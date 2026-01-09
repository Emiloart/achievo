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
exports.EndorsementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const endorsementWeight_service_1 = require("./endorsementWeight.service");
const consistencyScoring_service_1 = require("../consistency/consistencyScoring.service");
const riskEngine_service_1 = require("../risk/riskEngine.service");
const privacy_service_1 = require("../privacy/privacy.service");
const DEFAULT_LIMIT = 20;
function parseIntEnv(name, fallback) {
    const raw = Number(process.env[name]);
    if (!Number.isFinite(raw))
        return fallback;
    return Math.max(0, Math.floor(raw));
}
function slugify(input) {
    const value = input.trim().toLowerCase();
    if (!value)
        return "";
    const cleaned = value
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
    return cleaned.slice(0, 50);
}
function computeAccountAgeDays(createdAt) {
    if (!createdAt)
        return 0;
    const diffMs = Date.now() - createdAt.getTime();
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
function contentIdForTarget(targetType, targetId) {
    if (targetType === "PROFILE")
        return "PROFILE";
    if (targetType === "SKILL")
        return `SKILL:${targetId || ""}`;
    if (targetType === "BADGE")
        return `BADGE:${targetId || ""}`;
    return `ACHIEVEMENT:${targetId || ""}`;
}
let EndorsementsService = class EndorsementsService {
    constructor(prisma, weight, consistency, risk, privacy) {
        this.prisma = prisma;
        this.weight = weight;
        this.consistency = consistency;
        this.risk = risk;
        this.privacy = privacy;
    }
    endorsementsEnabled() {
        const raw = String(process.env.ENDORSEMENTS_ENABLED || "true").toLowerCase();
        return raw !== "false" && raw !== "0";
    }
    async createSkill(displayName, createdByUserId) {
        if (!this.endorsementsEnabled())
            throw new common_1.BadRequestException("ENDORSEMENTS_DISABLED");
        const label = String(displayName || "").trim();
        if (!label || label.length > 80)
            throw new common_1.BadRequestException("INVALID_SKILL_NAME");
        const slug = slugify(label);
        if (!slug || slug.length < 2)
            throw new common_1.BadRequestException("INVALID_SKILL_NAME");
        const existing = await this.prisma.skillTag.findFirst({
            where: {
                OR: [{ slug }, { displayName: { equals: label, mode: client_1.Prisma.QueryMode.insensitive } }],
            },
        });
        if (existing)
            return existing;
        return this.prisma.skillTag.create({
            data: {
                slug,
                displayName: label,
                createdByUserId: createdByUserId || null,
            },
        });
    }
    async searchSkills(query) {
        const search = String(query || "").trim();
        const where = search
            ? {
                OR: [
                    { slug: { contains: search.toLowerCase() } },
                    { displayName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                ],
            }
            : undefined;
        const tags = await this.prisma.skillTag.findMany({
            where,
            orderBy: { displayName: "asc" },
            take: 20,
        });
        return tags;
    }
    async upsertUserSkill(userId, skillTagId, proficiency) {
        if (!this.endorsementsEnabled())
            throw new common_1.BadRequestException("ENDORSEMENTS_DISABLED");
        const tag = await this.prisma.skillTag.findUnique({ where: { id: skillTagId } });
        if (!tag)
            throw new common_1.BadRequestException("SKILL_NOT_FOUND");
        let safeProficiency = null;
        if (proficiency !== undefined && proficiency !== null) {
            const value = Math.floor(Number(proficiency));
            if (!Number.isFinite(value) || value < 1 || value > 5)
                throw new common_1.BadRequestException("INVALID_PROFICIENCY");
            safeProficiency = value;
        }
        const record = await this.prisma.userSkill.upsert({
            where: {
                userId_skillTagId: {
                    userId,
                    skillTagId,
                },
            },
            update: {
                proficiency: safeProficiency,
            },
            create: {
                userId,
                skillTagId,
                proficiency: safeProficiency,
            },
        });
        return { ...record, tag };
    }
    async deleteUserSkill(userId, skillTagId) {
        await this.prisma.userSkill.delete({
            where: {
                userId_skillTagId: { userId, skillTagId },
            },
        });
        return { success: true };
    }
    async listUserSkills(targetUserId, viewerUserId, token) {
        const skills = await this.prisma.userSkill.findMany({
            where: { userId: targetUserId },
            include: { skillTag: true },
            orderBy: { createdAt: "desc" },
        });
        const filtered = [];
        for (const skill of skills) {
            const contentId = contentIdForTarget("SKILL", skill.skillTagId);
            const decision = await this.privacy.resolvePolicy(targetUserId, "ENDORSEMENTS", contentId);
            const canView = this.privacy.canView(viewerUserId, targetUserId, decision, token || null);
            if (!canView)
                continue;
            filtered.push({ skill, decision });
        }
        const skillIds = filtered.map((entry) => entry.skill.skillTagId);
        const endorsementRows = await this.prisma.endorsement.findMany({
            where: {
                targetUserId,
                targetType: "SKILL",
                targetId: { in: skillIds },
                status: "ACTIVE",
            },
        });
        const aggregates = new Map();
        for (const row of endorsementRows) {
            const agg = aggregates.get(row.targetId || "") || { count: 0, weight: 0 };
            agg.count += 1;
            agg.weight += row.computedWeight || 0;
            aggregates.set(row.targetId || "", agg);
        }
        return filtered.map(({ skill, decision }) => ({
            skillTagId: skill.skillTagId,
            displayName: skill.skillTag.displayName,
            slug: skill.skillTag.slug,
            proficiency: skill.proficiency,
            endorsementsCount: aggregates.get(skill.skillTagId)?.count || 0,
            endorsementsWeight: aggregates.get(skill.skillTagId)?.weight || 0,
            visibility: viewerUserId === targetUserId ? decision.visibility : undefined,
            redaction: viewerUserId === targetUserId ? decision.redaction : undefined,
            unlistedPublicId: viewerUserId === targetUserId ? decision.unlistedPublicId : undefined,
        }));
    }
    async createEndorsement(endorserUserId, payload) {
        if (!this.endorsementsEnabled())
            throw new common_1.BadRequestException("ENDORSEMENTS_DISABLED");
        const targetUserId = String(payload?.targetUserId || "").trim();
        if (!targetUserId)
            throw new common_1.BadRequestException("TARGET_REQUIRED");
        if (targetUserId === endorserUserId)
            throw new common_1.BadRequestException("CANNOT_ENDORSE_SELF");
        const targetType = String(payload?.targetType || "")
            .trim()
            .toUpperCase();
        if (!Object.prototype.hasOwnProperty.call(client_1.EndorsementTargetType, targetType)) {
            throw new common_1.BadRequestException("INVALID_TARGET_TYPE");
        }
        const targetIdRaw = payload?.targetId ?? null;
        const targetId = targetIdRaw !== null && targetIdRaw !== undefined ? String(targetIdRaw).trim() : null;
        if (targetType === "PROFILE" && targetId)
            throw new common_1.BadRequestException("PROFILE_TARGET_NO_ID");
        if (targetType !== "PROFILE" && !targetId)
            throw new common_1.BadRequestException("TARGET_ID_REQUIRED");
        if (targetType === "SKILL") {
            const hasSkill = await this.prisma.userSkill.findFirst({
                where: { userId: targetUserId, skillTagId: targetId || "" },
            });
            if (!hasSkill)
                throw new common_1.BadRequestException("SKILL_NOT_LISTED");
        }
        const message = payload?.message ? String(payload.message).trim() : null;
        if (message && message.length > 280)
            throw new common_1.BadRequestException("MESSAGE_TOO_LONG");
        const dailyLimit = parseIntEnv("ENDORSEMENTS_DAILY_LIMIT", 20);
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCount = await this.prisma.endorsement.count({
            where: { endorserUserId, createdAt: { gte: since } },
        });
        if (recentCount >= dailyLimit)
            throw new common_1.BadRequestException("ENDORSEMENT_LIMIT_REACHED");
        const endorserRecord = await this.prisma.user.findFirst({
            where: { userId: endorserUserId },
            select: { createdAt: true },
        });
        const accountAgeDays = computeAccountAgeDays(endorserRecord?.createdAt || null);
        const credibility = await this.consistency.getConsistencyScore(endorserUserId);
        const riskProfile = await this.risk.getRiskProfile(endorserUserId);
        const mutual = await this.prisma.endorsement.findFirst({
            where: {
                endorserUserId: targetUserId,
                targetUserId: endorserUserId,
                createdAt: { gte: since },
                status: "ACTIVE",
            },
        });
        const weight = this.weight.computeWeight({
            credibilityScore: credibility.credibilityScore || 0,
            riskScore: riskProfile.riskScore || 0,
            accountAgeDays,
            mutualWithinWindow: Boolean(mutual),
        });
        const uniqueKey = {
            endorserUserId,
            targetUserId,
            targetType: targetType,
            targetId: targetId || null,
        };
        const existing = await this.prisma.endorsement.findFirst({
            where: uniqueKey,
        });
        const record = existing
            ? await this.prisma.endorsement.update({
                where: { id: existing.id },
                data: {
                    message,
                    status: client_1.EndorsementStatus.ACTIVE,
                    revokedAt: null,
                    endorserCredibilityScore: credibility.credibilityScore || 0,
                    endorserRiskScore: riskProfile.riskScore || 0,
                    computedWeight: weight.computedWeight,
                    weightVersion: "1",
                },
            })
            : await this.prisma.endorsement.create({
                data: {
                    ...uniqueKey,
                    message,
                    status: client_1.EndorsementStatus.ACTIVE,
                    endorserCredibilityScore: credibility.credibilityScore || 0,
                    endorserRiskScore: riskProfile.riskScore || 0,
                    computedWeight: weight.computedWeight,
                    weightVersion: "1",
                },
            });
        return record;
    }
    async revokeEndorsement(id, endorserUserId) {
        const existing = await this.prisma.endorsement.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException("ENDORSEMENT_NOT_FOUND");
        if (existing.endorserUserId !== endorserUserId)
            throw new common_1.ForbiddenException("NOT_ENDORSER");
        if (existing.status === "REVOKED")
            return existing;
        return this.prisma.endorsement.update({
            where: { id },
            data: { status: client_1.EndorsementStatus.REVOKED, revokedAt: new Date() },
        });
    }
    async enrichEndorsers(endorsements) {
        const endorserIds = Array.from(new Set(endorsements.map((row) => row.endorserUserId)));
        if (!endorserIds.length)
            return [];
        const users = await this.prisma.user.findMany({
            where: { userId: { in: endorserIds } },
            select: { userId: true, displayName: true },
        });
        const usernames = await this.prisma.username.findMany({
            where: { achusrId: { in: endorserIds }, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        const userMap = new Map(users.map((user) => [user.userId, user]));
        const usernameMap = new Map();
        for (const row of usernames) {
            if (!usernameMap.has(row.achusrId))
                usernameMap.set(row.achusrId, row.username);
        }
        return endorsements.map((row) => ({
            ...row,
            endorser: {
                userId: row.endorserUserId,
                displayName: userMap.get(row.endorserUserId)?.displayName || row.endorserUserId,
                username: usernameMap.get(row.endorserUserId) || "",
            },
        }));
    }
    buildAggregates(rows) {
        const active = rows.filter((row) => row.status === "ACTIVE");
        const countActive = active.length;
        const totalWeight = active.reduce((sum, row) => sum + (row.computedWeight || 0), 0);
        const byTargetType = new Map();
        const skillTotals = new Map();
        for (const row of active) {
            const typeKey = row.targetType;
            const entry = byTargetType.get(typeKey) || { count: 0, weight: 0 };
            entry.count += 1;
            entry.weight += row.computedWeight || 0;
            byTargetType.set(typeKey, entry);
            if (row.targetType === "SKILL" && row.targetId) {
                const skillEntry = skillTotals.get(row.targetId) || { count: 0, weight: 0 };
                skillEntry.count += 1;
                skillEntry.weight += row.computedWeight || 0;
                skillTotals.set(row.targetId, skillEntry);
            }
        }
        return {
            countActive,
            totalWeight,
            byTargetType: Array.from(byTargetType.entries()).map(([type, data]) => ({
                targetType: type,
                count: data.count,
                totalWeight: data.weight,
            })),
            skillTotals,
        };
    }
    async listEndorsements(targetUserId, viewerUserId, filters) {
        const take = Math.min(Math.max(Number(filters.limit || DEFAULT_LIMIT), 1), 50);
        const where = { targetUserId };
        if (filters.targetType)
            where.targetType = filters.targetType.toUpperCase();
        if (filters.targetId)
            where.targetId = String(filters.targetId);
        const query = {
            where,
            orderBy: { createdAt: "desc" },
            take,
        };
        if (filters.cursor) {
            query.cursor = { id: filters.cursor };
            query.skip = 1;
        }
        const raw = await this.prisma.endorsement.findMany(query);
        const isOwner = viewerUserId === targetUserId;
        if (filters.targetType) {
            const targetType = filters.targetType.toUpperCase();
            const contentId = contentIdForTarget(targetType, filters.targetId || null);
            const decision = await this.privacy.resolvePolicy(targetUserId, "ENDORSEMENTS", contentId);
            const canView = this.privacy.canView(viewerUserId, targetUserId, decision, filters.token || null);
            if (!canView) {
                return {
                    data: [],
                    nextCursor: null,
                    aggregates: { countActive: 0, totalWeight: 0, byTargetType: [] },
                    hidden: true,
                };
            }
            const aggregates = this.buildAggregates(raw);
            if (!isOwner && decision.redaction === "FULL") {
                return {
                    data: [],
                    nextCursor: null,
                    aggregates: { countActive: 0, totalWeight: 0, byTargetType: [] },
                    hidden: true,
                };
            }
            if (!isOwner && decision.redaction === "METADATA_ONLY") {
                return {
                    data: [],
                    nextCursor: null,
                    aggregates: {
                        countActive: aggregates.countActive,
                        totalWeight: aggregates.totalWeight,
                        byTargetType: aggregates.byTargetType,
                    },
                    redacted: true,
                };
            }
            const enriched = await this.enrichEndorsers(raw);
            const data = enriched.map((row) => ({
                id: row.id,
                endorserUserId: row.endorserUserId,
                targetUserId: row.targetUserId,
                targetType: row.targetType,
                targetId: row.targetId,
                message: isOwner ? row.message : row.message,
                status: row.status,
                computedWeight: row.computedWeight,
                endorserCredibilityScore: isOwner ? row.endorserCredibilityScore : undefined,
                endorserRiskScore: isOwner ? row.endorserRiskScore : undefined,
                createdAt: row.createdAt,
                endorser: row.endorser,
                visibility: isOwner ? decision.visibility : undefined,
                redaction: isOwner ? decision.redaction : undefined,
                unlistedPublicId: isOwner ? decision.unlistedPublicId : undefined,
            }));
            const nextCursor = raw.length ? raw[raw.length - 1].id : null;
            return {
                data,
                nextCursor,
                aggregates: {
                    countActive: aggregates.countActive,
                    totalWeight: aggregates.totalWeight,
                    byTargetType: aggregates.byTargetType,
                },
                decision: isOwner
                    ? {
                        visibility: decision.visibility,
                        redaction: decision.redaction,
                        unlistedPublicId: decision.unlistedPublicId,
                    }
                    : undefined,
            };
        }
        const filtered = [];
        for (const row of raw) {
            const decision = await this.privacy.resolvePolicy(targetUserId, "ENDORSEMENTS", contentIdForTarget(row.targetType, row.targetId));
            const canView = this.privacy.canView(viewerUserId, targetUserId, decision, filters.token || null);
            if (!canView)
                continue;
            if (!isOwner && decision.redaction === "FULL")
                continue;
            if (!isOwner && decision.redaction === "METADATA_ONLY")
                continue;
            filtered.push(row);
        }
        const aggregates = this.buildAggregates(filtered);
        const enriched = await this.enrichEndorsers(filtered);
        const data = enriched.map((row) => ({
            id: row.id,
            endorserUserId: row.endorserUserId,
            targetUserId: row.targetUserId,
            targetType: row.targetType,
            targetId: row.targetId,
            message: row.message,
            status: row.status,
            computedWeight: row.computedWeight,
            createdAt: row.createdAt,
            endorser: row.endorser,
        }));
        const nextCursor = filtered.length ? filtered[filtered.length - 1].id : null;
        return {
            data,
            nextCursor,
            aggregates: {
                countActive: aggregates.countActive,
                totalWeight: aggregates.totalWeight,
                byTargetType: aggregates.byTargetType,
            },
        };
    }
    async getSummary(targetUserId, viewerUserId, token) {
        const endorsements = await this.prisma.endorsement.findMany({
            where: { targetUserId, status: "ACTIVE" },
        });
        const isOwner = viewerUserId === targetUserId;
        const allowed = [];
        for (const row of endorsements) {
            const decision = await this.privacy.resolvePolicy(targetUserId, "ENDORSEMENTS", contentIdForTarget(row.targetType, row.targetId));
            const canView = this.privacy.canView(viewerUserId, targetUserId, decision, token || null);
            if (!canView)
                continue;
            if (!isOwner && decision.redaction === "FULL")
                continue;
            allowed.push(row);
        }
        const aggregates = this.buildAggregates(allowed);
        const skillIds = Array.from(aggregates.skillTotals.keys());
        const skillTags = skillIds.length ? await this.prisma.skillTag.findMany({ where: { id: { in: skillIds } } }) : [];
        const skillMap = new Map(skillTags.map((tag) => [tag.id, tag]));
        const topSkills = Array.from(aggregates.skillTotals.entries())
            .map(([skillId, data]) => ({
            skillTagId: skillId,
            displayName: skillMap.get(skillId)?.displayName || skillId,
            slug: skillMap.get(skillId)?.slug || "",
            count: data.count,
            totalWeight: data.weight,
        }))
            .sort((a, b) => b.totalWeight - a.totalWeight)
            .slice(0, 5);
        return {
            countActive: aggregates.countActive,
            totalWeight: aggregates.totalWeight,
            byTargetType: aggregates.byTargetType,
            topSkills,
        };
    }
};
exports.EndorsementsService = EndorsementsService;
exports.EndorsementsService = EndorsementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        endorsementWeight_service_1.EndorsementWeightService,
        consistencyScoring_service_1.ConsistencyScoringService,
        riskEngine_service_1.RiskEngineService,
        privacy_service_1.PrivacyPolicyService])
], EndorsementsService);

export const EndorsementsService = exports.EndorsementsService as any;
export type EndorsementsService = any;
