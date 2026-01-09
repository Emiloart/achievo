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
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const questEngine_service_1 = require("../quests/questEngine.service");
const socialIdentity_service_1 = require("../social/socialIdentity.service");
async function mapWithConcurrency(items, limit, fn) {
    const results = [];
    let index = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (index < items.length) {
            const current = items[index++];
            // eslint-disable-next-line no-await-in-loop
            const result = await fn(current);
            results.push(result);
        }
    });
    await Promise.all(workers);
    return results;
}
let LeaderboardService = class LeaderboardService {
    constructor(prisma, quests, identities) {
        this.prisma = prisma;
        this.quests = quests;
        this.identities = identities;
    }
    async getGlobalXp(page = 1, limit = 20) {
        const users = await this.prisma.user.findMany({ select: { userId: true } });
        const totals = await mapWithConcurrency(users, 4, async (user) => {
            const stats = await this.quests.getTotalsForUser(user.userId);
            return { achusrId: user.userId, totalXp: stats.totalXp, level: stats.level };
        });
        totals.sort((a, b) => b.totalXp - a.totalXp);
        const skip = (page - 1) * limit;
        const pageItems = totals.slice(skip, skip + limit);
        const identityMap = await this.identities.getSummaries(pageItems.map((item) => item.achusrId));
        return {
            data: pageItems.map((item, idx) => ({
                rank: skip + idx + 1,
                achusrId: item.achusrId,
                username: identityMap.get(item.achusrId)?.username || "",
                displayName: identityMap.get(item.achusrId)?.displayName || item.achusrId,
                avatar: identityMap.get(item.achusrId)?.avatar || "",
                xpTotal: item.totalXp,
                level: item.level,
            })),
            page,
            limit,
        };
    }
    async getGlobalStreak(page = 1, limit = 20) {
        const streaks = await this.prisma.userStreak.findMany();
        streaks.sort((a, b) => {
            if (b.currentStreak !== a.currentStreak)
                return b.currentStreak - a.currentStreak;
            if (b.longestStreak !== a.longestStreak)
                return b.longestStreak - a.longestStreak;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        const skip = (page - 1) * limit;
        const pageItems = streaks.slice(skip, skip + limit);
        const identityMap = await this.identities.getSummaries(pageItems.map((item) => item.achusrId));
        return {
            data: pageItems.map((item, idx) => ({
                rank: skip + idx + 1,
                achusrId: item.achusrId,
                username: identityMap.get(item.achusrId)?.username || "",
                displayName: identityMap.get(item.achusrId)?.displayName || item.achusrId,
                avatar: identityMap.get(item.achusrId)?.avatar || "",
                currentStreak: item.currentStreak,
                longestStreak: item.longestStreak,
            })),
            page,
            limit,
        };
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        questEngine_service_1.QuestEngineService,
        socialIdentity_service_1.SocialIdentityService])
], LeaderboardService);

export const LeaderboardService = exports.LeaderboardService as any;
export type LeaderboardService = any;
