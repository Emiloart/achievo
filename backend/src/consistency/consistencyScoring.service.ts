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
exports.ConsistencyScoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const activityEvent_types_1 = require("./activityEvent.types");
const consistency_utils_1 = require("./consistency.utils");
const STREAK_LOOKBACK_DAYS = 180;
const ANOMALY_LOOKBACK_DAYS = 30;
const WEEKLY_SUMMARY_WEEKS = 8;
const MIN_RELIABILITY_SIGNALS = 3;
const BURST_WINDOW_MINUTES = 10;
const BURST_THRESHOLD = 20;
const REPEAT_THRESHOLD = 5;
const PATTERN_THRESHOLD = 10;
const WEIGHT_STREAK = 0.45;
const WEIGHT_RELIABILITY = 0.35;
const WEIGHT_ANOMALY = 0.2;
const streakScoreCache = new Map();
function computeStreakScore(streakDays) {
    const safe = Math.max(0, Math.min(streakDays, 365));
    const cached = streakScoreCache.get(safe);
    if (cached !== undefined)
        return cached;
    const score = Math.min(100, Math.floor(100 * (1 - Math.exp(-safe / 14))));
    streakScoreCache.set(safe, score);
    return score;
}
function clampScore(value) {
    if (!Number.isFinite(value))
        return 0;
    if (value < 0)
        return 0;
    if (value > 100)
        return 100;
    return Math.round(value);
}
let ConsistencyScoringService = class ConsistencyScoringService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserTimeZone(userId) {
        const profile = await this.prisma.professionalProfile.findUnique({
            where: { achusrId: userId },
            select: { timezone: true },
        });
        return (0, consistency_utils_1.resolveTimeZone)(profile?.timezone ?? null);
    }
    async getConsistencyScore(userId) {
        const existing = await this.prisma.userConsistencyScore.findUnique({ where: { userId } });
        if (existing)
            return existing;
        return this.recompute(userId);
    }
    async recompute(userId) {
        const now = new Date();
        const timeZone = await this.getUserTimeZone(userId);
        const streakStart = new Date(now);
        streakStart.setUTCDate(streakStart.getUTCDate() - STREAK_LOOKBACK_DAYS);
        const anomalyStart = new Date(now);
        anomalyStart.setUTCDate(anomalyStart.getUTCDate() - ANOMALY_LOOKBACK_DAYS);
        const events = await this.prisma.userActivityEvent.findMany({
            where: { userId, occurredAt: { gte: streakStart } },
            orderBy: { occurredAt: "asc" },
        });
        const dayWeights = new Map();
        const counts = new Map();
        for (const event of events) {
            const dayKey = (0, consistency_utils_1.dayKeyFromDate)(event.occurredAt, timeZone);
            dayWeights.set(dayKey, (dayWeights.get(dayKey) || 0) + (event.weight || 1));
            counts.set(event.type, (counts.get(event.type) || 0) + 1);
        }
        const activeDays = Array.from(dayWeights.entries())
            .filter(([, weight]) => weight >= 1)
            .map(([dayKey]) => dayKey)
            .sort();
        const activeSet = new Set(activeDays);
        const todayKey = (0, consistency_utils_1.dayKeyFromDate)(now, timeZone);
        const lastActiveKey = activeDays.length ? activeDays[activeDays.length - 1] : null;
        const streakAnchor = activeSet.has(todayKey) ? todayKey : lastActiveKey;
        let currentStreak = 0;
        if (streakAnchor) {
            let cursor = streakAnchor;
            while (activeSet.has(cursor)) {
                currentStreak += 1;
                cursor = (0, consistency_utils_1.shiftDayKey)(cursor, -1);
            }
        }
        let bestStreak = 0;
        let run = 0;
        let prevKey = null;
        for (const dayKey of activeDays) {
            if (prevKey && (0, consistency_utils_1.shiftDayKey)(prevKey, 1) === dayKey) {
                run += 1;
            }
            else {
                run = 1;
            }
            if (run > bestStreak)
                bestStreak = run;
            prevKey = dayKey;
        }
        const streakScore = computeStreakScore(currentStreak);
        const startedEvents = (counts.get(activityEvent_types_1.ActivityEventType.TASK_STARTED) || 0) + (counts.get(activityEvent_types_1.ActivityEventType.CHECKIN) || 0);
        const completedEvents = (counts.get(activityEvent_types_1.ActivityEventType.TASK_COMPLETED) || 0) +
            (counts.get(activityEvent_types_1.ActivityEventType.BADGE_MINTED) || 0) +
            (counts.get(activityEvent_types_1.ActivityEventType.VALIDATION_APPROVED) || 0);
        let reliabilityScore = 35;
        const totalSignals = startedEvents + completedEvents;
        if (totalSignals > 0) {
            const ratio = completedEvents / Math.max(startedEvents, 1);
            const base = Math.round(Math.min(1, ratio) * 100);
            reliabilityScore = totalSignals < MIN_RELIABILITY_SIGNALS ? Math.min(base, 40) : base;
        }
        const recentEvents = events.filter((event) => event.occurredAt >= anomalyStart);
        const anomalies = [];
        let burstMax = 0;
        let left = 0;
        const burstWindowMs = BURST_WINDOW_MINUTES * 60 * 1000;
        for (let right = 0; right < recentEvents.length; right += 1) {
            const rightTime = recentEvents[right].occurredAt.getTime();
            while (rightTime - recentEvents[left].occurredAt.getTime() > burstWindowMs) {
                left += 1;
            }
            const count = right - left + 1;
            if (count > burstMax)
                burstMax = count;
        }
        if (burstMax >= BURST_THRESHOLD) {
            anomalies.push(`Burst activity: ${burstMax} events within ${BURST_WINDOW_MINUTES} minutes.`);
        }
        const refCounts = new Map();
        for (const event of recentEvents) {
            if (!event.refId)
                continue;
            refCounts.set(event.refId, (refCounts.get(event.refId) || 0) + 1);
        }
        const topRepeats = Array.from(refCounts.entries()).filter(([, count]) => count >= REPEAT_THRESHOLD);
        if (topRepeats.length) {
            anomalies.push(`Repeated references: ${topRepeats
                .slice(0, 3)
                .map(([ref, count]) => `${ref} (${count}x)`)
                .join(", ")}`);
        }
        const typeDayCounts = new Map();
        for (const event of recentEvents) {
            const dayKey = (0, consistency_utils_1.dayKeyFromDate)(event.occurredAt, timeZone);
            const key = `${dayKey}:${event.type}`;
            typeDayCounts.set(key, (typeDayCounts.get(key) || 0) + 1);
        }
        const patterned = Array.from(typeDayCounts.entries()).filter(([, count]) => count >= PATTERN_THRESHOLD);
        if (patterned.length) {
            anomalies.push(`Repeated activity patterns detected (${patterned.length} spikes).`);
        }
        let anomalyScore = 0;
        if (burstMax >= BURST_THRESHOLD)
            anomalyScore += 40;
        if (topRepeats.length)
            anomalyScore += 30;
        if (patterned.length)
            anomalyScore += 30;
        anomalyScore = clampScore(anomalyScore);
        const baseCredibilityScore = clampScore(streakScore * WEIGHT_STREAK + reliabilityScore * WEIGHT_RELIABILITY + (100 - anomalyScore) * WEIGHT_ANOMALY);
        const riskProfile = await this.prisma.userRiskProfile.findUnique({
            where: { userId },
            select: { riskScore: true, riskLevel: true, signals: true },
        });
        const riskScore = riskProfile?.riskScore ?? 0;
        const riskPenalty = Math.floor(riskScore * 0.25);
        const credibilityScore = clampScore(baseCredibilityScore - riskPenalty);
        const explanations = {
            streak: {
                currentStreakDays: currentStreak,
                bestStreakDays: bestStreak,
                activeDays: activeDays.length,
                lastActiveDay: lastActiveKey,
            },
            reliability: {
                startedEvents,
                completedEvents,
                totalSignals,
                score: reliabilityScore,
            },
            risk: {
                riskScore,
                riskLevel: riskProfile?.riskLevel ?? "LOW",
                riskPenalty,
                topSignals: Array.isArray(riskProfile?.signals) ? (riskProfile?.signals).slice(0, 3) : [],
            },
            anomalies,
            composite: {
                streakScore,
                reliabilityScore,
                anomalyScore,
                baseCredibilityScore,
                riskPenalty,
                credibilityScore,
                weights: { streak: WEIGHT_STREAK, reliability: WEIGHT_RELIABILITY, anomaly: WEIGHT_ANOMALY },
            },
        };
        const payload = {
            userId,
            scoreVersion: "1",
            streakDays: currentStreak,
            bestStreakDays: bestStreak,
            streakScore,
            reliabilityScore,
            anomalyScore,
            credibilityScore,
            lastActiveDay: lastActiveKey ? (0, consistency_utils_1.dayKeyToDate)(lastActiveKey) : null,
            computedAt: now,
            explanations: explanations,
        };
        return this.prisma.userConsistencyScore.upsert({
            where: { userId },
            update: payload,
            create: {
                ...payload,
            },
        });
    }
    async getActivitySummary(userId) {
        const now = new Date();
        const timeZone = await this.getUserTimeZone(userId);
        const summaryStart = new Date(now);
        summaryStart.setUTCDate(summaryStart.getUTCDate() - WEEKLY_SUMMARY_WEEKS * 7);
        const events = await this.prisma.userActivityEvent.findMany({
            where: { userId, occurredAt: { gte: summaryStart } },
            orderBy: { occurredAt: "asc" },
        });
        const activeDays = new Set();
        const typeCounts = new Map();
        for (const event of events) {
            activeDays.add((0, consistency_utils_1.dayKeyFromDate)(event.occurredAt, timeZone));
            typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
        }
        const weeklyCounts = new Map();
        for (const dayKey of activeDays) {
            const weekKey = (0, consistency_utils_1.weekKeyFromDayKey)(dayKey);
            weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
        }
        const weekly = [];
        let cursor = new Date(now);
        for (let i = 0; i < WEEKLY_SUMMARY_WEEKS; i += 1) {
            const weekKey = (0, consistency_utils_1.weekKeyFromDate)(cursor, timeZone);
            weekly.unshift({
                weekKey,
                weekStart: (0, consistency_utils_1.weekStartFromKey)(weekKey),
                activeDays: weeklyCounts.get(weekKey) || 0,
            });
            cursor.setUTCDate(cursor.getUTCDate() - 7);
        }
        const topEvents = Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
        return {
            weekly,
            activeDays: activeDays.size,
            topEvents,
        };
    }
};
exports.ConsistencyScoringService = ConsistencyScoringService;
exports.ConsistencyScoringService = ConsistencyScoringService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConsistencyScoringService);

export const ConsistencyScoringService = exports.ConsistencyScoringService as any;
export type ConsistencyScoringService = any;
