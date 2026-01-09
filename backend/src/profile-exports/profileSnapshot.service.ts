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
exports.ProfileSnapshotService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const achievo_config_1 = require("../../../packages/achievo-config");
const chains_1 = require("viem/chains");
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
function toUnix(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return Math.floor(date.getTime() / 1000);
}
let ProfileSnapshotService = class ProfileSnapshotService {
    constructor(prisma, onchain) {
        this.prisma = prisma;
        this.onchain = onchain;
    }
    hashSnapshot(snapshot) {
        const canonical = stableStringify(snapshot);
        const hash = (0, crypto_1.createHash)("sha256").update(Buffer.from(canonical, "utf8")).digest("hex");
        return { canonical, hash: `0x${hash}` };
    }
    async buildSnapshot(achusrId) {
        const user = await this.prisma.user.findUnique({
            where: { userId: achusrId },
            select: { userId: true, primaryWallet: true, displayName: true },
        });
        if (!user)
            throw new common_1.NotFoundException("USER_NOT_FOUND");
        const username = await this.prisma.username.findFirst({
            where: { achusrId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        const walletAddress = user.primaryWallet || "";
        const identityProfile = walletAddress
            ? await this.onchain.getUserProfile(walletAddress)
            : { achusrId: "", username: "", bio: "", about: "", avatar: "" };
        const badgeTokens = walletAddress ? await this.onchain.getBadgesByOwner(walletAddress) : [];
        const badges = badgeTokens.map((tokenId) => ({
            tokenId: String(tokenId),
            contractAddress: achievo_config_1.ACHIEVO_BADGE_V11_ADDRESS,
            chainId: chains_1.baseSepolia.id,
            name: null,
            issuedAt: null,
        }));
        badges.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
        const validationRequests = await this.prisma.validationRequest.findMany({
            where: { claimantUserId: achusrId, status: "APPROVED" },
            include: {
                attestations: {
                    where: { status: "APPROVED" },
                    orderBy: { version: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "asc" },
        });
        const validatorWallets = validationRequests
            .map((request) => request.attestations[0]?.validatorWallet)
            .filter(Boolean);
        const validatorProfiles = await this.prisma.validatorProfile.findMany({
            where: { walletAddress: { in: validatorWallets } },
            select: { walletAddress: true, displayName: true },
        });
        const validatorMap = new Map();
        for (const profile of validatorProfiles) {
            validatorMap.set(profile.walletAddress, profile.displayName);
        }
        const validatedAchievements = validationRequests.map((request) => {
            const attestation = request.attestations[0];
            return {
                requestId: request.id,
                achievementId: request.achievementId,
                badgeTokenId: request.badgeTokenId,
                title: request.title,
                validatorWallet: attestation?.validatorWallet || request.requestedValidatorWallet,
                validatorDisplayName: attestation?.validatorWallet
                    ? validatorMap.get(attestation.validatorWallet) || null
                    : null,
                status: request.status,
                issuedAt: attestation?.issuedAt ? toUnix(attestation.issuedAt) : null,
                score: attestation?.score ?? null,
                message: attestation?.message ?? null,
                attestationHash: attestation?.attestationHash ?? null,
                anchorTxHash: attestation?.anchorTxHash ?? null,
            };
        });
        validatedAchievements.sort((a, b) => {
            const aTime = a.issuedAt ?? 0;
            const bTime = b.issuedAt ?? 0;
            if (aTime !== bTime)
                return aTime - bTime;
            return a.requestId.localeCompare(b.requestId);
        });
        const proofArtifactsRaw = await this.prisma.proofArtifact.findMany({
            where: { userId: achusrId },
            orderBy: { createdAt: "asc" },
        });
        const proofArtifacts = proofArtifactsRaw.map((proof) => ({
            id: proof.id,
            kind: proof.kind,
            achievementId: proof.achievementId,
            badgeTokenId: proof.badgeTokenId,
            sha256: proof.sha256,
            sourceUrl: proof.sourceUrl,
            createdAt: toUnix(proof.createdAt),
        }));
        const snapshot = {
            snapshotVersion: "1",
            generatedAt: Math.floor(Date.now() / 1000),
            userId: achusrId,
            username: username?.username || "",
            displayName: user.displayName || "",
            walletAddress,
            identityContract: achievo_config_1.ACHIEVO_IDENTITY_ADDRESS,
            achievoIdentity: {
                achusrId: identityProfile.achusrId || achusrId,
                username: identityProfile.username || "",
                bio: identityProfile.bio || "",
                about: identityProfile.about || "",
                avatar: identityProfile.avatar || "",
            },
            badges,
            validatedAchievements,
            proofArtifacts,
        };
        const { canonical, hash } = this.hashSnapshot(snapshot);
        return { snapshot, snapshotHash: hash, canonical };
    }
    verifySnapshot(snapshot) {
        return this.hashSnapshot(snapshot);
    }
    buildJsonLd(snapshot, publicId, baseUrl) {
        const profileUrl = `${baseUrl.replace(/\/$/, "")}/exports/${publicId}`;
        return {
            "@context": {
                "@vocab": "https://schema.org/",
                achievo: "https://achievo.example/schema#",
            },
            "@type": "Person",
            identifier: snapshot.userId,
            name: snapshot.displayName || snapshot.username || snapshot.userId,
            url: profileUrl,
            "achievo:achusrId": snapshot.userId,
            "achievo:walletAddress": snapshot.walletAddress,
            "achievo:badges": snapshot.badges.map((badge) => ({
                "@type": "Credential",
                identifier: badge.tokenId,
                issuer: badge.contractAddress,
                "achievo:chainId": badge.chainId,
                dateIssued: badge.issuedAt || undefined,
            })),
            evidence: snapshot.proofArtifacts.map((proof) => proof.sourceUrl || proof.sha256),
            "achievo:validatedAchievements": snapshot.validatedAchievements.map((validation) => ({
                "@type": "Claim",
                identifier: validation.requestId,
                name: validation.title,
                "achievo:achievementId": validation.achievementId,
                "achievo:badgeTokenId": validation.badgeTokenId,
                "achievo:validatorWallet": validation.validatorWallet,
                dateIssued: validation.issuedAt || undefined,
            })),
        };
    }
};
exports.ProfileSnapshotService = ProfileSnapshotService;
exports.ProfileSnapshotService = ProfileSnapshotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11])
], ProfileSnapshotService);

export const ProfileSnapshotService = exports.ProfileSnapshotService as any;
export type ProfileSnapshotService = any;
