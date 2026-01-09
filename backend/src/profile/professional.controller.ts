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
exports.ShareLinkPublicController = exports.ProfessionalProfileController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const professional_service_1 = require("./professional.service");
let ProfessionalProfileController = class ProfessionalProfileController {
    constructor(prisma, professional) {
        this.prisma = prisma;
        this.professional = professional;
    }
    async resolveAuthedUser(req) {
        const userId = req.user?.sub;
        if (!userId)
            return null;
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { userId: true, primaryWallet: true },
        });
    }
    async getMe(req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.professional.getProfessionalProfileForMe(user.userId, user.primaryWallet || "");
        return data;
    }
    async updateMe(body, req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        await this.professional.updateProfessionalProfile(user.userId, body || {});
        return this.professional.getProfessionalProfileForMe(user.userId, user.primaryWallet || "");
    }
    async getPublic(handle) {
        return this.professional.getPublicProfessionalProfile(handle);
    }
    async getPins(req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        const pins = await this.professional.getPinsForUser(user.userId, user.primaryWallet || "");
        return { pins };
    }
    async updatePins(body, req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        const pins = await this.professional.updatePinsForUser(user.userId, user.primaryWallet || "", body?.pins || []);
        return { pins };
    }
    async createShareLink(body, req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        const link = await this.professional.createShareLink(user.userId, body || {});
        return { data: link };
    }
    async listShareLinks(req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { data: [] };
        const data = await this.professional.listShareLinks(user.userId);
        return { data };
    }
    async updateShareLink(id, body, req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.professional.updateShareLink(user.userId, id, body || {});
        return { data };
    }
    async deleteShareLink(id, req) {
        const user = await this.resolveAuthedUser(req);
        if (!user)
            return { success: false, error: "Unauthorized" };
        return this.professional.deleteShareLink(user.userId, id);
    }
};
exports.ProfessionalProfileController = ProfessionalProfileController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("professional/me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Put)("professional/me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Get)("professional/public/:handle"),
    __param(0, (0, common_1.Param)("handle")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "getPublic", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("pins/me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "getPins", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Put)("pins/me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "updatePins", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("share-links"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "createShareLink", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("share-links/me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "listShareLinks", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)("share-links/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "updateShareLink", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)("share-links/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProfessionalProfileController.prototype, "deleteShareLink", null);
exports.ProfessionalProfileController = ProfessionalProfileController = __decorate([
    (0, common_1.Controller)("profile"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        professional_service_1.ProfessionalProfileService])
], ProfessionalProfileController);
let ShareLinkPublicController = class ShareLinkPublicController {
    constructor(professional) {
        this.professional = professional;
    }
    async resolve(slug) {
        return this.professional.resolveShareLink(slug);
    }
};
exports.ShareLinkPublicController = ShareLinkPublicController;
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShareLinkPublicController.prototype, "resolve", null);
exports.ShareLinkPublicController = ShareLinkPublicController = __decorate([
    (0, common_1.Controller)("share-links"),
    __metadata("design:paramtypes", [professional_service_1.ProfessionalProfileService])
], ShareLinkPublicController);

export const ProfessionalProfileController = exports.ProfessionalProfileController as any;
export const ShareLinkPublicController = exports.ShareLinkPublicController as any;
export type ProfessionalProfileController = any;
export type ShareLinkPublicController = any;
