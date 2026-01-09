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
exports.OrgInvitesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const organizations_service_1 = require("./organizations.service");
const auth_request_1 = require("../auth/auth.request");
let OrgInvitesController = class OrgInvitesController {
    constructor(orgs, jwt, prisma) {
        this.orgs = orgs;
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
    async acceptInvite(token, req) {
        const userId = await this.resolveAchusrId(req);
        if (!userId) {
            throw new common_1.BadRequestException("USER_NOT_FOUND");
        }
        const data = await this.orgs.acceptInvite(token, userId || "");
        return { success: true, data };
    }
    async revokeInvite(token, req) {
        const actorUserId = await this.resolveAchusrId(req);
        if (!actorUserId) {
            throw new common_1.BadRequestException("USER_NOT_FOUND");
        }
        const data = await this.orgs.revokeInvite(token, actorUserId || "");
        return { success: true, data };
    }
};
exports.OrgInvitesController = OrgInvitesController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("org-invites/:token/accept"),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrgInvitesController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("org-invites/:token/revoke"),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrgInvitesController.prototype, "revokeInvite", null);
exports.OrgInvitesController = OrgInvitesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], OrgInvitesController);

export const OrgInvitesController = exports.OrgInvitesController as any;
export type OrgInvitesController = any;
