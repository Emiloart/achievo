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
exports.IdentityController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const username_util_1 = require("./username.util");
const jwt_guard_1 = require("../auth/jwt.guard");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const goalStatus_1 = require("../achievo/goalStatus");
const viem_1 = require("viem");
const usernameRegistry_service_1 = require("../blockchain/usernameRegistry.service");
const questEngine_service_1 = require("../quests/questEngine.service");
const jwt_1 = require("@nestjs/jwt");
const socialIdentity_service_1 = require("../social/socialIdentity.service");
const feed_util_1 = require("../social/feed.util");
const auth_request_1 = require("../auth/auth.request");
function normalizeAchusrId(raw) {
    const trimmed = (raw || "").trim().toUpperCase();
    if (!/^ACHUSR-\d{10}$/.test(trimmed))
        return null;
    return trimmed;
}
let IdentityController = class IdentityController {
    constructor(prisma, onchain, registry, questEngine, jwt, identities) {
        this.prisma = prisma;
        this.onchain = onchain;
        this.registry = registry;
        this.questEngine = questEngine;
        this.jwt = jwt;
        this.identities = identities;
    }
    async resolveAchusrId(req) {
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
    async availability(username) {
        const norm = (0, username_util_1.normalizeUsername)(username || "");
        if (!norm.valid || !norm.normalized) {
            return { available: false, reason: "INVALID" };
        }
        const existing = await this.prisma.username.findFirst({
            where: { usernameNormalized: norm.normalized, status: "ACTIVE" },
        });
        if (existing) {
            return { available: false, reason: "TAKEN" };
        }
        return { available: true, reason: "AVAILABLE" };
    }
    async claim(body, req) {
        const rawUsername = body?.username || "";
        const cleaned = rawUsername.trim().startsWith("@") ? rawUsername.trim().slice(1) : rawUsername.trim();
        const norm = (0, username_util_1.normalizeUsername)(cleaned);
        if (!norm.valid || !norm.normalized) {
            throw new common_1.BadRequestException("INVALID_USERNAME");
        }
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { userId: true, primaryWallet: true },
        });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const achusrId = user.userId;
        const wallet = (0, viem_1.getAddress)(user.primaryWallet);
        const onchainId = await this.onchain.getUserId(wallet);
        const formatted = (0, username_util_1.toAchusrId)(onchainId);
        if (formatted !== achusrId) {
            throw new common_1.BadRequestException("ACHUSR_MISMATCH");
        }
        const onchainOwner = await this.registry.ownerOfUsername(cleaned);
        if (!onchainOwner || onchainOwner === "0x0000000000000000000000000000000000000000") {
            throw new common_1.BadRequestException("USERNAME_NOT_CLAIMED");
        }
        if ((0, viem_1.getAddress)(onchainOwner) !== wallet) {
            throw new common_1.BadRequestException("USERNAME_OWNER_MISMATCH");
        }
        const existing = await this.prisma.username.findFirst({
            where: { usernameNormalized: norm.normalized, status: "ACTIVE" },
        });
        if (existing && existing.achusrId !== achusrId) {
            throw new common_1.BadRequestException("USERNAME_TAKEN");
        }
        if (existing && existing.achusrId === achusrId) {
            const updated = await this.prisma.username.update({
                where: { id: existing.id },
                data: { username: cleaned, walletAddress: wallet },
            });
            return {
                success: true,
                data: {
                    achusrId,
                    walletAddress: wallet,
                    username: updated.username,
                    usernameNormalized: updated.usernameNormalized,
                },
            };
        }
        await this.prisma.$transaction([
            this.prisma.username.updateMany({ where: { achusrId, status: "ACTIVE" }, data: { status: "LOCKED" } }),
            this.prisma.username.create({
                data: {
                    achusrId,
                    walletAddress: wallet,
                    username: cleaned,
                    usernameNormalized: norm.normalized,
                    status: "ACTIVE",
                },
            }),
        ]);
        return {
            success: true,
            data: {
                achusrId,
                walletAddress: wallet,
                username: cleaned,
                usernameNormalized: norm.normalized,
            },
        };
    }
    async buildResultFromWallet(wallet) {
        const checksum = (0, viem_1.getAddress)(wallet);
        const user = await this.prisma.user.findFirst({ where: { primaryWallet: checksum } });
        const displayName = user?.displayName || "";
        const onchain = await this.onchain.getUserProfile(checksum);
        const achusrId = user?.userId || onchain.achusrId || "";
        const usernameRow = await this.prisma.username.findFirst({
            where: { achusrId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        const goals = await this.onchain.getGoalsByCreator(checksum);
        const badges = await this.onchain.getBadgesByOwner(checksum);
        const withStatuses = goals.map(goalStatus_1.withStatus);
        const goalsCompleted = withStatuses.filter((goal) => goal.status === "VERIFIED" || goal.status === "BADGED").length;
        const { xp: goalXp } = (0, goalStatus_1.computeXpAndLevel)(withStatuses);
        const totals = achusrId
            ? await this.questEngine.getTotalXpAndLevel(achusrId, goalXp)
            : { totalXp: goalXp, level: (0, goalStatus_1.computeLevelFromXp)(goalXp) };
        const professional = achusrId ? await this.prisma.professionalProfile.findUnique({ where: { achusrId } }) : null;
        return {
            achusrId: achusrId || "",
            walletAddress: checksum,
            username: usernameRow?.username || onchain.username || "",
            displayName: displayName || usernameRow?.username || onchain.username || "",
            avatar: onchain.avatar || "",
            goalsCount: goals.length,
            badgesCount: badges.length,
            level: totals.level,
            totalXP: totals.totalXp,
            _goalsCompleted: goalsCompleted,
            _skills: professional?.skills || [],
            _availability: professional?.availability || "UNSPECIFIED",
        };
    }
    async search(q, skills, availability, minLevel, minGoalsCompleted) {
        const query = (q || "").trim();
        if (!query)
            return { results: [] };
        const results = [];
        const seen = new Set();
        const pushResult = async (wallet) => {
            const checksum = (0, viem_1.getAddress)(wallet);
            if (seen.has(checksum))
                return;
            const res = await this.buildResultFromWallet(checksum);
            seen.add(checksum);
            results.push(res);
        };
        if (query.startsWith("@")) {
            const norm = (0, username_util_1.normalizeUsername)(query.slice(1));
            if (norm.valid && norm.normalized) {
                const row = await this.prisma.username.findFirst({
                    where: { usernameNormalized: norm.normalized, status: "ACTIVE" },
                });
                if (row) {
                    const user = await this.prisma.user.findFirst({ where: { userId: row.achusrId } });
                    if (user?.primaryWallet) {
                        await pushResult(user.primaryWallet);
                        return { results };
                    }
                }
            }
            return { results };
        }
        if (/^ACHUSR-\d{10}$/i.test(query)) {
            const row = await this.prisma.user.findFirst({ where: { userId: query.toUpperCase() } });
            if (row?.primaryWallet) {
                await pushResult(row.primaryWallet);
            }
            return { results };
        }
        if ((0, viem_1.isAddress)(query)) {
            const addr = (0, viem_1.getAddress)(query);
            await pushResult(addr);
            return { results };
        }
        // Fuzzy fallback (simple contains)
        const normalized = query.toLowerCase();
        const usernameMatches = await this.prisma.username.findMany({
            where: { usernameNormalized: { contains: normalized }, status: "ACTIVE" },
            take: 10,
        });
        for (const row of usernameMatches) {
            const user = await this.prisma.user.findFirst({ where: { userId: row.achusrId } });
            if (user?.primaryWallet) {
                await pushResult(user.primaryWallet);
                if (results.length >= 10)
                    break;
            }
        }
        if (results.length < 10) {
            const displayMatches = await this.prisma.user.findMany({
                where: { displayName: { contains: query, mode: "insensitive" } },
                take: 10,
            });
            for (const user of displayMatches) {
                await pushResult(user.primaryWallet);
                if (results.length >= 10)
                    break;
            }
        }
        const filtersActive = Boolean(skills || availability || minLevel || minGoalsCompleted);
        const stripInternal = (rows) => rows.map((result) => {
            const { _skills, _availability, _goalsCompleted, ...rest } = result;
            return rest;
        });
        if (!filtersActive) {
            return { results: stripInternal(results) };
        }
        const skillFilters = (skills || "")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
        const availabilityFilter = availability ? availability.trim().toUpperCase() : "";
        const minLevelValue = minLevel ? Number(minLevel) : null;
        const minGoalsValue = minGoalsCompleted ? Number(minGoalsCompleted) : null;
        const filtered = results.filter((result) => {
            if (skillFilters.length) {
                const candidateSkills = Array.isArray(result._skills) ? result._skills.map((s) => s.toLowerCase()) : [];
                const overlaps = skillFilters.some((skill) => candidateSkills.includes(skill));
                if (!overlaps)
                    return false;
            }
            if (availabilityFilter) {
                if (String(result._availability || "").toUpperCase() !== availabilityFilter)
                    return false;
            }
            if (minLevelValue !== null && Number.isFinite(minLevelValue)) {
                if (Number(result.level || 0) < minLevelValue)
                    return false;
            }
            if (minGoalsValue !== null && Number.isFinite(minGoalsValue)) {
                if (Number(result._goalsCompleted || 0) < minGoalsValue)
                    return false;
            }
            return true;
        });
        return { results: stripInternal(filtered) };
    }
    async follow(achusrIdParam, req) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const user = await this.prisma.user.findUnique({ where: { id: req.user?.sub }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        if (user.userId === target)
            throw new common_1.BadRequestException("CANNOT_FOLLOW_SELF");
        await this.prisma.userFollow.upsert({
            where: { followerAchusrId_followedAchusrId: { followerAchusrId: user.userId, followedAchusrId: target } },
            update: { status: "ACTIVE" },
            create: { followerAchusrId: user.userId, followedAchusrId: target, status: "ACTIVE" },
        });
        return { success: true };
    }
    async unfollow(achusrIdParam, req) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const user = await this.prisma.user.findUnique({ where: { id: req.user?.sub }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("Unauthorized");
        await this.prisma.userFollow.updateMany({
            where: { followerAchusrId: user.userId, followedAchusrId: target },
            data: { status: "MUTED" },
        });
        return { success: true };
    }
    async followers(achusrIdParam, page, limit) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const pageNumber = Math.max(Number(page || 1), 1);
        const take = Math.min(Math.max(Number(limit || 20), 1), 50);
        const skip = (pageNumber - 1) * take;
        const [total, rows] = await this.prisma.$transaction([
            this.prisma.userFollow.count({ where: { followedAchusrId: target, status: "ACTIVE" } }),
            this.prisma.userFollow.findMany({
                where: { followedAchusrId: target, status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
        ]);
        const ids = rows.map((row) => row.followerAchusrId);
        const identityMap = await this.identities.getSummaries(ids);
        const data = ids.map((id) => ({
            achusrId: id,
            username: identityMap.get(id)?.username || "",
            displayName: identityMap.get(id)?.displayName || id,
            avatar: identityMap.get(id)?.avatar || "",
        }));
        return { success: true, data, page: pageNumber, limit: take, total };
    }
    async following(achusrIdParam, page, limit) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const pageNumber = Math.max(Number(page || 1), 1);
        const take = Math.min(Math.max(Number(limit || 20), 1), 50);
        const skip = (pageNumber - 1) * take;
        const [total, rows] = await this.prisma.$transaction([
            this.prisma.userFollow.count({ where: { followerAchusrId: target, status: "ACTIVE" } }),
            this.prisma.userFollow.findMany({
                where: { followerAchusrId: target, status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
        ]);
        const ids = rows.map((row) => row.followedAchusrId);
        const identityMap = await this.identities.getSummaries(ids);
        const data = ids.map((id) => ({
            achusrId: id,
            username: identityMap.get(id)?.username || "",
            displayName: identityMap.get(id)?.displayName || id,
            avatar: identityMap.get(id)?.avatar || "",
        }));
        return { success: true, data, page: pageNumber, limit: take, total };
    }
    async followStats(achusrIdParam, req) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const [followersCount, followingCount] = await this.prisma.$transaction([
            this.prisma.userFollow.count({ where: { followedAchusrId: target, status: "ACTIVE" } }),
            this.prisma.userFollow.count({ where: { followerAchusrId: target, status: "ACTIVE" } }),
        ]);
        const viewerAchusrId = await this.resolveAchusrId(req);
        let isFollowing = false;
        if (viewerAchusrId) {
            const existing = await this.prisma.userFollow.findUnique({
                where: { followerAchusrId_followedAchusrId: { followerAchusrId: viewerAchusrId, followedAchusrId: target } },
            });
            isFollowing = existing?.status === "ACTIVE";
        }
        return { success: true, followersCount, followingCount, isFollowing };
    }
    async activity(achusrIdParam, page, limit) {
        const target = normalizeAchusrId(achusrIdParam);
        if (!target)
            throw new common_1.BadRequestException("INVALID_ACHUSR");
        const pageNumber = Math.max(Number(page || 1), 1);
        const take = Math.min(Math.max(Number(limit || 20), 1), 50);
        const skip = (pageNumber - 1) * take;
        const [total, rows] = await this.prisma.$transaction([
            this.prisma.userActivity.count({ where: { achusrId: target } }),
            this.prisma.userActivity.findMany({
                where: { achusrId: target },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
        ]);
        const data = rows.map((row) => ({
            id: row.id,
            type: row.type,
            payload: row.payload,
            createdAt: row.createdAt,
            summary: (0, feed_util_1.describeActivity)(row.type, row.payload),
        }));
        return { success: true, data, page: pageNumber, limit: take, total };
    }
};
exports.IdentityController = IdentityController;
__decorate([
    (0, common_1.Get)("username/availability"),
    __param(0, (0, common_1.Query)("username")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "availability", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("username"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "claim", null);
__decorate([
    (0, common_1.Get)("search"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("skills")),
    __param(2, (0, common_1.Query)("availability")),
    __param(3, (0, common_1.Query)("minLevel")),
    __param(4, (0, common_1.Query)("minGoalsCompleted")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "search", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":achusrId/follow"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "follow", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":achusrId/unfollow"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "unfollow", null);
__decorate([
    (0, common_1.Get)(":achusrId/followers"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "followers", null);
__decorate([
    (0, common_1.Get)(":achusrId/following"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "following", null);
__decorate([
    (0, common_1.Get)(":achusrId/follow-stats"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "followStats", null);
__decorate([
    (0, common_1.Get)(":achusrId/activity"),
    __param(0, (0, common_1.Param)("achusrId")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "activity", null);
exports.IdentityController = IdentityController = __decorate([
    (0, common_1.Controller)("identity"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11,
        usernameRegistry_service_1.UsernameRegistryService,
        questEngine_service_1.QuestEngineService,
        jwt_1.JwtService,
        socialIdentity_service_1.SocialIdentityService])
], IdentityController);

export const IdentityController = exports.IdentityController as any;
export type IdentityController = any;
