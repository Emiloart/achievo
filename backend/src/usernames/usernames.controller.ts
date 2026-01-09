/**
 * Username marketplace HTTP API.
 *
 * Exposes order preparation, signed order submission, and settlement status reads.
 */
import { BadRequestException, Body, Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { JwtGuard } from "../auth/jwt.guard";
import { UsernamesMarketService } from "./usernames-market.service";
import { UsernamesChainService } from "./username-chain.service";
import { resolveJwtFromRequest } from "../auth/auth.request";
import { JwtService } from "@nestjs/jwt";
import { normalizeUsername, validateUsername } from "../../../packages/username";
import { Prisma, UsernameOrderStatus, UsernameOrderType } from "@prisma/client";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiErrorResponses } from "../common/swagger/api-error.decorator";
import { UsernameCancelOrderDto, UsernameCreateOrderDto, UsernamePrepareOrderDto, UsernameSubmitTradeTxDto } from "./dto";

const MAX_LIMIT = 50;

const SENSITIVE_TTL_RAW = Number(process.env.THROTTLE_SENSITIVE_TTL);
const SENSITIVE_LIMIT_RAW = Number(process.env.THROTTLE_SENSITIVE_LIMIT);
const SENSITIVE_TTL_SECONDS =
  Number.isFinite(SENSITIVE_TTL_RAW) && SENSITIVE_TTL_RAW > 0 ? SENSITIVE_TTL_RAW : 60;
const SENSITIVE_TTL_MS = SENSITIVE_TTL_SECONDS * 1000;
const SENSITIVE_LIMIT = Number.isFinite(SENSITIVE_LIMIT_RAW) && SENSITIVE_LIMIT_RAW > 0 ? SENSITIVE_LIMIT_RAW : 30;

function cleanName(value?: string | null) {
  const trimmed = String(value || "").trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function toOrderDto(order: any) {
  return {
    id: order.id,
    normalized: order.normalized || order.usernameNormalized,
    handleHash: order.handleHash,
    type: order.type,
    makerAchusrId: order.makerAchusrId,
    makerAddress: order.makerAddress,
    takerAddress: order.takerAddress,
    nonce: order.nonce ?? null,
    priceWei: order.priceWei ?? order.price?.toString?.() ?? String(order.price),
    currency: order.currency,
    status: order.status,
    orderHash: order.orderHash,
    expiresAt: order.expiresAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function toTradeDto(trade: any) {
  return {
    id: trade.id,
    normalized: trade.normalized || trade.usernameNormalized,
    handleHash: trade.handleHash,
    sellerAddress: trade.sellerAddress,
    buyerAddress: trade.buyerAddress,
    priceWei: trade.priceWei ?? trade.price?.toString?.() ?? String(trade.price),
    currency: trade.currency,
    status: trade.status,
    txHash: trade.txHash,
    chainId: trade.chainId,
    blockNumber: trade.blockNumber,
    confirmedAt: trade.confirmedAt ?? null,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

@ApiTags("usernames")
@ApiErrorResponses()
@Controller("usernames")
/** Username marketplace endpoints with signed order enforcement. */
export class UsernamesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: UsernamesMarketService,
    private readonly chain: UsernamesChainService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveUser(req: any) {
    try {
      const decoded = await resolveJwtFromRequest<{ sub?: string }>(req, this.jwt);
      if (!decoded?.sub) return null;
      return this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, userId: true, primaryWallet: true },
      });
    } catch {
      return null;
    }
  }

  @Get("availability")
  @ApiOperation({ summary: "Check username availability" })
  async availability(@Query("name") name?: string) {
    const raw = cleanName(name);
    const normalized = normalizeUsername(raw).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      return { success: true, data: { available: false, reason: "INVALID", normalized, handleHash: "" } };
    }
    try {
      const data = await this.chain.isAvailable(raw);
      return { success: true, data };
    } catch (error) {
      if (error instanceof RpcUnavailableError) {
        return {
          success: true,
          data: { available: null, reason: "UNKNOWN", normalized, handleHash: normalizeUsername(raw).handleHash },
        };
      }
      throw error;
    }
  }

  @Post("orders/prepare")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiOperation({ summary: "Prepare a signed username order" })
  async prepareOrder(
    @Body() body: UsernamePrepareOrderDto,
    @Request() req: any,
  ) {
    const user = await this.resolveUser(req);
    const makerAddress = user?.primaryWallet || body?.makerAddress || "";
    const data = await this.market.prepareOrder({
      makerAddress,
      type: body?.type || "",
      name: cleanName(body?.name),
      priceWei: body?.priceWei ?? "0",
      takerAddress: body?.takerAddress || null,
      expiresAt: body?.expiresAt ?? null,
      nonce: body?.nonce ?? null,
      salt: body?.salt ?? null,
    });
    return { success: true, data };
  }

  @UseGuards(JwtGuard)
  @Post("orders")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Create a signed username order" })
  async createOrder(@Body() body: UsernameCreateOrderDto, @Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException("Unauthorized");
    const order = await this.market.createOrder({
      userId,
      name: cleanName(body?.name),
      typedData: body?.typedData,
      signature: body?.signature || "",
    });
    return { success: true, data: toOrderDto(order) };
  }

  @UseGuards(JwtGuard)
  @Post("orders/:id/cancel")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Cancel a signed username order" })
  async cancelOrder(@Param("id") id: string, @Body() body: UsernameCancelOrderDto, @Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException("Unauthorized");
    const order = await this.market.cancelOrder({ userId, orderId: id, signature: body?.signature || "" });
    return { success: true, data: toOrderDto(order) };
  }

  @UseGuards(JwtGuard)
  @Post("orders/:id/accept")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Accept a username order" })
  async acceptOrder(@Param("id") id: string, @Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException("Unauthorized");
    const result = await this.market.acceptOrder({ userId, orderId: id });
    return { success: true, data: result };
  }

  @UseGuards(JwtGuard)
  @Post("trades/:id/submit-tx")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Submit seller tx hash for username trade" })
  async submitTradeTx(@Param("id") id: string, @Body() body: UsernameSubmitTradeTxDto, @Request() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException("Unauthorized");
    const trade = await this.market.submitSellerTx({ userId, tradeId: id, txHash: body?.txHash || "" });
    return { success: true, data: trade ? toTradeDto(trade) : null };
  }

  @Get("orders")
  @ApiOperation({ summary: "List username orders" })
  async listOrders(
    @Query("handle") handle?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    const where: Prisma.UsernameOrderWhereInput = {};
    if (handle) {
      const normalized = normalizeUsername(cleanName(handle)).normalized;
      const validation = validateUsername(normalized);
      if (!validation.valid) return { success: true, data: [] };
      where.OR = [{ normalized }, { usernameNormalized: normalized }];
    }
    if (type) {
      const upper = String(type).toUpperCase();
      if (Object.values(UsernameOrderType).includes(upper as UsernameOrderType)) {
        where.type = upper as UsernameOrderType;
      }
    }
    if (status) {
      const upper = String(status).toUpperCase();
      if (Object.values(UsernameOrderStatus).includes(upper as UsernameOrderStatus)) {
        where.status = upper as UsernameOrderStatus;
      }
    }

    const take = Math.min(Math.max(Number(limit || 20), 1), MAX_LIMIT);
    const rows = await this.prisma.usernameOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    return { success: true, data: rows.map(toOrderDto) };
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Get username order by id" })
  async getOrder(@Param("id") id: string) {
    const order = await this.prisma.usernameOrder.findUnique({ where: { id } });
    if (!order) throw new BadRequestException("ORDER_NOT_FOUND");
    return { success: true, data: toOrderDto(order) };
  }

  @Get("trades")
  @ApiOperation({ summary: "List username trades" })
  async listTrades(@Query("handle") handle?: string, @Query("limit") limit?: string) {
    const where: Prisma.UsernameTradeWhereInput = {};
    if (handle) {
      const normalized = normalizeUsername(cleanName(handle)).normalized;
      const validation = validateUsername(normalized);
      if (!validation.valid) return { success: true, data: [] };
      where.OR = [{ normalized }, { usernameNormalized: normalized }];
    }
    const take = Math.min(Math.max(Number(limit || 20), 1), MAX_LIMIT);
    const rows = await this.prisma.usernameTrade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    return { success: true, data: rows.map(toTradeDto) };
  }

  // Legacy ask endpoints (compat)
  @UseGuards(JwtGuard)
  @Post("asks")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async createAsk(@Body() body: any, @Request() req: any) {
    if (!body?.signature || !body?.typedData) {
      const user = await this.resolveUser(req);
      const makerAddress = user?.primaryWallet || "";
      const prepared = await this.market.prepareOrder({
        makerAddress,
        type: "ASK",
        name: cleanName(body?.username),
        priceWei: body?.price ?? "0",
        takerAddress: null,
      });
      return {
        success: false,
        error: "SIGNATURE_REQUIRED",
        data: prepared,
      };
    }
    const order = await this.market.createOrder({
      userId: req.user?.sub,
      name: cleanName(body?.username),
      typedData: body?.typedData,
      signature: body?.signature,
    });
    return { success: true, data: toOrderDto(order) };
  }

  @Get("asks")
  async getAsk(@Query("username") username?: string) {
    const normalized = normalizeUsername(cleanName(username)).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) return { data: null };
    const ask = await this.prisma.usernameOrder.findFirst({
      where: {
        status: UsernameOrderStatus.OPEN,
        type: UsernameOrderType.ASK,
        OR: [{ normalized }, { usernameNormalized: normalized }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (!ask) return { data: null };
    return { data: toOrderDto(ask) };
  }

  @Get("asks/open")
  async getOpenAsks(@Query("page") page?: string, @Query("limit") limit?: string) {
    const pageNumber = Math.max(Number(page || 1), 1);
    const take = Math.min(Math.max(Number(limit || 20), 1), MAX_LIMIT);
    const skip = (pageNumber - 1) * take;
    const asks = await this.prisma.usernameOrder.findMany({
      where: { status: UsernameOrderStatus.OPEN, type: UsernameOrderType.ASK },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
    const data = asks.map(toOrderDto);
    return { data, page: pageNumber, limit: take };
  }

  @UseGuards(JwtGuard)
  @Post("asks/:id/cancel")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async cancelAsk(@Param("id") id: string, @Body() body: { signature?: string }, @Request() req: any) {
    const order = await this.market.cancelOrder({ userId: req.user?.sub, orderId: id, signature: body?.signature || "" });
    return { success: true, data: toOrderDto(order) };
  }

  @UseGuards(JwtGuard)
  @Post("asks/:id/accept")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async acceptAsk(@Param("id") id: string, @Request() req: any) {
    const result = await this.market.acceptOrder({ userId: req.user?.sub, orderId: id });
    return { success: true, data: result };
  }
}
