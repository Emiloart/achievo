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
exports.QuestEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const quest_types_1 = require("./quest.types");
const goalStatus_1 = require("../achievo/goalStatus");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const partyFeed_service_1 = require("../social/partyFeed.service");
const activityEvent_service_1 = require("../consistency/activityEvent.service");
const activityEvent_types_1 = require("../consistency/activityEvent.types");
const STREAK_THRESHOLDS = [
    { threshold: 7, xpReward: 50 },
    { threshold: 30, xpReward: 200 },
];
function toDayKey(date) {
    return date.toISOString().slice(0, 10);
}
function toWeekKey(date) {
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function toUtcDateOnly(dayKey) {
    return new Date(`${dayKey}T00:00:00.000Z`);
}
function addDays(date, days) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}
let QuestEngineService = class QuestEngineService {
    constructor(prisma, onchain, partyFeed, activity) {
        this.prisma = prisma;
        this.onchain = onchain;
        this.partyFeed = partyFeed;
        this.activity = activity;
    }
    async recordEvent(params) {
        const now = params.eventDate ?? new Date();
        const dayKey = toDayKey(now);
        const weekKey = toWeekKey(now);
        const todayKey = toDayKey(new Date());
        const currentWeekKey = toWeekKey(new Date());
        const refId = params.metadata?.refId;
        const refType = params.metadata?.refType || "event";
        const requiresDedup = params.eventType !== quest_types_1.QuestEventType.DAILY_LOGIN;
        let didLog = true;
        if (requiresDedup) {
            if (refId === undefined || refId === null) {
                return;
            }
            didLog = await this.tryLogEvent(params.achusrId, params.eventType, refType, String(refId));
            if (!didLog)
                return;
        }
        if (this.shouldCountStreak(params.eventType) && dayKey === todayKey) {
            await this.updateStreak(params.achusrId, dayKey);
        }
        const templates = await this.prisma.questTemplate.findMany({
            where: { active: true, triggerEvent: params.eventType },
            orderBy: { sortOrder: "asc" },
        });
        const eligibleTemplates = templates.filter((template) => {
            if (template.type === "DAILY")
                return dayKey === todayKey;
            if (template.type === "WEEKLY")
                return weekKey === currentWeekKey;
            return true;
        });
        for (const template of eligibleTemplates) {
            if (template.type === "MILESTONE" && template.isUniquePerUser) {
                const existingMilestone = await this.prisma.userQuest.findFirst({
                    where: { achusrId: params.achusrId, questTemplateId: template.id },
                });
                if (existingMilestone && ["COMPLETED", "CLAIMED"].includes(existingMilestone.status)) {
                    continue;
                }
            }
            if (template.type === "DAILY" || template.type === "WEEKLY") {
                const periodKey = template.type === "DAILY" ? dayKey : weekKey;
                const existing = await this.prisma.userQuest.findUnique({
                    where: {
                        achusrId_questTemplateId_periodKey: {
                            achusrId: params.achusrId,
                            questTemplateId: template.id,
                            periodKey,
                        },
                    },
                });
                if (!existing) {
                    const completed = template.targetCount <= 1;
                    await this.prisma.userQuest.create({
                        data: {
                            achusrId: params.achusrId,
                            questTemplateId: template.id,
                            periodKey,
                            currentCount: 1,
                            targetCount: template.targetCount,
                            status: completed ? "COMPLETED" : "ACTIVE",
                            completedAt: completed ? new Date() : null,
                            lastProgressAt: new Date(),
                        },
                    });
                    continue;
                }
                const nextCount = Math.min(existing.currentCount + 1, existing.targetCount);
                const updates = { currentCount: nextCount, lastProgressAt: new Date() };
                if (existing.status === "ACTIVE" && nextCount >= existing.targetCount) {
                    updates.status = "COMPLETED";
                    updates.completedAt = new Date();
                }
                await this.prisma.userQuest.update({ where: { id: existing.id }, data: updates });
            }
            else {
                const existing = await this.prisma.userQuest.findFirst({
                    where: { achusrId: params.achusrId, questTemplateId: template.id, periodKey: null },
                });
                if (!existing) {
                    const completed = template.targetCount <= 1;
                    await this.prisma.userQuest.create({
                        data: {
                            achusrId: params.achusrId,
                            questTemplateId: template.id,
                            periodKey: null,
                            currentCount: 1,
                            targetCount: template.targetCount,
                            status: completed ? "COMPLETED" : "ACTIVE",
                            completedAt: completed ? new Date() : null,
                            lastProgressAt: new Date(),
                        },
                    });
                }
                else {
                    const nextCount = Math.min(existing.currentCount + 1, existing.targetCount);
                    const updates = { currentCount: nextCount, lastProgressAt: new Date() };
                    if (existing.status === "ACTIVE" && nextCount >= existing.targetCount) {
                        updates.status = "COMPLETED";
                        updates.completedAt = new Date();
                    }
                    await this.prisma.userQuest.update({ where: { id: existing.id }, data: updates });
                }
            }
        }
        const activityType = this.mapToActivityEvent(params.eventType);
        if (activityType && (!requiresDedup || didLog)) {
            void this.activity
                .recordEvent({
                userId: params.achusrId,
                type: activityType,
                refId: refId !== undefined && refId !== null ? String(refId) : null,
                occurredAt: now,
            })
                .catch(() => { });
        }
        if (didLog) {
            void this.emitFeedForEvent(params, now).catch(() => { });
        }
    }
    async claimQuest(userQuestId, achusrId) {
        const quest = await this.prisma.userQuest.findUnique({
            where: { id: userQuestId },
            include: { questTemplate: true },
        });
        if (!quest || quest.achusrId !== achusrId) {
            throw new common_1.ForbiddenException("FORBIDDEN");
        }
        if (quest.status !== "COMPLETED") {
            throw new common_1.BadRequestException("QUEST_NOT_COMPLETED");
        }
        await this.prisma.userQuest.update({
            where: { id: userQuestId },
            data: { status: "CLAIMED", claimedAt: new Date() },
        });
        const goalXp = await this.computeGoalXpForUser(achusrId);
        const totals = await this.getTotalXpAndLevel(achusrId, goalXp);
        void this.partyFeed
            .addFeedItemForUserParties({
            achusrId,
            type: "QUEST_CLAIMED",
            payload: {
                questSlug: quest.questTemplate.slug,
                title: quest.questTemplate.title,
                xpReward: quest.questTemplate.xpReward,
                claimedAt: new Date().toISOString(),
            },
        })
            .catch(() => { });
        return {
            quest: {
                id: quest.id,
                slug: quest.questTemplate.slug,
                title: quest.questTemplate.title,
                description: quest.questTemplate.description,
                type: quest.questTemplate.type,
            },
            xpGained: quest.questTemplate.xpReward,
            totalXP: totals.totalXp,
            level: totals.level,
            status: "CLAIMED",
        };
    }
    async getQuestSummary(achusrId) {
        const now = new Date();
        const dayKey = toDayKey(now);
        const weekKey = toWeekKey(now);
        const [dailyTemplates, weeklyTemplates, milestoneTemplates] = await Promise.all([
            this.prisma.questTemplate.findMany({ where: { active: true, type: "DAILY" }, orderBy: { sortOrder: "asc" } }),
            this.prisma.questTemplate.findMany({ where: { active: true, type: "WEEKLY" }, orderBy: { sortOrder: "asc" } }),
            this.prisma.questTemplate.findMany({ where: { active: true, type: "MILESTONE" }, orderBy: { sortOrder: "asc" } }),
        ]);
        const dailyIds = dailyTemplates.map((t) => t.id);
        const weeklyIds = weeklyTemplates.map((t) => t.id);
        const milestoneIds = milestoneTemplates.map((t) => t.id);
        const [dailyUserQuests, weeklyUserQuests, milestoneUserQuests, streak, recentClaims] = await Promise.all([
            dailyIds.length
                ? this.prisma.userQuest.findMany({
                    where: { achusrId, questTemplateId: { in: dailyIds }, periodKey: dayKey },
                })
                : [],
            weeklyIds.length
                ? this.prisma.userQuest.findMany({
                    where: { achusrId, questTemplateId: { in: weeklyIds }, periodKey: weekKey },
                })
                : [],
            milestoneIds.length
                ? this.prisma.userQuest.findMany({
                    where: { achusrId, questTemplateId: { in: milestoneIds }, periodKey: null },
                })
                : [],
            this.prisma.userStreak.findUnique({ where: { achusrId } }),
            this.prisma.userQuest.findMany({
                where: { achusrId, status: "CLAIMED" },
                include: { questTemplate: true },
                orderBy: { claimedAt: "desc" },
                take: 10,
            }),
        ]);
        const daily = dailyTemplates.map((template) => {
            const row = dailyUserQuests.find((q) => q.questTemplateId === template.id);
            return this.formatQuestRow(template, row);
        });
        const weekly = weeklyTemplates.map((template) => {
            const row = weeklyUserQuests.find((q) => q.questTemplateId === template.id);
            return this.formatQuestRow(template, row);
        });
        const milestones = milestoneTemplates.map((template) => {
            const row = milestoneUserQuests.find((q) => q.questTemplateId === template.id);
            return this.formatQuestRow(template, row);
        });
        const recentActivity = recentClaims.map((row) => ({
            questSlug: row.questTemplate.slug,
            title: row.questTemplate.title,
            type: row.questTemplate.type,
            xpReward: row.questTemplate.xpReward,
            claimedAt: row.claimedAt,
            completedAt: row.completedAt,
        }));
        return {
            daily,
            weekly,
            milestones,
            streak: {
                currentStreak: streak?.currentStreak || 0,
                longestStreak: streak?.longestStreak || 0,
                lastActiveDate: streak?.lastActiveDate ? toDayKey(streak.lastActiveDate) : null,
            },
            recentActivity,
        };
    }
    async getTotalXpAndLevel(achusrId, goalXp) {
        const questXp = await this.getQuestXp(achusrId);
        const streakXp = await this.getStreakXp(achusrId);
        const totalXp = goalXp + questXp + streakXp;
        return { totalXp, level: (0, goalStatus_1.computeLevelFromXp)(totalXp), questXp, streakXp };
    }
    async getTotalsForUser(achusrId) {
        const goalXp = await this.computeGoalXpForUser(achusrId);
        return this.getTotalXpAndLevel(achusrId, goalXp);
    }
    async getQuestXp(achusrId) {
        const rows = await this.prisma.userQuest.findMany({
            where: { achusrId, status: "CLAIMED" },
            include: { questTemplate: true },
        });
        return rows.reduce((sum, row) => sum + (row.questTemplate?.xpReward || 0), 0);
    }
    async getStreakXp(achusrId) {
        const rows = await this.prisma.streakMilestone.findMany({ where: { achusrId } });
        return rows.reduce((sum, row) => sum + row.xpReward, 0);
    }
    async computeGoalXpForUser(achusrId) {
        const user = await this.prisma.user.findFirst({ where: { userId: achusrId }, select: { primaryWallet: true } });
        if (!user?.primaryWallet)
            return 0;
        const goals = await this.onchain.getGoalsByCreator(user.primaryWallet);
        const withStatuses = goals.map(goalStatus_1.withStatus);
        return (0, goalStatus_1.computeXpAndLevel)(withStatuses).xp;
    }
    async updateStreak(achusrId, dayKey) {
        const todayKey = toDayKey(new Date());
        if (dayKey !== todayKey)
            return;
        const existing = await this.prisma.userStreak.findUnique({ where: { achusrId } });
        if (!existing) {
            const created = await this.prisma.userStreak.create({
                data: {
                    achusrId,
                    currentStreak: 1,
                    longestStreak: 1,
                    lastActiveDate: toUtcDateOnly(dayKey),
                },
            });
            await this.checkStreakMilestones(achusrId, created.currentStreak, 0);
            return;
        }
        const lastKey = existing.lastActiveDate ? toDayKey(existing.lastActiveDate) : "";
        if (lastKey === dayKey) {
            return;
        }
        const yesterdayKey = toDayKey(addDays(new Date(), -1));
        let currentStreak = existing.currentStreak;
        let lastBreakDate = existing.lastBreakDate;
        if (lastKey === yesterdayKey) {
            currentStreak += 1;
        }
        else {
            lastBreakDate = existing.lastActiveDate;
            currentStreak = 1;
        }
        const longestStreak = Math.max(existing.longestStreak, currentStreak);
        await this.prisma.userStreak.update({
            where: { achusrId },
            data: {
                currentStreak,
                longestStreak,
                lastActiveDate: toUtcDateOnly(dayKey),
                lastBreakDate,
            },
        });
        await this.checkStreakMilestones(achusrId, currentStreak, existing.longestStreak);
    }
    async checkStreakMilestones(achusrId, currentStreak, previousLongest) {
        for (const milestone of STREAK_THRESHOLDS) {
            if (currentStreak >= milestone.threshold && previousLongest < milestone.threshold) {
                try {
                    await this.prisma.streakMilestone.create({
                        data: {
                            achusrId,
                            threshold: milestone.threshold,
                            xpReward: milestone.xpReward,
                        },
                    });
                    void this.partyFeed
                        .addFeedItemForUserParties({
                        achusrId,
                        type: "STREAK_MILESTONE",
                        payload: {
                            currentStreak,
                            threshold: milestone.threshold,
                            xpBonus: milestone.xpReward,
                            awardedAt: new Date().toISOString(),
                        },
                    })
                        .catch(() => { });
                }
                catch {
                    // ignore duplicates
                }
            }
        }
    }
    shouldCountStreak(eventType) {
        return eventType === quest_types_1.QuestEventType.DAILY_LOGIN || eventType === quest_types_1.QuestEventType.GOAL_VERIFIED;
    }
    mapToActivityEvent(eventType) {
        if (eventType === quest_types_1.QuestEventType.DAILY_LOGIN)
            return activityEvent_types_1.ActivityEventType.CHECKIN;
        if (eventType === quest_types_1.QuestEventType.GOAL_CREATED)
            return activityEvent_types_1.ActivityEventType.TASK_STARTED;
        if (eventType === quest_types_1.QuestEventType.GOAL_VERIFIED)
            return activityEvent_types_1.ActivityEventType.TASK_COMPLETED;
        if (eventType === quest_types_1.QuestEventType.BADGE_MINTED)
            return activityEvent_types_1.ActivityEventType.BADGE_MINTED;
        return null;
    }
    async tryLogEvent(achusrId, eventType, refType, refId) {
        try {
            await this.prisma.questEventLog.create({
                data: {
                    achusrId,
                    eventType,
                    refType,
                    refId,
                },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async emitFeedForEvent(params, now) {
        const refId = params.metadata?.refId;
        if (params.eventType === quest_types_1.QuestEventType.GOAL_VERIFIED) {
            await this.partyFeed.addFeedItemForUserParties({
                achusrId: params.achusrId,
                type: "GOAL_VERIFIED",
                payload: {
                    goalId: refId,
                    verifiedAt: now.toISOString(),
                },
                createdAt: now,
            });
        }
        if (params.eventType === quest_types_1.QuestEventType.BADGE_MINTED) {
            await this.partyFeed.addFeedItemForUserParties({
                achusrId: params.achusrId,
                type: "BADGE_MINTED",
                payload: {
                    badgeId: refId,
                    mintedAt: now.toISOString(),
                },
                createdAt: now,
            });
        }
    }
    formatQuestRow(template, row) {
        return {
            userQuestId: row?.id || null,
            slug: template.slug,
            title: template.title,
            description: template.description,
            type: template.type,
            triggerEvent: template.triggerEvent,
            currentCount: row?.currentCount ?? 0,
            targetCount: row?.targetCount ?? template.targetCount,
            status: row?.status ?? "ACTIVE",
            xpReward: template.xpReward,
        };
    }
};
exports.QuestEngineService = QuestEngineService;
exports.QuestEngineService = QuestEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11,
        partyFeed_service_1.PartyFeedService,
        activityEvent_service_1.ActivityEventService])
], QuestEngineService);

export const QuestEngineService = exports.QuestEngineService as any;
export type QuestEngineService = any;
