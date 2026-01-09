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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityEventService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const activityEvent_types_1 = require("./activityEvent.types");
const consistency_utils_1 = require("./consistency.utils");
const consistencyScoring_service_1 = require("./consistencyScoring.service");
const riskEngine_service_1 = require("../risk/riskEngine.service");
let ActivityEventService = class ActivityEventService {
    constructor(prisma, scoring, risk) {
        this.prisma = prisma;
        this.scoring = scoring;
        this.risk = risk;
    }
    normalizeWeight(weight) {
        if (!Number.isFinite(weight))
            return 1;
        const safe = Math.floor(weight);
        if (safe < 1)
            return 1;
        if (safe > 10)
            return 10;
        return safe;
    }
    async resolveUserTimeZone(userId) {
        const profile = await this.prisma.professionalProfile.findUnique({
            where: { achusrId: userId },
            select: { timezone: true },
        });
        return (0, consistency_utils_1.resolveTimeZone)(profile?.timezone ?? null);
    }
    async recordEvent(input) {
        const userId = String(input.userId || "").trim();
        if (!userId)
            return null;
        const refId = input.refId ? String(input.refId).trim() : null;
        const occurredAt = input.occurredAt ?? new Date();
        const weight = this.normalizeWeight(input.weight);
        if (!input.allowDuplicate && refId) {
            const existing = await this.prisma.userActivityEvent.findFirst({
                where: { userId, type: input.type, refId },
                select: { id: true },
            });
            if (existing)
                return null;
        }
        if (input.type === activityEvent_types_1.ActivityEventType.CHECKIN && !input.allowDuplicate) {
            const timeZone = await this.resolveUserTimeZone(userId);
            const targetDay = (0, consistency_utils_1.dayKeyFromDate)(occurredAt, timeZone);
            const windowStart = new Date(occurredAt);
            windowStart.setUTCDate(windowStart.getUTCDate() - 1);
            const windowEnd = new Date(occurredAt);
            windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
            const recent = await this.prisma.userActivityEvent.findMany({
                where: {
                    userId,
                    type: activityEvent_types_1.ActivityEventType.CHECKIN,
                    occurredAt: { gte: windowStart, lte: windowEnd },
                },
                take: 5,
            });
            if (recent.some((event) => (0, consistency_utils_1.dayKeyFromDate)(event.occurredAt, timeZone) === targetDay)) {
                return null;
            }
        }
        const created = await this.prisma.userActivityEvent.create({
            data: {
                userId,
                type: input.type,
                refId,
                weight,
                occurredAt,
            },
        });
        void (async () => {
            try {
                await this.risk.recompute(userId);
            }
            catch { }
            try {
                await this.scoring.recompute(userId);
            }
            catch { }
        })();
        return created;
    }
};
exports.ActivityEventService = ActivityEventService;
exports.ActivityEventService = ActivityEventService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        consistencyScoring_service_1.ConsistencyScoringService,
        riskEngine_service_1.RiskEngineService])
], ActivityEventService);

export const ActivityEventService = exports.ActivityEventService as any;
export type ActivityEventService = any;
