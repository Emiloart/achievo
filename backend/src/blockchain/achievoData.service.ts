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
exports.AchievoDataService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const onchainServiceV11_1 = require("./onchainServiceV11");
const config_1 = require("../config");
let AchievoDataService = class AchievoDataService {
    constructor(prisma, onchainV11) {
        this.prisma = prisma;
        this.onchainV11 = onchainV11;
        this.chainId = Number(process.env.INDEXER_CHAIN_ID || 84532);
        this.coreV1Address = (process.env.CORE_ADDRESS || config_1.ACHIEVO_CORE_ADDRESS).toLowerCase();
        this.badgeV1Address = (process.env.BADGE_ADDRESS || config_1.ACHIEVO_BADGE_ADDRESS).toLowerCase();
    }
    async getGoalsForUser(address, options) {
        const version = options?.version || "v11";
        if (version === "v1") {
            return this.getLegacyGoalsByCreator(address);
        }
        const goals = await this.onchainV11.getGoalsByCreator(address);
        return goals.map((goal) => ({
            ...goal,
            source: "chain",
            chainId: this.chainId,
            version: "v11",
        }));
    }
    async getGoalById(goalId, options) {
        const version = options?.version || "v11";
        if (version === "v1") {
            return this.getLegacyGoalById(goalId);
        }
        const goal = await this.onchainV11.getGoalById(goalId);
        if (!goal)
            return null;
        const history = options?.includeHistory ? await this.getGoalHistory(goalId, "core_v11") : [];
        return {
            ...goal,
            source: history.length ? "hybrid" : "chain",
            chainId: this.chainId,
            version: "v11",
            history,
        };
    }
    async getBadgesForUser(address, options) {
        const version = options?.version || "v11";
        if (version === "v1") {
            return this.getLegacyBadgesByOwner(address);
        }
        const badges = await this.onchainV11.getBadgesByOwner(address);
        return badges.map((tokenId) => ({
            tokenId,
            source: "chain",
            chainId: this.chainId,
            version: "v11",
        }));
    }
    normalizeAddress(value) {
        return value.toLowerCase();
    }
    toUnix(date) {
        if (!date)
            return null;
        return Math.floor(date.getTime() / 1000);
    }
    buildLegacyGoalConfidence(goal) {
        const unknownFields = [];
        if (goal.goalCid == null)
            unknownFields.push("goalCID");
        if (goal.evidenceCid == null)
            unknownFields.push("evidenceCID");
        if (goal.level == null)
            unknownFields.push("level");
        if (goal.approvals == null)
            unknownFields.push("approvals");
        if (goal.verified == null)
            unknownFields.push("verified");
        if (goal.badgeMinted == null)
            unknownFields.push("badgeMinted");
        if (goal.peersRestricted == null)
            unknownFields.push("peersRestricted");
        if (goal.autoVerifier == null)
            unknownFields.push("autoVerifier");
        if (goal.autoDataHash == null)
            unknownFields.push("autoDataHash");
        if (goal.autoVerifiedAt == null)
            unknownFields.push("autoVerifiedAt");
        if (goal.createdAt == null)
            unknownFields.push("createdAt");
        const critical = ["goalCID", "createdAt", "verified"];
        const missingCritical = critical.filter((field) => unknownFields.includes(field));
        const confidence = unknownFields.length === 0
            ? "FULL"
            : missingCritical.length === critical.length
                ? "UNKNOWN"
                : "PARTIAL";
        return { confidence, unknownFields };
    }
    async getLegacyGoalsByCreator(address) {
        const creator = this.normalizeAddress(address);
        const goals = await this.prisma.legacyGoal.findMany({
            where: {
                chainId: this.chainId,
                contractAddress: this.coreV1Address,
                creatorAddress: creator,
                removed: false,
            },
            orderBy: [{ createdAtBlock: "asc" }, { goalId: "asc" }],
        });
        return goals.map((goal) => ({
            id: Number(goal.goalId),
            creator: goal.creatorAddress,
            goalCID: goal.goalCid ?? null,
            evidenceCID: goal.evidenceCid ?? null,
            level: goal.level ?? null,
            approvals: goal.approvals ?? null,
            createdAt: this.toUnix(goal.createdAt),
            verified: goal.verified ?? null,
            badgeMinted: goal.badgeMinted ?? null,
            peersRestricted: goal.peersRestricted ?? null,
            autoVerifier: goal.autoVerifier ?? null,
            autoDataHash: goal.autoDataHash ?? null,
            autoVerifiedAt: this.toUnix(goal.autoVerifiedAt),
            legacyId: null,
            legacyTxHash: null,
            source: "projection",
            chainId: this.chainId,
            version: "v1",
            ...this.buildLegacyGoalConfidence(goal),
        }));
    }
    async getLegacyGoalById(goalId) {
        const goal = await this.prisma.legacyGoal.findUnique({
            where: {
                chainId_contractAddress_goalId: {
                    chainId: this.chainId,
                    contractAddress: this.coreV1Address,
                    goalId: String(goalId),
                },
            },
        });
        if (!goal || goal.removed)
            return null;
        return {
            id: Number(goal.goalId),
            creator: goal.creatorAddress,
            goalCID: goal.goalCid ?? null,
            evidenceCID: goal.evidenceCid ?? null,
            level: goal.level ?? null,
            approvals: goal.approvals ?? null,
            createdAt: this.toUnix(goal.createdAt),
            verified: goal.verified ?? null,
            badgeMinted: goal.badgeMinted ?? null,
            peersRestricted: goal.peersRestricted ?? null,
            autoVerifier: goal.autoVerifier ?? null,
            autoDataHash: goal.autoDataHash ?? null,
            autoVerifiedAt: this.toUnix(goal.autoVerifiedAt),
            legacyId: null,
            legacyTxHash: null,
            source: "projection",
            chainId: this.chainId,
            version: "v1",
            ...this.buildLegacyGoalConfidence(goal),
        };
    }
    async getLegacyBadgesByOwner(address) {
        const owner = this.normalizeAddress(address);
        const tokens = await this.prisma.legacyOwnerBadgeToken.findMany({
            where: {
                chainId: this.chainId,
                contractAddress: this.badgeV1Address,
                ownerAddress: owner,
            },
            orderBy: { tokenId: "asc" },
        });
        return tokens.map((token) => ({
            tokenId: Number(token.tokenId),
            source: "projection",
            chainId: this.chainId,
            version: "v1",
            confidence: "FULL",
            unknownFields: [],
        }));
    }
    async getGoalHistory(goalId, contractKey) {
        try {
            const events = await this.prisma.decodedEvent.findMany({
                where: {
                    chainId: this.chainId,
                    contractKey,
                    removed: false,
                    args: { path: ["goalId"], equals: String(goalId) },
                },
                orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
            });
            return events.map((event) => ({
                eventId: event.eventId,
                eventName: event.eventName,
                blockNumber: event.blockNumber,
                txHash: event.txHash,
                logIndex: event.logIndex,
                args: event.args,
            }));
        }
        catch {
            return [];
        }
    }
};
exports.AchievoDataService = AchievoDataService;
exports.AchievoDataService = AchievoDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, onchainServiceV11_1.OnchainServiceV11])
], AchievoDataService);

export const AchievoDataService = exports.AchievoDataService as any;
export type AchievoDataService = any;
