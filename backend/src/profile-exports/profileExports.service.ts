// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileExportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const profileSnapshot_service_1 = require("./profileSnapshot.service");
const profileExportSigner_service_1 = require("./profileExportSigner.service");
const profileExportStorage_service_1 = require("./profileExportStorage.service");
const profileExportPdf_service_1 = require("./profileExportPdf.service");
const privacy_service_1 = require("../privacy/privacy.service");
const anchoring_service_1 = require("../anchoring/anchoring.service");
const anchoring_queue_service_1 = require("../anchoring/anchoring.queue.service");
const anchoring_constants_1 = require("../anchoring/anchoring.constants");
function generatePublicId() {
    return (0, crypto_1.randomBytes)(8).toString("base64url");
}
function toUnix(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return Math.floor(date.getTime() / 1000);
}
let ProfileExportsService = class ProfileExportsService {
    constructor(prisma, snapshotService, signer, storage, pdf, privacy, anchoring, queue) {
        this.prisma = prisma;
        this.snapshotService = snapshotService;
        this.signer = signer;
        this.storage = storage;
        this.pdf = pdf;
        this.privacy = privacy;
        this.anchoring = anchoring;
        this.queue = queue;
    }
    normalizeFormat(raw) {
        const value = String(raw || "")
            .trim()
            .toUpperCase();
        if (!["JSON", "JSONLD", "PDF"].includes(value))
            throw new common_1.BadRequestException("INVALID_FORMAT");
        return value;
    }
    buildAnchorInfo(record) {
        if (!record?.anchorTxHash)
            return null;
        return {
            chainId: record.chainId,
            contract: record.anchorContract,
            txHash: record.anchorTxHash,
        };
    }
    buildExportBundle(record, baseUrl) {
        const issuedAt = toUnix(record.createdAt) || Math.floor(Date.now() / 1000);
        const downloadUrl = record.format === "PDF" ? `${baseUrl.replace(/\/$/, "")}/api/exports/${record.publicId}/download` : null;
        return {
            publicId: record.publicId,
            format: record.format,
            snapshot: record.snapshot,
            snapshotHash: record.snapshotHash,
            signature: record.signature,
            signatureType: record.signatureType,
            signerAddress: record.signerAddress,
            issuedAt,
            anchor: this.buildAnchorInfo(record),
            downloadUrl,
        };
    }
    async createProfileExport(achusrId, input) {
        const format = this.normalizeFormat(input.format);
        const { snapshot, snapshotHash } = await this.snapshotService.buildSnapshot(achusrId);
        const signatureData = await this.signer.signSnapshot(snapshotHash);
        const publicId = generatePublicId();
        let anchorTxHash = null;
        let anchorContract = null;
        let anchoredAt = null;
        let chainId = null;
        const anchorRequested = Boolean(input.anchor);
        if (anchorRequested && this.anchoring.isEnabled()) {
            const registry = this.anchoring.getRegistryAddressSafe();
            if (registry) {
                anchorContract = registry;
                chainId = this.anchoring.getChainId();
            }
        }
        let storageProvider = "NONE";
        let storageKey = null;
        let mimeType = null;
        let sizeBytes = null;
        if (format === "PDF") {
            const pdfBuffer = await this.pdf.renderPdf(snapshot, {
                publicId,
                snapshotHash,
                signerAddress: signatureData.signerAddress,
                signature: signatureData.signature,
                anchorTxHash,
                baseUrl: input.baseUrl,
            });
            const stored = await this.storage.saveFile({
                buffer: pdfBuffer,
                originalName: `achievo-export-${publicId}.pdf`,
                mimeType: "application/pdf",
                size: pdfBuffer.length,
            });
            storageProvider = this.storage.getDriver();
            storageKey = stored.storageKey;
            mimeType = stored.mimeType;
            sizeBytes = stored.sizeBytes;
        }
        const record = await this.prisma.profileExport.create({
            data: {
                userId: achusrId,
                format,
                version: "1",
                snapshot,
                snapshotHash,
                signatureType: signatureData.signatureType,
                signerAddress: signatureData.signerAddress,
                signature: signatureData.signature,
                publicId,
                storageProvider: storageProvider,
                storageKey,
                mimeType,
                sizeBytes,
                chainId,
                anchorTxHash,
                anchorContract,
                anchoredAt,
            },
        });
        if (anchorRequested && anchorContract) {
            void this.queue
                .enqueue({
                kind: anchoring_constants_1.AnchorKinds.EXPORT,
                hash: snapshotHash,
                entityType: "EXPORT",
                entityId: record.id,
            })
                .catch(() => { });
        }
        const bundle = this.buildExportBundle(record, input.baseUrl);
        if (format === "JSONLD") {
            return {
                ...bundle,
                jsonld: this.snapshotService.buildJsonLd(snapshot, record.publicId, input.baseUrl),
            };
        }
        return bundle;
    }
    async getExportByPublicId(publicId, baseUrl, viewer) {
        const record = await this.prisma.profileExport.findUnique({ where: { publicId } });
        if (!record)
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        const decision = await this.privacy.resolvePolicy(record.userId, "EXPORT", record.publicId);
        const canView = this.privacy.canView(viewer?.viewerAchusrId || null, record.userId, decision, viewer?.token || null);
        if (!canView)
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        const bundle = this.buildExportBundle(record, baseUrl);
        const decorated = this.privacy.decorateExport(bundle, decision, viewer?.viewerAchusrId || null, record.userId);
        if (!decorated)
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        if (record.format === "JSONLD") {
            return {
                ...decorated,
                jsonld: decorated.snapshot
                    ? this.snapshotService.buildJsonLd(record.snapshot, record.publicId, baseUrl)
                    : null,
            };
        }
        return decorated;
    }
    async listExportsForUser(achusrId, viewerId, baseUrl, filters) {
        if (achusrId !== viewerId)
            throw new common_1.ForbiddenException("NOT_OWNER");
        const take = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
        const query = {
            where: { userId: achusrId },
            orderBy: { createdAt: "desc" },
            take,
        };
        if (filters.cursor) {
            query.cursor = { id: filters.cursor };
            query.skip = 1;
        }
        const records = await this.prisma.profileExport.findMany(query);
        const data = [];
        for (const record of records) {
            const decision = await this.privacy.resolvePolicy(achusrId, "EXPORT", record.publicId);
            const bundle = this.buildExportBundle(record, baseUrl);
            data.push(this.privacy.decorateExport(bundle, decision, viewerId, achusrId));
        }
        const nextCursor = records.length ? records[records.length - 1].id : null;
        return { data, nextCursor };
    }
    async getDownloadStream(publicId, viewer) {
        const record = await this.prisma.profileExport.findUnique({ where: { publicId } });
        if (!record)
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        const decision = await this.privacy.resolvePolicy(record.userId, "EXPORT", record.publicId);
        const canView = this.privacy.canView(viewer?.viewerAchusrId || null, record.userId, decision, viewer?.token || null);
        if (!canView)
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        if (decision.redaction !== "NONE" && viewer?.viewerAchusrId !== record.userId) {
            throw new common_1.NotFoundException("EXPORT_NOT_FOUND");
        }
        if (record.format !== "PDF")
            throw new common_1.BadRequestException("EXPORT_NOT_PDF");
        if (!record.storageKey)
            throw new common_1.NotFoundException("FILE_NOT_AVAILABLE");
        const stream = this.storage.getFileStream(record.storageKey);
        return { stream, mimeType: record.mimeType || "application/pdf" };
    }
    async verifyExport(snapshot, signature, signerAddress) {
        const { hash } = this.snapshotService.verifySnapshot(snapshot);
        const result = await this.signer.verifySnapshot(hash, signature, signerAddress);
        return { valid: result.valid, snapshotHash: hash };
    }
};
exports.ProfileExportsService = ProfileExportsService;
exports.ProfileExportsService = ProfileExportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        profileSnapshot_service_1.ProfileSnapshotService,
        profileExportSigner_service_1.ProfileExportSignerService,
        profileExportStorage_service_1.ProfileExportStorageService,
        profileExportPdf_service_1.ProfileExportPdfService,
        privacy_service_1.PrivacyPolicyService,
        anchoring_service_1.AnchoringService,
        anchoring_queue_service_1.AnchoringQueueService])
], ProfileExportsService);

export const ProfileExportsService = exports.ProfileExportsService as any;
export type ProfileExportsService = any;
