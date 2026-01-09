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
exports.UserExportsController = exports.ProfileExportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const profileExports_service_1 = require("./profileExports.service");
const common_2 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const auth_request_1 = require("../auth/auth.request");
let ProfileExportsController = class ProfileExportsController {
    constructor(exportsService, prisma, jwt) {
        this.exportsService = exportsService;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    getBaseUrl(req) {
        const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
        const proto = req.headers["x-forwarded-proto"] || "http";
        return `${proto}://${host}`;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } })
                : null;
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async createExport(body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const baseUrl = this.getBaseUrl(req);
        const data = await this.exportsService.createProfileExport(user.userId, {
            format: body?.format,
            anchor: Boolean(body?.anchor),
            baseUrl,
        });
        return { success: true, data };
    }
    async verify(body) {
        const data = await this.exportsService.verifyExport(body?.snapshot, body?.signature, body?.signerAddress);
        return { success: true, data };
    }
    async getExport(publicId, req, token) {
        const baseUrl = this.getBaseUrl(req);
        const viewer = await this.resolveViewer(req);
        const data = await this.exportsService.getExportByPublicId(publicId, baseUrl, { viewerAchusrId: viewer, token });
        return { success: true, data };
    }
    async download(publicId, res, req, token) {
        const viewer = await this.resolveViewer(req);
        const { stream, mimeType } = await this.exportsService.getDownloadStream(publicId, {
            viewerAchusrId: viewer,
            token,
        });
        res.header("Content-Type", mimeType);
        res.header("Content-Disposition", `inline; filename="achievo-export-${publicId}.pdf"`);
        return new common_2.StreamableFile(stream);
    }
};
exports.ProfileExportsController = ProfileExportsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("profile"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileExportsController.prototype, "createExport", null);
__decorate([
    (0, common_1.Post)("verify"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileExportsController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)(":publicId"),
    __param(0, (0, common_1.Param)("publicId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ProfileExportsController.prototype, "getExport", null);
__decorate([
    (0, common_1.Get)(":publicId/download"),
    __param(0, (0, common_1.Param)("publicId")),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], ProfileExportsController.prototype, "download", null);
exports.ProfileExportsController = ProfileExportsController = __decorate([
    (0, common_1.Controller)("exports"),
    __metadata("design:paramtypes", [profileExports_service_1.ProfileExportsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], ProfileExportsController);
let UserExportsController = class UserExportsController {
    constructor(exportsService, prisma) {
        this.exportsService = exportsService;
        this.prisma = prisma;
    }
    getBaseUrl(req) {
        const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
        const proto = req.headers["x-forwarded-proto"] || "http";
        return `${proto}://${host}`;
    }
    async listExports(userId, req, limit, cursor) {
        const viewerId = req.user?.sub;
        const viewer = await this.prisma.user.findUnique({ where: { id: viewerId }, select: { userId: true } });
        if (!viewer)
            throw new common_1.BadRequestException("Unauthorized");
        const baseUrl = this.getBaseUrl(req);
        const data = await this.exportsService.listExportsForUser(userId, viewer.userId, baseUrl, { limit, cursor });
        return { success: true, ...data };
    }
};
exports.UserExportsController = UserExportsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":userId/exports"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("limit")),
    __param(3, (0, common_1.Query)("cursor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], UserExportsController.prototype, "listExports", null);
exports.UserExportsController = UserExportsController = __decorate([
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [profileExports_service_1.ProfileExportsService,
        prisma_service_1.PrismaService])
], UserExportsController);

export const ProfileExportsController = exports.ProfileExportsController as any;
export const UserExportsController = exports.UserExportsController as any;
export type ProfileExportsController = any;
export type UserExportsController = any;
