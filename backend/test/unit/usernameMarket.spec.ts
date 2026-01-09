import { privateKeyToAccount } from "viem/accounts";
import { UsernameOrderStatus, UsernameOrderType, ChainActionType, SettlementStatus } from "@prisma/client";
import { UsernamesMarketService } from "../../src/usernames/usernames-market.service";
import { UsernameEip712Service } from "../../src/usernames/username-eip712.service";
import { normalizeUsername } from "../../../packages/username";

describe("UsernamesMarketService", () => {
  const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f094538e2d7a1d8b6ab5f2f1f8b7a3b5f4c1d5b6");
  const other = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  const normalized = normalizeUsername("alice");
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);

  function signOrder(
    makerAccount: ReturnType<typeof privateKeyToAccount>,
    typedData: any,
    overrides?: Partial<{ priceWei: bigint; nonce: bigint; salt: bigint; expiresAt: bigint }>,
  ) {
    return makerAccount.signTypedData({
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: "Order",
      message: {
        ...typedData.message,
        priceWei: overrides?.priceWei ?? 1000n,
        nonce: overrides?.nonce ?? 1n,
        salt: overrides?.salt ?? 2n,
        expiresAt: overrides?.expiresAt ?? expiresAt,
      },
    } as any);
  }

  function signCancel(
    makerAccount: ReturnType<typeof privateKeyToAccount>,
    typedData: any,
    overrides?: Partial<{ nonce: bigint }>,
  ) {
    return makerAccount.signTypedData({
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: "Cancel",
      message: {
        ...typedData.message,
        nonce: overrides?.nonce ?? 1n,
      },
    } as any);
  }

  function buildService() {
    const prisma = {
      user: { findUnique: jest.fn() },
      usernameOrder: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      usernameTrade: {
        create: jest.fn(),
        update: jest.fn(),
      },
      operationalAlert: { create: jest.fn() },
    } as any;

    const chain = {
      getChainId: jest.fn().mockReturnValue(84532),
      getRegistryAddress: jest.fn().mockReturnValue("0x0000000000000000000000000000000000000abc"),
      getOwnerByHandleHash: jest.fn(),
      getSettlementMode: jest.fn().mockReturnValue("OPERATOR"),
      transferUsername: jest.fn(),
    } as any;

    const eip712 = new UsernameEip712Service(chain);
    const actions = { recordPending: jest.fn() } as any;
    const risk = { recompute: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new UsernamesMarketService(prisma, chain, eip712, actions, risk);
    return { prisma, chain, eip712, actions, service };
  }

  function buildSignedOrder(eip712: UsernameEip712Service, maker: string) {
    const typedData = eip712.buildOrderTypedData({
      orderType: 1,
      maker,
      taker: null,
      handleHash: normalized.handleHash,
      priceWei: 1000n,
      currencyHash: eip712.getCurrencyHash(),
      nonce: 1n,
      salt: 2n,
      expiresAt,
    });
    return { typedData };
  }

  it("creates and cancels a signed order", async () => {
    const { prisma, chain, eip712, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      userId: "ACHUSR-0000000001",
      primaryWallet: account.address,
    });
    prisma.usernameOrder.count.mockResolvedValue(0);
    prisma.usernameOrder.findFirst.mockResolvedValue(null);
    chain.getOwnerByHandleHash.mockResolvedValue(account.address.toLowerCase());

    const { typedData } = buildSignedOrder(eip712, account.address);
    const signature = await signOrder(account, typedData);

    prisma.usernameOrder.create.mockImplementation(async ({ data }: any) => ({
      id: "order-1",
      ...data,
    }));

    const order = await service.createOrder({
      userId: "user-1",
      name: "alice",
      typedData,
      signature,
    });
    expect(order.status).toBe(UsernameOrderStatus.OPEN);

    prisma.usernameOrder.findUnique.mockResolvedValue(order);
    prisma.usernameOrder.update.mockImplementation(async ({ data }: any) => ({
      ...order,
      ...data,
    }));

    const orderHash = order.orderHash || eip712.hashTypedData(order.typedData).toLowerCase();
    const cancelTyped = eip712.buildCancelTypedData({
      orderHash,
      maker: account.address,
      nonce: 1n,
    });
    const cancelSig = await signCancel(account, cancelTyped, { nonce: 1n });

    const canceled = await service.cancelOrder({ userId: "user-1", orderId: order.id, signature: cancelSig });
    expect(canceled.status).toBe(UsernameOrderStatus.CANCELED);
  });

  it("rejects tampered typed data", async () => {
    const { prisma, chain, eip712, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      userId: "ACHUSR-0000000004",
      primaryWallet: account.address,
    });
    prisma.usernameOrder.count.mockResolvedValue(0);
    prisma.usernameOrder.findFirst.mockResolvedValue(null);
    chain.getOwnerByHandleHash.mockResolvedValue(account.address.toLowerCase());

    const otherName = normalizeUsername("bob");
    const typedData = eip712.buildOrderTypedData({
      orderType: 1,
      maker: account.address,
      taker: null,
      handleHash: otherName.handleHash,
      priceWei: 1000n,
      currencyHash: eip712.getCurrencyHash(),
      nonce: 3n,
      salt: 4n,
      expiresAt,
    });
    const signature = await signOrder(account, typedData, { nonce: 3n, salt: 4n });

    await expect(
      service.createOrder({
        userId: "user-2",
        name: "alice",
        typedData,
        signature,
      }),
    ).rejects.toThrow("HANDLE_HASH_MISMATCH");
  });

  it("rejects duplicate order hash", async () => {
    const { prisma, chain, eip712, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-dup",
      userId: "ACHUSR-0000000010",
      primaryWallet: account.address,
    });
    prisma.usernameOrder.count.mockResolvedValue(0);
    prisma.usernameOrder.findFirst.mockResolvedValue(null);
    chain.getOwnerByHandleHash.mockResolvedValue(account.address.toLowerCase());

    const { typedData } = buildSignedOrder(eip712, account.address);
    const signature = await signOrder(account, typedData);

    prisma.usernameOrder.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["orderHash"] },
    });

    await expect(
      service.createOrder({
        userId: "user-dup",
        name: "alice",
        typedData,
        signature,
      }),
    ).rejects.toThrow("ORDER_ALREADY_EXISTS");
  });

  it("rejects accept when seller is not owner", async () => {
    const { prisma, chain, eip712, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "buyer-1",
      userId: "ACHUSR-0000000002",
      primaryWallet: other.address,
    });

    const { typedData } = buildSignedOrder(eip712, account.address);
    const signature = await signOrder(account, typedData);

    const order = {
      id: "order-2",
      normalized: normalized.normalized,
      handleHash: normalized.handleHash,
      type: UsernameOrderType.ASK,
      status: UsernameOrderStatus.OPEN,
      makerAddress: account.address,
      takerAddress: null,
      priceWei: "1000",
      price: 1000n,
      currency: "ETH",
      nonce: "1",
      salt: "2",
      orderHash: eip712.hashTypedData(typedData).toLowerCase(),
      typedData,
      signature,
      makerAchusrId: "ACHUSR-0000000001",
      makerUserId: "user-1",
    };

    prisma.usernameOrder.findUnique.mockResolvedValue(order);
    prisma.usernameOrder.updateMany.mockResolvedValue({ count: 1 });
    prisma.usernameOrder.update.mockResolvedValue({ ...order, status: UsernameOrderStatus.OPEN });
    chain.getOwnerByHandleHash.mockResolvedValue(other.address.toLowerCase());

    await expect(service.acceptOrder({ userId: "buyer-1", orderId: order.id })).rejects.toThrow("SELLER_NOT_OWNER");
    expect(prisma.usernameOrder.update).toHaveBeenCalled();
  });

  it("accepts order and records chain action", async () => {
    const { prisma, chain, eip712, actions, service } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "buyer-2",
      userId: "ACHUSR-0000000003",
      primaryWallet: other.address,
    });

    const { typedData } = buildSignedOrder(eip712, account.address);
    const signature = await signOrder(account, typedData);

    const order = {
      id: "order-3",
      normalized: normalized.normalized,
      handleHash: normalized.handleHash,
      type: UsernameOrderType.ASK,
      status: UsernameOrderStatus.OPEN,
      makerAddress: account.address,
      takerAddress: null,
      priceWei: "1000",
      price: 1000n,
      currency: "ETH",
      nonce: "1",
      salt: "2",
      orderHash: eip712.hashTypedData(typedData).toLowerCase(),
      typedData,
      signature,
      makerAchusrId: "ACHUSR-0000000001",
      makerUserId: "user-1",
    };

    prisma.usernameOrder.findUnique.mockResolvedValue(order);
    prisma.usernameOrder.updateMany.mockResolvedValue({ count: 1 });
    chain.getOwnerByHandleHash.mockResolvedValue(account.address.toLowerCase());
    chain.transferUsername.mockResolvedValue("0xabc");

    prisma.usernameTrade.create.mockResolvedValue({
      id: "trade-1",
      normalized: normalized.normalized,
      handleHash: normalized.handleHash,
      status: SettlementStatus.PENDING,
      sellerAddress: account.address.toLowerCase(),
      buyerAddress: other.address.toLowerCase(),
      priceWei: "1000",
      currency: "ETH",
      chainId: 84532,
      askOrderId: order.id,
    });
    prisma.usernameTrade.update.mockResolvedValue({});

    const result = await service.acceptOrder({ userId: "buyer-2", orderId: order.id });
    expect(result.txHash).toBe("0xabc");
    expect(actions.recordPending).toHaveBeenCalledWith(
      ChainActionType.USERNAME_TRANSFER,
      84532,
      "0xabc",
      account.address.toLowerCase(),
      other.address.toLowerCase(),
      expect.any(Object),
    );
  });
});
