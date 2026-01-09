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
exports.PartiesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const parties_service_1 = require("./parties.service");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_request_1 = require("../auth/auth.request");
let PartiesController = class PartiesController {
    constructor(parties, jwt, prisma) {
        this.parties = parties;
        this.jwt = jwt;
        this.prisma = prisma;
    }
    async resolveAchusrId(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } })
                : null;
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async create(body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }
        const party = await this.parties.createParty({
            name: body?.name || "",
            slug: body?.slug || "",
            description: body?.description,
            visibility: body?.visibility,
        }, user.userId);
        return { success: true, data: party };
    }
    async discover(page, limit) {
        return this.parties.listDiscoverParties(page, limit);
    }
    async myParties(req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { data: [] };
        const data = await this.parties.listMyParties(user.userId);
        return { data };
    }
    async get(slug, req) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.parties.getPartyBySlug(slug, viewerAchusrId);
        return { success: true, data };
    }
    async members(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.parties.listMembers(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
    async join(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.parties.joinParty(slug, user.userId);
        return { success: true, data };
    }
    async leave(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.parties.leaveParty(slug, user.userId);
        return { success: true, data };
    }
    async createInvite(slug, req, body) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;
        const invite = await this.parties.createInvite(slug, user.userId, body?.maxUses, expiresAt);
        return { success: true, data: { token: invite.token, partyId: invite.partyId } };
    }
    async acceptInvite(token, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const party = await this.parties.acceptInvite(token, user.userId);
        return { success: true, data: party };
    }
    async feed(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.parties.getPartyFeed(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
    async feedMe(req, page, limit) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, data: [] };
        const data = await this.parties.getFeedForUser(user.userId, page, limit);
        return { success: true, ...data };
    }
    async leaderboardXp(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.parties.getPartyLeaderboardXp(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
    async leaderboardStreak(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.parties.getPartyLeaderboardStreak(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
};
exports.PartiesController = PartiesController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("discover"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "discover", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "myParties", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(":slug/members"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "members", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/join"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "join", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/leave"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "leave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/invites"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "createInvite", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("invites/:token/accept"),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.Get)(":slug/feed"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "feed", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("feed/me"),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "feedMe", null);
__decorate([
    (0, common_1.Get)(":slug/leaderboard/xp"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "leaderboardXp", null);
__decorate([
    (0, common_1.Get)(":slug/leaderboard/streak"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], PartiesController.prototype, "leaderboardStreak", null);
exports.PartiesController = PartiesController = __decorate([
    (0, common_1.Controller)("parties"),
    __metadata("design:paramtypes", [parties_service_1.PartiesService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], PartiesController);

export const PartiesController = exports.PartiesController as any;
export type PartiesController = any;
