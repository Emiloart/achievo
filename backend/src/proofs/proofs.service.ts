import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ProofKind, ProofStorageProvider, type ProofArtifact } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProofHashService } from "./proofHash.service";
import { StorageService } from "./storage.service";
import { PrivacyPolicyService } from "../privacy/privacy.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { AnchoringQueueService } from "../anchoring/anchoring.queue.service";
import { AnchorKinds } from "../anchoring/anchoring.constants";
import { ActivityEventService } from "../consistency/activityEvent.service";
import { ActivityEventType } from "../consistency/activityEvent.types";

type ProofMeta = {
  title?: unknown;
  description?: unknown;
  achievementId?: unknown;
  badgeTokenId?: unknown;
  autoAnchor?: unknown;
  anchor?: unknown;
};

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeOptionalId(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeKind(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return undefined;
  if (normalized === ProofKind.FILE || normalized === ProofKind.URL || normalized === ProofKind.TEXT) {
    return normalized as ProofKind;
  }
  throw new BadRequestException("INVALID_PROOF_KIND");
}

@Injectable()
export class ProofsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: ProofHashService,
    private readonly storage: StorageService,
    private readonly privacy: PrivacyPolicyService,
    private readonly anchoring: AnchoringService,
    private readonly queue: AnchoringQueueService,
    private readonly activity: ActivityEventService,
  ) {}

  private maxProofBytes() {
    const maxMb = Number(process.env.PROOF_MAX_SIZE_MB || 10);
    const safeMb = Number.isFinite(maxMb) && maxMb > 0 ? maxMb : 10;
    return Math.floor(safeMb * 1024 * 1024);
  }

  private shouldAutoAnchor(meta: ProofMeta) {
    return toBoolean(meta.anchor) || toBoolean(meta.autoAnchor) || toBoolean(process.env.AUTO_ANCHOR_PROOFS);
  }

  private resolveAnchorIntent(meta: ProofMeta) {
    const requested = this.shouldAutoAnchor(meta);
    if (!requested || !this.anchoring.isEnabled()) {
      return {
        requested,
        chainId: null as number | null,
        contract: null as string | null,
      };
    }
    return {
      requested,
      chainId: this.anchoring.getChainId(),
      contract: this.anchoring.getRegistryAddressSafe(),
    };
  }

  private buildFileUrl(id: string, token?: string | null) {
    const search = token ? `?token=${encodeURIComponent(token)}` : "";
    return `/api/proofs/${id}/file${search}`;
  }

  private toProofDto(proof: ProofArtifact, token?: string | null) {
    return {
      id: proof.id,
      userId: proof.userId,
      achievementId: proof.achievementId,
      badgeTokenId: proof.badgeTokenId,
      kind: proof.kind,
      title: proof.title,
      description: proof.description,
      sourceUrl: proof.sourceUrl,
      mimeType: proof.mimeType,
      sizeBytes: proof.sizeBytes,
      storageProvider: proof.storageProvider,
      storageKey: proof.storageKey,
      sha256: proof.sha256,
      contentHash: proof.contentHash,
      chainId: proof.chainId,
      anchorTxHash: proof.anchorTxHash,
      anchorContract: proof.anchorContract,
      anchoredAt: toIso(proof.anchoredAt),
      createdAt: toIso(proof.createdAt),
      fileUrl: proof.kind === ProofKind.FILE && proof.storageKey ? this.buildFileUrl(proof.id, token || null) : null,
    };
  }

  private async decorateProof(
    proof: ProofArtifact,
    ownerUserId: string,
    viewerUserId: string | null,
    token?: string | null,
  ) {
    const decision = await this.privacy.resolvePolicy(ownerUserId, "PROOF", proof.id);
    const canView = this.privacy.canView(viewerUserId, ownerUserId, decision, token || null);
    if (!canView) return null;
    return this.privacy.decorateProof(this.toProofDto(proof, token), decision, viewerUserId, ownerUserId);
  }

  private async queueAnchor(proof: ProofArtifact) {
    if (!proof.anchorContract || !this.anchoring.isEnabled()) return;
    void this.queue
      .enqueue({
        kind: AnchorKinds.PROOF,
        hash: proof.sha256,
        entityType: "PROOF",
        entityId: proof.id,
      })
      .catch(() => {});
  }

  private async recordProofAdded(proof: ProofArtifact) {
    void this.activity
      .recordEvent({
        userId: proof.userId,
        type: ActivityEventType.PROOF_ADDED,
        refId: proof.id,
        occurredAt: proof.createdAt,
      })
      .catch(() => {});
  }

  async getProofForViewer(
    id: string,
    ownerUserId: string,
    viewerUserId: string | null,
    token?: string | null,
  ): Promise<any> {
    const proof = await this.prisma.proofArtifact.findFirst({
      where: { id, userId: ownerUserId },
    });
    if (!proof) return null;
    return this.decorateProof(proof, ownerUserId, viewerUserId, token || null);
  }

  async createFileProof(
    achusrId: string,
    file: { buffer?: Buffer; size?: number; mimetype?: string; originalname?: string },
    meta: ProofMeta,
  ): Promise<any> {
    if (!file?.buffer?.length) throw new BadRequestException("FILE_REQUIRED");
    if ((file.size ?? file.buffer.length) > this.maxProofBytes()) {
      throw new BadRequestException("FILE_TOO_LARGE");
    }

    const { sha256 } = this.hashService.hashBuffer(file.buffer);
    const stored = await this.storage.saveFile({
      buffer: file.buffer,
      size: file.size ?? file.buffer.length,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    const anchor = this.resolveAnchorIntent(meta);

    const proof = await this.prisma.proofArtifact.create({
      data: {
        userId: achusrId,
        achievementId: normalizeOptionalId(meta.achievementId),
        badgeTokenId: normalizeOptionalId(meta.badgeTokenId),
        kind: ProofKind.FILE,
        title: normalizeOptionalString(meta.title),
        description: normalizeOptionalString(meta.description),
        sourceUrl: null,
        mimeType: stored.mimeType || file.mimetype || "application/octet-stream",
        sizeBytes: stored.sizeBytes ?? file.size ?? file.buffer.length,
        storageProvider: (this.storage.getDriver() || ProofStorageProvider.LOCAL) as ProofStorageProvider,
        storageKey: stored.storageKey,
        sha256,
        contentHash: sha256,
        chainId: anchor.contract ? anchor.chainId : null,
        anchorTxHash: null,
        anchorContract: anchor.contract,
        anchoredAt: null,
      },
    });

    await this.recordProofAdded(proof);
    await this.queueAnchor(proof);
    return this.getProofForOwner(proof.id, achusrId);
  }

  async createUrlProof(achusrId: string, sourceUrl: string, meta: ProofMeta): Promise<any> {
    const { canonical, sha256 } = this.hashService.hashUrl(sourceUrl);
    const anchor = this.resolveAnchorIntent(meta);

    const proof = await this.prisma.proofArtifact.create({
      data: {
        userId: achusrId,
        achievementId: normalizeOptionalId(meta.achievementId),
        badgeTokenId: normalizeOptionalId(meta.badgeTokenId),
        kind: ProofKind.URL,
        title: normalizeOptionalString(meta.title),
        description: normalizeOptionalString(meta.description),
        sourceUrl: canonical,
        mimeType: null,
        sizeBytes: Buffer.byteLength(canonical, "utf8"),
        storageProvider: ProofStorageProvider.NONE,
        storageKey: null,
        sha256,
        contentHash: sha256,
        chainId: anchor.contract ? anchor.chainId : null,
        anchorTxHash: null,
        anchorContract: anchor.contract,
        anchoredAt: null,
      },
    });

    await this.recordProofAdded(proof);
    await this.queueAnchor(proof);
    return this.getProofForOwner(proof.id, achusrId);
  }

  async getProofForOwner(id: string, achusrId: string): Promise<any> {
    const proof = await this.prisma.proofArtifact.findFirst({
      where: { id, userId: achusrId },
    });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");

    const data = await this.decorateProof(proof, achusrId, achusrId);
    if (!data) throw new NotFoundException("PROOF_NOT_FOUND");
    return data;
  }

  async getProofForFile(
    id: string,
    ownerUserId?: string | null,
    viewerUserId?: string | null,
    token?: string | null,
  ): Promise<any> {
    const proof = await this.prisma.proofArtifact.findFirst({
      where: {
        id,
        ...(ownerUserId ? { userId: ownerUserId } : {}),
      },
    });
    if (!proof || proof.kind !== ProofKind.FILE || !proof.storageKey) {
      throw new NotFoundException("PROOF_FILE_NOT_FOUND");
    }

    const decision = await this.privacy.resolvePolicy(proof.userId, "PROOF", proof.id);
    const canView = this.privacy.canView(viewerUserId || null, proof.userId, decision, token || null);
    if (!canView) throw new NotFoundException("PROOF_NOT_FOUND");
    if ((viewerUserId || null) !== proof.userId && decision.redaction !== "NONE") {
      throw new NotFoundException("PROOF_NOT_FOUND");
    }

    return proof;
  }

  async anchorProof(id: string, achusrId: string): Promise<any> {
    const proof = await this.prisma.proofArtifact.findFirst({
      where: { id, userId: achusrId },
    });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
    if (!this.anchoring.isEnabled()) throw new BadRequestException("ANCHORING_DISABLED");

    const contract = this.anchoring.getRegistryAddressSafe();
    if (!contract) {
      throw new InternalServerErrorException("ANCHOR_REGISTRY_ADDRESS_NOT_CONFIGURED");
    }

    const updated = await this.prisma.proofArtifact.update({
      where: { id: proof.id },
      data: {
        chainId: proof.chainId || this.anchoring.getChainId(),
        anchorContract: proof.anchorContract || contract,
      },
    });

    await this.queueAnchor(updated);
    return this.getProofForOwner(updated.id, achusrId);
  }

  async listProofs(
    achusrId: string,
    viewerUserId: string | null,
    filters: {
      achievementId?: string;
      badgeTokenId?: string;
      kind?: string;
      limit?: string;
      cursor?: string;
    },
  ): Promise<any> {
    const takeRaw = Number(filters.limit || 20);
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 100) : 20;

    const records = await this.prisma.proofArtifact.findMany({
      where: {
        userId: achusrId,
        ...(filters.achievementId ? { achievementId: filters.achievementId } : {}),
        ...(filters.badgeTokenId ? { badgeTokenId: filters.badgeTokenId } : {}),
        ...(filters.kind ? { kind: normalizeKind(filters.kind) } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    const data = [];
    for (const record of records) {
      const decorated = await this.decorateProof(record, achusrId, viewerUserId);
      if (decorated) data.push(decorated);
    }

    return {
      data,
      nextCursor: records.length === take ? records[records.length - 1].id : null,
    };
  }
}
