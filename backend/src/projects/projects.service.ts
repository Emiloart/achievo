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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const socialIdentity_service_1 = require("../social/socialIdentity.service");
const questEngine_service_1 = require("../quests/questEngine.service");
const username_util_1 = require("../identity/username.util");
const viem_1 = require("viem");
const feed_util_1 = require("../social/feed.util");
const client_1 = require("@prisma/client");
const goalStatus_1 = require("../achievo/goalStatus");
const PROJECT_SLUG_REGEX = /^[a-z0-9-]+$/;
const INVOICE_SLUG_REGEX = /^[a-z0-9-]+$/;
const HANDLE_ACHUSR_REGEX = /^ACHUSR-\d{10}$/i;
const PROJECT_SLUG_MIN = 3;
const PROJECT_SLUG_MAX = 40;
const SHARE_SLUG_MIN = 3;
const SHARE_SLUG_MAX = 32;
const INVOICE_SLUG_MIN = 3;
const INVOICE_SLUG_MAX = 64;
const SHARE_SECTION_KEYS = ["summary", "goals", "activity", "team", "clientNotes"];
function normalizeSlug(raw, min, max) {
    const value = (raw || "").trim().toLowerCase();
    if (!value || value.length < min || value.length > max)
        return { valid: false, slug: "" };
    if (!PROJECT_SLUG_REGEX.test(value))
        return { valid: false, slug: "" };
    if (value.startsWith("-") || value.endsWith("-"))
        return { valid: false, slug: "" };
    return { valid: true, slug: value };
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
function coerceVisibility(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ProjectVisibility, value)) {
        throw new common_1.BadRequestException("INVALID_VISIBILITY");
    }
    return value;
}
function coerceStatus(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ProjectStatus, value)) {
        throw new common_1.BadRequestException("INVALID_STATUS");
    }
    return value;
}
function coerceMemberRole(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ProjectMemberRole, value)) {
        throw new common_1.BadRequestException("INVALID_ROLE");
    }
    return value;
}
function coerceShareVisibility(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ShareLinkVisibility, value)) {
        throw new common_1.BadRequestException("INVALID_VISIBILITY");
    }
    return value;
}
function coerceShareTheme(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.ShareLinkTheme, value)) {
        throw new common_1.BadRequestException("INVALID_THEME");
    }
    return value;
}
function normalizeShareSections(input) {
    const output = {};
    for (const key of SHARE_SECTION_KEYS) {
        output[key] = Boolean(input?.[key]);
    }
    return output;
}
function parseDate(raw) {
    if (raw === undefined || raw === null)
        return null;
    if (!raw)
        return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()))
        throw new common_1.BadRequestException("INVALID_DATE");
    return date;
}
function parseOptionalDate(raw) {
    if (raw === undefined)
        return null;
    if (!raw)
        return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()))
        throw new common_1.BadRequestException("INVALID_DATE");
    return date;
}
function parseBooleanParam(raw) {
    if (raw === undefined)
        return null;
    const value = String(raw).trim().toLowerCase();
    if (value === "true" || value === "1")
        return true;
    if (value === "false" || value === "0")
        return false;
    throw new common_1.BadRequestException("INVALID_BOOLEAN");
}
function parseNumberValue(raw, label = "INVALID_NUMBER") {
    if (raw === undefined || raw === null)
        return null;
    if (typeof raw === "number") {
        if (!Number.isFinite(raw))
            throw new common_1.BadRequestException(label);
        return raw;
    }
    const trimmed = String(raw).trim();
    if (!trimmed)
        return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value))
        throw new common_1.BadRequestException(label);
    return value;
}
function roundAmount(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
function normalizeInvoiceSlug(raw) {
    const value = (raw || "").trim().toLowerCase();
    if (!value || value.length < INVOICE_SLUG_MIN || value.length > INVOICE_SLUG_MAX)
        return null;
    if (!INVOICE_SLUG_REGEX.test(value))
        return null;
    if (value.startsWith("-") || value.endsWith("-"))
        return null;
    return value;
}
function formatDecimal(value) {
    if (value === null || value === undefined)
        return 0;
    return Number(value);
}
function computeDurationMinutes(startedAt, endedAt) {
    const diffMs = endedAt.getTime() - startedAt.getTime();
    if (diffMs <= 0)
        throw new common_1.BadRequestException("INVALID_DURATION");
    return Math.ceil(diffMs / 60000);
}
function formatInvoiceNumber(id, issueDate) {
    const year = issueDate.getUTCFullYear();
    const short = id.replace(/-/g, "").slice(0, 6).toUpperCase();
    return `INV-${year}-${short}`;
}
function coerceBillingModel(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.BillingModel, value)) {
        throw new common_1.BadRequestException("INVALID_BILLING_MODEL");
    }
    return value;
}
function coerceInvoiceStatus(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.InvoiceStatus, value)) {
        throw new common_1.BadRequestException("INVALID_STATUS");
    }
    return value;
}
function coerceInvoiceVisibility(raw) {
    if (!raw)
        return null;
    const value = raw.toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(client_1.InvoiceVisibility, value)) {
        throw new common_1.BadRequestException("INVALID_VISIBILITY");
    }
    return value;
}
let ProjectsService = class ProjectsService {
    constructor(prisma, onchain, identities, questEngine) {
        this.prisma = prisma;
        this.onchain = onchain;
        this.identities = identities;
        this.questEngine = questEngine;
    }
    async resolveAchusrIdFromHandle(handle) {
        const trimmed = (handle || "").trim();
        if (!trimmed)
            return null;
        if (trimmed.startsWith("@")) {
            const normalized = (0, username_util_1.normalizeUsername)(trimmed.slice(1));
            if (!normalized.valid || !normalized.normalized)
                return null;
            const username = await this.prisma.username.findFirst({
                where: { usernameNormalized: normalized.normalized, status: "ACTIVE" },
            });
            return username?.achusrId || null;
        }
        if (HANDLE_ACHUSR_REGEX.test(trimmed)) {
            return trimmed.toUpperCase();
        }
        if ((0, viem_1.isAddress)(trimmed)) {
            const wallet = (0, viem_1.getAddress)(trimmed);
            const user = await this.prisma.user.findFirst({
                where: { primaryWallet: wallet },
                select: { userId: true },
            });
            return user?.userId || null;
        }
        return null;
    }
    async requireProject(slugRaw) {
        const slugInfo = normalizeSlug(slugRaw, PROJECT_SLUG_MIN, PROJECT_SLUG_MAX);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const project = await this.prisma.project.findUnique({ where: { slug: slugInfo.slug } });
        if (!project)
            throw new common_1.NotFoundException("PROJECT_NOT_FOUND");
        return project;
    }
    async getMembership(projectId, achusrId) {
        if (!achusrId)
            return null;
        return this.prisma.projectMember.findUnique({
            where: { projectId_achusrId: { projectId, achusrId } },
        });
    }
    async createProjectEvent(projectId, achusrId, type, payload) {
        await this.prisma.projectEvent.create({
            data: {
                projectId,
                achusrId,
                type,
                payload,
            },
        });
    }
    formatProject(project) {
        return {
            id: project.id,
            slug: project.slug,
            name: project.name,
            description: project.description,
            status: project.status,
            visibility: project.visibility,
            clientName: project.clientName,
            clientReference: project.clientReference,
            dueDate: project.dueDate,
            linkedPartyId: project.linkedPartyId,
            ownerAchusrId: project.ownerAchusrId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
    async fetchGoalsForProject(projectId) {
        const rows = await this.prisma.projectGoal.findMany({
            where: { projectId },
            orderBy: { createdAt: "asc" },
        });
        const ids = rows.map((row) => Number(row.goalId)).filter((id) => Number.isFinite(id) && id > 0);
        if (!ids.length)
            return [];
        const goals = await mapWithConcurrency(ids, 4, async (id) => this.onchain.getGoalById(id));
        return goals.filter(Boolean).map((goal) => (0, goalStatus_1.withStatus)(goal));
    }
    computeStats(goals) {
        const goalsTotal = goals.length;
        const goalsVerified = goals.filter((goal) => goal.status === goalStatus_1.GoalStatus.VERIFIED || goal.status === goalStatus_1.GoalStatus.BADGED).length;
        const completionPercent = goalsTotal ? Math.round((goalsVerified / goalsTotal) * 100) : 0;
        return { goalsTotal, goalsVerified, completionPercent };
    }
    async requireActiveMember(projectId, achusrId, allowClient = false) {
        const membership = await this.getMembership(projectId, achusrId);
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        if (!allowClient && membership.role === "CLIENT")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        return membership;
    }
    requireRoles(membership, roles) {
        if (!roles.includes(membership.role))
            throw new common_1.ForbiddenException("NOT_ALLOWED");
    }
    computeInvoiceTotals(lineItems, taxPercent) {
        const subtotal = roundAmount(lineItems.reduce((sum, item) => sum + item.totalAmount, 0));
        const tax = taxPercent ? roundAmount((subtotal * taxPercent) / 100) : 0;
        return { subtotalAmount: subtotal, taxAmount: tax, totalAmount: roundAmount(subtotal + tax) };
    }
    formatTimeEntry(entry) {
        return {
            id: entry.id,
            projectId: entry.projectId,
            achusrId: entry.achusrId,
            goalId: entry.goalId,
            startedAt: entry.startedAt,
            endedAt: entry.endedAt,
            durationMinutes: entry.durationMinutes,
            note: entry.note,
            billable: entry.billable,
            invoiceId: entry.invoiceId,
        };
    }
    formatBillingSettings(settings) {
        if (!settings)
            return null;
        return {
            billingModel: settings.billingModel,
            currency: settings.currency,
            hourlyRateAmount: settings.hourlyRateAmount !== null ? formatDecimal(settings.hourlyRateAmount) : null,
            fixedFeeAmount: settings.fixedFeeAmount !== null ? formatDecimal(settings.fixedFeeAmount) : null,
            taxPercent: settings.taxPercent !== null ? formatDecimal(settings.taxPercent) : null,
            defaultDueDays: settings.defaultDueDays ?? null,
            notes: settings.notes || "",
        };
    }
    formatInvoice(invoice) {
        const status = this.normalizeInvoiceStatus(invoice.status, invoice.dueDate);
        return {
            id: invoice.id,
            projectId: invoice.projectId,
            ownerAchusrId: invoice.ownerAchusrId,
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientAddress: invoice.clientAddress,
            currency: invoice.currency,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            status,
            number: formatInvoiceNumber(invoice.id, invoice.issueDate),
            subtotalAmount: formatDecimal(invoice.subtotalAmount),
            taxAmount: formatDecimal(invoice.taxAmount),
            totalAmount: formatDecimal(invoice.totalAmount),
            notes: invoice.notes,
            publicSlug: invoice.publicSlug,
            publicVisibility: invoice.publicVisibility,
            publicTheme: invoice.publicTheme,
            publicExpiresAt: invoice.publicExpiresAt,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
        };
    }
    formatInvoiceLineItem(item) {
        return {
            id: item.id,
            description: item.description,
            quantity: formatDecimal(item.quantity),
            unitAmount: formatDecimal(item.unitAmount),
            totalAmount: formatDecimal(item.totalAmount),
            linkedType: item.linkedType,
            linkedRef: item.linkedRef,
        };
    }
    normalizeInvoiceStatus(status, dueDate) {
        if (status === "SENT" && dueDate && dueDate.getTime() < Date.now())
            return "OVERDUE";
        return status;
    }
    validateInvoiceStatusTransition(current, next) {
        const allowed = {
            DRAFT: ["SENT", "CANCELLED"],
            SENT: ["PAID", "CANCELLED"],
            PAID: [],
            CANCELLED: [],
            OVERDUE: ["PAID", "CANCELLED"],
        };
        if (!allowed[current].includes(next))
            throw new common_1.BadRequestException("INVALID_STATUS_TRANSITION");
    }
    async createProject(input, ownerAchusrId) {
        const name = (input.name || "").trim();
        if (!name || name.length > 120)
            throw new common_1.BadRequestException("INVALID_NAME");
        const slugInfo = normalizeSlug(input.slug || "", PROJECT_SLUG_MIN, PROJECT_SLUG_MAX);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const existing = await this.prisma.project.findUnique({ where: { slug: slugInfo.slug } });
        if (existing)
            throw new common_1.BadRequestException("SLUG_TAKEN");
        const visibility = coerceVisibility(input.visibility) ?? "PRIVATE";
        const status = coerceStatus(input.status) ?? "ACTIVE";
        const description = input.description ? input.description.trim() : null;
        if (description && description.length > 1000)
            throw new common_1.BadRequestException("INVALID_DESCRIPTION");
        const clientName = input.clientName ? input.clientName.trim() : null;
        const clientReference = input.clientReference ? input.clientReference.trim() : null;
        const dueDate = parseDate(input.dueDate ?? null);
        if (input.linkedPartyId) {
            const membership = await this.prisma.partyMember.findUnique({
                where: { partyId_achusrId: { partyId: input.linkedPartyId, achusrId: ownerAchusrId } },
            });
            if (!membership || membership.status !== "ACTIVE") {
                throw new common_1.BadRequestException("INVALID_PARTY");
            }
        }
        const [project] = await this.prisma.$transaction([
            this.prisma.project.create({
                data: {
                    ownerAchusrId,
                    slug: slugInfo.slug,
                    name,
                    description,
                    visibility,
                    status,
                    clientName,
                    clientReference,
                    dueDate,
                    linkedPartyId: input.linkedPartyId ?? null,
                },
            }),
            this.prisma.projectMember.create({
                data: {
                    project: { connect: { slug: slugInfo.slug } },
                    achusrId: ownerAchusrId,
                    role: "OWNER",
                    status: "ACTIVE",
                },
            }),
        ]);
        await this.createProjectEvent(project.id, ownerAchusrId, "PROJECT_CREATED", {
            name: project.name,
            status: project.status,
        });
        return this.formatProject(project);
    }
    async updateProject(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const updates = {};
        if (input.name !== undefined) {
            const name = (input.name || "").trim();
            if (!name || name.length > 120)
                throw new common_1.BadRequestException("INVALID_NAME");
            updates.name = name;
        }
        if (input.description !== undefined) {
            const description = input.description ? input.description.trim() : null;
            if (description && description.length > 1000)
                throw new common_1.BadRequestException("INVALID_DESCRIPTION");
            updates.description = description;
        }
        const visibility = coerceVisibility(input.visibility);
        if (visibility)
            updates.visibility = visibility;
        const status = coerceStatus(input.status);
        if (status)
            updates.status = status;
        if (input.clientName !== undefined)
            updates.clientName = input.clientName ? input.clientName.trim() : null;
        if (input.clientReference !== undefined) {
            updates.clientReference = input.clientReference ? input.clientReference.trim() : null;
        }
        if (input.dueDate !== undefined)
            updates.dueDate = parseDate(input.dueDate);
        if (input.linkedPartyId !== undefined) {
            if (input.linkedPartyId) {
                const partyMember = await this.prisma.partyMember.findUnique({
                    where: { partyId_achusrId: { partyId: input.linkedPartyId, achusrId } },
                });
                if (!partyMember || partyMember.status !== "ACTIVE") {
                    throw new common_1.BadRequestException("INVALID_PARTY");
                }
                updates.linkedPartyId = input.linkedPartyId;
            }
            else {
                updates.linkedPartyId = null;
            }
        }
        const updated = await this.prisma.project.update({ where: { id: project.id }, data: updates });
        if (status && status !== project.status) {
            await this.createProjectEvent(project.id, achusrId, "PROJECT_STATUS_CHANGED", {
                from: project.status,
                to: status,
            });
        }
        return this.formatProject(updated);
    }
    async getProjectBySlug(slugRaw, viewerAchusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, viewerAchusrId);
        const isMember = membership?.status === "ACTIVE";
        if (project.visibility === "PRIVATE" && !isMember) {
            throw new common_1.NotFoundException("PROJECT_NOT_FOUND");
        }
        if (project.visibility === "INVITE_ONLY" && !isMember) {
            return {
                project: {
                    slug: project.slug,
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    visibility: project.visibility,
                },
                membership: null,
                stats: {
                    goalsTotal: 0,
                    goalsVerified: 0,
                    completionPercent: 0,
                    membersCount: 0,
                },
            };
        }
        const goals = await this.fetchGoalsForProject(project.id);
        const stats = this.computeStats(goals);
        const membersCount = await this.prisma.projectMember.count({ where: { projectId: project.id, status: "ACTIVE" } });
        return {
            project: this.formatProject(project),
            membership: membership ? { role: membership.role, status: membership.status } : null,
            stats: { ...stats, membersCount },
        };
    }
    async listProjects(achusrId, status, role) {
        const whereMembership = { achusrId, status: "ACTIVE" };
        if (role) {
            const roleValue = coerceMemberRole(role);
            if (roleValue)
                whereMembership.role = roleValue;
        }
        const memberships = await this.prisma.projectMember.findMany({
            where: whereMembership,
            include: { project: true },
            orderBy: { joinedAt: "desc" },
        });
        const filtered = status
            ? memberships.filter((m) => m.project.status === (coerceStatus(status) ?? m.project.status))
            : memberships;
        const statsList = await mapWithConcurrency(filtered, 3, async (membership) => {
            const goals = await this.fetchGoalsForProject(membership.projectId);
            return { projectId: membership.projectId, stats: this.computeStats(goals) };
        });
        const statsMap = new Map(statsList.map((item) => [item.projectId, item.stats]));
        return filtered.map((membership) => ({
            project: this.formatProject(membership.project),
            membership: { role: membership.role, status: membership.status },
            stats: statsMap.get(membership.projectId) || { goalsTotal: 0, goalsVerified: 0, completionPercent: 0 },
        }));
    }
    async listMembers(slugRaw, viewerAchusrId, page, limit) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, viewerAchusrId);
        if (project.visibility !== "PUBLIC") {
            if (!membership || membership.status !== "ACTIVE")
                throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const [total, rows] = await this.prisma.$transaction([
            this.prisma.projectMember.count({ where: { projectId: project.id, status: "ACTIVE" } }),
            this.prisma.projectMember.findMany({
                where: { projectId: project.id, status: "ACTIVE" },
                orderBy: { joinedAt: "asc" },
                skip,
                take,
            }),
        ]);
        const achusrIds = rows.map((row) => row.achusrId);
        const identityMap = await this.identities.getSummaries(achusrIds);
        const streaks = await this.prisma.userStreak.findMany({ where: { achusrId: { in: achusrIds } } });
        const streakMap = new Map(streaks.map((s) => [s.achusrId, s]));
        const totals = await mapWithConcurrency(achusrIds, 4, async (id) => {
            const stats = await this.questEngine.getTotalsForUser(id);
            return { id, totals: stats };
        });
        const xpMap = new Map(totals.map((row) => [row.id, row.totals]));
        const data = rows.map((row) => {
            const identity = identityMap.get(row.achusrId);
            const streak = streakMap.get(row.achusrId);
            const total = xpMap.get(row.achusrId);
            return {
                achusrId: row.achusrId,
                username: identity?.username || "",
                displayName: identity?.displayName || row.achusrId,
                avatar: identity?.avatar || "",
                role: row.role,
                xpTotal: total?.totalXp ?? 0,
                level: total?.level ?? 1,
                currentStreak: streak?.currentStreak ?? 0,
            };
        });
        return { data, page: pageNumber, limit: take, total };
    }
    async addMember(slugRaw, actorAchusrId, handle, roleRaw) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, actorAchusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const targetAchusrId = await this.resolveAchusrIdFromHandle(handle);
        if (!targetAchusrId)
            throw new common_1.BadRequestException("INVALID_HANDLE");
        const role = coerceMemberRole(roleRaw) ?? "COLLABORATOR";
        const existing = await this.prisma.projectMember.findUnique({
            where: { projectId_achusrId: { projectId: project.id, achusrId: targetAchusrId } },
        });
        if (existing && existing.status === "ACTIVE") {
            if (existing.role !== role) {
                await this.prisma.projectMember.update({
                    where: { id: existing.id },
                    data: { role },
                });
                await this.createProjectEvent(project.id, actorAchusrId, "MEMBER_ROLE_CHANGED", {
                    achusrId: targetAchusrId,
                    role,
                });
            }
            return existing;
        }
        const member = existing
            ? await this.prisma.projectMember.update({
                where: { id: existing.id },
                data: { role, status: "ACTIVE", joinedAt: new Date(), leftAt: null },
            })
            : await this.prisma.projectMember.create({
                data: {
                    projectId: project.id,
                    achusrId: targetAchusrId,
                    role,
                    status: "ACTIVE",
                },
            });
        await this.createProjectEvent(project.id, actorAchusrId, "MEMBER_ADDED", {
            achusrId: targetAchusrId,
            role,
        });
        return member;
    }
    async updateMemberRole(slugRaw, actorAchusrId, targetAchusrId, roleRaw) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, actorAchusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const target = await this.prisma.projectMember.findUnique({
            where: { projectId_achusrId: { projectId: project.id, achusrId: targetAchusrId } },
        });
        if (!target || target.status !== "ACTIVE")
            throw new common_1.BadRequestException("NOT_A_MEMBER");
        const role = coerceMemberRole(roleRaw);
        if (!role)
            throw new common_1.BadRequestException("INVALID_ROLE");
        if (role === "OWNER") {
            await this.prisma.$transaction([
                this.prisma.projectMember.updateMany({
                    where: { projectId: project.id, role: "OWNER", status: "ACTIVE" },
                    data: { role: "COLLABORATOR" },
                }),
                this.prisma.projectMember.update({
                    where: { id: target.id },
                    data: { role: "OWNER" },
                }),
            ]);
        }
        else if (target.role === "OWNER") {
            const ownerCount = await this.prisma.projectMember.count({
                where: { projectId: project.id, role: "OWNER", status: "ACTIVE" },
            });
            if (ownerCount <= 1)
                throw new common_1.BadRequestException("OWNER_REQUIRED");
            await this.prisma.projectMember.update({ where: { id: target.id }, data: { role } });
        }
        else {
            await this.prisma.projectMember.update({ where: { id: target.id }, data: { role } });
        }
        await this.createProjectEvent(project.id, actorAchusrId, "MEMBER_ROLE_CHANGED", {
            achusrId: targetAchusrId,
            role,
        });
        return { success: true };
    }
    async removeMember(slugRaw, actorAchusrId, targetAchusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, actorAchusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const target = await this.prisma.projectMember.findUnique({
            where: { projectId_achusrId: { projectId: project.id, achusrId: targetAchusrId } },
        });
        if (!target || target.status !== "ACTIVE")
            throw new common_1.BadRequestException("NOT_A_MEMBER");
        if (target.role === "OWNER") {
            const ownerCount = await this.prisma.projectMember.count({
                where: { projectId: project.id, role: "OWNER", status: "ACTIVE" },
            });
            if (ownerCount <= 1)
                throw new common_1.BadRequestException("OWNER_REQUIRED");
        }
        await this.prisma.projectMember.update({
            where: { id: target.id },
            data: { status: "REMOVED", leftAt: new Date() },
        });
        await this.createProjectEvent(project.id, actorAchusrId, "MEMBER_REMOVED", {
            achusrId: targetAchusrId,
        });
        return { success: true };
    }
    async leaveProject(slugRaw, achusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.BadRequestException("NOT_A_MEMBER");
        if (membership.role === "OWNER") {
            const memberCount = await this.prisma.projectMember.count({
                where: { projectId: project.id, status: "ACTIVE" },
            });
            if (memberCount > 1)
                throw new common_1.BadRequestException("OWNER_CANNOT_LEAVE");
            await this.prisma.project.update({ where: { id: project.id }, data: { status: "ARCHIVED" } });
        }
        await this.prisma.projectMember.update({
            where: { id: membership.id },
            data: { status: "LEFT", leftAt: new Date() },
        });
        return { success: true };
    }
    async attachGoals(slugRaw, achusrId, goalIds) {
        if (!Array.isArray(goalIds) || !goalIds.length) {
            throw new common_1.BadRequestException("INVALID_GOALS");
        }
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        if (membership.role !== "OWNER" && membership.role !== "COLLABORATOR") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const members = await this.prisma.projectMember.findMany({
            where: { projectId: project.id, status: "ACTIVE" },
            select: { achusrId: true },
        });
        const identityMap = await this.identities.getSummaries(members.map((m) => m.achusrId));
        const walletSet = new Set(Array.from(identityMap.values())
            .map((identity) => identity.walletAddress?.toLowerCase())
            .filter(Boolean));
        const targets = goalIds.map((id) => String(id).trim()).filter(Boolean);
        const payload = [];
        for (const goalIdRaw of targets) {
            const numericId = Number(goalIdRaw);
            if (!Number.isFinite(numericId) || numericId <= 0)
                throw new common_1.BadRequestException("INVALID_GOAL_ID");
            const goal = await this.onchain.getGoalById(numericId);
            if (!goal)
                throw new common_1.BadRequestException("GOAL_NOT_FOUND");
            if (!walletSet.has(String(goal.creator).toLowerCase())) {
                throw new common_1.BadRequestException("GOAL_NOT_MEMBER");
            }
            payload.push({ projectId: project.id, goalId: String(goal.id) });
        }
        if (payload.length) {
            await this.prisma.projectGoal.createMany({ data: payload, skipDuplicates: true });
        }
        return this.listGoals(slugRaw, achusrId);
    }
    async detachGoal(slugRaw, achusrId, goalId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        if (membership.role !== "OWNER" && membership.role !== "COLLABORATOR") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        await this.prisma.projectGoal.deleteMany({
            where: { projectId: project.id, goalId: String(goalId) },
        });
        return { success: true };
    }
    async listGoals(slugRaw, viewerAchusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, viewerAchusrId);
        if (project.visibility !== "PUBLIC") {
            if (!membership || membership.status !== "ACTIVE")
                throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const goals = await this.fetchGoalsForProject(project.id);
        const stats = this.computeStats(goals);
        const data = goals.map((goal) => ({
            goalId: String(goal.id),
            creator: goal.creator,
            goalCID: goal.goalCID,
            evidenceCID: goal.evidenceCID,
            level: goal.level,
            approvals: goal.approvals,
            createdAt: goal.createdAt,
            verified: goal.verified,
            badgeMinted: goal.badgeMinted,
            verifiedAt: goal.autoVerifiedAt && goal.autoVerifiedAt > 0 ? goal.autoVerifiedAt : goal.createdAt,
            status: goal.status,
        }));
        return { goals: data, stats };
    }
    async listProjectsByGoal(goalId, achusrId) {
        const memberships = await this.prisma.projectMember.findMany({
            where: { achusrId, status: "ACTIVE" },
            select: { projectId: true },
        });
        const projectIds = memberships.map((m) => m.projectId);
        if (!projectIds.length)
            return [];
        const links = await this.prisma.projectGoal.findMany({
            where: { projectId: { in: projectIds }, goalId: String(goalId) },
            select: { projectId: true },
        });
        const linkedIds = links.map((link) => link.projectId);
        if (!linkedIds.length)
            return [];
        const projects = await this.prisma.project.findMany({ where: { id: { in: linkedIds } } });
        return projects.map((project) => this.formatProject(project));
    }
    async startTimeEntry(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR", "VIEWER"]);
        const running = await this.prisma.timeEntry.findFirst({
            where: { projectId: project.id, achusrId, endedAt: null },
        });
        if (running)
            throw new common_1.BadRequestException("RUNNING_ENTRY_EXISTS");
        let goalId = null;
        if (input.goalId) {
            const numericId = Number(input.goalId);
            if (!Number.isFinite(numericId) || numericId <= 0)
                throw new common_1.BadRequestException("INVALID_GOAL_ID");
            const goal = await this.onchain.getGoalById(numericId);
            if (!goal)
                throw new common_1.BadRequestException("GOAL_NOT_FOUND");
            goalId = String(numericId);
        }
        const note = input.note ? input.note.trim() : null;
        if (note && note.length > 500)
            throw new common_1.BadRequestException("INVALID_NOTE");
        const billable = input.billable !== undefined ? Boolean(input.billable) : true;
        const entry = await this.prisma.timeEntry.create({
            data: {
                projectId: project.id,
                achusrId,
                goalId,
                startedAt: new Date(),
                endedAt: null,
                durationMinutes: null,
                note,
                billable,
            },
        });
        return this.formatTimeEntry(entry);
    }
    async stopTimeEntry(slugRaw, achusrId, entryId) {
        const project = await this.requireProject(slugRaw);
        const entry = await this.prisma.timeEntry.findUnique({ where: { id: entryId } });
        if (!entry || entry.projectId !== project.id)
            throw new common_1.NotFoundException("ENTRY_NOT_FOUND");
        if (entry.achusrId !== achusrId)
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        if (entry.endedAt)
            throw new common_1.BadRequestException("ENTRY_NOT_RUNNING");
        const endedAt = new Date();
        const durationMinutes = computeDurationMinutes(entry.startedAt, endedAt);
        const updated = await this.prisma.timeEntry.update({
            where: { id: entry.id },
            data: { endedAt, durationMinutes },
        });
        return this.formatTimeEntry(updated);
    }
    async createTimeEntry(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR", "VIEWER"]);
        const startedAt = parseDate(input.startedAt);
        const endedAt = parseDate(input.endedAt);
        if (!startedAt || !endedAt)
            throw new common_1.BadRequestException("INVALID_DATE_RANGE");
        const durationMinutes = computeDurationMinutes(startedAt, endedAt);
        let goalId = null;
        if (input.goalId) {
            const numericId = Number(input.goalId);
            if (!Number.isFinite(numericId) || numericId <= 0)
                throw new common_1.BadRequestException("INVALID_GOAL_ID");
            const goal = await this.onchain.getGoalById(numericId);
            if (!goal)
                throw new common_1.BadRequestException("GOAL_NOT_FOUND");
            goalId = String(numericId);
        }
        const note = input.note ? input.note.trim() : null;
        if (note && note.length > 500)
            throw new common_1.BadRequestException("INVALID_NOTE");
        const billable = input.billable !== undefined ? Boolean(input.billable) : true;
        const entry = await this.prisma.timeEntry.create({
            data: {
                projectId: project.id,
                achusrId,
                goalId,
                startedAt,
                endedAt,
                durationMinutes,
                note,
                billable,
            },
        });
        return this.formatTimeEntry(entry);
    }
    async updateTimeEntry(slugRaw, achusrId, entryId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR", "VIEWER"]);
        const entry = await this.prisma.timeEntry.findUnique({ where: { id: entryId } });
        if (!entry || entry.projectId !== project.id)
            throw new common_1.NotFoundException("ENTRY_NOT_FOUND");
        if (entry.invoiceId)
            throw new common_1.BadRequestException("ENTRY_ALREADY_INVOICED");
        if (entry.achusrId !== achusrId && membership.role !== "OWNER")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        const data = {};
        if (input.note !== undefined) {
            const note = input.note ? input.note.trim() : null;
            if (note && note.length > 500)
                throw new common_1.BadRequestException("INVALID_NOTE");
            data.note = note;
        }
        if (input.billable !== undefined)
            data.billable = Boolean(input.billable);
        if (input.goalId !== undefined) {
            if (!input.goalId) {
                data.goalId = null;
            }
            else {
                const numericId = Number(input.goalId);
                if (!Number.isFinite(numericId) || numericId <= 0)
                    throw new common_1.BadRequestException("INVALID_GOAL_ID");
                const goal = await this.onchain.getGoalById(numericId);
                if (!goal)
                    throw new common_1.BadRequestException("GOAL_NOT_FOUND");
                data.goalId = String(numericId);
            }
        }
        if (input.startedAt !== undefined) {
            if (!input.startedAt)
                throw new common_1.BadRequestException("INVALID_DATE");
            data.startedAt = parseDate(input.startedAt);
        }
        if (input.endedAt !== undefined) {
            data.endedAt = input.endedAt ? parseDate(input.endedAt) : null;
        }
        const nextStarted = data.startedAt ?? entry.startedAt;
        const nextEnded = data.endedAt !== undefined ? data.endedAt : entry.endedAt;
        if (nextEnded) {
            data.durationMinutes = computeDurationMinutes(nextStarted, nextEnded);
        }
        else if (data.endedAt === null) {
            data.durationMinutes = null;
        }
        const updated = await this.prisma.timeEntry.update({ where: { id: entry.id }, data });
        return this.formatTimeEntry(updated);
    }
    async deleteTimeEntry(slugRaw, achusrId, entryId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR", "VIEWER"]);
        const entry = await this.prisma.timeEntry.findUnique({ where: { id: entryId } });
        if (!entry || entry.projectId !== project.id)
            throw new common_1.NotFoundException("ENTRY_NOT_FOUND");
        if (entry.invoiceId)
            throw new common_1.BadRequestException("ENTRY_ALREADY_INVOICED");
        if (entry.achusrId !== achusrId && membership.role !== "OWNER")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        await this.prisma.timeEntry.delete({ where: { id: entry.id } });
        return { success: true };
    }
    async listTimeEntries(slugRaw, achusrId, filters) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        const isViewer = membership.role === "VIEWER";
        const mineFlag = parseBooleanParam(filters.mine);
        const mineOnly = isViewer ? true : mineFlag === null ? false : mineFlag;
        const where = { projectId: project.id };
        if (mineOnly)
            where.achusrId = achusrId;
        const billableFlag = parseBooleanParam(filters.billable);
        if (billableFlag !== null)
            where.billable = billableFlag;
        if (filters.goalId)
            where.goalId = String(filters.goalId);
        const fromDate = parseOptionalDate(filters.from);
        const toDate = parseOptionalDate(filters.to);
        if (fromDate || toDate) {
            where.startedAt = {};
            if (fromDate)
                where.startedAt.gte = fromDate;
            if (toDate)
                where.startedAt.lte = toDate;
        }
        const entries = await this.prisma.timeEntry.findMany({
            where,
            orderBy: { startedAt: "desc" },
        });
        const totals = entries.reduce((acc, entry) => {
            const minutes = entry.durationMinutes ?? 0;
            acc.totalMinutes += minutes;
            if (entry.billable)
                acc.billableMinutes += minutes;
            else
                acc.nonBillableMinutes += minutes;
            return acc;
        }, { totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 });
        return {
            entries: entries.map((entry) => this.formatTimeEntry(entry)),
            summary: totals,
        };
    }
    async getBillingSettings(slugRaw, achusrId) {
        const project = await this.requireProject(slugRaw);
        await this.requireActiveMember(project.id, achusrId);
        const settings = await this.prisma.projectBillingSettings.findUnique({
            where: { projectId: project.id },
        });
        if (settings)
            return this.formatBillingSettings(settings);
        const profile = await this.prisma.professionalProfile.findUnique({ where: { achusrId: project.ownerAchusrId } });
        return {
            billingModel: "HOURLY",
            currency: profile?.currency || "USD",
            hourlyRateAmount: profile?.hourlyRateMin ? Number(profile.hourlyRateMin) : null,
            fixedFeeAmount: null,
            taxPercent: null,
            defaultDueDays: 7,
            notes: "",
        };
    }
    async updateBillingSettings(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER"]);
        const billingModel = coerceBillingModel(input.billingModel);
        const currency = input.currency ? input.currency.trim().toUpperCase() : null;
        if (currency && currency.length > 10)
            throw new common_1.BadRequestException("INVALID_CURRENCY");
        const hourlyRateAmount = parseNumberValue(input.hourlyRateAmount ?? null);
        const fixedFeeAmount = parseNumberValue(input.fixedFeeAmount ?? null);
        const taxPercent = parseNumberValue(input.taxPercent ?? null);
        const defaultDueDays = input.defaultDueDays !== undefined ? parseNumberValue(input.defaultDueDays) : null;
        if (hourlyRateAmount !== null && hourlyRateAmount < 0)
            throw new common_1.BadRequestException("INVALID_RATE");
        if (fixedFeeAmount !== null && fixedFeeAmount < 0)
            throw new common_1.BadRequestException("INVALID_RATE");
        if (taxPercent !== null && taxPercent < 0)
            throw new common_1.BadRequestException("INVALID_TAX");
        if (defaultDueDays !== null && defaultDueDays < 0)
            throw new common_1.BadRequestException("INVALID_DUE_DAYS");
        const notes = input.notes !== undefined ? (input.notes ? input.notes.trim() : "") : undefined;
        if (notes !== undefined && notes.length > 2000)
            throw new common_1.BadRequestException("INVALID_NOTES");
        const data = {};
        if (billingModel)
            data.billingModel = billingModel;
        if (currency)
            data.currency = currency;
        if (input.hourlyRateAmount !== undefined)
            data.hourlyRateAmount = hourlyRateAmount;
        if (input.fixedFeeAmount !== undefined)
            data.fixedFeeAmount = fixedFeeAmount;
        if (input.taxPercent !== undefined)
            data.taxPercent = taxPercent;
        if (input.defaultDueDays !== undefined)
            data.defaultDueDays = defaultDueDays;
        if (notes !== undefined)
            data.notes = notes;
        const updated = await this.prisma.projectBillingSettings.upsert({
            where: { projectId: project.id },
            update: data,
            create: {
                projectId: project.id,
                billingModel: data.billingModel || "HOURLY",
                currency: data.currency || "USD",
                hourlyRateAmount: data.hourlyRateAmount ?? null,
                fixedFeeAmount: data.fixedFeeAmount ?? null,
                taxPercent: data.taxPercent ?? null,
                defaultDueDays: data.defaultDueDays ?? null,
                notes: data.notes || "",
            },
        });
        return this.formatBillingSettings(updated);
    }
    async listInvoices(slugRaw, achusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR"]);
        const invoices = await this.prisma.invoice.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: "desc" },
        });
        return invoices.map((invoice) => this.formatInvoice(invoice));
    }
    async getInvoiceDetail(slugRaw, achusrId, invoiceId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR"]);
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { lineItems: true, timeEntries: true },
        });
        if (!invoice || invoice.projectId !== project.id)
            throw new common_1.NotFoundException("INVOICE_NOT_FOUND");
        return {
            invoice: this.formatInvoice(invoice),
            project: { slug: project.slug, name: project.name },
            lineItems: invoice.lineItems.map((item) => this.formatInvoiceLineItem(item)),
            timeEntries: invoice.timeEntries.map((entry) => ({
                id: entry.id,
                goalId: entry.goalId,
                startedAt: entry.startedAt,
                endedAt: entry.endedAt,
                durationMinutes: entry.durationMinutes,
                note: entry.note,
                billable: entry.billable,
            })),
        };
    }
    async createInvoice(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR"]);
        const clientName = (input.clientName || "").trim();
        if (!clientName || clientName.length > 160)
            throw new common_1.BadRequestException("INVALID_CLIENT");
        const clientEmail = input.clientEmail ? input.clientEmail.trim() : null;
        if (clientEmail && clientEmail.length > 160)
            throw new common_1.BadRequestException("INVALID_CLIENT");
        const clientAddress = input.clientAddress ? input.clientAddress.trim() : null;
        const currency = (input.currency || "").trim().toUpperCase();
        if (!currency || currency.length > 10)
            throw new common_1.BadRequestException("INVALID_CURRENCY");
        const issueDate = parseDate(input.issueDate);
        if (!issueDate)
            throw new common_1.BadRequestException("INVALID_DATE");
        const dueDate = input.dueDate ? parseDate(input.dueDate) : null;
        const items = Array.isArray(input.lineItems) ? input.lineItems : [];
        if (!items.length)
            throw new common_1.BadRequestException("INVALID_LINE_ITEMS");
        const lineItems = items.map((item) => {
            const description = (item.description || "").trim();
            if (!description || description.length > 300)
                throw new common_1.BadRequestException("INVALID_LINE_ITEM");
            const quantity = parseNumberValue(item.quantity ?? 1) ?? 1;
            const unitAmount = parseNumberValue(item.unitAmount ?? 0) ?? 0;
            if (quantity <= 0 || unitAmount < 0)
                throw new common_1.BadRequestException("INVALID_LINE_ITEM");
            const totalAmount = roundAmount(quantity * unitAmount);
            const linkedType = item.linkedType ? String(item.linkedType).toUpperCase() : null;
            if (linkedType && !Object.prototype.hasOwnProperty.call(client_1.InvoiceLineType, linkedType)) {
                throw new common_1.BadRequestException("INVALID_LINKED_TYPE");
            }
            if (linkedType === "TIME_ENTRY" && !item.linkedRef) {
                throw new common_1.BadRequestException("INVALID_LINE_ITEM");
            }
            return {
                description,
                quantity,
                unitAmount,
                totalAmount,
                linkedType: linkedType ?? null,
                linkedRef: item.linkedRef ? String(item.linkedRef) : null,
            };
        });
        const billing = await this.prisma.projectBillingSettings.findUnique({ where: { projectId: project.id } });
        const taxPercent = billing?.taxPercent ? Number(billing.taxPercent) : null;
        const totals = this.computeInvoiceTotals(lineItems, taxPercent);
        const publicSlug = input.publicSlug ? normalizeInvoiceSlug(input.publicSlug) : null;
        if (input.publicSlug && !publicSlug)
            throw new common_1.BadRequestException("INVALID_PUBLIC_SLUG");
        if (publicSlug) {
            const existing = await this.prisma.invoice.findUnique({ where: { publicSlug } });
            if (existing)
                throw new common_1.BadRequestException("SLUG_TAKEN");
        }
        const publicVisibility = coerceInvoiceVisibility(input.publicVisibility) ?? "UNLISTED";
        const publicTheme = coerceShareTheme(input.publicTheme) ?? "AUTO";
        const publicExpiresAt = input.publicExpiresAt ? parseDate(input.publicExpiresAt) : null;
        const linkedTimeIds = lineItems
            .filter((item) => item.linkedType === "TIME_ENTRY" && item.linkedRef)
            .map((item) => String(item.linkedRef));
        const invoice = await this.prisma.$transaction(async (tx) => {
            if (linkedTimeIds.length) {
                const entries = await tx.timeEntry.findMany({
                    where: { id: { in: linkedTimeIds }, projectId: project.id },
                });
                if (entries.length !== linkedTimeIds.length)
                    throw new common_1.BadRequestException("INVALID_TIME_ENTRY");
                if (entries.some((entry) => entry.invoiceId))
                    throw new common_1.BadRequestException("ENTRY_ALREADY_INVOICED");
            }
            const created = await tx.invoice.create({
                data: {
                    projectId: project.id,
                    ownerAchusrId: achusrId,
                    clientName,
                    clientEmail,
                    clientAddress,
                    currency,
                    issueDate,
                    dueDate,
                    notes: input.notes ? input.notes.trim() : null,
                    subtotalAmount: totals.subtotalAmount,
                    taxAmount: totals.taxAmount,
                    totalAmount: totals.totalAmount,
                    publicSlug,
                    publicVisibility,
                    publicTheme,
                    publicExpiresAt,
                    lineItems: {
                        create: lineItems.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitAmount: item.unitAmount,
                            totalAmount: item.totalAmount,
                            linkedType: item.linkedType,
                            linkedRef: item.linkedRef,
                        })),
                    },
                },
                include: { lineItems: true },
            });
            if (linkedTimeIds.length) {
                await tx.timeEntry.updateMany({
                    where: { id: { in: linkedTimeIds } },
                    data: { invoiceId: created.id },
                });
            }
            return created;
        });
        return {
            invoice: this.formatInvoice(invoice),
            lineItems: invoice.lineItems.map((item) => this.formatInvoiceLineItem(item)),
        };
    }
    async generateInvoiceFromTime(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR"]);
        const from = parseDate(input.from);
        const to = parseDate(input.to);
        if (!from || !to)
            throw new common_1.BadRequestException("INVALID_DATE_RANGE");
        const billing = await this.prisma.projectBillingSettings.findUnique({ where: { projectId: project.id } });
        const billingModel = billing?.billingModel ?? "HOURLY";
        const hourlyRate = billing?.hourlyRateAmount ? Number(billing.hourlyRateAmount) : null;
        if ((billingModel === "HOURLY" || billingModel === "HYBRID") && (hourlyRate === null || hourlyRate <= 0)) {
            throw new common_1.BadRequestException("MISSING_HOURLY_RATE");
        }
        const entries = await this.prisma.timeEntry.findMany({
            where: {
                projectId: project.id,
                startedAt: { gte: from, lte: to },
                endedAt: { not: null },
                invoiceId: null,
                ...(input.onlyBillable ? { billable: true } : {}),
            },
            orderBy: { startedAt: "asc" },
        });
        if (!entries.length)
            throw new common_1.BadRequestException("NO_TIME_ENTRIES");
        const grouping = (input.grouping || "SINGLE_LINE").toUpperCase();
        const grouped = new Map();
        for (const entry of entries) {
            const minutes = entry.durationMinutes ?? computeDurationMinutes(entry.startedAt, entry.endedAt);
            let key = "all";
            let label = "Work";
            let goalId = null;
            if (grouping === "BY_DAY") {
                const day = entry.startedAt.toISOString().slice(0, 10);
                key = day;
                label = `Work on ${day}`;
            }
            else if (grouping === "BY_GOAL") {
                const resolvedGoalId = entry.goalId ?? "UNASSIGNED";
                goalId = resolvedGoalId;
                key = resolvedGoalId;
                label = entry.goalId ? `Work on goal ${entry.goalId}` : "General project work";
            }
            else {
                label = `Work from ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`;
            }
            const bucket = grouped.get(key) || { minutes: 0, goalId, label };
            bucket.minutes += minutes;
            grouped.set(key, bucket);
        }
        const lineItems = Array.from(grouped.entries()).map(([key, bucket]) => {
            const hours = roundAmount(bucket.minutes / 60);
            const unitAmount = hourlyRate ?? 0;
            const totalAmount = roundAmount(hours * unitAmount);
            const linkedType = grouping === "BY_GOAL" && bucket.goalId && bucket.goalId !== "UNASSIGNED" ? "GOAL" : "CUSTOM";
            return {
                description: bucket.label || `Work batch ${key}`,
                quantity: hours,
                unitAmount,
                totalAmount,
                linkedType: linkedType,
                linkedRef: linkedType === "GOAL" ? bucket.goalId : null,
            };
        });
        const taxPercent = billing?.taxPercent ? Number(billing.taxPercent) : null;
        const totals = this.computeInvoiceTotals(lineItems, taxPercent);
        const issueDate = new Date();
        const dueDate = billing?.defaultDueDays ? new Date(issueDate.getTime() + billing.defaultDueDays * 86400000) : null;
        const invoice = await this.prisma.$transaction(async (tx) => {
            const created = await tx.invoice.create({
                data: {
                    projectId: project.id,
                    ownerAchusrId: achusrId,
                    clientName: project.clientName || "Client",
                    currency: billing?.currency || "USD",
                    issueDate,
                    dueDate,
                    status: "DRAFT",
                    subtotalAmount: totals.subtotalAmount,
                    taxAmount: totals.taxAmount,
                    totalAmount: totals.totalAmount,
                    publicVisibility: "UNLISTED",
                    publicTheme: "AUTO",
                    lineItems: {
                        create: lineItems.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitAmount: item.unitAmount,
                            totalAmount: item.totalAmount,
                            linkedType: item.linkedType,
                            linkedRef: item.linkedRef,
                        })),
                    },
                },
                include: { lineItems: true },
            });
            await tx.timeEntry.updateMany({
                where: { id: { in: entries.map((e) => e.id) } },
                data: { invoiceId: created.id },
            });
            return created;
        });
        return {
            invoice: this.formatInvoice(invoice),
            lineItems: invoice.lineItems.map((item) => this.formatInvoiceLineItem(item)),
        };
    }
    async updateInvoice(slugRaw, achusrId, invoiceId, input) {
        if (input.lineItems !== undefined)
            throw new common_1.BadRequestException("LINE_ITEMS_IMMUTABLE");
        const project = await this.requireProject(slugRaw);
        const membership = await this.requireActiveMember(project.id, achusrId);
        this.requireRoles(membership, ["OWNER", "COLLABORATOR"]);
        const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice || invoice.projectId !== project.id)
            throw new common_1.NotFoundException("INVOICE_NOT_FOUND");
        const data = {};
        if (input.clientName !== undefined) {
            const clientName = (input.clientName || "").trim();
            if (!clientName || clientName.length > 160)
                throw new common_1.BadRequestException("INVALID_CLIENT");
            data.clientName = clientName;
        }
        if (input.clientEmail !== undefined) {
            data.clientEmail = input.clientEmail ? input.clientEmail.trim() : null;
        }
        if (input.clientAddress !== undefined) {
            data.clientAddress = input.clientAddress ? input.clientAddress.trim() : null;
        }
        if (input.issueDate !== undefined) {
            if (!input.issueDate)
                throw new common_1.BadRequestException("INVALID_DATE");
            data.issueDate = parseDate(input.issueDate);
        }
        if (input.dueDate !== undefined)
            data.dueDate = input.dueDate ? parseDate(input.dueDate) : null;
        if (input.notes !== undefined)
            data.notes = input.notes ? input.notes.trim() : null;
        if (input.status !== undefined) {
            const nextStatus = coerceInvoiceStatus(input.status);
            if (!nextStatus)
                throw new common_1.BadRequestException("INVALID_STATUS");
            this.validateInvoiceStatusTransition(invoice.status, nextStatus);
            data.status = nextStatus;
        }
        if (input.publicSlug !== undefined) {
            if (!input.publicSlug) {
                data.publicSlug = null;
            }
            else {
                const slug = normalizeInvoiceSlug(input.publicSlug);
                if (!slug)
                    throw new common_1.BadRequestException("INVALID_PUBLIC_SLUG");
                const existing = await this.prisma.invoice.findFirst({ where: { publicSlug: slug, NOT: { id: invoice.id } } });
                if (existing)
                    throw new common_1.BadRequestException("SLUG_TAKEN");
                data.publicSlug = slug;
            }
        }
        if (input.publicVisibility !== undefined) {
            const visibility = coerceInvoiceVisibility(input.publicVisibility);
            if (!visibility)
                throw new common_1.BadRequestException("INVALID_VISIBILITY");
            data.publicVisibility = visibility;
        }
        if (input.publicTheme !== undefined) {
            const theme = coerceShareTheme(input.publicTheme);
            if (!theme)
                throw new common_1.BadRequestException("INVALID_THEME");
            data.publicTheme = theme;
        }
        if (input.publicExpiresAt !== undefined) {
            data.publicExpiresAt = input.publicExpiresAt ? parseDate(input.publicExpiresAt) : null;
        }
        const updated = await this.prisma.invoice.update({ where: { id: invoice.id }, data });
        return this.formatInvoice(updated);
    }
    async resolvePublicInvoice(slug) {
        const invoice = await this.prisma.invoice.findFirst({ where: { publicSlug: slug } });
        if (!invoice || invoice.publicVisibility === "DISABLED")
            throw new common_1.NotFoundException("INVOICE_NOT_FOUND");
        if (invoice.publicExpiresAt && invoice.publicExpiresAt.getTime() < Date.now()) {
            throw new common_1.NotFoundException("INVOICE_NOT_FOUND");
        }
        const project = await this.prisma.project.findUnique({ where: { id: invoice.projectId } });
        if (!project)
            throw new common_1.NotFoundException("PROJECT_NOT_FOUND");
        const identityMap = await this.identities.getSummaries([invoice.ownerAchusrId]);
        const identity = identityMap.get(invoice.ownerAchusrId);
        const profile = await this.prisma.professionalProfile.findUnique({ where: { achusrId: invoice.ownerAchusrId } });
        const lineItems = await this.prisma.invoiceLineItem.findMany({
            where: { invoiceId: invoice.id },
            orderBy: { createdAt: "asc" },
        });
        return {
            invoice: {
                clientName: invoice.clientName,
                clientEmail: invoice.clientEmail,
                clientAddress: invoice.clientAddress,
                currency: invoice.currency,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                status: this.normalizeInvoiceStatus(invoice.status, invoice.dueDate),
                subtotalAmount: formatDecimal(invoice.subtotalAmount),
                taxAmount: formatDecimal(invoice.taxAmount),
                totalAmount: formatDecimal(invoice.totalAmount),
                publicSlug: invoice.publicSlug,
                publicTheme: invoice.publicTheme,
            },
            project: { name: project.name },
            owner: {
                displayName: identity?.displayName || invoice.ownerAchusrId,
                username: identity?.username || "",
                achusrId: invoice.ownerAchusrId,
                professionalProfile: {
                    headline: profile?.headline || "",
                    location: profile?.location || "",
                    websiteUrl: profile?.websiteUrl || "",
                    githubUrl: profile?.githubUrl || "",
                    xUrl: profile?.xUrl || "",
                },
            },
            lineItems: lineItems.map((item) => ({
                description: item.description,
                quantity: formatDecimal(item.quantity),
                unitAmount: formatDecimal(item.unitAmount),
                totalAmount: formatDecimal(item.totalAmount),
            })),
        };
    }
    async getProjectActivity(slugRaw, viewerAchusrId, page, limit, ignoreVisibility = false) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, viewerAchusrId);
        if (!ignoreVisibility && project.visibility !== "PUBLIC") {
            if (!membership || membership.status !== "ACTIVE")
                throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const { page: pageNumber, take, skip } = parsePagination(page, limit);
        const goalLinks = await this.prisma.projectGoal.findMany({ where: { projectId: project.id } });
        const goalSet = new Set(goalLinks.map((link) => String(link.goalId)));
        const fetchSize = Math.min(take * 4, 200);
        const [projectEvents, activity] = await Promise.all([
            this.prisma.projectEvent.findMany({
                where: { projectId: project.id },
                orderBy: { createdAt: "desc" },
                take: fetchSize,
            }),
            goalSet.size
                ? this.prisma.userActivity.findMany({
                    where: { type: { in: ["GOAL_VERIFIED"] } },
                    orderBy: { createdAt: "desc" },
                    take: fetchSize,
                })
                : [],
        ]);
        const filteredActivity = activity.filter((item) => {
            const goalId = item.payload?.goalId;
            if (!goalId)
                return false;
            return goalSet.has(String(goalId));
        });
        const combined = [
            ...projectEvents.map((event) => ({
                id: event.id,
                type: event.type,
                achusrId: event.achusrId,
                createdAt: event.createdAt,
                payload: event.payload,
                summary: this.describeProjectEvent(event.type, event.payload),
            })),
            ...filteredActivity.map((item) => ({
                id: item.id,
                type: item.type,
                achusrId: item.achusrId,
                createdAt: item.createdAt,
                payload: item.payload,
                summary: (0, feed_util_1.describeActivity)(item.type, item.payload),
            })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const pageItems = combined.slice(skip, skip + take);
        const identityMap = await this.identities.getSummaries(Array.from(new Set(pageItems.map((item) => item.achusrId).filter(Boolean))));
        const data = pageItems.map((item) => ({
            id: item.id,
            type: item.type,
            createdAt: item.createdAt,
            payload: item.payload,
            summary: item.summary,
            actor: item.achusrId ? identityMap.get(item.achusrId) : null,
        }));
        return { data, page: pageNumber, limit: take, total: combined.length };
    }
    async createShareLink(slugRaw, achusrId, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const slugInfo = normalizeSlug(input.slug || "", SHARE_SLUG_MIN, SHARE_SLUG_MAX);
        if (!slugInfo.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const existing = await this.prisma.projectShareLink.findUnique({ where: { slug: slugInfo.slug } });
        if (existing)
            throw new common_1.BadRequestException("SLUG_TAKEN");
        const title = (input.title || "").trim();
        if (!title || title.length > 80)
            throw new common_1.BadRequestException("INVALID_TITLE");
        const description = input.description ? input.description.trim() : null;
        if (description && description.length > 200)
            throw new common_1.BadRequestException("INVALID_DESCRIPTION");
        const visibility = coerceShareVisibility(input.visibility) ?? "UNLISTED";
        const theme = coerceShareTheme(input.theme) ?? "AUTO";
        const sections = normalizeShareSections(input.sections);
        let expiresAt = null;
        if (input.expiresAt) {
            expiresAt = parseDate(input.expiresAt);
            if (expiresAt && expiresAt.getTime() < Date.now())
                throw new common_1.BadRequestException("INVALID_EXPIRES_AT");
        }
        if (input.isPrimary) {
            await this.prisma.projectShareLink.updateMany({ where: { projectId: project.id }, data: { isPrimary: false } });
        }
        const link = await this.prisma.projectShareLink.create({
            data: {
                projectId: project.id,
                slug: slugInfo.slug,
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
    async listShareLinks(slugRaw, achusrId) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE")
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        if (membership.role !== "OWNER" && membership.role !== "COLLABORATOR") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const links = await this.prisma.projectShareLink.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: "desc" },
        });
        return links.map((link) => this.formatShareLink(link));
    }
    async updateShareLink(slugRaw, achusrId, id, input) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const existing = await this.prisma.projectShareLink.findUnique({ where: { id } });
        if (!existing || existing.projectId !== project.id)
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        const data = {};
        if (input.slug !== undefined) {
            const slugInfo = normalizeSlug(input.slug || "", SHARE_SLUG_MIN, SHARE_SLUG_MAX);
            if (!slugInfo.valid)
                throw new common_1.BadRequestException("INVALID_SLUG");
            const other = await this.prisma.projectShareLink.findFirst({
                where: { slug: slugInfo.slug, NOT: { id } },
            });
            if (other)
                throw new common_1.BadRequestException("SLUG_TAKEN");
            data.slug = slugInfo.slug;
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
        const visibility = coerceShareVisibility(input.visibility);
        if (visibility)
            data.visibility = visibility;
        const theme = coerceShareTheme(input.theme);
        if (theme)
            data.theme = theme;
        if (input.sections !== undefined)
            data.sections = normalizeShareSections(input.sections);
        if (input.isPrimary !== undefined) {
            data.isPrimary = Boolean(input.isPrimary);
            if (input.isPrimary) {
                await this.prisma.projectShareLink.updateMany({ where: { projectId: project.id }, data: { isPrimary: false } });
            }
        }
        if (input.expiresAt !== undefined) {
            data.expiresAt = input.expiresAt ? parseDate(input.expiresAt) : null;
        }
        const updated = await this.prisma.projectShareLink.update({ where: { id }, data });
        return this.formatShareLink(updated);
    }
    async deleteShareLink(slugRaw, achusrId, id) {
        const project = await this.requireProject(slugRaw);
        const membership = await this.getMembership(project.id, achusrId);
        if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
            throw new common_1.ForbiddenException("NOT_ALLOWED");
        }
        const existing = await this.prisma.projectShareLink.findUnique({ where: { id } });
        if (!existing || existing.projectId !== project.id)
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        await this.prisma.projectShareLink.update({
            where: { id },
            data: { visibility: "DISABLED" },
        });
        return { success: true };
    }
    async resolveShareLink(slug) {
        const link = await this.prisma.projectShareLink.findUnique({ where: { slug } });
        if (!link || link.visibility === "DISABLED")
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        if (link.expiresAt && link.expiresAt.getTime() < Date.now())
            throw new common_1.NotFoundException("LINK_NOT_FOUND");
        const project = await this.prisma.project.findUnique({ where: { id: link.projectId } });
        if (!project)
            throw new common_1.NotFoundException("PROJECT_NOT_FOUND");
        const goals = await this.fetchGoalsForProject(project.id);
        const stats = this.computeStats(goals);
        const sections = normalizeShareSections(link.sections);
        const team = sections.team
            ? await this.prisma.projectMember.findMany({
                where: { projectId: project.id, status: "ACTIVE" },
                orderBy: { joinedAt: "asc" },
            })
            : [];
        const identities = sections.team
            ? await this.identities.getSummaries(team.map((member) => member.achusrId))
            : new Map();
        const teamData = sections.team
            ? team.map((member) => {
                const identity = identities.get(member.achusrId);
                return {
                    achusrId: member.achusrId,
                    displayName: identity?.displayName || member.achusrId,
                    username: identity?.username || "",
                    avatar: identity?.avatar || "",
                    role: member.role,
                };
            })
            : [];
        const activity = sections.activity ? await this.getProjectActivity(project.slug, null, "1", "10", true) : null;
        return {
            link: this.formatShareLink(link),
            project: this.formatProject(project),
            stats,
            team: teamData,
            goals: sections.goals
                ? goals.map((goal) => ({
                    goalId: String(goal.id),
                    level: goal.level,
                    status: goal.status,
                    goalCID: goal.goalCID,
                    createdAt: goal.createdAt,
                    verifiedAt: goal.autoVerifiedAt && goal.autoVerifiedAt > 0 ? goal.autoVerifiedAt : goal.createdAt,
                }))
                : [],
            activity: sections.activity ? (activity?.data ?? []) : [],
            clientNotes: sections.clientNotes
                ? {
                    clientName: project.clientName,
                    clientReference: project.clientReference,
                    dueDate: project.dueDate,
                }
                : null,
        };
    }
    formatShareLink(link) {
        return {
            id: link.id,
            slug: link.slug,
            title: link.title,
            description: link.description,
            visibility: link.visibility,
            sections: link.sections,
            theme: link.theme,
            isPrimary: link.isPrimary,
            expiresAt: link.expiresAt,
            createdAt: link.createdAt,
        };
    }
    describeProjectEvent(type, payload) {
        switch (type) {
            case "PROJECT_CREATED":
                return "Project created";
            case "PROJECT_STATUS_CHANGED":
                return `Status changed to ${payload?.to || "UPDATED"}`;
            case "MEMBER_ADDED":
                return "Member added to project";
            case "MEMBER_REMOVED":
                return "Member removed from project";
            case "MEMBER_ROLE_CHANGED":
                return "Member role updated";
            default:
                return "Project update";
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11,
        socialIdentity_service_1.SocialIdentityService,
        questEngine_service_1.QuestEngineService])
], ProjectsService);

export const ProjectsService = exports.ProjectsService as any;
export type ProjectsService = any;
