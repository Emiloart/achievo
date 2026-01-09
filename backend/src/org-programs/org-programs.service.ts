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
exports.OrgProgramsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const org_audit_service_1 = require("../org-audit/org-audit.service");
const organizations_service_1 = require("../organizations/organizations.service");
const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MIN = 3;
const SLUG_MAX = 40;
function normalizeSlug(raw) {
    const value = (raw || "").trim().toLowerCase();
    if (!value || value.length < SLUG_MIN || value.length > SLUG_MAX)
        return { valid: false, slug: "" };
    if (!SLUG_REGEX.test(value))
        return { valid: false, slug: "" };
    if (value.startsWith("-") || value.endsWith("-"))
        return { valid: false, slug: "" };
    return { valid: true, slug: value };
}
let OrgProgramsService = class OrgProgramsService {
    constructor(prisma, audit, orgs) {
        this.prisma = prisma;
        this.audit = audit;
        this.orgs = orgs;
    }
    async canViewOrg(orgId, viewerUserId, token) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        if (!org)
            throw new common_1.NotFoundException("ORG_NOT_FOUND");
        const membership = viewerUserId ? await this.orgs.getMembership(orgId, viewerUserId) : null;
        if (org.visibility === "PRIVATE" && !membership)
            throw new common_1.NotFoundException("ORG_NOT_FOUND");
        if (org.visibility === "UNLISTED" && !membership) {
            const invite = token ? await this.prisma.orgInvite.findUnique({ where: { token: token || "" } }) : null;
            const valid = invite && invite.orgId === orgId && (!invite.expiresAt || invite.expiresAt.getTime() >= Date.now());
            if (!valid)
                throw new common_1.NotFoundException("ORG_NOT_FOUND");
        }
        return { org, membership };
    }
    async createProgram(orgId, actorUserId, input) {
        const slugResult = normalizeSlug(input.slug);
        if (!slugResult.valid)
            throw new common_1.BadRequestException("INVALID_SLUG");
        const title = (input.title || "").trim();
        if (!title)
            throw new common_1.BadRequestException("TITLE_REQUIRED");
        const program = await this.prisma.orgProgram.create({
            data: {
                orgId,
                slug: slugResult.slug,
                title,
                summary: input.summary?.trim() || null,
                status: "DRAFT",
                startsAt: input.startsAt ? new Date(input.startsAt) : null,
                endsAt: input.endsAt ? new Date(input.endsAt) : null,
                rules: input.rules ?? {},
                createdByUserId: actorUserId,
            },
        });
        await this.audit.log({
            orgId,
            actorUserId,
            action: "PROGRAM_CREATED",
            targetType: "PROGRAM",
            targetId: program.id,
        });
        return program;
    }
    async updateProgram(orgId, programId, actorUserId, input) {
        const program = await this.prisma.orgProgram.findUnique({ where: { id: programId } });
        if (!program || program.orgId !== orgId)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        const nextStatus = input.status ? String(input.status).toUpperCase() : null;
        if (nextStatus && !Object.prototype.hasOwnProperty.call(client_1.ProgramStatus, nextStatus)) {
            throw new common_1.BadRequestException("INVALID_STATUS");
        }
        const updated = await this.prisma.orgProgram.update({
            where: { id: programId },
            data: {
                title: input.title?.trim() || undefined,
                summary: input.summary?.trim() || undefined,
                startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
                endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
                rules: input.rules ?? undefined,
                status: nextStatus || undefined,
            },
        });
        await this.audit.log({
            orgId,
            actorUserId,
            action: "PROGRAM_UPDATED",
            targetType: "PROGRAM",
            targetId: programId,
        });
        return updated;
    }
    async publishProgram(orgId, programId, actorUserId) {
        const program = await this.prisma.orgProgram.findUnique({ where: { id: programId } });
        if (!program || program.orgId !== orgId)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        const updated = await this.prisma.orgProgram.update({
            where: { id: programId },
            data: { status: "LIVE" },
        });
        await this.audit.log({
            orgId,
            actorUserId,
            action: "PROGRAM_PUBLISHED",
            targetType: "PROGRAM",
            targetId: programId,
        });
        return updated;
    }
    async createMilestone(orgId, programId, actorUserId, input) {
        const program = await this.prisma.orgProgram.findUnique({ where: { id: programId } });
        if (!program || program.orgId !== orgId)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        const title = (input.title || "").trim();
        if (!title)
            throw new common_1.BadRequestException("TITLE_REQUIRED");
        const order = Number.isFinite(input.order) ? Math.floor(input.order) : NaN;
        if (!Number.isFinite(order) || order < 0)
            throw new common_1.BadRequestException("INVALID_ORDER");
        const milestone = await this.prisma.programMilestone.create({
            data: {
                programId,
                order,
                title,
                description: input.description?.trim() || null,
                requirements: input.requirements ?? {},
            },
        });
        await this.audit.log({
            orgId,
            actorUserId,
            action: "MILESTONE_CREATED",
            targetType: "MILESTONE",
            targetId: milestone.id,
        });
        return milestone;
    }
    async getProgramBySlug(orgId, slugRaw, viewerUserId, token) {
        const slug = normalizeSlug(slugRaw);
        if (!slug.valid)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        const { org, membership } = await this.canViewOrg(orgId, viewerUserId, token || null);
        const program = await this.prisma.orgProgram.findFirst({ where: { orgId, slug: slug.slug } });
        if (!program)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        if (!membership && program.status !== client_1.ProgramStatus.LIVE) {
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        }
        const milestones = await this.prisma.programMilestone.findMany({
            where: { programId: program.id },
            orderBy: { order: "asc" },
        });
        return { org, program, milestones, membership };
    }
};
exports.OrgProgramsService = OrgProgramsService;
exports.OrgProgramsService = OrgProgramsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        org_audit_service_1.OrgAuditService,
        organizations_service_1.OrganizationsService])
], OrgProgramsService);

export const OrgProgramsService = exports.OrgProgramsService as any;
export type OrgProgramsService = any;
