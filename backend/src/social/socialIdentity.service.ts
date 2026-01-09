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
exports.SocialIdentityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
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
let SocialIdentityService = class SocialIdentityService {
    constructor(prisma, onchain) {
        this.prisma = prisma;
        this.onchain = onchain;
    }
    async getSummaries(achusrIds) {
        const cleaned = Array.from(new Set(achusrIds.filter(Boolean)));
        if (!cleaned.length)
            return new Map();
        const users = await this.prisma.user.findMany({
            where: { userId: { in: cleaned } },
            select: { userId: true, primaryWallet: true, displayName: true },
        });
        const usernames = await this.prisma.username.findMany({
            where: { achusrId: { in: cleaned }, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        const usernameMap = new Map();
        for (const row of usernames) {
            if (!usernameMap.has(row.achusrId)) {
                usernameMap.set(row.achusrId, row.username);
            }
        }
        const walletMap = new Map();
        const displayMap = new Map();
        for (const user of users) {
            walletMap.set(user.userId, user.primaryWallet);
            displayMap.set(user.userId, user.displayName || "");
        }
        const avatars = new Map();
        await mapWithConcurrency(users, 4, async (user) => {
            if (!user.primaryWallet)
                return;
            const profile = await this.onchain.getUserProfile(user.primaryWallet);
            avatars.set(user.userId, profile.avatar || "");
            if (profile.username && !usernameMap.has(user.userId)) {
                usernameMap.set(user.userId, profile.username);
            }
        });
        const result = new Map();
        for (const achusrId of cleaned) {
            const username = usernameMap.get(achusrId) || "";
            const displayName = displayMap.get(achusrId) || username || achusrId;
            result.set(achusrId, {
                achusrId,
                walletAddress: walletMap.get(achusrId) || "",
                username,
                displayName,
                avatar: avatars.get(achusrId) || "",
            });
        }
        return result;
    }
};
exports.SocialIdentityService = SocialIdentityService;
exports.SocialIdentityService = SocialIdentityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11])
], SocialIdentityService);

export const SocialIdentityService = exports.SocialIdentityService as any;
export type SocialIdentityService = any;
