/**
 * Proof domain service.
 *
 * Enforces ownership rules, storage constraints, and optional anchoring triggers.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProofHashService } from "./proofHash.service";
import { StorageService } from "./storage.service";
import { ActivityEventService } from "../consistency/activityEvent.service";
import { ActivityEventType } from "../consistency/activityEvent.types";
import { PrivacyPolicyService } from "../privacy/privacy.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { AnchoringQueueService } from "../anchoring/anchoring.queue.service";
import { AnchorKinds } from "../anchoring/anchoring.constants";

const DEFAULT_MAX_MB = 10;
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown", "application/json"];

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

type ProofMeta = {
  title?: string;
  description?: string;
  achievementId?: string | number | null;
  badgeTokenId?: string | number | null;
  autoAnchor?: boolean;
  anchor?: boolean;
};

@Injectable()
/** Coordinates proof persistence, validation, and anchoring triggers. */
export class ProofsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ProofHashService) private readonly hasher: ProofHashService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ActivityEventService) private readonly activity: ActivityEventService,
    @Inject(PrivacyPolicyService) private readonly privacy: PrivacyPolicyService,
    @Inject(AnchoringService) private readonly anchoring: AnchoringService,
    @Inject(AnchoringQueueService) private readonly queue: AnchoringQueueService,
  ) {}

  private maxBytes() {
    const raw = Number(process.env.PROOF_MAX_SIZE_MB || DEFAULT_MAX_MB);
    const safe = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_MB;
    return Math.floor(safe * 1024 * 1024);
  }

  private normalizeOptional(value?: string | number | null) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  private isAllowedMime(mime?: string | null) {
    if (!mime) return false;
    if (ALLOWED_MIME_TYPES.includes(mime)) return true;
    return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
  }

  private toDto(proof: any) {
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
      anchoredAt: proof.anchoredAt ? new Date(proof.anchoredAt).toISOString() : null,
      createdAt: proof.createdAt ? new Date(proof.createdAt).toISOString() : null,
      fileUrl: proof.storageKey ? `/api/proofs/${proof.id}/file` : null,
    };
  }

  private shouldAutoAnchor(meta: ProofMeta) {
    if (meta.anchor !== undefined) return Boolean(meta.anchor);
    if (meta.autoAnchor !== undefined) return Boolean(meta.autoAnchor);
    return toBooleanEnv("AUTO_ANCHOR_PROOFS", false);
  }

  private async queueProofAnchor(proof: any) {
    if (!this.anchoring.isEnabled()) return null;
    const contract = this.anchoring.getRegistryAddressSafe();
    if (!contract) return null;
    const chainId = this.anchoring.getChainId();
    const updated = await this.prisma.proofArtifact.update({
      where: { id: proof.id },
      data: { chainId, anchorContract: contract },
    });
    await this.queue.enqueue({
      kind: AnchorKinds.PROOF,
      hash: proof.sha256,
      entityType: "PROOF",
      entityId: proof.id,
    });
    return updated;
  }

  async createFileProof(
    achusrId: string,
    file: { buffer?: Buffer; size?: number; mimetype?: string; originalname?: string },
    meta: ProofMeta,
  ) {
    if (!file?.buffer) throw new BadRequestException("FILE_REQUIRED");
    if (file.size && file.size > this.maxBytes()) throw new BadRequestException("FILE_TOO_LARGE");
    if (!this.isAllowedMime(file.mimetype)) throw new BadRequestException("UNSUPPORTED_FILE_TYPE");

    const { sha256 } = this.hasher.hashBuffer(file.buffer);
    const stored = await this.storage.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    const proof = await this.prisma.proofArtifact.create({
      data: {
        userId: achusrId,
        achievementId: this.normalizeOptional(meta.achievementId),
        badgeTokenId: this.normalizeOptional(meta.badgeTokenId),
        kind: "FILE",
        title: this.normalizeOptional(meta.title),
        description: this.normalizeOptional(meta.description),
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: this.storage.getDriver() as any,
        storageKey: stored.storageKey,
        sha256,
        contentHash: sha256,
      },
    });

    void this.activity
      .recordEvent({ userId: achusrId, type: ActivityEventType.PROOF_ADDED, refId: proof.id })
      .catch(() => {});

    if (this.shouldAutoAnchor(meta)) {
      void this.queueProofAnchor(proof).catch(() => {});
    }
    return this.toDto(proof);
  }

  async createUrlProof(achusrId: string, sourceUrl: string, meta: ProofMeta) {
    const { canonical, sha256 } = this.hasher.hashUrl(sourceUrl);
    const proof = await this.prisma.proofArtifact.create({
      data: {
        userId: achusrId,
        achievementId: this.normalizeOptional(meta.achievementId),
        badgeTokenId: this.normalizeOptional(meta.badgeTokenId),
        kind: "URL",
        title: this.normalizeOptional(meta.title),
        description: this.normalizeOptional(meta.description),
        sourceUrl: canonical,
        storageProvider: "NONE",
        sha256,
        contentHash: sha256,
      },
    });
    void this.activity
      .recordEvent({ userId: achusrId, type: ActivityEventType.PROOF_ADDED, refId: proof.id })
      .catch(() => {});
    if (this.shouldAutoAnchor(meta)) {
      void this.queueProofAnchor(proof).catch(() => {});
    }
    return this.toDto(proof);
  }

  async getProofForOwner(id: string, achusrId: string) {
    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
    if (proof.userId !== achusrId) throw new ForbiddenException("NOT_OWNER");
    const decision = await this.privacy.resolvePolicy(achusrId, "PROOF", proof.id);
    return this.privacy.decorateProof(this.toDto(proof), decision, achusrId, achusrId);
  }

  async getProofForFile(id: string, ownerUserId?: string | null, viewerUserId?: string | null, token?: string | null) {
    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
    const ownerId = ownerUserId || proof.userId;
    const decision = await this.privacy.resolvePolicy(ownerId, "PROOF", proof.id);
    const canView = this.privacy.canView(viewerUserId || null, ownerId, decision, token || null);
    if (!canView) throw new NotFoundException("PROOF_NOT_FOUND");
    if (decision.redaction !== "NONE" && viewerUserId !== ownerId) {
      throw new NotFoundException("FILE_NOT_AVAILABLE");
    }
    if (!proof.storageKey || proof.storageProvider !== "LOCAL") {
      throw new NotFoundException("FILE_NOT_AVAILABLE");
    }
    return proof;
  }

  async listProofs(
    achusrId: string,
    viewerUserId: string | null,
    filters: { achievementId?: string; badgeTokenId?: string; kind?: string; limit?: string; cursor?: string },
  ) {
    const take = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const where: any = { userId: achusrId };
    if (filters.achievementId) where.achievementId = this.normalizeOptional(filters.achievementId);
    if (filters.badgeTokenId) where.badgeTokenId = this.normalizeOptional(filters.badgeTokenId);
    if (filters.kind) where.kind = String(filters.kind).toUpperCase();

    const query: any = {
      where,
      orderBy: { createdAt: "desc" },
      take,
    };
    if (filters.cursor) {
      query.cursor = { id: filters.cursor };
      query.skip = 1;
    }
    const proofs = await this.prisma.proofArtifact.findMany(query);
    const data: any[] = [];
    for (const proof of proofs) {
      const decision = await this.privacy.resolvePolicy(achusrId, "PROOF", proof.id);
      const canView = this.privacy.canView(viewerUserId, achusrId, decision, null);
      if (!canView) continue;
      const decorated = this.privacy.decorateProof(this.toDto(proof), decision, viewerUserId, achusrId);
      if (decorated) data.push(decorated);
    }
    const nextCursor = proofs.length ? proofs[proofs.length - 1].id : null;
    return { data, nextCursor };
  }

  async getProofForViewer(id: string, ownerUserId: string, viewerUserId: string | null, token?: string | null) {
    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof || proof.userId !== ownerUserId) return null;
    const decision = await this.privacy.resolvePolicy(ownerUserId, "PROOF", proof.id);
    const canView = this.privacy.canView(viewerUserId, ownerUserId, decision, token || null);
    if (!canView) return null;
    return this.privacy.decorateProof(this.toDto(proof), decision, viewerUserId, ownerUserId);
  }

  async anchorProof(id: string, achusrId: string) {
    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
    if (proof.userId !== achusrId) throw new ForbiddenException("NOT_OWNER");
    if (proof.anchorTxHash) return this.toDto(proof);
    try {
      const updated = await this.queueProofAnchor(proof);
      return this.toDto(updated || proof);
    } catch {
      return this.toDto(proof);
    }
  }
}
