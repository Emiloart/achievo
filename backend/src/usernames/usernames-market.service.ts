/**
 * Username marketplace service.
 *
 * Validates signed orders, enforces ownership checks, and records settlement actions.
 */
import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { UsernameOrderStatus, UsernameOrderType, SettlementStatus, ChainActionType } from "@prisma/client";
import { randomBytes } from "crypto";
import { getAddress } from "viem";
import { PrismaService } from "../prisma/prisma.service";
import { UsernamesChainService } from "./username-chain.service";
import { UsernameEip712Service } from "./username-eip712.service";
import { normalizeUsername, validateUsername } from "../../../packages/username";
import { ChainActionsService } from "../chain-actions/chain-actions.service";
import { RiskEngineService } from "../risk/riskEngine.service";

const ORDER_TYPE_MAP: Record<string, number> = {
  ASK: 1,
  BID: 2,
  OFFER: 3,
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizeAddress(value?: string | null) {
  if (!value) return null;
  const address = getAddress(value);
  const normalized = address.toLowerCase();
  return normalized === ZERO_ADDRESS ? null : normalized;
}

function parsePrice(raw: unknown) {
  if (typeof raw === "bigint") {
    if (raw <= 0n) throw new BadRequestException("INVALID_PRICE");
    return raw;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) throw new BadRequestException("INVALID_PRICE");
    return BigInt(Math.floor(raw));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) throw new BadRequestException("INVALID_PRICE");
    const value = BigInt(trimmed);
    if (value <= 0n) throw new BadRequestException("INVALID_PRICE");
    return value;
  }
  throw new BadRequestException("INVALID_PRICE");
}

function parseOrderType(raw: string | number) {
  if (typeof raw === "number") {
    const numeric = Math.floor(raw);
    const kind = numeric === 1 ? "ASK" : numeric === 2 ? "BID" : numeric === 3 ? "OFFER" : null;
    if (!kind) throw new BadRequestException("INVALID_ORDER_TYPE");
    return { kind: kind as UsernameOrderType, numeric };
  }
  const trimmed = String(raw || "").trim();
  if (/^\d+$/.test(trimmed)) {
    return parseOrderType(Number(trimmed));
  }
  const normalized = trimmed.toUpperCase();
  const numeric = ORDER_TYPE_MAP[normalized];
  if (!numeric) throw new BadRequestException("INVALID_ORDER_TYPE");
  return { kind: normalized as UsernameOrderType, numeric };
}

function parseNumeric(raw: string | number | bigint, label: string) {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) throw new BadRequestException(`INVALID_${label}`);
    return BigInt(Math.floor(raw));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) throw new BadRequestException(`INVALID_${label}`);
    return BigInt(trimmed);
  }
  throw new BadRequestException(`INVALID_${label}`);
}

function randomUint() {
  return BigInt(`0x${randomBytes(8).toString("hex")}`);
}

function toExpirySeconds(value?: string | number | null) {
  if (!value) {
    const weekSeconds = 60 * 60 * 24 * 7;
    return BigInt(Math.floor(Date.now() / 1000) + weekSeconds);
  }
  const raw = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) throw new BadRequestException("INVALID_EXPIRES_AT");
  return BigInt(Math.floor(raw));
}

@Injectable()
/** Validates signed orders and coordinates username trade settlement. */
export class UsernamesMarketService {
  private readonly logger = new Logger(UsernamesMarketService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(UsernamesChainService) private readonly chain: UsernamesChainService,
    @Inject(UsernameEip712Service) private readonly eip712: UsernameEip712Service,
    @Inject(ChainActionsService) private readonly actions: ChainActionsService,
    @Inject(RiskEngineService) private readonly risk: RiskEngineService,
  ) {}

  private async resolveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userId: true, primaryWallet: true },
    });
    if (!user) throw new BadRequestException("USER_NOT_FOUND");
    return user;
  }

  async prepareOrder(params: {
    makerAddress: string;
    type: string;
    name: string;
    priceWei: string | number | bigint;
    takerAddress?: string | null;
    expiresAt?: string | number | null;
    nonce?: string | number | bigint | null;
    salt?: string | number | bigint | null;
  }) {
    const { kind, numeric } = parseOrderType(params.type);
    const normalizedResult = normalizeUsername(params.name || "");
    const validation = validateUsername(normalizedResult.normalized);
    if (!validation.valid) throw new BadRequestException("INVALID_USERNAME");

    const maker = normalizeAddress(params.makerAddress);
    if (!maker) throw new BadRequestException("MAKER_REQUIRED");
    const taker = normalizeAddress(params.takerAddress) || null;
    const priceWei = parsePrice(params.priceWei);
    const nonce = params.nonce ? parseNumeric(params.nonce, "NONCE") : randomUint();
    const salt = params.salt ? parseNumeric(params.salt, "SALT") : randomUint();
    const expiresAt = toExpirySeconds(params.expiresAt ?? null);

    const typedData = this.eip712.buildOrderTypedData({
      orderType: numeric,
      maker,
      taker,
      handleHash: normalizedResult.handleHash,
      priceWei,
      currencyHash: this.eip712.getCurrencyHash(),
      nonce,
      salt,
      expiresAt,
    });

    return {
      normalized: normalizedResult.normalized,
      handleHash: normalizedResult.handleHash,
      orderType: kind,
      nonce: nonce.toString(),
      salt: salt.toString(),
      expiresAt: Number(expiresAt),
      typedData,
    };
  }

  async createOrder(params: {
    userId: string;
    name: string;
    typedData: any;
    signature: string;
  }) {
    const user = await this.resolveUser(params.userId);
    const makerWallet = normalizeAddress(user.primaryWallet);
    if (!makerWallet) throw new BadRequestException("WALLET_REQUIRED");

    const normalizedResult = normalizeUsername(params.name || "");
    const validation = validateUsername(normalizedResult.normalized);
    if (!validation.valid) throw new BadRequestException("INVALID_USERNAME");

    if (!params.typedData?.message) throw new BadRequestException("TYPED_DATA_REQUIRED");
    const expectedDomain = this.eip712.getDomain();
    const domain = params.typedData.domain || {};
    if (
      Number(domain.chainId || 0) !== expectedDomain.chainId ||
      String(domain.verifyingContract || "").toLowerCase() !== expectedDomain.verifyingContract.toLowerCase() ||
      String(domain.name || "") !== expectedDomain.name ||
      String(domain.version || "") !== expectedDomain.version
    ) {
      throw new BadRequestException("DOMAIN_MISMATCH");
    }
    const message = params.typedData.message;
    const { kind, numeric } = parseOrderType(message.orderType ?? "");
    const maker = normalizeAddress(message.maker);
    if (!maker || maker !== makerWallet) throw new BadRequestException("MAKER_MISMATCH");
    const taker = normalizeAddress(message.taker) || null;
    const handleHash = String(message.handleHash || "").toLowerCase();
    if (!handleHash || handleHash !== normalizedResult.handleHash) {
      throw new BadRequestException("HANDLE_HASH_MISMATCH");
    }
    const priceWei = parseNumeric(message.priceWei, "PRICE");
    const currencyHash = String(message.currencyHash || "").toLowerCase();
    if (currencyHash !== this.eip712.getCurrencyHash()) throw new BadRequestException("INVALID_CURRENCY");
    const nonce = parseNumeric(message.nonce, "NONCE");
    const salt = parseNumeric(message.salt, "SALT");
    const expiresAt = parseNumeric(message.expiresAt, "EXPIRES_AT");
    if (expiresAt <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new BadRequestException("ORDER_EXPIRED");
    }

    const built = this.eip712.buildOrderTypedData({
      orderType: numeric,
      maker: makerWallet,
      taker,
      handleHash: normalizedResult.handleHash,
      priceWei,
      currencyHash: this.eip712.getCurrencyHash(),
      nonce,
      salt,
      expiresAt,
    });

    const signature = String(params.signature || "").trim();
    if (!signature) throw new BadRequestException("SIGNATURE_REQUIRED");
    const recovered = await this.eip712.recoverSigner(built, signature as `0x${string}`);
    if (normalizeAddress(recovered) !== makerWallet) throw new BadRequestException("SIGNATURE_INVALID");

    if (kind === "ASK") {
      const owner = await this.chain.getOwnerByHandleHash(normalizedResult.handleHash);
      if (!owner || owner !== makerWallet) throw new BadRequestException("USERNAME_OWNER_MISMATCH");
    }

    const expiresAtDate = new Date(Number(expiresAt) * 1000);
    const orderHash = this.eip712.hashTypedData(built).toLowerCase();

    const maxOpenRaw = Number(process.env.USERNAME_MAX_OPEN_ORDERS ?? 5);
    const maxOpen = Number.isFinite(maxOpenRaw) && maxOpenRaw > 0 ? maxOpenRaw : 5;
    const openCount = await this.prisma.usernameOrder.count({
      where: {
        makerAchusrId: user.userId,
        status: { in: [UsernameOrderStatus.OPEN, UsernameOrderStatus.RESERVED] },
      },
    });
    if (openCount >= maxOpen) throw new BadRequestException("ORDER_LIMIT_REACHED");

    const cooldownRaw = Number(process.env.USERNAME_RELIST_COOLDOWN_SECONDS ?? 60);
    const cooldownSeconds = Number.isFinite(cooldownRaw) && cooldownRaw > 0 ? cooldownRaw : 60;
    const cooldownSince = new Date(Date.now() - cooldownSeconds * 1000);
    const recent = await this.prisma.usernameOrder.findFirst({
      where: {
        makerAchusrId: user.userId,
        normalized: normalizedResult.normalized,
        createdAt: { gte: cooldownSince },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) throw new BadRequestException("REL_LIST_COOLDOWN");

    try {
      const created = await this.prisma.usernameOrder.create({
        data: {
          usernameNormalized: normalizedResult.normalized,
          normalized: normalizedResult.normalized,
          handleHash: normalizedResult.handleHash,
          type: kind,
          status: UsernameOrderStatus.OPEN,
          makerUserId: user.id,
          makerAchusrId: user.userId,
          makerAddress: makerWallet,
          takerAddress: taker,
          price: priceWei,
          priceWei: priceWei.toString(),
          currency: "ETH",
          nonce: nonce.toString(),
          salt: salt.toString(),
          orderHash,
          typedData: built as any,
          signature,
          signerRecovered: makerWallet,
          expiresAt: expiresAtDate,
        },
      });
      void this.risk.recompute(user.userId).catch(() => {});
      return created;
    } catch (error: any) {
      if (error?.code === "P2002") {
        const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(",") : String(error?.meta?.target || "");
        if (target.includes("orderHash")) {
          throw new BadRequestException("ORDER_ALREADY_EXISTS");
        }
        throw new BadRequestException("NONCE_ALREADY_USED");
      }
      throw error;
    }
  }

  async cancelOrder(params: { userId: string; orderId: string; signature: string }) {
    const user = await this.resolveUser(params.userId);
    const order = await this.prisma.usernameOrder.findUnique({ where: { id: params.orderId } });
    if (!order) throw new BadRequestException("ORDER_NOT_FOUND");
    const makerWallet = normalizeAddress(order.makerAddress);
    if (!makerWallet) throw new BadRequestException("ORDER_INVALID");
    const userWallet = normalizeAddress(user.primaryWallet);
    if (makerWallet !== userWallet) throw new BadRequestException("FORBIDDEN");
    if (order.status !== UsernameOrderStatus.OPEN && order.status !== UsernameOrderStatus.RESERVED) {
      return order;
    }

    const nonce = parseNumeric(order.nonce || "0", "NONCE");
    const typedData = this.eip712.buildCancelTypedData({
      orderHash: order.orderHash || "",
      maker: makerWallet,
      nonce,
    });
    const signature = String(params.signature || "").trim();
    if (!signature) throw new BadRequestException("SIGNATURE_REQUIRED");
    const recovered = await this.eip712.recoverSigner(typedData, signature as `0x${string}`);
    if (normalizeAddress(recovered) !== makerWallet) throw new BadRequestException("SIGNATURE_INVALID");

    const updated = await this.prisma.usernameOrder.update({
      where: { id: order.id },
      data: { status: UsernameOrderStatus.CANCELED },
    });
    void this.risk.recompute(user.userId).catch(() => {});
    return updated;
  }

  private async reserveOrder(orderId: string) {
    const result = await this.prisma.usernameOrder.updateMany({
      where: { id: orderId, status: UsernameOrderStatus.OPEN },
      data: { status: UsernameOrderStatus.RESERVED },
    });
    if (result.count === 0) throw new BadRequestException("ORDER_NOT_OPEN");
  }

  async acceptOrder(params: { userId: string; orderId: string }) {
    const buyerUser = await this.resolveUser(params.userId);
    const order = await this.prisma.usernameOrder.findUnique({ where: { id: params.orderId } });
    if (!order) throw new BadRequestException("ORDER_NOT_FOUND");
    if (order.status !== UsernameOrderStatus.OPEN) throw new BadRequestException("ORDER_NOT_OPEN");

    if (order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.EXPIRED } });
      throw new BadRequestException("ORDER_EXPIRED");
    }

    const normalized = order.normalized || order.usernameNormalized;
    if (!normalized) throw new BadRequestException("ORDER_INVALID");
    const handleHash = order.handleHash || normalizeUsername(normalized).handleHash;
    const makerWallet = normalizeAddress(order.makerAddress);
    if (!makerWallet) throw new BadRequestException("ORDER_INVALID");

    if (!order.signature || !order.typedData) {
      await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.INVALID } });
      throw new BadRequestException("ORDER_INVALID");
    }
    const recovered = await this.eip712.recoverSigner(order.typedData, order.signature as `0x${string}`);
    if (normalizeAddress(recovered) !== makerWallet) {
      await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.INVALID } });
      throw new BadRequestException("ORDER_INVALID");
    }

    const buyerWallet = normalizeAddress(buyerUser.primaryWallet);
    if (!buyerWallet) throw new BadRequestException("BUYER_WALLET_REQUIRED");

    const taker = normalizeAddress(order.takerAddress);
    const kind = order.type;
    const sellerWallet = kind === "ASK" ? makerWallet : buyerWallet;
    const actualBuyerWallet = kind === "ASK" ? buyerWallet : makerWallet;
    if (taker && taker !== buyerWallet) throw new BadRequestException("TAKER_MISMATCH");
    if (sellerWallet === actualBuyerWallet) throw new BadRequestException("INVALID_PARTIES");

    await this.reserveOrder(order.id);

    try {
      const owner = await this.chain.getOwnerByHandleHash(handleHash);
      if (!owner || owner !== sellerWallet) {
        await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.OPEN } });
        throw new BadRequestException("SELLER_NOT_OWNER");
      }
    } catch (error) {
      await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.OPEN } });
      throw error;
    }

    const mode = this.chain.getSettlementMode();
    const trade = await this.prisma.usernameTrade.create({
      data: {
        usernameNormalized: normalized,
        normalized,
        handleHash,
        askOrderId: kind === "ASK" ? order.id : null,
        bidOrderId: kind === "BID" ? order.id : null,
        offerOrderId: kind === "OFFER" ? order.id : null,
        sellerAchusrId: kind === "ASK" ? order.makerAchusrId : buyerUser.userId,
        buyerAchusrId: kind === "ASK" ? buyerUser.userId : order.makerAchusrId,
        sellerAddress: sellerWallet,
        buyerAddress: actualBuyerWallet,
        price: BigInt(order.priceWei || order.price || 0),
        priceWei: order.priceWei || String(order.price || "0"),
        currency: order.currency || "ETH",
        status: SettlementStatus.PENDING,
        chainId: this.chain.getChainId(),
      },
    });

    if (mode === "SELLER_TX") {
      return {
        mode,
        trade,
        txRequest: {
          to: this.chain.getRegistryAddress(),
          functionName: "transferUsername",
          args: [sellerWallet, actualBuyerWallet, normalized],
        },
      };
    }

    let txHash: `0x${string}`;
    try {
      txHash = await this.chain.transferUsername({
        from: sellerWallet,
        to: actualBuyerWallet,
        normalized,
      });
    } catch (error) {
      await this.prisma.usernameOrder.update({ where: { id: order.id }, data: { status: UsernameOrderStatus.OPEN } });
      throw error;
    }

    try {
      await this.prisma.usernameTrade.update({ where: { id: trade.id }, data: { txHash } });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new BadRequestException("TX_HASH_ALREADY_USED");
      }
      throw error;
    }
    await this.actions.recordPending(
      ChainActionType.USERNAME_TRANSFER,
      this.chain.getChainId(),
      txHash,
      sellerWallet,
      actualBuyerWallet,
      {
        tradeId: trade.id,
        orderId: order.id,
        handleHash,
        normalized,
        sellerAddress: sellerWallet,
        buyerAddress: actualBuyerWallet,
      },
    );

    this.logger.log(
      JSON.stringify({
        message: "username_trade_pending",
        tradeId: trade.id,
        orderId: order.id,
        txHash,
      }),
    );

    return { mode, trade, txHash };
  }

  async submitSellerTx(params: { userId: string; tradeId: string; txHash: string }) {
    const user = await this.resolveUser(params.userId);
    const trade = await this.prisma.usernameTrade.findUnique({ where: { id: params.tradeId } });
    if (!trade) throw new BadRequestException("TRADE_NOT_FOUND");
    if (trade.status !== SettlementStatus.PENDING) return trade;

    const sellerWallet = normalizeAddress(trade.sellerAddress);
    if (!sellerWallet) throw new BadRequestException("SELLER_WALLET_REQUIRED");
    const userWallet = normalizeAddress(user.primaryWallet);
    if (sellerWallet !== userWallet) throw new BadRequestException("FORBIDDEN");

    const normalized = trade.normalized || trade.usernameNormalized;
    if (!normalized) throw new BadRequestException("TRADE_INVALID");
    const receipt = await this.chain.verifyTransferReceipt({ txHash: params.txHash, normalized });

    try {
      await this.prisma.usernameTrade.update({
        where: { id: trade.id },
        data: {
          txHash: receipt.txHash,
          chainId: this.chain.getChainId(),
          blockNumber: receipt.blockNumber,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new BadRequestException("TX_HASH_ALREADY_USED");
      }
      throw error;
    }

    await this.actions.recordObservedReceipt(
      ChainActionType.USERNAME_TRANSFER,
      this.chain.getChainId(),
      receipt.txHash,
      {
        status: "success",
        blockNumber: receipt.blockNumber ?? undefined,
        blockHash: receipt.blockHash ?? undefined,
        from: receipt.from || undefined,
        to: receipt.to || undefined,
      },
      {
        eventName: "UsernameTransferred",
        logIndex: receipt.logIndex ?? null,
        args: { from: receipt.from, to: receipt.to, normalized },
      },
      {
        tradeId: trade.id,
        handleHash: trade.handleHash,
        normalized,
        sellerAddress: sellerWallet,
        buyerAddress: trade.buyerAddress,
      },
    );

    return this.prisma.usernameTrade.findUnique({ where: { id: trade.id } });
  }
}
