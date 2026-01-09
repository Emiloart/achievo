/**
 * Authentication service for wallet-based sessions.
 *
 * Enforces nonce single-use, refresh token rotation, and wallet-to-user invariants.
 */
import { Inject, Injectable, UnauthorizedException, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "crypto";
import { getAddress, verifyMessage } from "viem";
import { Web3Service } from "../web3/web3.service";
import { toAchusrId } from "../identity/username.util";

const LOGIN_MESSAGE_PREFIX = "Achievo login nonce:";
const identityAbi = [
  {
    inputs: [{ internalType: "address", name: "wallet", type: "address" }],
    name: "getUserId",
    outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
];

type SessionContext = {
  ip?: string | null;
  userAgent?: string | null;
};

function now() {
  return new Date();
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeWallet(address: string) {
  return getAddress(address).toLowerCase();
}

@Injectable()
/** Issues and validates wallet-based authentication sessions. */
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(Web3Service) private readonly web3: Web3Service,
  ) {}

  private formatUserId(id: bigint) {
    return toAchusrId(id);
  }

  private accessTtlMinutes() {
    const raw = Number(this.config.get("AUTH_ACCESS_TTL_MINUTES", 15));
    return Number.isFinite(raw) && raw > 0 ? raw : 15;
  }

  private refreshTtlDays() {
    const raw = Number(this.config.get("AUTH_REFRESH_TTL_DAYS", 30));
    return Number.isFinite(raw) && raw > 0 ? raw : 30;
  }

  private nonceTtlMinutes() {
    const raw = Number(this.config.get("AUTH_NONCE_TTL_MINUTES", 10));
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  }

  getAccessTokenTtlSeconds() {
    return Math.floor(this.accessTtlMinutes() * 60);
  }

  getRefreshTokenMaxAgeMs() {
    return Math.floor(this.refreshTtlDays() * 24 * 60 * 60 * 1000);
  }

  private buildLoginMessage(nonce: string) {
    return `${LOGIN_MESSAGE_PREFIX} ${nonce}`;
  }

  private async fetchOnChainUserId(address: string): Promise<bigint> {
    const identityAddr = this.config.get<string>("IDENTITY_ADDRESS");
    if (!identityAddr) throw new InternalServerErrorException("IDENTITY_ADDRESS not configured");
    const userId = (await this.web3.publicClient.readContract({
      address: identityAddr as `0x${string}`,
      abi: identityAbi as any,
      functionName: "getUserId",
      args: [address as `0x${string}`],
    })) as bigint;
    return userId;
  }

  async issueNonce(address: string) {
    const checksum = normalizeWallet(address);
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = addMinutes(this.nonceTtlMinutes());
    await this.prisma.authNonce.upsert({
      where: { walletAddress: checksum },
      update: { nonce, expiresAt },
      create: { walletAddress: checksum, nonce, expiresAt },
    });
    return { nonce, expiresAt };
  }

  private async validateNonce(address: string, nonce?: string | null) {
    const checksum = normalizeWallet(address);
    const record = await this.prisma.authNonce.findUnique({ where: { walletAddress: checksum } });
    if (!record) throw new UnauthorizedException("Nonce missing");
    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.authNonce.deleteMany({ where: { walletAddress: checksum } });
      throw new UnauthorizedException("Nonce expired");
    }
    if (nonce && record.nonce !== nonce) {
      throw new UnauthorizedException("Nonce mismatch");
    }
    await this.prisma.authNonce.deleteMany({ where: { walletAddress: checksum } });
    return record.nonce;
  }

  private async ensureUser(address: string) {
    const checksum = normalizeWallet(address);
    const chainUserId = await this.fetchOnChainUserId(checksum);
    if (chainUserId === 0n) {
      throw new UnauthorizedException("Achievo ID not claimed for this wallet. Claim on-chain first.");
    }

    const formatted = this.formatUserId(chainUserId);
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const userByWallet = await tx.user.findFirst({
        where: { primaryWallet: { equals: checksum, mode: "insensitive" } },
      });
      const userByUserId = await tx.user.findFirst({ where: { userId: formatted } });
      let user = userByWallet || userByUserId;
      if (userByWallet && userByUserId && userByWallet.id !== userByUserId.id) {
        user = userByUserId;
      }

      if (!user) {
        try {
          user = await tx.user.create({
            data: {
              userId: formatted,
              primaryWallet: checksum,
              wallets: {
                create: {
                  address: checksum,
                  role: "PRIMARY",
                },
              },
            },
          });
        } catch (error: any) {
          if (error?.code !== "P2002") throw error;
          user = await tx.user.findFirst({ where: { userId: formatted } });
          if (!user) throw error;
        }
      }

      const updates: Record<string, string> = {};
      if (user.primaryWallet !== checksum) updates.primaryWallet = checksum;
      if (user.userId !== formatted && (!userByUserId || userByUserId.id === user.id)) {
        updates.userId = formatted;
      }
      if (Object.keys(updates).length) {
        user = await tx.user.update({ where: { id: user.id }, data: updates });
      }

      await tx.wallet.upsert({
        where: { address: checksum },
        update: { userId: user.id, role: "PRIMARY" },
        create: { address: checksum, role: "PRIMARY", userId: user.id },
      });

      return user;
    });
  }

  private createAccessToken(user: { id: string; userId: string; primaryWallet: string }) {
    return this.jwt.sign(
      {
        sub: user.id,
        userId: user.userId,
        address: user.primaryWallet,
      },
      { expiresIn: this.getAccessTokenTtlSeconds() },
    );
  }

  private async createSession(
    user: { id: string; primaryWallet: string },
    context?: SessionContext,
    familyId?: string,
  ) {
    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenFamilyId = familyId || randomUUID();
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        walletAddress: user.primaryWallet.toLowerCase(),
        refreshTokenHash,
        refreshTokenFamilyId,
        lastUsedAt: now(),
        ip: context?.ip || null,
        userAgent: context?.userAgent || null,
      },
    });
    return { session, refreshToken };
  }

  private async revokeFamily(refreshTokenFamilyId: string) {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenFamilyId, revokedAt: null },
      data: { revokedAt: now() },
    });
  }

  async login(params: {
    address: string;
    signature: string;
    nonce?: string | null;
    context?: SessionContext;
  }) {
    const checksum = normalizeWallet(params.address);
    const signerAddress = getAddress(checksum);
    const nonce = await this.validateNonce(checksum, params.nonce);
    const message = this.buildLoginMessage(nonce);
    const valid = await verifyMessage({
      address: signerAddress,
      message,
      signature: params.signature as `0x${string}`,
    });
    if (!valid) throw new UnauthorizedException("Signature invalid");

    const user = await this.ensureUser(checksum);
    const accessToken = this.createAccessToken(user);
    const { session, refreshToken } = await this.createSession(user, params.context);
    const csrfToken = randomBytes(16).toString("hex");

    return {
      accessToken,
      refreshToken,
      csrfToken,
      session,
      user: {
        id: user.id,
        userId: user.userId,
        primaryWallet: user.primaryWallet,
      },
    };
  }

  async refresh(params: { refreshToken: string; context?: SessionContext }) {
    const refreshTokenHash = hashToken(params.refreshToken);
    const session = await this.prisma.authSession.findUnique({ where: { refreshTokenHash } });
    if (!session) throw new UnauthorizedException("Refresh token invalid");
    if (session.revokedAt) {
      await this.revokeFamily(session.refreshTokenFamilyId);
      throw new UnauthorizedException("Refresh token revoked");
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const accessToken = this.createAccessToken(user);
    const rotated = await this.createSession(
      { id: user.id, primaryWallet: user.primaryWallet },
      params.context,
      session.refreshTokenFamilyId,
    );
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: now(), lastUsedAt: now() },
    });
    const csrfToken = randomBytes(16).toString("hex");

    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      csrfToken,
      session: rotated.session,
      user: {
        id: user.id,
        userId: user.userId,
        primaryWallet: user.primaryWallet,
      },
    };
  }

  async logout(refreshToken?: string | null) {
    if (!refreshToken) return;
    const refreshTokenHash = hashToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({ where: { refreshTokenHash } });
    if (!session) return;
    await this.revokeFamily(session.refreshTokenFamilyId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return {
      id: user.id,
      userId: user.userId,
      primaryWallet: user.primaryWallet,
      displayName: user.displayName ?? "",
    };
  }

  getLoginMessage(nonce: string) {
    return this.buildLoginMessage(nonce);
  }
}
