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
exports.ProfessionalProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const questEngine_service_1 = require("../quests/questEngine.service");
const goalStatus_1 = require("../achievo/goalStatus");
const username_util_1 = require("../identity/username.util");
const viem_1 = require("viem");
const feed_util_1 = require("../social/feed.util");
const HANDLE_ACHUSR_REGEX = /^ACHUSR-\d{10}$/i;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const SECTION_KEYS = ["summary", "skills", "goals", "badges", "streak", "parties", "activity", "contact"];
function normalizeTags(input) {
    if (!input)
        return [];
    const raw = Array.isArray(input) ? input : String(input).split(",");
    const cleaned = raw
        .map((item) => String(item || "")
        .trim()
        .toLowerCase())
        .filter((item) => item.length > 0);
    return Array.from(new Set(cleaned));
}
function validateSlug(raw) {
    const value = (raw || "").trim().toLowerCase();
    if (!value || value.length < 3 || value.length > 32)
        return null;
    if (!SLUG_REGEX.test(value))
        return null;
    if (value.startsWith("-") || value.endsWith("-"))
        return null;
    return value;
}
function normalizeSections(input) {
    const output = {};
    for (const key of SECTION_KEYS) {
        output[key] = Boolean(input?.[key]);
    }
    return output;
}
function parseUrl(raw) {
    if (!raw)
        return null;
    const value = raw.trim();
    if (!value)
        return null;
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new common_1.BadRequestException("INVALID_URL");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new common_1.BadRequestException("INVALID_URL");
    }
    return value;
}
function parseNumber(raw) {
    if (raw === undefined || raw === null)
        return null;
    if (typeof raw === "number") {
        if (!Number.isFinite(raw))
            throw new common_1.BadRequestException("INVALID_NUMBER");
        return raw;
    }
    const trimmed = String(raw).trim();
    if (!trimmed)
        return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value))
        throw new common_1.BadRequestException("INVALID_NUMBER");
    return value;
}
function coerceAvailability(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.Availability, value)) {
        throw new common_1.BadRequestException("INVALID_AVAILABILITY");
    }
    return value;
}
function coerceVisibility(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ShareLinkVisibility, value)) {
        throw new common_1.BadRequestException("INVALID_VISIBILITY");
    }
    return value;
}
function coerceTheme(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ShareLinkTheme, value)) {
        throw new common_1.BadRequestException("INVALID_THEME");
    }
    return value;
}
function parseAchusrId(handle) {
    const trimmed = (handle || "").trim();
    if (!trimmed)
        return null;
    if (HANDLE_ACHUSR_REGEX.test(trimmed))
        return trimmed.toUpperCase();
    return null;
}
let ProfessionalProfileService = class ProfessionalProfileService {
    constructor(prisma, onchain, quests) {
        this.prisma = prisma;
        this.onchain = onchain;
        this.quests = quests;
    }
    async getProfessionalProfileForUser(achusrId) {
        const profile = await this.prisma.professionalProfile.findUnique({ where: { achusrId } });
        return this.formatProfessional(profile);
    }
    async updateProfessionalProfile(achusrId, input) {
        const existing = await this.prisma.professionalProfile.findUnique({ where: { achusrId } });
        const data = {};
        const fields = [
            { key: "headline", max: 140 },
            { key: "currentRole", max: 80 },
            { key: "currentOrg", max: 120 },
            { key: "location", max: 120 },
            { key: "timezone", max: 120 },
            { key: "bioShort", max: 280 },
            { key: "currency", max: 10 },
        ];
        for (const { key, max } of fields) {
            const raw = input[key];
            if (raw === undefined || raw === null)
                continue;
            const trimmed = String(raw).trim();
            if (!trimmed)
                continue;
            if (trimmed.length > max)
                throw new common_1.BadRequestException("INVALID_LENGTH");
            data[key] = trimmed;
        }
        if (input.skills !== undefined) {
            data.skills = normalizeTags(input.skills);
        }
        if (input.industries !== undefined) {
            data.industries = normalizeTags(input.industries);
        }
        const availability = coerceAvailability(input.availability);
        if (availability)
            data.availability = availability;
        const hourlyRateMin = parseNumber(input.hourlyRateMin ?? null);
        const hourlyRateMax = parseNumber(input.hourlyRateMax ?? null);
        if (hourlyRateMin !== null)
            data.hourlyRateMin = hourlyRateMin;
        if (hourlyRateMax !== null)
            data.hourlyRateMax = hourlyRateMax;
        const nextMin = hourlyRateMin ?? (existing?.hourlyRateMin ? Number(existing.hourlyRateMin) : null);
        const nextMax = hourlyRateMax ?? (existing?.hourlyRateMax ? Number(existing.hourlyRateMax) : null);
        if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
            throw new common_1.BadRequestException("INVALID_RATE_RANGE");
        }
        if (input.websiteUrl !== undefined)
            data.websiteUrl = parseUrl(input.websiteUrl);
        if (input.githubUrl !== undefined)
            data.githubUrl = parseUrl(input.githubUrl);
        if (input.linkedinUrl !== undefined)
            data.linkedinUrl = parseUrl(input.linkedinUrl);
        if (input.xUrl !== undefined)
            data.xUrl = parseUrl(input.xUrl);
        if (input.portfolioUrl !== undefined)
            data.portfolioUrl = parseUrl(input.portfolioUrl);
        if (input.isPublic !== undefined) {
            data.isPublic = Boolean(input.isPublic);
        }
        const updated = await this.prisma.professionalProfile.upsert({
            where: { achusrId },
            update: data,
            create: {
                achusrId,
                ...data,
            },
        });
        return this.formatProfessional(updated);
    }
    async resolveIdentityByHandle(handle) {
        const trimmed = (handle || "").trim();
        if (!trimmed)
            return null;
        if (trimmed.startsWith("@")) {
            const normalized = (0, username_util_1.normalizeUsername)(trimmed.slice(1));
            if (!normalized.valid || !normalized.normalized)
                return null;
            const usernameRow = await this.prisma.username.findFirst({
                where: { usernameNormalized: normalized.normalized, status: "ACTIVE" },
            });
            if (!usernameRow)
                return null;
            const user = await this.prisma.user.findFirst({
                where: { userId: usernameRow.achusrId },
                select: { userId: true, primaryWallet: true, displayName: true },
            });
            return user ? { achusrId: user.userId, walletAddress: user.primaryWallet, displayName: user.displayName } : null;
        }
        const achusrId = parseAchusrId(trimmed);
        if (achusrId) {
            const user = await this.prisma.user.findFirst({
                where: { userId: achusrId },
                select: { userId: true, primaryWallet: true, displayName: true },
            });
            return user ? { achusrId: user.userId, walletAddress: user.primaryWallet, displayName: user.displayName } : null;
        }
        if ((0, viem_1.isAddress)(trimmed)) {
            const wallet = (0, viem_1.getAddress)(trimmed);
            const user = await this.prisma.user.findFirst({
                where: { primaryWallet: wallet },
                select: { userId: true, primaryWallet: true, displayName: true },
            });
            if (user) {
                return { achusrId: user.userId, walletAddress: user.primaryWallet, displayName: user.displayName };
            }
            const profile = await this.onchain.getUserProfile(wallet);
            if (!profile.achusrId)
                return null;
            return { achusrId: profile.achusrId, walletAddress: wallet, displayName: "" };
        }
        return null;
    }
    async getPublicProfessionalProfile(handle) {
        const identity = await this.resolveIdentityByHandle(handle);
        if (!identity)
            throw new common_1.NotFoundException("PROFILE_NOT_FOUND");
        const professionalRow = await this.prisma.professionalProfile.findUnique({
            where: { achusrId: identity.achusrId },
        });
        if (!professionalRow || !professionalRow.isPublic) {
            throw new common_1.NotFoundException("PROFILE_NOT_FOUND");
        }
        return this.buildProfileResponse(identity.achusrId, identity.walletAddress, {
            includeProfessional: professionalRow,
            includePrivateProfessional: false,
        });
    }
    async getProfessionalProfileForMe(achusrId, walletAddress) {
        return this.buildProfileResponse(achusrId, walletAddress, { includePrivateProfessional: true });
    }
    async getPinsForUser(achusrId, walletAddress) {
        return this.buildPins(achusrId, walletAddress);
    }
    async updatePinsForUser(achusrId, walletAddress, pins) {
        if (!Array.isArray(pins))
            throw new common_1.BadRequestException("INVALID_PINS");
        if (pins.length > 6)
            throw new common_1.BadRequestException("TOO_MANY_PINS");
        const goals = await this.onchain.getGoalsByCreator(walletAddress);
        const badges = await this.onchain.getBadgesByOwner(walletAddress);
        const goalMap = new Map(goals.map((goal) => [String(goal.id), goal]));
        const badgeSet = new Set(badges.map((b) => String(b)));
        const partyMemberships = await this.prisma.partyMember.findMany({
            where: { achusrId, status: "ACTIVE" },
            select: { partyId: true },
        });
        const partySet = new Set(partyMemberships.map((m) => m.partyId));
        const payload = [];
        pins.forEach((pin, index) => {
            const type = String(pin.type || "").toUpperCase();
            const ref = String(pin.ref || "").trim();
            if (!ref)
                throw new common_1.BadRequestException("INVALID_PIN_REF");
            if (!Object.prototype.hasOwnProperty.call(client_1.ProfilePinType, type)) {
                throw new common_1.BadRequestException("INVALID_PIN_TYPE");
            }
            if (type === "GOAL" && !goalMap.has(ref)) {
                throw new common_1.BadRequestException("INVALID_GOAL_PIN");
            }
            if (type === "BADGE" && !badgeSet.has(ref)) {
                throw new common_1.BadRequestException("INVALID_BADGE_PIN");
            }
            if (type === "PARTY" && !partySet.has(ref)) {
                throw new common_1.BadRequestException("INVALID_PARTY_PIN");
            }
            payload.push({ achusrId, type, ref, position: index });
        });
        await this.prisma.$transaction([
            this.prisma.profilePin.deleteMany({ where: { achusrId } }),
            this.prisma.profilePin.createMany({ data: payload }),
        ]);
        return this.buildPins(achusrId, walletAddress);
    }
    async createShareLink(achusrId, input) {
        const slug = validateSlug(input.slug || "");
        if (!slug)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const existing = await this.prisma.profileShareLink.findUnique({ where: { slug } });
        if (existing)
            throw new common_1.BadRequestException("SLUG_TAKEN");
        const title = (input.title || "").trim();
        if (!title || title.length > 80)
            throw new common_1.BadRequestException("INVALID_TITLE");
        const description = input.description ? input.description.trim() : null;
        if (description && description.length > 200)
            throw new common_1.BadRequestException("INVALID_DESCRIPTION");
        const visibility = coerceVisibility(input.visibility) ?? "UNLISTED";
        const theme = coerceTheme(input.theme) ?? "AUTO";
        const sections = normalizeSections(input.sections);
        let expiresAt = null;
        if (input.expiresAt) {
            const date = new Date(input.expiresAt);
            if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) {
                throw new common_1.BadRequestException("INVALID_EXPIRES_AT");
            }
            expiresAt = date;
        }
        if (input.isPrimary) {
            await this.prisma.profileShareLink.updateMany({ where: { achusrId }, data: { isPrimary: false } });
        }
        const link = await this.prisma.profileShareLink.create({
            data: {
                achusrId,
                slug,
                title,
                description,
                visibility,
                sections,
                theme,
                isPrimary: Boolean(input.isPrimary),
                expiresAt,
            },
        });
        return this.formatShareLink(link);
    }
    async listShareLinks(achusrId) {
        const links = await this.prisma.profileShareLink.findMany({
            where: { achusrId },
            orderBy: { createdAt: "desc" },
        });
        return links.map((link) => this.formatShareLink(link));
    }
    async updateShareLink(achusrId, id, input) {
        const existing = await this.prisma.profileShareLink.findUnique({ where: { id } });
        if (!existing || existing.achusrId !== achusrId) {
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        }
        const data = {};
        if (input.slug !== undefined) {
            const slug = validateSlug(input.slug || "");
            if (!slug)
                throw new common_1.BadRequestException("INVALID_SLUG");
            const other = await this.prisma.profileShareLink.findFirst({ where: { slug, NOT: { id } } });
            if (other)
                throw new common_1.BadRequestException("SLUG_TAKEN");
            data.slug = slug;
        }
        if (input.title !== undefined) {
            const title = (input.title || "").trim();
            if (!title || title.length > 80)
                throw new common_1.BadRequestException("INVALID_TITLE");
            data.title = title;
        }
        if (input.description !== undefined) {
            const description = input.description ? input.description.trim() : null;
            if (description && description.length > 200)
                throw new common_1.BadRequestException("INVALID_DESCRIPTION");
            data.description = description;
        }
        const visibility = coerceVisibility(input.visibility);
        if (visibility)
            data.visibility = visibility;
        const theme = coerceTheme(input.theme);
        if (theme)
            data.theme = theme;
        if (input.sections !== undefined) {
            data.sections = normalizeSections(input.sections);
        }
        if (input.isPrimary !== undefined) {
            data.isPrimary = Boolean(input.isPrimary);
            if (input.isPrimary) {
                await this.prisma.profileShareLink.updateMany({ where: { achusrId }, data: { isPrimary: false } });
            }
        }
        if (input.expiresAt !== undefined) {
            if (!input.expiresAt) {
                data.expiresAt = null;
            }
            else {
                const date = new Date(input.expiresAt);
                if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) {
                    throw new common_1.BadRequestException("INVALID_EXPIRES_AT");
                }
                data.expiresAt = date;
            }
        }
        const updated = await this.prisma.profileShareLink.update({ where: { id }, data });
        return this.formatShareLink(updated);
    }
    async deleteShareLink(achusrId, id) {
        const existing = await this.prisma.profileShareLink.findUnique({ where: { id } });
        if (!existing || existing.achusrId !== achusrId) {
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        }
        await this.prisma.profileShareLink.update({
            where: { id },
            data: { visibility: "DISABLED" },
        });
        return { success: true };
    }
    async resolveShareLink(slug) {
        const link = await this.prisma.profileShareLink.findUnique({ where: { slug } });
        if (!link || link.visibility === "DISABLED")
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        if (link.expiresAt && link.expiresAt.getTime() < Date.now())
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        const response = await this.buildProfileResponse(link.achusrId, undefined, {
            includePrivateProfessional: true,
            includeSectionsData: true,
            sections: normalizeSections(link.sections),
        });
        return {
            link: this.formatShareLink(link),
            ...response,
        };
    }
    async buildProfileResponse(achusrId, walletOverride, options) {
        const user = await this.prisma.user.findFirst({
            where: { userId: achusrId },
            select: { userId: true, primaryWallet: true, displayName: true },
        });
        const walletAddress = walletOverride || user?.primaryWallet || "";
        const onchainProfile = walletAddress
            ? await this.onchain.getUserProfile(walletAddress)
            : { username: "", avatar: "", achusrId: "" };
        const usernameRow = await this.prisma.username.findFirst({
            where: { achusrId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        const professionalRow = options?.includeProfessional ?? (await this.prisma.professionalProfile.findUnique({ where: { achusrId } }));
        if (!options?.includePrivateProfessional && professionalRow && !professionalRow.isPublic) {
            throw new common_1.NotFoundException("PROFILE_NOT_FOUND");
        }
        const goals = walletAddress ? await this.onchain.getGoalsByCreator(walletAddress) : [];
        const badges = walletAddress ? await this.onchain.getBadgesByOwner(walletAddress) : [];
        const goalsWithStatus = goals.map(goalStatus_1.withStatus);
        const goalsCompleted = goalsWithStatus.filter((goal) => goal.status === goalStatus_1.GoalStatus.VERIFIED || goal.status === goalStatus_1.GoalStatus.BADGED).length;
        const goalMetrics = (0, goalStatus_1.computeXpAndLevel)(goalsWithStatus);
        const totals = achusrId
            ? await this.quests.getTotalXpAndLevel(achusrId, goalMetrics.xp)
            : { totalXp: goalMetrics.xp, level: (0, goalStatus_1.computeLevelFromXp)(goalMetrics.xp) };
        const streak = await this.prisma.userStreak.findUnique({ where: { achusrId } });
        const partiesCount = await this.prisma.partyMember.count({ where: { achusrId, status: "ACTIVE" } });
        const highlights = await this.buildPins(achusrId, walletAddress);
        const baseResponse = {
            identity: {
                achusrId,
                walletAddress,
                username: usernameRow?.username || onchainProfile.username || "",
                displayName: user?.displayName || usernameRow?.username || onchainProfile.username || achusrId,
                avatar: onchainProfile.avatar || "",
            },
            professional: this.formatProfessional(professionalRow),
            stats: {
                xpTotal: totals.totalXp,
                level: totals.level,
                currentStreak: streak?.currentStreak || 0,
                longestStreak: streak?.longestStreak || 0,
                goalsCompleted,
                badgesCount: badges.length,
                partiesCount,
            },
            highlights: { pinnedItems: highlights },
        };
        if (!options?.includeSectionsData)
            return baseResponse;
        const sections = options?.sections || normalizeSections({});
        const sectionsData = {};
        if (sections.goals) {
            const verified = goalsWithStatus
                .filter((goal) => goal.status === goalStatus_1.GoalStatus.VERIFIED || goal.status === goalStatus_1.GoalStatus.BADGED)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 10)
                .map((goal) => ({
                goalId: String(goal.id),
                goalCID: goal.goalCID,
                level: goal.level,
                verified: goal.verified,
                verifiedAt: goal.autoVerifiedAt ? new Date(goal.autoVerifiedAt * 1000).toISOString() : null,
                createdAt: goal.createdAt ? new Date(goal.createdAt * 1000).toISOString() : null,
            }));
            sectionsData.goals = verified;
        }
        if (sections.badges) {
            sectionsData.badges = badges.slice(0, 10).map((tokenId) => ({
                tokenId: String(tokenId),
            }));
        }
        if (sections.parties) {
            const memberships = await this.prisma.partyMember.findMany({
                where: { achusrId, status: "ACTIVE" },
                include: { party: true },
            });
            const partyIds = memberships.map((m) => m.partyId);
            const counts = await this.prisma.partyMember.groupBy({
                by: ["partyId"],
                where: { partyId: { in: partyIds }, status: "ACTIVE" },
                _count: { partyId: true },
            });
            const countMap = new Map(counts.map((c) => [c.partyId, c._count.partyId]));
            sectionsData.parties = memberships.map((m) => ({
                id: m.party.id,
                name: m.party.name,
                slug: m.party.slug,
                membersCount: countMap.get(m.partyId) || 0,
            }));
        }
        if (sections.activity) {
            const activity = await this.prisma.userActivity.findMany({
                where: { achusrId },
                orderBy: { createdAt: "desc" },
                take: 10,
            });
            sectionsData.activity = activity.map((item) => ({
                id: item.id,
                type: item.type,
                summary: (0, feed_util_1.describeActivity)(item.type, item.payload),
                createdAt: item.createdAt,
            }));
        }
        return { ...baseResponse, sectionsData };
    }
    formatProfessional(row) {
        if (!row) {
            return {
                headline: null,
                currentRole: null,
                currentOrg: null,
                location: null,
                timezone: null,
                bioShort: null,
                skills: [],
                industries: [],
                availability: client_1.Availability.UNSPECIFIED,
                hourlyRateMin: null,
                hourlyRateMax: null,
                currency: null,
                websiteUrl: null,
                githubUrl: null,
                linkedinUrl: null,
                xUrl: null,
                portfolioUrl: null,
                isPublic: true,
            };
        }
        return {
            headline: row.headline ?? null,
            currentRole: row.currentRole ?? null,
            currentOrg: row.currentOrg ?? null,
            location: row.location ?? null,
            timezone: row.timezone ?? null,
            bioShort: row.bioShort ?? null,
            skills: row.skills ?? [],
            industries: row.industries ?? [],
            availability: row.availability ?? client_1.Availability.UNSPECIFIED,
            hourlyRateMin: row.hourlyRateMin ? Number(row.hourlyRateMin) : null,
            hourlyRateMax: row.hourlyRateMax ? Number(row.hourlyRateMax) : null,
            currency: row.currency ?? null,
            websiteUrl: row.websiteUrl ?? null,
            githubUrl: row.githubUrl ?? null,
            linkedinUrl: row.linkedinUrl ?? null,
            xUrl: row.xUrl ?? null,
            portfolioUrl: row.portfolioUrl ?? null,
            isPublic: row.isPublic ?? true,
        };
    }
    formatShareLink(link) {
        return {
            id: link.id,
            achusrId: link.achusrId,
            slug: link.slug,
            title: link.title,
            description: link.description,
            isPrimary: link.isPrimary,
            visibility: link.visibility,
            sections: normalizeSections(link.sections),
            theme: link.theme,
            expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        };
    }
    async buildPins(achusrId, walletAddress) {
        const pins = await this.prisma.profilePin.findMany({
            where: { achusrId },
            orderBy: { position: "asc" },
        });
        if (!pins.length)
            return [];
        const goals = walletAddress ? await this.onchain.getGoalsByCreator(walletAddress) : [];
        const badges = walletAddress ? await this.onchain.getBadgesByOwner(walletAddress) : [];
        const goalMap = new Map(goals.map((goal) => [String(goal.id), goal]));
        const badgeSet = new Set(badges.map((b) => String(b)));
        const parties = await this.prisma.party.findMany({
            where: { id: { in: pins.filter((pin) => pin.type === "PARTY").map((pin) => pin.ref) } },
        });
        const partyMap = new Map(parties.map((party) => [party.id, party]));
        const partyCounts = await this.prisma.partyMember.groupBy({
            by: ["partyId"],
            where: { partyId: { in: parties.map((p) => p.id) }, status: "ACTIVE" },
            _count: { partyId: true },
        });
        const partyCountMap = new Map(partyCounts.map((row) => [row.partyId, row._count.partyId]));
        return pins.map((pin) => {
            const payload = {
                id: pin.id,
                type: pin.type,
                ref: pin.ref,
                position: pin.position,
            };
            if (pin.type === "GOAL") {
                const goal = goalMap.get(pin.ref);
                if (goal) {
                    payload.goal = {
                        goalId: String(goal.id),
                        goalCID: goal.goalCID,
                        level: goal.level,
                        verified: goal.verified,
                        verifiedAt: goal.autoVerifiedAt ? new Date(goal.autoVerifiedAt * 1000).toISOString() : null,
                        createdAt: goal.createdAt ? new Date(goal.createdAt * 1000).toISOString() : null,
                    };
                }
            }
            if (pin.type === "BADGE" && badgeSet.has(pin.ref)) {
                payload.badge = {
                    tokenId: pin.ref,
                };
            }
            if (pin.type === "PARTY") {
                const party = partyMap.get(pin.ref);
                if (party) {
                    payload.party = {
                        id: party.id,
                        name: party.name,
                        slug: party.slug,
                        membersCount: partyCountMap.get(party.id) || 0,
                    };
                }
            }
            return payload;
        });
    }
};
exports.ProfessionalProfileService = ProfessionalProfileService;
exports.ProfessionalProfileService = ProfessionalProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11,
        questEngine_service_1.QuestEngineService])
], ProfessionalProfileService);

export const ProfessionalProfileService = exports.ProfessionalProfileService as any;
export type ProfessionalProfileService = any;
