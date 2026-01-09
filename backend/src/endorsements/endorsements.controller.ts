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
exports.UserEndorsementsController = exports.EndorsementsController = exports.UserSkillsController = exports.SkillsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const endorsements_service_1 = require("./endorsements.service");
const auth_request_1 = require("../auth/auth.request");
let SkillsController = class SkillsController {
    constructor(endorsements, prisma, jwt) {
        this.endorsements = endorsements;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async resolveUser(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            return this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
        }
        catch {
            return null;
        }
    }
    async createSkill(body, req) {
        const label = String(body?.displayName || "").trim();
        const user = await this.resolveUser(req);
        const data = await this.endorsements.createSkill(label, user?.userId || null);
        return { success: true, data };
    }
    async searchSkills(query) {
        const data = await this.endorsements.searchSkills(query);
        return { success: true, data };
    }
};
exports.SkillsController = SkillsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SkillsController.prototype, "createSkill", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("query")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SkillsController.prototype, "searchSkills", null);
exports.SkillsController = SkillsController = __decorate([
    (0, common_1.Controller)("skills"),
    __metadata("design:paramtypes", [endorsements_service_1.EndorsementsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], SkillsController);
let UserSkillsController = class UserSkillsController {
    constructor(endorsements, prisma, jwt) {
        this.endorsements = endorsements;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const user = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async addSkill(body, req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const skillTagId = String(body?.skillTagId || "").trim();
        const proficiency = body?.proficiency ?? null;
        if (!skillTagId)
            throw new common_1.BadRequestException("SKILL_TAG_REQUIRED");
        const data = await this.endorsements.upsertUserSkill(user.userId, skillTagId, proficiency);
        return { success: true, data };
    }
    async removeSkill(skillTagId, req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        await this.endorsements.deleteUserSkill(user.userId, skillTagId);
        return { success: true };
    }
    async listUserSkills(userId, req, token) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const viewer = await this.resolveViewer(req);
        const data = await this.endorsements.listUserSkills(userId, viewer, token);
        return { success: true, data };
    }
};
exports.UserSkillsController = UserSkillsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("me/skills"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserSkillsController.prototype, "addSkill", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)("me/skills/:skillTagId"),
    __param(0, (0, common_1.Param)("skillTagId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserSkillsController.prototype, "removeSkill", null);
__decorate([
    (0, common_1.Get)(":userId/skills"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], UserSkillsController.prototype, "listUserSkills", null);
exports.UserSkillsController = UserSkillsController = __decorate([
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [endorsements_service_1.EndorsementsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserSkillsController);
let EndorsementsController = class EndorsementsController {
    constructor(endorsements, prisma) {
        this.endorsements = endorsements;
        this.prisma = prisma;
    }
    async createEndorsement(body, req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const data = await this.endorsements.createEndorsement(user.userId, body || {});
        return { success: true, data };
    }
    async revokeEndorsement(id, req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const data = await this.endorsements.revokeEndorsement(id, user.userId);
        return { success: true, data };
    }
};
exports.EndorsementsController = EndorsementsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EndorsementsController.prototype, "createEndorsement", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":id/revoke"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EndorsementsController.prototype, "revokeEndorsement", null);
exports.EndorsementsController = EndorsementsController = __decorate([
    (0, common_1.Controller)("endorsements"),
    __metadata("design:paramtypes", [endorsements_service_1.EndorsementsService,
        prisma_service_1.PrismaService])
], EndorsementsController);
let UserEndorsementsController = class UserEndorsementsController {
    constructor(endorsements, prisma, jwt) {
        this.endorsements = endorsements;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const user = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async listEndorsements(userId, req, targetType, targetId, limit, cursor, token) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const viewer = await this.resolveViewer(req);
        const data = await this.endorsements.listEndorsements(userId, viewer, {
            targetType,
            targetId,
            limit,
            cursor,
            token,
        });
        return { success: true, ...data };
    }
    async summary(userId, req, token) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const viewer = await this.resolveViewer(req);
        const data = await this.endorsements.getSummary(userId, viewer, token);
        return { success: true, data };
    }
};
exports.UserEndorsementsController = UserEndorsementsController;
__decorate([
    (0, common_1.Get)(":userId/endorsements"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("targetType")),
    __param(3, (0, common_1.Query)("targetId")),
    __param(4, (0, common_1.Query)("limit")),
    __param(5, (0, common_1.Query)("cursor")),
    __param(6, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UserEndorsementsController.prototype, "listEndorsements", null);
__decorate([
    (0, common_1.Get)(":userId/endorsements/summary"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], UserEndorsementsController.prototype, "summary", null);
exports.UserEndorsementsController = UserEndorsementsController = __decorate([
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [endorsements_service_1.EndorsementsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserEndorsementsController);

export const EndorsementsController = exports.EndorsementsController as any;
export const SkillsController = exports.SkillsController as any;
export const UserEndorsementsController = exports.UserEndorsementsController as any;
export const UserSkillsController = exports.UserSkillsController as any;
export type EndorsementsController = any;
export type SkillsController = any;
export type UserEndorsementsController = any;
export type UserSkillsController = any;
