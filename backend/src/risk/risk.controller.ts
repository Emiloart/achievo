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
exports.RiskController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const riskEngine_service_1 = require("./riskEngine.service");
const admin_auth_guard_1 = require("../security/adminAuth/admin-auth.guard");
const admin_auth_service_1 = require("../security/adminAuth/admin-auth.service");
const auth_request_1 = require("../auth/auth.request");
let RiskController = class RiskController {
    constructor(prisma, jwt, risk, adminAuth) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.risk = risk;
        this.adminAuth = adminAuth;
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
    async isAdmin(req) {
        try {
            await this.adminAuth.verifyRequest(req);
            return true;
        }
        catch {
            return false;
        }
    }
    async getRiskProfile(userId, req) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const viewer = await this.resolveViewer(req);
        const isAdmin = await this.isAdmin(req);
        if (viewer !== userId && !isAdmin) {
            throw new common_1.ForbiddenException("FORBIDDEN");
        }
        const profile = await this.risk.getRiskProfile(userId);
        return { success: true, data: this.risk.toDto(profile) };
    }
    async recompute(userId, req) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const profile = await this.risk.recompute(userId);
        return { success: true, data: this.risk.toDto(profile) };
    }
    async listHighRisk(minRisk = "70", req) {
        const value = Number(minRisk);
        const risk = Number.isFinite(value) ? value : 70;
        const data = await this.risk.listHighRisk(risk);
        return { success: true, data: data.map((profile) => this.risk.toDto(profile)) };
    }
};
exports.RiskController = RiskController;
__decorate([
    (0, common_1.Get)("users/:userId/risk"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RiskController.prototype, "getRiskProfile", null);
__decorate([
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Post)("users/:userId/risk/recompute"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RiskController.prototype, "recompute", null);
__decorate([
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Get)("admin/risk/users"),
    __param(0, (0, common_1.Query)("minRisk")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RiskController.prototype, "listHighRisk", null);
exports.RiskController = RiskController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        riskEngine_service_1.RiskEngineService,
        admin_auth_service_1.AdminAuthService])
], RiskController);

export const RiskController = exports.RiskController as any;
export type RiskController = any;
