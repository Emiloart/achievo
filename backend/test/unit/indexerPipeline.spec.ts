import { IndexerService } from "../../src/indexer/indexer.service";
import { LegacyBadgeProjector } from "../../src/indexer/projectors/badge.projector";
import { ReorgManager } from "../../src/indexer/reorg.manager";

const ZERO = "0x0000000000000000000000000000000000000000";

const badgeAddress = "0x0000000000000000000000000000000000000bad";

function makePrisma() {
  const chainLogs = new Map<string, any>();
  const decodedEvents = new Map<string, any>();
  const chainCursors = new Map<number, any>();
  const projectionCursors = new Map<string, any>();
  const legacyOwnerBadgeTokens = new Map<string, any>();
  const legacyBadgeOwnership = new Map<string, any>();

  const logKey = (chainId: number, txHash: string, logIndex: number) => `${chainId}:${txHash}:${logIndex}`;
  const eventKey = (eventId: string) => eventId;
  const cursorKey = (chainId: number, projectorKey: string) => `${chainId}:${projectorKey}`;
  const badgeTokenKey = (chainId: number, contractAddress: string, ownerAddress: string, tokenId: string) =>
    `${chainId}:${contractAddress}:${ownerAddress}:${tokenId}`;
  const badgeOwnershipKey = (chainId: number, contractAddress: string, tokenId: string) =>
    `${chainId}:${contractAddress}:${tokenId}`;

  return {
    chainCursor: {
      findUnique: jest.fn(({ where: { chainId } }) => Promise.resolve(chainCursors.get(chainId) || null)),
      create: jest.fn(({ data }: any) => {
        chainCursors.set(data.chainId, { ...data });
        return Promise.resolve(chainCursors.get(data.chainId));
      }),
      update: jest.fn(({ where: { chainId }, data }: any) => {
        const current = chainCursors.get(chainId) || { chainId };
        chainCursors.set(chainId, { ...current, ...data });
        return Promise.resolve(chainCursors.get(chainId));
      }),
    },
    chainLog: {
      upsert: jest.fn(({ where: { chainId_txHash_logIndex }, create, update }: any) => {
        const key = logKey(chainId_txHash_logIndex.chainId, chainId_txHash_logIndex.txHash, chainId_txHash_logIndex.logIndex);
        const existing = chainLogs.get(key);
        chainLogs.set(key, { ...(existing || {}), ...(existing ? update : create) });
        return Promise.resolve(chainLogs.get(key));
      }),
      updateMany: jest.fn(({ where: { chainId, blockNumber }, data }: any) => {
        for (const [key, value] of chainLogs.entries()) {
          if (value.chainId === chainId && value.blockNumber >= blockNumber.gte) {
            chainLogs.set(key, { ...value, ...data });
          }
        }
        return Promise.resolve();
      }),
    },
    decodedEvent: {
      upsert: jest.fn(({ where: { eventId }, create, update }: any) => {
        const key = eventKey(eventId);
        const existing = decodedEvents.get(key);
        decodedEvents.set(key, { ...(existing || {}), ...(existing ? update : create) });
        return Promise.resolve(decodedEvents.get(key));
      }),
      updateMany: jest.fn(({ where: { chainId, blockNumber }, data }: any) => {
        for (const [key, value] of decodedEvents.entries()) {
          if (value.chainId === chainId && value.blockNumber >= blockNumber.gte) {
            decodedEvents.set(key, { ...value, ...data });
          }
        }
        return Promise.resolve();
      }),
      findMany: jest.fn(({ where, orderBy }: any) => {
        let results = Array.from(decodedEvents.values());
        if (where?.chainId !== undefined) results = results.filter((item) => item.chainId === where.chainId);
        if (where?.contractKey) results = results.filter((item) => item.contractKey === where.contractKey);
        if (where?.removed !== undefined) results = results.filter((item) => item.removed === where.removed);
        if (where?.blockNumber?.gte !== undefined) {
          results = results.filter((item) => item.blockNumber >= where.blockNumber.gte);
        }
        if (where?.blockNumber?.lte !== undefined) {
          results = results.filter((item) => item.blockNumber <= where.blockNumber.lte);
        }
        if (orderBy) {
          results.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.logIndex - b.logIndex));
        }
        return Promise.resolve(results);
      }),
    },
    projectionCursor: {
      findUnique: jest.fn(({ where: { chainId_projectorKey } }: any) =>
        Promise.resolve(projectionCursors.get(cursorKey(chainId_projectorKey.chainId, chainId_projectorKey.projectorKey)) || null),
      ),
      create: jest.fn(({ data }: any) => {
        projectionCursors.set(cursorKey(data.chainId, data.projectorKey), { ...data });
        return Promise.resolve(projectionCursors.get(cursorKey(data.chainId, data.projectorKey)));
      }),
      update: jest.fn(({ where: { chainId_projectorKey }, data }: any) => {
        const key = cursorKey(chainId_projectorKey.chainId, chainId_projectorKey.projectorKey);
        const current = projectionCursors.get(key) || { chainId: chainId_projectorKey.chainId };
        projectionCursors.set(key, { ...current, ...data });
        return Promise.resolve(projectionCursors.get(key));
      }),
      deleteMany: jest.fn(({ where: { chainId } }: any) => {
        for (const key of projectionCursors.keys()) {
          if (key.startsWith(`${chainId}:`)) projectionCursors.delete(key);
        }
        return Promise.resolve();
      }),
    },
    legacyBadgeOwnership: {
      upsert: jest.fn(({ where: { chainId_contractAddress_tokenId }, create, update }: any) => {
        const key = badgeOwnershipKey(
          chainId_contractAddress_tokenId.chainId,
          chainId_contractAddress_tokenId.contractAddress,
          chainId_contractAddress_tokenId.tokenId,
        );
        const existing = legacyBadgeOwnership.get(key);
        legacyBadgeOwnership.set(key, { ...(existing || {}), ...(existing ? update : create) });
        return Promise.resolve(legacyBadgeOwnership.get(key));
      }),
      updateMany: jest.fn(({ where: { chainId, contractAddress, tokenId }, data }: any) => {
        const key = badgeOwnershipKey(chainId, contractAddress, tokenId);
        const existing = legacyBadgeOwnership.get(key);
        if (existing) legacyBadgeOwnership.set(key, { ...existing, ...data });
        return Promise.resolve();
      }),
      deleteMany: jest.fn(({ where: { chainId } }: any) => {
        for (const key of legacyBadgeOwnership.keys()) {
          if (key.startsWith(`${chainId}:`)) legacyBadgeOwnership.delete(key);
        }
        return Promise.resolve();
      }),
    },
    legacyOwnerBadgeToken: {
      upsert: jest.fn(({ where: { chainId_contractAddress_ownerAddress_tokenId }, create, update }: any) => {
        const key = badgeTokenKey(
          chainId_contractAddress_ownerAddress_tokenId.chainId,
          chainId_contractAddress_ownerAddress_tokenId.contractAddress,
          chainId_contractAddress_ownerAddress_tokenId.ownerAddress,
          chainId_contractAddress_ownerAddress_tokenId.tokenId,
        );
        const existing = legacyOwnerBadgeTokens.get(key);
        legacyOwnerBadgeTokens.set(key, { ...(existing || {}), ...(existing ? update : create) });
        return Promise.resolve(legacyOwnerBadgeTokens.get(key));
      }),
      deleteMany: jest.fn(({ where }: any) => {
        for (const [key, value] of legacyOwnerBadgeTokens.entries()) {
          if (where?.chainId !== undefined && value.chainId !== where.chainId) continue;
          if (where?.contractAddress && value.contractAddress !== where.contractAddress) continue;
          if (where?.ownerAddress && value.ownerAddress !== where.ownerAddress) continue;
          if (where?.tokenId && value.tokenId !== where.tokenId) continue;
          legacyOwnerBadgeTokens.delete(key);
        }
        return Promise.resolve();
      }),
    },
    legacyGoalEvidence: { deleteMany: jest.fn() },
    legacyGoalApproval: { deleteMany: jest.fn() },
    legacyGoal: { deleteMany: jest.fn() },
    usernameOwnership: { deleteMany: jest.fn() },
    _state: {
      chainLogs,
      decodedEvents,
      legacyOwnerBadgeTokens,
    },
  };
}

describe("IndexerService pipeline", () => {
  it("handles deep reorgs and rebuilds projections deterministically", async () => {
    const prisma = makePrisma();
    const decoderMap = new Map<string, any>();
    const decoder = {
      decode: jest.fn(({ data }: any) => decoderMap.get(data) || null),
    };

    let blockHash = "0xaaa";
    let dataHex = "0xdata1";
    const fetcher = {
      fetchLogs: jest.fn(async ({ fromBlock, toBlock }: any) => {
        if (fromBlock <= 2 && toBlock >= 2) {
          return [
            {
              blockNumber: 2n,
              blockHash,
              transactionHash: blockHash === "0xaaa" ? "0xaaa1" : "0xbbb1",
              logIndex: 0n,
              address: badgeAddress,
              data: dataHex,
              topics: ["0xtopic"],
            },
          ];
        }
        return [];
      }),
    };

    const client = {
      getBlockNumber: jest.fn().mockResolvedValue(2),
      getBlock: jest.fn(async () => ({ hash: blockHash })),
    };

    const service = new IndexerService(prisma as any);
    (service as any).config = { enabled: true, chainId: 84532, rpcUrl: "http://rpc", finalityDepth: 0, startBlock: 1, batchSize: 1000 };
    (service as any).client = client;
    (service as any).fetcher = fetcher;
    (service as any).decoder = decoder;
    (service as any).contracts = [{ key: "badge_v1", address: badgeAddress, abi: [] }];
    (service as any).reorgManager = new ReorgManager(prisma as any, client as any);
    (service as any).badgeProjector = new LegacyBadgeProjector(prisma as any);
    (service as any).goalProjector = { process: jest.fn() };

    decoderMap.set("0xdata1", {
      contractKey: "badge_v1",
      eventName: "Transfer",
      args: { from: ZERO, to: "0x111", tokenId: "1" },
    });

    await service.sync();

    const firstOwner = Array.from(prisma._state.legacyOwnerBadgeTokens.values())[0];
    expect(firstOwner.ownerAddress).toBe("0x111");

    // Simulate reorg with new block hash and new transfer.
    blockHash = "0xbbb";
    dataHex = "0xdata2";
    decoderMap.set("0xdata2", {
      contractKey: "badge_v1",
      eventName: "Transfer",
      args: { from: ZERO, to: "0x222", tokenId: "1" },
    });

    await service.sync();

    const logs = Array.from(prisma._state.chainLogs.values());
    const removedLogs = logs.filter((log) => log.removed);
    expect(removedLogs.length).toBeGreaterThan(0);

    const tokens = Array.from(prisma._state.legacyOwnerBadgeTokens.values());
    expect(tokens.length).toBe(1);
    expect(tokens[0].ownerAddress).toBe("0x222");
  });

  it("is idempotent on repeated ingestion", async () => {
    const prisma = makePrisma();
    const decoder = {
      decode: jest.fn(({ data }: any) => {
        if (data !== "0xdata1") return null;
        return {
          contractKey: "badge_v1",
          eventName: "Transfer",
          args: { from: ZERO, to: "0x333", tokenId: "7" },
        };
      }),
    };

    const fetcher = {
      fetchLogs: jest.fn(async ({ fromBlock, toBlock }: any) => {
        if (fromBlock <= 2 && toBlock >= 2) {
          return [
            {
              blockNumber: 2n,
              blockHash: "0xccc",
              transactionHash: "0xccc1",
              logIndex: 0n,
              address: badgeAddress,
              data: "0xdata1",
              topics: ["0xtopic"],
            },
          ];
        }
        return [];
      }),
    };

    const client = {
      getBlockNumber: jest.fn().mockResolvedValue(2),
      getBlock: jest.fn(async () => ({ hash: "0xccc" })),
    };

    const service = new IndexerService(prisma as any);
    (service as any).config = { enabled: true, chainId: 84532, rpcUrl: "http://rpc", finalityDepth: 0, startBlock: 1, batchSize: 1000 };
    (service as any).client = client;
    (service as any).fetcher = fetcher;
    (service as any).decoder = decoder;
    (service as any).contracts = [{ key: "badge_v1", address: badgeAddress, abi: [] }];
    (service as any).reorgManager = new ReorgManager(prisma as any, client as any);
    (service as any).badgeProjector = new LegacyBadgeProjector(prisma as any);
    (service as any).goalProjector = { process: jest.fn() };

    await service.sync();
    const firstLogCount = prisma._state.chainLogs.size;
    const firstEventCount = prisma._state.decodedEvents.size;
    const firstTokenCount = prisma._state.legacyOwnerBadgeTokens.size;

    await service.sync();
    const secondLogCount = prisma._state.chainLogs.size;
    const secondEventCount = prisma._state.decodedEvents.size;
    const secondTokenCount = prisma._state.legacyOwnerBadgeTokens.size;

    expect(secondLogCount).toBe(firstLogCount);
    expect(secondEventCount).toBe(firstEventCount);
    expect(secondTokenCount).toBe(firstTokenCount);
  });
});
