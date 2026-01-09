/**
 * Organization domain service.
 *
 * Enforces handle uniqueness, on-chain creation requirements, and membership invariants.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ChainActionType, OrgRole, OrgVisibility, ProgramStatus, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SocialIdentityService } from "../social/socialIdentity.service";
import { OrgAuditService } from "../org-audit/org-audit.service";
import { hashHandle, normalizeHandle } from "./handle.util";
import { OrgRegistryService } from "./orgRegistry.service";
import { ChainActionsService } from "../chain-actions/chain-actions.service";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";

function generateToken() {
  return randomBytes(16).toString("base64url");
}

function coerceVisibility(raw?: string) {
  if (!raw) return null;
  const value = raw.toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(OrgVisibility, value)) {
    throw new BadRequestException("INVALID_VISIBILITY");
  }
  return value as OrgVisibility;
}

@Injectable()
/** Orchestrates organization creation, membership, and visibility enforcement. */
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SocialIdentityService) private readonly identities: SocialIdentityService,
    @Inject(OrgAuditService) private readonly audit: OrgAuditService,
    @Inject(OrgRegistryService) private readonly orgRegistry: OrgRegistryService,
    @Inject(ChainActionsService) private readonly chainActions: ChainActionsService,
  ) {}

  async getMembership(orgId: string, userId: string) {
    return this.prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
  }

  private async isInviteTokenValid(orgId: string, token?: string | null) {
    if (!token) return false;
    const invite = await this.prisma.orgInvite.findUnique({ where: { token } });
    if (!invite || invite.orgId !== orgId) return false;
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return false;
    return true;
  }

  private enforceVisibility(
    org: { visibility: OrgVisibility; id: string },
    viewerId?: string | null,
    token?: string | null,
  ) {
    if (org.visibility === "PUBLIC") return;
    if (viewerId) return;
    if (org.visibility === "UNLISTED") {
      throw new NotFoundException("ORG_NOT_FOUND");
    }
    throw new NotFoundException("ORG_NOT_FOUND");
  }

  async createOrg(
    actorUserId: string,
    input: {
      handle: string;
      displayName: string;
      description?: string;
      website?: string;
      visibility?: string;
      creationTxHash?: string;
    },
  ) {
    const handleResult = normalizeHandle(input.handle);
    if (!handleResult.valid) throw new BadRequestException("INVALID_HANDLE");
    const displayName = (input.displayName || "").trim();
    if (!displayName) throw new BadRequestException("DISPLAY_NAME_REQUIRED");
    const visibility = coerceVisibility(input.visibility || "PUBLIC") || "PUBLIC";
    const localHandleHash = hashHandle(handleResult.handle).toLowerCase();
    const creationTxHashRaw = (input.creationTxHash || "").trim();
    const creationTxHash = creationTxHashRaw
      ? (creationTxHashRaw.startsWith("0x") ? creationTxHashRaw : `0x${creationTxHashRaw}`)
      : "";
    const creationTxHashLower = creationTxHash.toLowerCase();

    if (creationTxHashLower) {
      const existing = await this.prisma.organization.findFirst({
        where: {
          OR: [{ onchainCreationTxHash: creationTxHashLower }, { creationTxHash: creationTxHashLower }],
        },
      });
      if (existing) {
        if (existing.handle !== handleResult.handle) {
          throw new BadRequestException("ORG_CREATION_TX_ALREADY_USED");
        }
        if (existing.createdByUserId !== actorUserId) {
          throw new ForbiddenException("ORG_CREATION_TX_ALREADY_USED");
        }
        return existing;
      }
    }

    let chainInfo: {
      txHash: string;
      handleHash: string;
      creator: string;
      createdAt: number | null;
      chainId: number;
      blockNumber?: number | null;
      blockHash?: string | null;
      logIndex?: number | null;
      fromAddress?: string | null;
      toAddress?: string | null;
      registry?: string | null;
      feePaid?: string | null;
    } | null = null;

    if (this.orgRegistry.isRequired()) {
      if (!creationTxHash) throw new BadRequestException("ORG_CREATION_TX_REQUIRED");
      const user = await this.prisma.user.findUnique({
        where: { userId: actorUserId },
        select: { primaryWallet: true },
      });
      if (!user?.primaryWallet) throw new BadRequestException("WALLET_REQUIRED");
      try {
        chainInfo = await this.orgRegistry.verifyCreateOrgTx({
          txHash: creationTxHash,
          handle: handleResult.handle,
          creator: user.primaryWallet,
        });
      } catch (error) {
        if (!(error instanceof RpcUnavailableError)) throw error;
        chainInfo = {
          txHash: creationTxHash,
          handleHash: localHandleHash,
          creator: user.primaryWallet,
          createdAt: null,
          chainId: this.orgRegistry.getChainId(),
        };
      }
    } else if (creationTxHash) {
      const registry = this.orgRegistry.getRegistryAddressSafe();
      if (registry) {
        const user = await this.prisma.user.findUnique({
          where: { userId: actorUserId },
          select: { primaryWallet: true },
        });
        if (user?.primaryWallet) {
          try {
            chainInfo = await this.orgRegistry.verifyCreateOrgTx({
              txHash: creationTxHash,
              handle: handleResult.handle,
              creator: user.primaryWallet,
            });
          } catch {
            // If org creation isn't required, ignore bad on-chain txs.
            chainInfo = null;
          }
        }
      }
    }

    let created;
    try {
      created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const org = await tx.organization.create({
          data: {
            handle: handleResult.handle,
            displayName,
            description: input.description?.trim() || null,
            website: input.website?.trim() || null,
            visibility,
            createdByUserId: actorUserId,
            handleHash: chainInfo?.handleHash || localHandleHash,
            chainId: chainInfo?.chainId ?? null,
            creationTxHash: chainInfo?.txHash?.toLowerCase() || null,
            onchainCreator: chainInfo?.creator?.toLowerCase() || null,
            onchainCreatedAt: chainInfo?.createdAt ? new Date(chainInfo.createdAt * 1000) : null,
            onchainChainId: chainInfo?.chainId ?? null,
            onchainCreationTxHash: chainInfo?.txHash?.toLowerCase() || null,
            onchainHandleHash: chainInfo?.handleHash || localHandleHash,
            onchainStatus: chainInfo ? "PENDING_CONFIRMATIONS" : null,
            onchainBlockNumber: chainInfo?.blockNumber ?? null,
            onchainBlockHash: chainInfo?.blockHash ?? null,
            onchainConfirmedAt: null,
          },
        });
        await tx.orgMember.create({
          data: {
            orgId: org.id,
            userId: actorUserId,
            role: "OWNER",
          },
        });

        if (chainInfo) {
          if (chainInfo.blockNumber || chainInfo.blockHash) {
            await this.chainActions.recordObservedReceipt(
              ChainActionType.ORG_CREATE,
              chainInfo.chainId,
              chainInfo.txHash,
              {
                status: "success",
                blockNumber: chainInfo.blockNumber ?? null,
                blockHash: chainInfo.blockHash ?? null,
                from: chainInfo.fromAddress ?? null,
                to: chainInfo.toAddress ?? null,
              },
              {
                eventName: "OrgCreated",
                logIndex: chainInfo.logIndex ?? null,
                args: {
                  handle: handleResult.handle,
                  handleHash: chainInfo.handleHash,
                  creator: chainInfo.creator,
                  feePaid: chainInfo.feePaid,
                },
              },
              { orgId: org.id, handle: handleResult.handle },
              tx,
            );
          } else {
            await this.chainActions.recordPending(
              ChainActionType.ORG_CREATE,
              chainInfo.chainId,
              chainInfo.txHash,
              chainInfo.creator ?? null,
              chainInfo.registry ?? null,
              { orgId: org.id, handle: handleResult.handle },
              tx,
            );
          }
        }
        return org;
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(",") : String(error?.meta?.target || "");
        if (target.includes("handle") || target.includes("handleHash")) {
          throw new BadRequestException("ORG_HANDLE_TAKEN");
        }
        if (target.includes("onchainCreationTxHash")) {
          throw new BadRequestException("ORG_CREATION_TX_ALREADY_USED");
        }
      }
      throw error;
    }

    await this.audit.log({
      orgId: created.id,
      actorUserId,
      action: "ORG_CREATED",
      targetType: "ORG",
      targetId: created.id,
    });

    return created;
  }

  async getOrgByHandle(handleRaw: string, viewerUserId?: string | null, token?: string | null) {
    const handleResult = normalizeHandle(handleRaw);
    if (!handleResult.valid) throw new NotFoundException("ORG_NOT_FOUND");
    const org = await this.prisma.organization.findUnique({ where: { handle: handleResult.handle } });
    if (!org) throw new NotFoundException("ORG_NOT_FOUND");

    const membership = viewerUserId ? await this.getMembership(org.id, viewerUserId) : null;
    if (org.visibility === "PRIVATE" && !membership) throw new NotFoundException("ORG_NOT_FOUND");
    if (org.visibility === "UNLISTED" && !membership) {
      const validToken = await this.isInviteTokenValid(org.id, token);
      if (!validToken) throw new NotFoundException("ORG_NOT_FOUND");
    }

    const programs = await this.prisma.orgProgram.findMany({
      where: {
        orgId: org.id,
        status: membership ? undefined : ProgramStatus.LIVE,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const membersCount = await this.prisma.orgMember.count({ where: { orgId: org.id } });

    return {
      org,
      membership: membership ? { role: membership.role, joinedAt: membership.joinedAt } : null,
      membersCount,
      programs,
    };
  }

  async updateOrg(
    orgId: string,
    input: { displayName?: string; description?: string; website?: string; visibility?: string; logoUrl?: string },
  ) {
    const visibility = coerceVisibility(input.visibility || undefined);
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        displayName: input.displayName?.trim() || undefined,
        description: input.description?.trim() || undefined,
        website: input.website?.trim() || undefined,
        logoUrl: input.logoUrl?.trim() || undefined,
        visibility: visibility || undefined,
      },
    });
  }

  async listMembers(orgId: string, viewerUserId?: string | null, token?: string | null) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException("ORG_NOT_FOUND");
    const membership = viewerUserId ? await this.getMembership(org.id, viewerUserId) : null;
    if (org.visibility === "PRIVATE" && !membership) {
      throw new NotFoundException("ORG_NOT_FOUND");
    }
    if (org.visibility === "UNLISTED" && !membership) {
      const validToken = await this.isInviteTokenValid(org.id, token);
      if (!validToken) throw new NotFoundException("ORG_NOT_FOUND");
    }

    const members = await this.prisma.orgMember.findMany({ where: { orgId }, orderBy: { joinedAt: "asc" } });
    type OrgMemberSummary = { userId: string; role: OrgRole; joinedAt: Date | null };
    type UserScore = { userId: string; credibilityScore: number };
    const userIds = members.map((member: OrgMemberSummary) => member.userId);
    const summaries = await this.identities.getSummaries(userIds);
    const scores = await this.prisma.userConsistencyScore.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, credibilityScore: true },
    });
    const scoreMap = new Map(scores.map((score: UserScore) => [score.userId, score.credibilityScore]));

    return members.map((member: OrgMemberSummary) => {
      const identity = summaries.get(member.userId);
      return {
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
        username: identity?.username || "",
        displayName: identity?.displayName || member.userId,
        avatar: identity?.avatar || "",
        credibilityScore: scoreMap.get(member.userId) ?? 0,
      };
    });
  }

  async createInvite(
    orgId: string,
    actorUserId: string,
    input: { targetUserId?: string; email?: string; role?: string; expiresInDays?: number },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException("ORG_NOT_FOUND");
    const role = (input.role || "MEMBER").toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(OrgRole, role)) throw new BadRequestException("INVALID_ROLE");
    const expiresIn = Math.max(Number(input.expiresInDays || 7), 1);
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    const token = generateToken();

    const invite = await this.prisma.orgInvite.create({
      data: {
        orgId,
        role: role as OrgRole,
        email: input.email?.trim() || null,
        targetUserId: input.targetUserId?.trim() || null,
        token,
        expiresAt,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      actorUserId,
      action: "MEMBER_INVITED",
      targetType: "INVITE",
      targetId: invite.id,
      metadata: { role: invite.role, email: invite.email, targetUserId: invite.targetUserId },
    });

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.orgInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("INVITE_NOT_FOUND");
    if (invite.acceptedAt) throw new BadRequestException("INVITE_USED");
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) throw new BadRequestException("INVITE_EXPIRED");
    if (invite.targetUserId && invite.targetUserId !== userId) throw new ForbiddenException("INVITE_NOT_FOR_USER");

    const membership = await this.prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
      update: { role: invite.role, joinedAt: new Date() },
      create: { orgId: invite.orgId, userId, role: invite.role, invitedByUserId: invite.createdByUserId },
    });

    await this.prisma.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await this.audit.log({
      orgId: invite.orgId,
      actorUserId: userId,
      action: "MEMBER_JOINED",
      targetType: "MEMBER",
      targetId: membership.id,
      metadata: { role: membership.role },
    });

    return membership;
  }

  async revokeInvite(token: string, actorUserId: string) {
    const invite = await this.prisma.orgInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("INVITE_NOT_FOUND");
    const membership = await this.getMembership(invite.orgId, actorUserId);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("INSUFFICIENT_ROLE");
    }
    await this.prisma.orgInvite.delete({ where: { id: invite.id } });
    await this.audit.log({
      orgId: invite.orgId,
      actorUserId,
      action: "INVITE_REVOKED",
      targetType: "INVITE",
      targetId: invite.id,
    });
    return { success: true };
  }
}
