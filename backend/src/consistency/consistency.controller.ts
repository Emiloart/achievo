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
exports.ConsistencyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const activityEvent_service_1 = require("./activityEvent.service");
const consistencyScoring_service_1 = require("./consistencyScoring.service");
const activityEvent_types_1 = require("./activityEvent.types");
const privacy_service_1 = require("../privacy/privacy.service");
const jwt_1 = require("@nestjs/jwt");
const auth_request_1 = require("../auth/auth.request");
let ConsistencyController = class ConsistencyController {
    constructor(prisma, scoring, activity, privacy, jwt) {
        this.prisma = prisma;
        this.scoring = scoring;
        this.activity = activity;
        this.privacy = privacy;
        this.jwt = jwt;
    }
    scoreDto(score) {
        return {
            userId: score.userId,
            scoreVersion: score.scoreVersion,
            streakDays: score.streakDays,
            bestStreakDays: score.bestStreakDays,
            streakScore: score.streakScore,
            reliabilityScore: score.reliabilityScore,
            anomalyScore: score.anomalyScore,
            credibilityScore: score.credibilityScore,
            lastActiveDay: score.lastActiveDay ? new Date(score.lastActiveDay).toISOString() : null,
            computedAt: score.computedAt ? new Date(score.computedAt).toISOString() : null,
            explanations: score.explanations || {},
        };
    }
    async resolveViewer(req) {
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
    assertAdmin(req) {
        if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
            throw new common_1.ForbiddenException("ADMIN_ONLY");
        }
        return true;
    }
    async getConsistency(userId, req) {
        const viewer = await this.resolveViewer(req);
        const settings = await this.privacy.getSettings(userId);
        if (!settings.showConsistency && viewer !== userId) {
            return { success: true, data: { hidden: true } };
        }
        const score = await this.scoring.getConsistencyScore(userId);
        const summary = await this.scoring.getActivitySummary(userId);
        return { success: true, data: { score: this.scoreDto(score), summary, hidden: false } };
    }
    async getSummary(userId, req) {
        const viewer = await this.resolveViewer(req);
        const settings = await this.privacy.getSettings(userId);
        if (!settings.showConsistency && viewer !== userId) {
            return { success: true, data: { hidden: true } };
        }
        const summary = await this.scoring.getActivitySummary(userId);
        return { success: true, data: summary };
    }
    async recomputeSelf(req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const score = await this.scoring.recompute(user.userId);
        return { success: true, data: this.scoreDto(score) };
    }
    async createEvent(body, req) {
        this.assertAdmin(req);
        const userId = String(body?.userId || "").trim();
        if (!userId)
            throw new common_1.BadRequestException("USER_ID_REQUIRED");
        const type = String(body?.type || "").trim();
        if (!Object.values(activityEvent_types_1.ActivityEventType).includes(type)) {
            throw new common_1.BadRequestException("INVALID_TYPE");
        }
        const occurredAt = body?.occurredAt ? new Date(body.occurredAt) : new Date();
        if (Number.isNaN(occurredAt.getTime()))
            throw new common_1.BadRequestException("INVALID_DATE");
        const event = await this.activity.recordEvent({
            userId,
            type: type,
            refId: body?.refId ?? null,
            weight: body?.weight,
            occurredAt,
            allowDuplicate: true,
        });
        return { success: true, data: event };
    }
    async recompute(userId, req) {
        this.assertAdmin(req);
        const score = await this.scoring.recompute(userId);
        return { success: true, data: this.scoreDto(score) };
    }
};
exports.ConsistencyController = ConsistencyController;
__decorate([
    (0, common_1.Get)("users/:userId/consistency"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConsistencyController.prototype, "getConsistency", null);
__decorate([
    (0, common_1.Get)("users/:userId/activity/summary"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConsistencyController.prototype, "getSummary", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("users/me/consistency/recompute"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConsistencyController.prototype, "recomputeSelf", null);
__decorate([
    (0, common_1.Post)("activity/events"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ConsistencyController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Post)("activity/recompute/:userId"),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConsistencyController.prototype, "recompute", null);
exports.ConsistencyController = ConsistencyController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        consistencyScoring_service_1.ConsistencyScoringService,
        activityEvent_service_1.ActivityEventService,
        privacy_service_1.PrivacyPolicyService,
        jwt_1.JwtService])
], ConsistencyController);

export const ConsistencyController = exports.ConsistencyController as any;
export type ConsistencyController = any;
