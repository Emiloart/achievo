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
exports.PrivacyPolicyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const DEFAULT_SETTINGS = {
    defaultProfileVisibility: "PUBLIC",
    showConsistency: true,
    defaultProofVisibility: "PUBLIC",
    defaultValidationVisibility: "PUBLIC",
    defaultAchievementVisibility: "PUBLIC",
};
const CONTENT_DEFAULT_MAP = {
    PROOF: "defaultProofVisibility",
    VALIDATION: "defaultValidationVisibility",
    ACHIEVEMENT: "defaultAchievementVisibility",
    BADGE: "defaultAchievementVisibility",
    EXPORT: "defaultProfileVisibility",
    ENDORSEMENTS: "defaultProfileVisibility",
};
function normalizeContentType(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}
function generateUnlistedId() {
    return (0, crypto_1.randomBytes)(16).toString("base64url");
}
let PrivacyPolicyService = class PrivacyPolicyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings(userId) {
        const settings = await this.prisma.userPrivacySettings.findUnique({ where: { userId } });
        if (!settings) {
            return { userId, ...DEFAULT_SETTINGS };
        }
        return settings;
    }
    async updateSettings(userId, input) {
        const data = {
            defaultProfileVisibility: input.defaultProfileVisibility ?? undefined,
            showConsistency: typeof input.showConsistency === "boolean" ? input.showConsistency : undefined,
            defaultProofVisibility: input.defaultProofVisibility ?? undefined,
            defaultValidationVisibility: input.defaultValidationVisibility ?? undefined,
            defaultAchievementVisibility: input.defaultAchievementVisibility ?? undefined,
        };
        const updated = await this.prisma.userPrivacySettings.upsert({
            where: { userId },
            update: data,
            create: {
                userId,
                ...DEFAULT_SETTINGS,
                ...data,
            },
        });
        return updated;
    }
    async getOverride(ownerUserId, contentType, contentId) {
        return this.prisma.contentVisibilityOverride.findUnique({
            where: {
                ownerUserId_contentType_contentId: {
                    ownerUserId,
                    contentType: normalizeContentType(contentType),
                    contentId: String(contentId),
                },
            },
        });
    }
    async upsertOverride(ownerUserId, contentType, contentId, visibility, redaction) {
        const normalizedType = normalizeContentType(contentType);
        const normalizedId = String(contentId);
        const existing = await this.getOverride(ownerUserId, normalizedType, normalizedId);
        let unlistedPublicId = existing?.unlistedPublicId ?? null;
        if (visibility === "UNLISTED" && !unlistedPublicId) {
            unlistedPublicId = normalizedType === "EXPORT" ? normalizedId : generateUnlistedId();
        }
        if (visibility !== "UNLISTED") {
            unlistedPublicId = null;
        }
        return this.prisma.contentVisibilityOverride.upsert({
            where: {
                ownerUserId_contentType_contentId: {
                    ownerUserId,
                    contentType: normalizedType,
                    contentId: normalizedId,
                },
            },
            update: {
                visibility,
                redaction,
                unlistedPublicId,
            },
            create: {
                ownerUserId,
                contentType: normalizedType,
                contentId: normalizedId,
                visibility,
                redaction,
                unlistedPublicId,
            },
        });
    }
    async deleteOverride(ownerUserId, contentType, contentId) {
        return this.prisma.contentVisibilityOverride.delete({
            where: {
                ownerUserId_contentType_contentId: {
                    ownerUserId,
                    contentType: normalizeContentType(contentType),
                    contentId: String(contentId),
                },
            },
        });
    }
    async resolvePolicy(ownerUserId, contentType, contentId) {
        const normalizedType = normalizeContentType(contentType);
        const normalizedId = String(contentId);
        const override = await this.getOverride(ownerUserId, normalizedType, normalizedId);
        if (override) {
            return {
                visibility: override.visibility,
                redaction: override.redaction,
                unlistedPublicId: override.unlistedPublicId,
                overrideId: override.id,
            };
        }
        if (normalizedType === "EXPORT") {
            return {
                visibility: "UNLISTED",
                redaction: "NONE",
                unlistedPublicId: normalizedId,
            };
        }
        const settings = await this.getSettings(ownerUserId);
        const key = CONTENT_DEFAULT_MAP[normalizedType] || "defaultProfileVisibility";
        const defaultVisibility = settings[key] || DEFAULT_SETTINGS.defaultProfileVisibility;
        return { visibility: defaultVisibility, redaction: "NONE", unlistedPublicId: null };
    }
    canView(viewerUserId, ownerUserId, decision, token) {
        if (viewerUserId && viewerUserId === ownerUserId)
            return true;
        if (decision.visibility === "PUBLIC")
            return true;
        if (decision.visibility === "UNLISTED" &&
            token &&
            decision.unlistedPublicId &&
            token === decision.unlistedPublicId) {
            return true;
        }
        return false;
    }
    decorateProof(dto, decision, viewerUserId, ownerUserId) {
        const isOwner = viewerUserId === ownerUserId;
        const visibility = decision.visibility;
        const redaction = decision.redaction;
        const base = { ...dto };
        if (!isOwner) {
            if (redaction === "FULL")
                return null;
            if (redaction === "METADATA_ONLY") {
                base.title = null;
                base.description = null;
                base.sourceUrl = null;
                base.storageKey = null;
                base.fileUrl = null;
            }
        }
        if (isOwner) {
            base.visibility = visibility;
            base.redaction = redaction;
            base.unlistedPublicId = decision.unlistedPublicId;
        }
        return base;
    }
    decorateValidation(item, decision, viewerUserId, ownerUserId) {
        const isOwner = viewerUserId === ownerUserId;
        if (!isOwner) {
            if (decision.redaction === "FULL")
                return null;
            if (decision.redaction === "METADATA_ONLY") {
                if (item.request) {
                    item.request.summary = null;
                    item.request.evidenceLinks = null;
                }
                if (item.attestation) {
                    item.attestation.message = null;
                }
            }
        }
        if (isOwner) {
            item.request.visibility = decision.visibility;
            item.request.redaction = decision.redaction;
            item.request.unlistedPublicId = decision.unlistedPublicId;
        }
        return item;
    }
    decorateExport(bundle, decision, viewerUserId, ownerUserId) {
        const isOwner = viewerUserId === ownerUserId;
        if (!isOwner) {
            if (decision.redaction === "FULL")
                return null;
            if (decision.redaction === "METADATA_ONLY") {
                bundle.snapshot = null;
                if (bundle.jsonld)
                    bundle.jsonld = null;
            }
        }
        if (isOwner) {
            bundle.visibility = decision.visibility;
            bundle.redaction = decision.redaction;
            bundle.unlistedPublicId = decision.unlistedPublicId;
        }
        return bundle;
    }
};
exports.PrivacyPolicyService = PrivacyPolicyService;
exports.PrivacyPolicyService = PrivacyPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrivacyPolicyService);

export const PrivacyPolicyService = exports.PrivacyPolicyService as any;
export type PrivacyPolicyService = any;
