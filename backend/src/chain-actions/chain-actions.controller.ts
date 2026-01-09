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
exports.ChainActionsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const chain_actions_service_1 = require("./chain-actions.service");
const admin_auth_guard_1 = require("../security/adminAuth/admin-auth.guard");
const ADMIN_TTL_RAW = Number(process.env.THROTTLE_ADMIN_TTL);
const ADMIN_LIMIT_RAW = Number(process.env.THROTTLE_ADMIN_LIMIT);
const ADMIN_TTL_SECONDS = Number.isFinite(ADMIN_TTL_RAW) && ADMIN_TTL_RAW > 0 ? ADMIN_TTL_RAW : 60;
const ADMIN_TTL_MS = ADMIN_TTL_SECONDS * 1000;
const ADMIN_LIMIT = Number.isFinite(ADMIN_LIMIT_RAW) && ADMIN_LIMIT_RAW > 0 ? ADMIN_LIMIT_RAW : 30;
let ChainActionsController = class ChainActionsController {
    constructor(actions) {
        this.actions = actions;
    }
    async list(status, type, chainId, limit) {
        const parsedStatus = status ? String(status).toUpperCase() : undefined;
        const parsedType = type ? String(type).toUpperCase() : undefined;
        const parsedChainId = chainId ? Number(chainId) : undefined;
        const parsedLimit = limit ? Number(limit) : undefined;
        const statusEnum = parsedStatus
            ? client_1.ChainActionStatus[parsedStatus]
            : undefined;
        const typeEnum = parsedType ? client_1.ChainActionType[parsedType] : undefined;
        if (parsedStatus && !statusEnum)
            throw new common_1.BadRequestException("INVALID_STATUS");
        if (parsedType && !typeEnum)
            throw new common_1.BadRequestException("INVALID_TYPE");
        if (parsedChainId !== undefined && !Number.isFinite(parsedChainId))
            throw new common_1.BadRequestException("INVALID_CHAIN");
        const data = await this.actions.list({
            status: statusEnum,
            type: typeEnum,
            chainId: Number.isFinite(parsedChainId) ? parsedChainId : undefined,
            limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        });
        return { success: true, data };
    }
    async getOne(id) {
        if (!id)
            throw new common_1.BadRequestException("INVALID_ID");
        const data = await this.actions.getById(id);
        if (!data)
            throw new common_1.BadRequestException("NOT_FOUND");
        return { success: true, data };
    }
};
exports.ChainActionsController = ChainActionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("status")),
    __param(1, (0, common_1.Query)("type")),
    __param(2, (0, common_1.Query)("chainId")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ChainActionsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChainActionsController.prototype, "getOne", null);
exports.ChainActionsController = ChainActionsController = __decorate([
    (0, common_1.Controller)("admin/chain-actions"),
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } }),
    __metadata("design:paramtypes", [chain_actions_service_1.ChainActionsService])
], ChainActionsController);

export const ChainActionsController = exports.ChainActionsController as any;
export type ChainActionsController = any;
