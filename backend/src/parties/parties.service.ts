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
exports.PartiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const socialIdentity_service_1 = require("../social/socialIdentity.service");
const questEngine_service_1 = require("../quests/questEngine.service");
const feed_util_1 = require("../social/feed.util");
const crypto_1 = require("crypto");
const SLUG_REGEX = /^[a-z0-9-]+$/;
const VISIBILITY = new Set(["PUBLIC", "INVITE_ONLY", "PRIVATE"]);
function normalizeSlug(raw) {
    const trimmed = (raw || "").trim().toLowerCase();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 32)
        return { valid: false, slug: "" };
    if (!SLUG_REGEX.test(trimmed))
        return { valid: false, slug: "" };
    if (trimmed.startsWith("-") || trimmed.endsWith("-"))
        return { valid: false, slug: "" };
    return { valid: true, slug: trimmed };
}
function parsePagination(page, limit) {
    const pageNumber = Math.max(Number(page || 1), 1);
    const take = Math.min(Math.max(Number(limit || 20), 1), 50);
    const skip = (pageNumber - 1) * take;
    return { page: pageNumber, take, skip };
}
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
let PartiesService = class PartiesService {
    constructor(prisma, identities, questEngine) {
        this.prisma = prisma;
        this.identities = identities;
        this.questEngine = questEngine;
    }
    async createParty(params, ownerAchusrId) {
        const name = (params.name || "").trim();
        if (!name || name.length > 80)
            throw new common_1.BadRequestException("INVALID_NAME");
        const slugInfo = normalizeSlug(params.slug);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const visibility = (params.visibility || "PUBLIC").toUpperCase();
        if (!VISIBILITY.has(visibility))
            throw new common_1.BadRequestException("INVALID_VISIBILITY");
        const existing = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (existing)
            throw new common_1.BadRequestException("SLUG_TAKEN");
        const [party] = await this.prisma.$transaction([
            this.prisma.party.create({
                data: {
                    slug: slugInfo.slug,
                    name,
                    description: params.description?.trim() || null,
                    visibility: visibility,
                    ownerAchusrId,
                },
            }),
            this.prisma.partyMember.create({
                data: {
                    party: { connect: { slug: slugInfo.slug } },
                    achusrId: ownerAchusrId,
                    role: "OWNER",
                    status: "ACTIVE",
                },
            }),
        ]);
        const membersCount = await this.prisma.partyMember.count({ where: { partyId: party.id, status: "ACTIVE" } });
        return { ...party, membersCount };
    }
    async getPartyBySlug(slugRaw, viewerAchusrId) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        const membership = viewerAchusrId
            ? await this.prisma.partyMember.findUnique({
                where: { partyId_achusrId: { partyId: party.id, achusrId: viewerAchusrId } },
            })
            : null;
        const isMember = membership?.status === "ACTIVE";
        if (party.visibility === "PRIVATE" && !isMember) {
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        }
        if (party.visibility === "INVITE_ONLY" && !isMember) {
            // limited info
            return {
                id: party.id,
                slug: party.slug,
                name: party.name,
                description: party.description,
                visibility: party.visibility,
                avatarUrl: party.avatarUrl,
                bannerUrl: party.bannerUrl,
                ownerAchusrId: party.ownerAchusrId,
                membersCount: await this.prisma.partyMember.count({ where: { partyId: party.id, status: "ACTIVE" } }),
                isMember: false,
                role: null,
            };
        }
        const membersCount = await this.prisma.partyMember.count({ where: { partyId: party.id, status: "ACTIVE" } });
        return {
            id: party.id,
            slug: party.slug,
            name: party.name,
            description: party.description,
            visibility: party.visibility,
            avatarUrl: party.avatarUrl,
            bannerUrl: party.bannerUrl,
            ownerAchusrId: party.ownerAchusrId,
            membersCount,
            isMember,
            role: membership?.role || null,
        };
    }
    async listMembers(slugRaw, viewerAchusrId, page, limit) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        if (party.visibility === "PRIVATE") {
            const membership = viewerAchusrId
                ? await this.prisma.partyMember.findUnique({
                    where: { partyId_achusrId: { partyId: party.id, achusrId: viewerAchusrId } },
                })
                : null;
            if (!membership || membership.status !== "ACTIVE") {
                throw new common_1.ForbiddenException("NOT_ALLOWED");
            }
        }
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const [total, rows] = await this.prisma.$transaction([
            this.prisma.partyMember.count({ where: { partyId: party.id, status: "ACTIVE" } }),
            this.prisma.partyMember.findMany({
                where: { partyId: party.id, status: "ACTIVE" },
                orderBy: { joinedAt: "asc" },
                skip,
                take,
            }),
        ]);
        const achusrIds = rows.map((row) => row.achusrId);
        const identityMap = await this.identities.getSummaries(achusrIds);
        const streaks = await this.prisma.userStreak.findMany({ where: { achusrId: { in: achusrIds } } });
        const streakMap = new Map(streaks.map((s) => [s.achusrId, s]));
        const stats = await mapWithConcurrency(achusrIds, 4, async (id) => {
            const totals = await this.questEngine.getTotalsForUser(id);
            return { id, totals };
        });
        const xpMap = new Map(stats.map((s) => [s.id, s.totals]));
        const data = rows.map((row) => {
            const identity = identityMap.get(row.achusrId);
            const streak = streakMap.get(row.achusrId);
            const totals = xpMap.get(row.achusrId);
            return {
                achusrId: row.achusrId,
                username: identity?.username || "",
                displayName: identity?.displayName || row.achusrId,
                avatar: identity?.avatar || "",
                role: row.role,
                xpTotal: totals?.totalXp ?? 0,
                level: totals?.level ?? 1,
                currentStreak: streak?.currentStreak ?? 0,
            };
        });
        return { data, page: pageNumber, limit: take, total };
    }
    async joinParty(slugRaw, achusrId) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        if (party.visibility !== "PUBLIC") {
            throw new common_1.ForbiddenException("JOIN_NOT_ALLOWED");
        }
        const existing = await this.prisma.partyMember.findUnique({
            where: { partyId_achusrId: { partyId: party.id, achusrId } },
        });
        if (existing && existing.status === "ACTIVE")
            return existing;
        if (existing) {
            return this.prisma.partyMember.update({
                where: { id: existing.id },
                data: { status: "ACTIVE", role: "MEMBER", joinedAt: new Date(), leftAt: null },
            });
        }
        return this.prisma.partyMember.create({
            data: {
                partyId: party.id,
                achusrId,
                role: "MEMBER",
                status: "ACTIVE",
            },
        });
    }
    async leaveParty(slugRaw, achusrId) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        const membership = await this.prisma.partyMember.findUnique({
            where: { partyId_achusrId: { partyId: party.id, achusrId } },
        });
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.BadRequestException("NOT_A_MEMBER");
        if (membership.role === "OWNER") {
            throw new common_1.BadRequestException("OWNER_CANNOT_LEAVE");
        }
        return this.prisma.partyMember.update({
            where: { id: membership.id },
            data: { status: "LEFT", leftAt: new Date() },
        });
    }
    async createInvite(slugRaw, creatorAchusrId, maxUses, expiresAt) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        const member = await this.prisma.partyMember.findUnique({
            where: { partyId_achusrId: { partyId: party.id, achusrId: creatorAchusrId } },
        });
        if (!member || member.status !== "ACTIVE" || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const token = (0, crypto_1.randomBytes)(16).toString("hex");
        const invite = await this.prisma.partyInvite.create({
            data: {
                partyId: party.id,
                token,
                creatorAchusrId,
                maxUses: maxUses ?? null,
                useCount: 0,
                expiresAt: expiresAt ?? null,
            },
        });
        return invite;
    }
    async acceptInvite(token, achusrId) {
        const invite = await this.prisma.partyInvite.findUnique({ where: { token } });
        if (!invite || invite.status !== "ACTIVE")
            throw new common_1.BadRequestException("INVITE_INVALID");
        if (invite.expiresAt && invite.expiresAt.getTime() < Date.now())
            throw new common_1.BadRequestException("INVITE_EXPIRED");
        if (invite.maxUses !== null && invite.useCount >= invite.maxUses)
            throw new common_1.BadRequestException("INVITE_FULL");
        const party = await this.prisma.party.findUnique({ where: { id: invite.partyId } });
        if (!party)
            throw new common_1.BadRequestException("PARTY_NOT_FOUND");
        await this.prisma.$transaction(async (tx) => {
            const membership = await tx.partyMember.findUnique({
                where: { partyId_achusrId: { partyId: invite.partyId, achusrId } },
            });
            if (membership) {
                await tx.partyMember.update({
                    where: { id: membership.id },
                    data: { status: "ACTIVE", role: membership.role || "MEMBER", joinedAt: new Date(), leftAt: null },
                });
            }
            else {
                await tx.partyMember.create({
                    data: {
                        partyId: invite.partyId,
                        achusrId,
                        role: "MEMBER",
                        status: "ACTIVE",
                    },
                });
            }
            await tx.partyInvite.update({
                where: { id: invite.id },
                data: {
                    useCount: { increment: 1 },
                    status: invite.maxUses && invite.useCount + 1 >= invite.maxUses ? "USED" : invite.status,
                },
            });
        });
        return party;
    }
    async listMyParties(achusrId) {
        const memberships = await this.prisma.partyMember.findMany({
            where: { achusrId, status: "ACTIVE" },
            include: { party: true },
            orderBy: { joinedAt: "asc" },
        });
        const partyIds = memberships.map((m) => m.party.id);
        if (!partyIds.length)
            return [];
        const counts = await this.prisma.partyMember.groupBy({
            by: ["partyId"],
            where: { partyId: { in: partyIds }, status: "ACTIVE" },
            _count: { partyId: true },
        });
        const countMap = new Map(counts.map((c) => [c.partyId, c._count.partyId]));
        return memberships.map((m) => ({
            id: m.party.id,
            slug: m.party.slug,
            name: m.party.name,
            description: m.party.description,
            visibility: m.party.visibility,
            avatarUrl: m.party.avatarUrl,
            bannerUrl: m.party.bannerUrl,
            role: m.role,
            membersCount: countMap.get(m.party.id) || 0,
        }));
    }
    async listDiscoverParties(page, limit) {
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const parties = await this.prisma.party.findMany({
            where: { visibility: "PUBLIC" },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        });
        const partyIds = parties.map((p) => p.id);
        const countMap = new Map();
        if (partyIds.length) {
            const counts = await this.prisma.partyMember.groupBy({
                by: ["partyId"],
                where: { partyId: { in: partyIds }, status: "ACTIVE" },
                _count: { partyId: true },
            });
            for (const count of counts) {
                countMap.set(count.partyId, count._count.partyId);
            }
        }
        return {
            data: parties.map((party) => ({
                id: party.id,
                slug: party.slug,
                name: party.name,
                description: party.description,
                visibility: party.visibility,
                avatarUrl: party.avatarUrl,
                bannerUrl: party.bannerUrl,
                membersCount: countMap.get(party.id) || 0,
            })),
            page: pageNumber,
            limit: take,
        };
    }
    async getPartyFeed(slugRaw, viewerAchusrId, page, limit) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        if (party.visibility !== "PUBLIC") {
            const membership = viewerAchusrId
                ? await this.prisma.partyMember.findUnique({
                    where: { partyId_achusrId: { partyId: party.id, achusrId: viewerAchusrId } },
                })
                : null;
            if (!membership || membership.status !== "ACTIVE") {
                throw new common_1.ForbiddenException("NOT_ALLOWED");
            }
        }
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const items = await this.prisma.partyFeedItem.findMany({
            where: { partyId: party.id },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        });
        const identityMap = await this.identities.getSummaries(items.map((item) => item.achusrId));
        const data = items.map((item) => ({
            id: item.id,
            type: item.type,
            payload: item.payload,
            createdAt: item.createdAt,
            summary: (0, feed_util_1.describeActivity)(item.type, item.payload),
            actor: identityMap.get(item.achusrId),
        }));
        return { data, page: pageNumber, limit: take, party: { slug: party.slug, name: party.name } };
    }
    async getFeedForUser(achusrId, page, limit) {
        const memberships = await this.prisma.partyMember.findMany({
            where: { achusrId, status: "ACTIVE" },
            select: { partyId: true },
        });
        const partyIds = memberships.map((m) => m.partyId);
        if (!partyIds.length)
            return { data: [], page: 1, limit: 20 };
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const items = await this.prisma.partyFeedItem.findMany({
            where: { partyId: { in: partyIds } },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        });
        const identityMap = await this.identities.getSummaries(items.map((item) => item.achusrId));
        const parties = await this.prisma.party.findMany({ where: { id: { in: partyIds } } });
        const partyMap = new Map(parties.map((p) => [p.id, { slug: p.slug, name: p.name }]));
        const data = items.map((item) => ({
            id: item.id,
            type: item.type,
            payload: item.payload,
            createdAt: item.createdAt,
            summary: (0, feed_util_1.describeActivity)(item.type, item.payload),
            actor: identityMap.get(item.achusrId),
            party: partyMap.get(item.partyId),
        }));
        return { data, page: pageNumber, limit: take };
    }
    async getPartyLeaderboardXp(slugRaw, viewerAchusrId, page, limit) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        if (party.visibility !== "PUBLIC") {
            const membership = viewerAchusrId
                ? await this.prisma.partyMember.findUnique({
                    where: { partyId_achusrId: { partyId: party.id, achusrId: viewerAchusrId } },
                })
                : null;
            if (!membership || membership.status !== "ACTIVE")
                throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const members = await this.prisma.partyMember.findMany({
            where: { partyId: party.id, status: "ACTIVE" },
            select: { achusrId: true },
        });
        const totals = await mapWithConcurrency(members, 4, async (member) => {
            const stats = await this.questEngine.getTotalsForUser(member.achusrId);
            return { achusrId: member.achusrId, totalXp: stats.totalXp, level: stats.level };
        });
        totals.sort((a, b) => b.totalXp - a.totalXp);
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const pageItems = totals.slice(skip, skip + take);
        const identityMap = await this.identities.getSummaries(pageItems.map((t) => t.achusrId));
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
            page: pageNumber,
            limit: take,
        };
    }
    async getPartyLeaderboardStreak(slugRaw, viewerAchusrId, page, limit) {
        const slugInfo = normalizeSlug(slugRaw);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const party = await this.prisma.party.findUnique({ where: { slug: slugInfo.slug } });
        if (!party)
            throw new common_1.NotFoundException("PARTY_NOT_FOUND");
        if (party.visibility !== "PUBLIC") {
            const membership = viewerAchusrId
                ? await this.prisma.partyMember.findUnique({
                    where: { partyId_achusrId: { partyId: party.id, achusrId: viewerAchusrId } },
                })
                : null;
            if (!membership || membership.status !== "ACTIVE")
                throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const members = await this.prisma.partyMember.findMany({
            where: { partyId: party.id, status: "ACTIVE" },
            select: { achusrId: true },
        });
        const streaks = await this.prisma.userStreak.findMany({
            where: { achusrId: { in: members.map((m) => m.achusrId) } },
        });
        streaks.sort((a, b) => {
            if (b.currentStreak !== a.currentStreak)
                return b.currentStreak - a.currentStreak;
            if (b.longestStreak !== a.longestStreak)
                return b.longestStreak - a.longestStreak;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const pageItems = streaks.slice(skip, skip + take);
        const identityMap = await this.identities.getSummaries(pageItems.map((s) => s.achusrId));
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
            page: pageNumber,
            limit: take,
        };
    }
};
exports.PartiesService = PartiesService;
exports.PartiesService = PartiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        socialIdentity_service_1.SocialIdentityService,
        questEngine_service_1.QuestEngineService])
], PartiesService);

export const PartiesService = exports.PartiesService as any;
export type PartiesService = any;
