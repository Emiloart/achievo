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
exports.MonitoringController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const admin_auth_guard_1 = require("../security/adminAuth/admin-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const ADMIN_TTL_RAW = Number(process.env.THROTTLE_ADMIN_TTL);
const ADMIN_LIMIT_RAW = Number(process.env.THROTTLE_ADMIN_LIMIT);
const ADMIN_TTL_SECONDS = Number.isFinite(ADMIN_TTL_RAW) && ADMIN_TTL_RAW > 0 ? ADMIN_TTL_RAW : 60;
const ADMIN_TTL_MS = ADMIN_TTL_SECONDS * 1000;
const ADMIN_LIMIT = Number.isFinite(ADMIN_LIMIT_RAW) && ADMIN_LIMIT_RAW > 0 ? ADMIN_LIMIT_RAW : 30;
let MonitoringController = class MonitoringController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(severity, type, since) {
        const where = {};
        if (severity)
            where.severity = String(severity).toUpperCase();
        if (type)
            where.type = String(type).toUpperCase();
        if (since) {
            const date = new Date(since);
            if (Number.isNaN(date.getTime()))
                throw new common_1.BadRequestException("INVALID_SINCE");
            where.createdAt = { gte: date };
        }
        const data = await this.prisma.operationalAlert.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        return { success: true, data };
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("severity")),
    __param(1, (0, common_1.Query)("type")),
    __param(2, (0, common_1.Query)("since")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "list", null);
exports.MonitoringController = MonitoringController = __decorate([
    (0, common_1.Controller)("admin/alerts"),
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MonitoringController);

export const MonitoringController = exports.MonitoringController as any;
export type MonitoringController = any;
