import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProofKind, ProofStorageProvider } from "@prisma/client";
import { ProofsService } from "../../src/proofs/proofs.service";

describe("ProofsService", () => {
  const buildService = (overrides?: {
    prisma?: Partial<any>;
    hashService?: Partial<any>;
    storage?: Partial<any>;
    privacy?: Partial<any>;
    anchoring?: Partial<any>;
    queue?: Partial<any>;
    activity?: Partial<any>;
  }) => {
    const prisma = {
      proofArtifact: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      ...(overrides?.prisma || {}),
    };
    const hashService = {
      hashBuffer: jest.fn(),
      hashUrl: jest.fn(),
      ...(overrides?.hashService || {}),
    };
    const storage = {
      saveFile: jest.fn(),
      getDriver: jest.fn().mockReturnValue("LOCAL"),
      ...(overrides?.storage || {}),
    };
    const privacy = {
      resolvePolicy: jest.fn().mockResolvedValue({
        visibility: "PUBLIC",
        redaction: "NONE",
        unlistedPublicId: null,
      }),
      canView: jest.fn().mockReturnValue(true),
      decorateProof: jest.fn((dto: any, decision: any, viewerUserId: string | null, ownerUserId: string) => ({
        ...dto,
        ...(viewerUserId === ownerUserId
          ? {
              visibility: decision.visibility,
              redaction: decision.redaction,
              unlistedPublicId: decision.unlistedPublicId,
            }
          : {}),
      })),
      ...(overrides?.privacy || {}),
    };
    const anchoring = {
      isEnabled: jest.fn().mockReturnValue(true),
      getChainId: jest.fn().mockReturnValue(84532),
      getRegistryAddressSafe: jest.fn().mockReturnValue("0xanchor"),
      ...(overrides?.anchoring || {}),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue({ status: "queued" }),
      ...(overrides?.queue || {}),
    };
    const activity = {
      recordEvent: jest.fn().mockResolvedValue({ id: "evt-1" }),
      ...(overrides?.activity || {}),
    };

    const service = new ProofsService(
      prisma as any,
      hashService as any,
      storage as any,
      privacy as any,
      anchoring as any,
      queue as any,
      activity as any,
    );

    return { service, prisma, hashService, storage, privacy, anchoring, queue, activity };
  };

  it("creates a URL proof, records activity, and queues anchoring", async () => {
    const createdAt = new Date("2026-04-07T12:00:00.000Z");
    const proofRecord = {
      id: "proof-1",
      userId: "ach-1",
      achievementId: null,
      badgeTokenId: null,
      kind: ProofKind.URL,
      title: null,
      description: null,
      sourceUrl: "https://example.com/proof",
      mimeType: null,
      sizeBytes: 25,
      storageProvider: ProofStorageProvider.NONE,
      storageKey: null,
      sha256: "0xproofhash",
      contentHash: "0xproofhash",
      chainId: 84532,
      anchorTxHash: null,
      anchorContract: "0xanchor",
      anchoredAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const { service, prisma, hashService, queue, activity } = buildService({
      hashService: {
        hashUrl: jest.fn().mockReturnValue({
          canonical: "https://example.com/proof",
          sha256: "0xproofhash",
        }),
      },
      prisma: {
        proofArtifact: {
          create: jest.fn().mockResolvedValue(proofRecord),
          findFirst: jest.fn().mockResolvedValue(proofRecord),
        },
      },
    });

    const result = await service.createUrlProof("ach-1", " example.com/proof ", { anchor: true });

    expect(hashService.hashUrl).toHaveBeenCalledWith(" example.com/proof ");
    expect(prisma.proofArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "ach-1",
          kind: ProofKind.URL,
          sourceUrl: "https://example.com/proof",
          sha256: "0xproofhash",
          contentHash: "0xproofhash",
          chainId: 84532,
          anchorContract: "0xanchor",
        }),
      }),
    );
    expect(queue.enqueue).toHaveBeenCalledWith({
      kind: 1,
      hash: "0xproofhash",
      entityType: "PROOF",
      entityId: "proof-1",
    });
    expect(activity.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "ach-1",
        type: "PROOF_ADDED",
        refId: "proof-1",
      }),
    );
    expect(result.id).toBe("proof-1");
    expect(result.sourceUrl).toBe("https://example.com/proof");
    expect(result.visibility).toBe("PUBLIC");
  });

  it("denies file access when proof metadata is redacted for a non-owner viewer", async () => {
    const createdAt = new Date("2026-04-07T12:00:00.000Z");
    const { service } = buildService({
      prisma: {
        proofArtifact: {
          findFirst: jest.fn().mockResolvedValue({
            id: "proof-file",
            userId: "ach-1",
            achievementId: null,
            badgeTokenId: null,
            kind: ProofKind.FILE,
            title: "Evidence",
            description: null,
            sourceUrl: null,
            mimeType: "application/pdf",
            sizeBytes: 123,
            storageProvider: ProofStorageProvider.LOCAL,
            storageKey: "20260407/file.pdf",
            sha256: "0xproofhash",
            contentHash: "0xproofhash",
            chainId: null,
            anchorTxHash: null,
            anchorContract: null,
            anchoredAt: null,
            createdAt,
            updatedAt: createdAt,
          }),
        },
      },
      privacy: {
        resolvePolicy: jest.fn().mockResolvedValue({
          visibility: "PUBLIC",
          redaction: "METADATA_ONLY",
          unlistedPublicId: null,
        }),
        canView: jest.fn().mockReturnValue(true),
        decorateProof: jest.fn(),
      },
    });

    await expect(service.getProofForFile("proof-file", null, "viewer-1")).rejects.toThrow(NotFoundException);
  });

  it("filters proof listings by privacy visibility", async () => {
    const createdAt = new Date("2026-04-07T12:00:00.000Z");
    const records = [
      {
        id: "proof-public",
        userId: "ach-1",
        achievementId: null,
        badgeTokenId: null,
        kind: ProofKind.URL,
        title: "Public proof",
        description: null,
        sourceUrl: "https://example.com/public",
        mimeType: null,
        sizeBytes: 20,
        storageProvider: ProofStorageProvider.NONE,
        storageKey: null,
        sha256: "0xpublic",
        contentHash: "0xpublic",
        chainId: null,
        anchorTxHash: null,
        anchorContract: null,
        anchoredAt: null,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "proof-private",
        userId: "ach-1",
        achievementId: null,
        badgeTokenId: null,
        kind: ProofKind.URL,
        title: "Private proof",
        description: null,
        sourceUrl: "https://example.com/private",
        mimeType: null,
        sizeBytes: 20,
        storageProvider: ProofStorageProvider.NONE,
        storageKey: null,
        sha256: "0xprivate",
        contentHash: "0xprivate",
        chainId: null,
        anchorTxHash: null,
        anchorContract: null,
        anchoredAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ];
    const { service, privacy } = buildService({
      prisma: {
        proofArtifact: {
          findMany: jest.fn().mockResolvedValue(records),
        },
      },
      privacy: {
        resolvePolicy: jest.fn().mockImplementation((_owner: string, _type: string, id: string) =>
          Promise.resolve({
            visibility: id === "proof-public" ? "PUBLIC" : "PRIVATE",
            redaction: "NONE",
            unlistedPublicId: null,
          }),
        ),
        canView: jest.fn().mockImplementation((_viewer: string | null, _owner: string, decision: any) => {
          return decision.visibility === "PUBLIC";
        }),
        decorateProof: jest.fn((dto: any) => dto),
      },
    });

    const result = await service.listProofs("ach-1", null, { limit: "2" });

    expect(privacy.canView).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("proof-public");
    expect(result.nextCursor).toBe("proof-private");
  });

  it("updates a proof for explicit anchoring and queues the proof hash", async () => {
    const createdAt = new Date("2026-04-07T12:00:00.000Z");
    const existing = {
      id: "proof-1",
      userId: "ach-1",
      achievementId: null,
      badgeTokenId: null,
      kind: ProofKind.URL,
      title: null,
      description: null,
      sourceUrl: "https://example.com/proof",
      mimeType: null,
      sizeBytes: 25,
      storageProvider: ProofStorageProvider.NONE,
      storageKey: null,
      sha256: "0xproofhash",
      contentHash: "0xproofhash",
      chainId: null,
      anchorTxHash: null,
      anchorContract: null,
      anchoredAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const updated = {
      ...existing,
      chainId: 84532,
      anchorContract: "0xanchor",
    };
    const { service, prisma, queue } = buildService({
      prisma: {
        proofArtifact: {
          findFirst: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
          update: jest.fn().mockResolvedValue(updated),
        },
      },
    });

    const result = await service.anchorProof("proof-1", "ach-1");

    expect(prisma.proofArtifact.update).toHaveBeenCalledWith({
      where: { id: "proof-1" },
      data: {
        chainId: 84532,
        anchorContract: "0xanchor",
      },
    });
    expect(queue.enqueue).toHaveBeenCalledWith({
      kind: 1,
      hash: "0xproofhash",
      entityType: "PROOF",
      entityId: "proof-1",
    });
    expect(result.id).toBe("proof-1");
    expect(result.anchorContract).toBe("0xanchor");
  });

  it("rejects explicit anchoring when anchoring is disabled", async () => {
    const createdAt = new Date("2026-04-07T12:00:00.000Z");
    const { service } = buildService({
      prisma: {
        proofArtifact: {
          findFirst: jest.fn().mockResolvedValue({
            id: "proof-1",
            userId: "ach-1",
            achievementId: null,
            badgeTokenId: null,
            kind: ProofKind.URL,
            title: null,
            description: null,
            sourceUrl: "https://example.com/proof",
            mimeType: null,
            sizeBytes: 25,
            storageProvider: ProofStorageProvider.NONE,
            storageKey: null,
            sha256: "0xproofhash",
            contentHash: "0xproofhash",
            chainId: null,
            anchorTxHash: null,
            anchorContract: null,
            anchoredAt: null,
            createdAt,
            updatedAt: createdAt,
          }),
        },
      },
      anchoring: {
        isEnabled: jest.fn().mockReturnValue(false),
      },
    });

    await expect(service.anchorProof("proof-1", "ach-1")).rejects.toThrow(BadRequestException);
  });
});
