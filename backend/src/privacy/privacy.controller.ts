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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const privacy_service_1 = require("./privacy.service");
const jwt_1 = require("@nestjs/jwt");
const proofs_service_1 = require("../proofs/proofs.service");
const validations_service_1 = require("../validations/validations.service");
const profileExports_service_1 = require("../profile-exports/profileExports.service");
const auth_request_1 = require("../auth/auth.request");
const VISIBILITY = ["PUBLIC", "UNLISTED", "PRIVATE"];
const REDACTION = ["NONE", "METADATA_ONLY", "FULL"];
const CONTENT_TYPES = ["PROOF", "VALIDATION", "BADGE", "ACHIEVEMENT", "EXPORT"];
let PrivacyController = class PrivacyController {
    constructor(prisma, privacy, jwt, proofs, validations, exportsService) {
        this.prisma = prisma;
        this.privacy = privacy;
        this.jwt = jwt;
        this.proofs = proofs;
        this.validations = validations;
        this.exportsService = exportsService;
    }
    async resolveAchusrId(req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        return user.userId;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const viewer = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
            return viewer?.userId || null;
        }
        catch {
            return null;
        }
    }
    async getSettings(req) {
        const achusrId = await this.resolveAchusrId(req);
        const settings = await this.privacy.getSettings(achusrId);
        const overridesCount = await this.prisma.contentVisibilityOverride.count({ where: { ownerUserId: achusrId } });
        return { success: true, data: { settings, overridesCount } };
    }
    async updateSettings(body, req) {
        const achusrId = await this.resolveAchusrId(req);
        const input = {};
        if (body?.defaultProfileVisibility) {
            if (!VISIBILITY.includes(body.defaultProfileVisibility))
                throw new common_1.BadRequestException("INVALID_VISIBILITY");
            input.defaultProfileVisibility = body.defaultProfileVisibility;
        }
        if (body?.defaultProofVisibility) {
            if (!VISIBILITY.includes(body.defaultProofVisibility))
                throw new common_1.BadRequestException("INVALID_VISIBILITY");
            input.defaultProofVisibility = body.defaultProofVisibility;
        }
        if (body?.defaultValidationVisibility) {
            if (!VISIBILITY.includes(body.defaultValidationVisibility))
                throw new common_1.BadRequestException("INVALID_VISIBILITY");
            input.defaultValidationVisibility = body.defaultValidationVisibility;
        }
        if (body?.defaultAchievementVisibility) {
            if (!VISIBILITY.includes(body.defaultAchievementVisibility))
                throw new common_1.BadRequestException("INVALID_VISIBILITY");
            input.defaultAchievementVisibility = body.defaultAchievementVisibility;
        }
        if (typeof body?.showConsistency === "boolean") {
            input.showConsistency = body.showConsistency;
        }
        const settings = await this.privacy.updateSettings(achusrId, input);
        return { success: true, data: settings };
    }
    async upsertOverride(body, req) {
        const achusrId = await this.resolveAchusrId(req);
        const contentType = String(body?.contentType || "").toUpperCase();
        if (!CONTENT_TYPES.includes(contentType))
            throw new common_1.BadRequestException("INVALID_CONTENT_TYPE");
        const contentId = String(body?.contentId || "").trim();
        if (!contentId)
            throw new common_1.BadRequestException("CONTENT_ID_REQUIRED");
        const visibility = String(body?.visibility || "").toUpperCase();
        if (!VISIBILITY.includes(visibility))
            throw new common_1.BadRequestException("INVALID_VISIBILITY");
        const redaction = body?.redaction ? String(body.redaction).toUpperCase() : "NONE";
        if (!REDACTION.includes(redaction))
            throw new common_1.BadRequestException("INVALID_REDACTION");
        const override = await this.privacy.upsertOverride(achusrId, contentType, contentId, visibility, redaction);
        return { success: true, data: override };
    }
    async deleteOverride(body, req) {
        const achusrId = await this.resolveAchusrId(req);
        const contentType = String(body?.contentType || "").toUpperCase();
        const contentId = String(body?.contentId || "").trim();
        if (!contentType || !contentId)
            throw new common_1.BadRequestException("CONTENT_REQUIRED");
        await this.privacy.deleteOverride(achusrId, contentType, contentId);
        return { success: true };
    }
    async getUnlisted(publicId, req, type) {
        const override = await this.prisma.contentVisibilityOverride.findUnique({ where: { unlistedPublicId: publicId } });
        if (!override)
            throw new common_1.NotFoundException("NOT_FOUND");
        if (override.visibility !== "UNLISTED")
            throw new common_1.NotFoundException("NOT_FOUND");
        const contentType = override.contentType.toUpperCase();
        const contentId = override.contentId;
        const viewer = await this.resolveViewer(req);
        if (type && contentType !== type.toUpperCase()) {
            throw new common_1.NotFoundException("NOT_FOUND");
        }
        if (contentType === "PROOF") {
            const data = await this.proofs.getProofForViewer(contentId, override.ownerUserId, viewer, publicId);
            if (!data)
                throw new common_1.NotFoundException("NOT_FOUND");
            return { success: true, data: { type: "PROOF", item: data } };
        }
        if (contentType === "VALIDATION") {
            const data = await this.validations.getRequestWithPrivacy(contentId, { viewerAchusrId: viewer, token: publicId });
            if (!data)
                throw new common_1.NotFoundException("NOT_FOUND");
            return { success: true, data: { type: "VALIDATION", item: data } };
        }
        if (contentType === "EXPORT") {
            const baseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000"}`;
            const data = await this.exportsService.getExportByPublicId(contentId, baseUrl, {
                viewerAchusrId: viewer,
                token: publicId,
            });
            if (!data)
                throw new common_1.NotFoundException("NOT_FOUND");
            return { success: true, data: { type: "EXPORT", item: data } };
        }
        throw new common_1.NotFoundException("NOT_FOUND");
    }
};
exports.PrivacyController = PrivacyController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "getSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Put)("me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Put)("override"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "upsertOverride", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)("override"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "deleteOverride", null);
__decorate([
    (0, common_1.Get)("unlisted/:publicId"),
    __param(0, (0, common_1.Param)("publicId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("type")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "getUnlisted", null);
exports.PrivacyController = PrivacyController = __decorate([
    (0, common_1.Controller)("privacy"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        privacy_service_1.PrivacyPolicyService,
        jwt_1.JwtService,
        proofs_service_1.ProofsService,
        validations_service_1.ValidationsService,
        profileExports_service_1.ProfileExportsService])
], PrivacyController);

export const PrivacyController = exports.PrivacyController as any;
export type PrivacyController = any;
