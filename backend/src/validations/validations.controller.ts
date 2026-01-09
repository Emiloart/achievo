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
exports.UserValidationsController = exports.ValidationsController = exports.ValidatorsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const validations_service_1 = require("./validations.service");
const validators_service_1 = require("./validators.service");
const viem_1 = require("viem");
const auth_request_1 = require("../auth/auth.request");
let ValidatorsController = class ValidatorsController {
    constructor(validators, validations, prisma, jwt) {
        this.validators = validators;
        this.validations = validations;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async resolveUser(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({
                    where: { id: decoded.sub },
                    select: { userId: true, primaryWallet: true },
                })
                : null;
            return user || null;
        }
        catch {
            return null;
        }
    }
    async register(body, req) {
        const walletAddress = String(body?.walletAddress || "").trim();
        const displayName = String(body?.displayName || "").trim();
        const type = String(body?.type || "")
            .trim()
            .toUpperCase();
        const user = await this.resolveUser(req);
        const normalizedWallet = walletAddress && (0, viem_1.isAddress)(walletAddress) ? (0, viem_1.getAddress)(walletAddress).toLowerCase() : "";
        const userId = user && normalizedWallet && user.primaryWallet.toLowerCase() === normalizedWallet ? user.userId : null;
        const profile = await this.validators.registerValidator({
            walletAddress,
            displayName,
            type,
            bio: body?.bio,
            website: body?.website,
            userId,
        });
        return { success: true, data: profile };
    }
    async getValidator(walletAddress) {
        const data = await this.validators.getValidatorProfile(walletAddress);
        return { success: true, data };
    }
    async listRequests(walletAddress, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { primaryWallet: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const normalized = (0, viem_1.getAddress)(walletAddress).toLowerCase();
        if (user.primaryWallet.toLowerCase() !== normalized)
            throw new common_1.BadRequestException("Wallet mismatch");
        const data = await this.validations.listValidatorRequests(walletAddress);
        return { success: true, data: data.data };
    }
};
exports.ValidatorsController = ValidatorsController;
__decorate([
    (0, common_1.Post)("register"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ValidatorsController.prototype, "register", null);
__decorate([
    (0, common_1.Get)(":walletAddress"),
    __param(0, (0, common_1.Param)("walletAddress")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ValidatorsController.prototype, "getValidator", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":walletAddress/requests"),
    __param(0, (0, common_1.Param)("walletAddress")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ValidatorsController.prototype, "listRequests", null);
exports.ValidatorsController = ValidatorsController = __decorate([
    (0, common_1.Controller)("validators"),
    __metadata("design:paramtypes", [validators_service_1.ValidatorsService,
        validations_service_1.ValidationsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], ValidatorsController);
let ValidationsController = class ValidationsController {
    constructor(validations, prisma, jwt) {
        this.validations = validations;
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({
                    where: { id: decoded.sub },
                    select: { userId: true, primaryWallet: true },
                })
                : null;
            return user ? { achusrId: user.userId, walletAddress: user.primaryWallet } : null;
        }
        catch {
            return null;
        }
    }
    async createRequest(body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const data = await this.validations.createRequest(user.userId, body || {});
        return { success: true, data };
    }
    async getRequest(id, req, token) {
        const viewer = await this.resolveViewer(req);
        const data = await this.validations.getRequest(id, viewer || undefined, token);
        return { success: true, data };
    }
    async prepare(id, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { primaryWallet: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const data = await this.validations.prepareAttestation(id, user.primaryWallet, body || {});
        return { success: true, data };
    }
    async attest(id, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { primaryWallet: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const data = await this.validations.attest(id, user.primaryWallet, body || {});
        return { success: true, data };
    }
    async revoke(id, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { primaryWallet: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        const data = await this.validations.revoke(id, user.primaryWallet, body || {});
        return { success: true, data };
    }
};
exports.ValidationsController = ValidationsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("requests"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ValidationsController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)("requests/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ValidationsController.prototype, "getRequest", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("requests/:id/attestation/prepare"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ValidationsController.prototype, "prepare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("requests/:id/attest"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ValidationsController.prototype, "attest", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("requests/:id/revoke"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ValidationsController.prototype, "revoke", null);
exports.ValidationsController = ValidationsController = __decorate([
    (0, common_1.Controller)("validations"),
    __metadata("design:paramtypes", [validations_service_1.ValidationsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], ValidationsController);
let UserValidationsController = class UserValidationsController {
    constructor(validations, prisma, jwt) {
        this.validations = validations;
        this.prisma = prisma;
        this.jwt = jwt;
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
    async listUserValidations(userId, status, badgeTokenId, achievementId, limit, cursor, req) {
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const viewer = req ? await this.resolveViewer(req) : null;
        const data = await this.validations.listUserValidations(userId, viewer, {
            status,
            badgeTokenId,
            achievementId,
            limit,
            cursor,
        });
        return { success: true, ...data };
    }
};
exports.UserValidationsController = UserValidationsController;
__decorate([
    (0, common_1.Get)(":userId/validations"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("badgeTokenId")),
    __param(3, (0, common_1.Query)("achievementId")),
    __param(4, (0, common_1.Query)("limit")),
    __param(5, (0, common_1.Query)("cursor")),
    __param(6, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], UserValidationsController.prototype, "listUserValidations", null);
exports.UserValidationsController = UserValidationsController = __decorate([
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [validations_service_1.ValidationsService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserValidationsController);

export const UserValidationsController = exports.UserValidationsController as any;
export const ValidationsController = exports.ValidationsController as any;
export const ValidatorsController = exports.ValidatorsController as any;
export type UserValidationsController = any;
export type ValidationsController = any;
export type ValidatorsController = any;
