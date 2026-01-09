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
exports.OrgSubmissionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const org_audit_service_1 = require("../org-audit/org-audit.service");
const organizations_service_1 = require("../organizations/organizations.service");
const privacy_service_1 = require("../privacy/privacy.service");
const activityEvent_service_1 = require("../consistency/activityEvent.service");
const activityEvent_types_1 = require("../consistency/activityEvent.types");
const validations_service_1 = require("../validations/validations.service");
const socialIdentity_service_1 = require("../social/socialIdentity.service");
const anchoring_service_1 = require("../anchoring/anchoring.service");
const anchoring_queue_service_1 = require("../anchoring/anchoring.queue.service");
const anchoring_constants_1 = require("../anchoring/anchoring.constants");
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
}
function normalizeArray(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map((item) => String(item).trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
}
let OrgSubmissionsService = class OrgSubmissionsService {
    constructor(prisma, orgs, audit, privacy, activity, validations, identities, anchoring, queue) {
        this.prisma = prisma;
        this.orgs = orgs;
        this.audit = audit;
        this.privacy = privacy;
        this.activity = activity;
        this.validations = validations;
        this.identities = identities;
        this.anchoring = anchoring;
        this.queue = queue;
    }
    async requireProgram(orgId, programId) {
        const program = await this.prisma.orgProgram.findUnique({ where: { id: programId } });
        if (!program || program.orgId !== orgId)
            throw new common_1.NotFoundException("PROGRAM_NOT_FOUND");
        return program;
    }
    async requireMilestone(programId, milestoneId) {
        const milestone = await this.prisma.programMilestone.findUnique({ where: { id: milestoneId } });
        if (!milestone || milestone.programId !== programId)
            throw new common_1.NotFoundException("MILESTONE_NOT_FOUND");
        return milestone;
    }
    buildSubmissionHash(payload) {
        const canonical = stableStringify(payload);
        const hash = (0, crypto_1.createHash)("sha256").update(canonical).digest("hex");
        return `0x${hash}`;
    }
    async processProofEvidence(userId, proofIds) {
        if (!proofIds.length)
            return [];
        const proofs = await this.prisma.proofArtifact.findMany({
            where: { id: { in: proofIds }, userId },
            select: { id: true },
        });
        if (proofs.length !== proofIds.length)
            throw new common_1.BadRequestException("PROOF_NOT_FOUND");
        const tokens = [];
        for (const proof of proofs) {
            const decision = await this.privacy.resolvePolicy(userId, "PROOF", proof.id);
            let token = decision.unlistedPublicId || null;
            if (decision.visibility === "PRIVATE") {
                const override = await this.privacy.upsertOverride(userId, "PROOF", proof.id, "UNLISTED", "NONE");
                token = override.unlistedPublicId || null;
            }
            else if (decision.visibility === "UNLISTED" && !token) {
                const override = await this.privacy.upsertOverride(userId, "PROOF", proof.id, "UNLISTED", decision.redaction);
                token = override.unlistedPublicId || null;
            }
            tokens.push({ id: proof.id, token });
        }
        return tokens;
    }
    async validateValidationEvidence(userId, validationIds) {
        if (!validationIds.length)
            return [];
        const requests = await this.prisma.validationRequest.findMany({
            where: { id: { in: validationIds }, claimantUserId: userId },
            select: { id: true },
        });
        if (requests.length !== validationIds.length)
            throw new common_1.BadRequestException("VALIDATION_NOT_FOUND");
        return validationIds;
    }
    async validateExportEvidence(userId, exportIds) {
        if (!exportIds.length)
            return [];
        const exports = await this.prisma.profileExport.findMany({
            where: { publicId: { in: exportIds }, userId },
            select: { publicId: true },
        });
        if (exports.length !== exportIds.length)
            throw new common_1.BadRequestException("EXPORT_NOT_FOUND");
        return exportIds;
    }
    async createSubmission(orgId, programId, milestoneId, userId, input) {
        const membership = await this.orgs.getMembership(orgId, userId);
        if (!membership)
            throw new common_1.ForbiddenException("NOT_MEMBER");
        const program = await this.requireProgram(orgId, programId);
        await this.requireMilestone(programId, milestoneId);
        const evidence = input.evidence || {};
        const proofIds = normalizeArray(evidence.proofArtifactIds);
        const validationIds = normalizeArray(evidence.validationIds);
        const exportIds = normalizeArray(evidence.exportPublicIds);
        const urls = normalizeArray(evidence.urls);
        const proofArtifacts = await this.processProofEvidence(userId, proofIds);
        const validationEvidence = await this.validateValidationEvidence(userId, validationIds);
        const exportEvidence = await this.validateExportEvidence(userId, exportIds);
        const evidencePayload = {
            proofArtifacts,
            validationIds: validationEvidence,
            exportPublicIds: exportEvidence,
            urls,
        };
        const submissionHash = this.buildSubmissionHash({
            orgId,
            programId,
            milestoneId,
            userId,
            note: input.note || "",
            evidence: evidencePayload,
        });
        const anchorRequired = Boolean(program.rules?.anchorSubmissions);
        const anchorRequested = Boolean(input.anchor) || anchorRequired;
        const anchorEnabled = anchorRequested && this.anchoring.isEnabled();
        const registry = anchorEnabled ? this.anchoring.getRegistryAddressSafe() : null;
        let anchorTxHash = null;
        let anchorContract = registry || null;
        let anchoredAt = null;
        let chainId = registry ? this.anchoring.getChainId() : null;
        const submission = await this.prisma.milestoneSubmission.create({
            data: {
                orgId,
                programId,
                milestoneId,
                userId,
                status: "SUBMITTED",
                note: input.note?.trim() || null,
                evidence: evidencePayload,
                submissionHash,
                chainId,
                anchorTxHash,
                anchorContract,
                anchoredAt,
            },
        });
        if (anchorEnabled && anchorContract) {
            void this.queue
                .enqueue({
                kind: anchoring_constants_1.AnchorKinds.SUBMISSION,
                hash: submissionHash,
                entityType: "SUBMISSION",
                entityId: submission.id,
            })
                .catch(() => { });
        }
        await this.audit.log({
            orgId,
            actorUserId: userId,
            action: "SUBMISSION_CREATED",
            targetType: "SUBMISSION",
            targetId: submission.id,
            metadata: { programId, milestoneId },
        });
        void this.activity
            .recordEvent({
            userId,
            type: activityEvent_types_1.ActivityEventType.TASK_COMPLETED,
            refId: submission.id,
            occurredAt: submission.createdAt,
            allowDuplicate: true,
        })
            .catch(() => { });
        return submission;
    }
    async listSubmissions(orgId, filters) {
        const where = { orgId };
        if (filters.status)
            where.status = filters.status;
        if (filters.programId)
            where.programId = filters.programId;
        if (filters.userId)
            where.userId = filters.userId;
        const submissions = await this.prisma.milestoneSubmission.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        const userIds = Array.from(new Set(submissions.map((item) => item.userId)));
        const summaries = await this.identities.getSummaries(userIds);
        return submissions.map((item) => ({
            ...item,
            submitter: summaries.get(item.userId) || null,
        }));
    }
    async reviewSubmission(orgId, submissionId, reviewerUserId, input) {
        const submission = await this.prisma.milestoneSubmission.findUnique({ where: { id: submissionId } });
        if (!submission || submission.orgId !== orgId)
            throw new common_1.NotFoundException("SUBMISSION_NOT_FOUND");
        const status = String(input.status || "").toUpperCase();
        if (!Object.prototype.hasOwnProperty.call(client_1.SubmissionStatus, status)) {
            throw new common_1.BadRequestException("INVALID_STATUS");
        }
        const updated = await this.prisma.milestoneSubmission.update({
            where: { id: submissionId },
            data: {
                status,
                reviewerUserId,
                reviewNote: input.reviewNote?.trim() || null,
                reviewedAt: new Date(),
            },
        });
        await this.audit.log({
            orgId,
            actorUserId: reviewerUserId,
            action: "SUBMISSION_REVIEWED",
            targetType: "SUBMISSION",
            targetId: submissionId,
            metadata: { status },
        });
        if (status === client_1.SubmissionStatus.APPROVED) {
            void this.activity
                .recordEvent({
                userId: submission.userId,
                type: activityEvent_types_1.ActivityEventType.VALIDATION_APPROVED,
                refId: submission.id,
                occurredAt: updated.reviewedAt || new Date(),
                allowDuplicate: true,
            })
                .catch(() => { });
        }
        return updated;
    }
    async issueOrgValidation(orgId, actorUserId, input) {
        const targetUserId = String(input.targetUserId || "").trim();
        if (!targetUserId)
            throw new common_1.BadRequestException("TARGET_USER_REQUIRED");
        const targetUser = await this.prisma.user.findUnique({ where: { userId: targetUserId }, select: { userId: true } });
        if (!targetUser)
            throw new common_1.BadRequestException("TARGET_USER_NOT_FOUND");
        const actorUser = await this.prisma.user.findUnique({
            where: { userId: actorUserId },
            select: { primaryWallet: true },
        });
        if (!actorUser?.primaryWallet)
            throw new common_1.BadRequestException("VALIDATOR_WALLET_REQUIRED");
        const request = await this.validations.createRequest(targetUserId, {
            title: input.title,
            summary: input.summary,
            achievementId: input.achievementId,
            badgeTokenId: input.badgeTokenId,
            requestedValidatorWallet: actorUser.primaryWallet,
            evidenceLinks: [],
        });
        const attest = await this.validations.attest(request.request.id, actorUser.primaryWallet, {
            status: input.status || "APPROVED",
            score: input.score,
            message: input.message,
            signature: input.signature,
            issuedAt: input.issuedAt,
            issuerOrgId: orgId,
        });
        await this.audit.log({
            orgId,
            actorUserId,
            action: "ORG_VALIDATION_ISSUED",
            targetType: "VALIDATION",
            targetId: attest.attestation?.id || null,
            metadata: { targetUserId },
        });
        return attest;
    }
};
exports.OrgSubmissionsService = OrgSubmissionsService;
exports.OrgSubmissionsService = OrgSubmissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        organizations_service_1.OrganizationsService,
        org_audit_service_1.OrgAuditService,
        privacy_service_1.PrivacyPolicyService,
        activityEvent_service_1.ActivityEventService,
        validations_service_1.ValidationsService,
        socialIdentity_service_1.SocialIdentityService,
        anchoring_service_1.AnchoringService,
        anchoring_queue_service_1.AnchoringQueueService])
], OrgSubmissionsService);

export const OrgSubmissionsService = exports.OrgSubmissionsService as any;
export const length = exports.length as any;
export type OrgSubmissionsService = any;
export type length = any;
