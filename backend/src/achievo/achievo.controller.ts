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
exports.AchievoController = void 0;
const common_1 = require("@nestjs/common");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const achievoData_service_1 = require("../blockchain/achievoData.service");
const viem_1 = require("viem");
const goalStatus_1 = require("./goalStatus");
const prisma_service_1 = require("../prisma/prisma.service");
const privacy_service_1 = require("../privacy/privacy.service");
const jwt_1 = require("@nestjs/jwt");
const auth_request_1 = require("../auth/auth.request");
let AchievoController = class AchievoController {
    constructor(achievo, achievoData, prisma, privacy, jwt) {
        this.achievo = achievo;
        this.achievoData = achievoData;
        this.prisma = prisma;
        this.privacy = privacy;
        this.jwt = jwt;
    }
    async resolveViewer(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const viewer = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
            return viewer?.userId || null;
        }
        catch {
            return null;
        }
    }
    async tasks(address, req) {
        if (!(0, viem_1.isAddress)(address))
            throw new common_1.BadRequestException("Invalid address");
        try {
            const data = await this.achievoData.getGoalsForUser(address, { version: "v11" });
            const withStatuses = data.map(goalStatus_1.withStatus);
            const checksum = (0, viem_1.getAddress)(address);
            const owner = await this.prisma.user.findFirst({ where: { primaryWallet: checksum }, select: { userId: true } });
            if (!owner)
                return { success: true, data: withStatuses };
            const viewer = await this.resolveViewer(req);
            if (viewer && viewer === owner.userId) {
                const enriched = [];
                for (const goal of withStatuses) {
                    const decision = await this.privacy.resolvePolicy(owner.userId, "ACHIEVEMENT", String(goal.id));
                    enriched.push({
                        ...goal,
                        visibility: decision.visibility,
                        redaction: decision.redaction,
                        unlistedPublicId: decision.unlistedPublicId,
                    });
                }
                return { success: true, data: enriched };
            }
            const settings = await this.privacy.getSettings(owner.userId);
            const results = [];
            for (const goal of withStatuses) {
                const decision = await this.privacy.resolvePolicy(owner.userId, "ACHIEVEMENT", String(goal.id));
                const canView = this.privacy.canView(viewer, owner.userId, decision, null);
                if (!canView || decision.visibility !== "PUBLIC")
                    continue;
                if (decision.redaction === "METADATA_ONLY") {
                    results.push({ ...goal, goalCID: "", evidenceCID: "" });
                }
                else if (decision.redaction !== "FULL") {
                    results.push(goal);
                }
            }
            if (!results.length && settings.defaultAchievementVisibility !== "PUBLIC") {
                return { success: true, data: [] };
            }
            return { success: true, data: results };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err?.message || "Failed to fetch tasks");
        }
    }
    async badges(address, req, includePrivacy) {
        if (!(0, viem_1.isAddress)(address))
            throw new common_1.BadRequestException("Invalid address");
        try {
            const raw = await this.achievoData.getBadgesForUser(address, { version: "v11" });
            const data = raw.map((item) => item.tokenId ?? item);
            const checksum = (0, viem_1.getAddress)(address);
            const owner = await this.prisma.user.findFirst({ where: { primaryWallet: checksum }, select: { userId: true } });
            if (!owner)
                return { success: true, data };
            const viewer = await this.resolveViewer(req);
            if (viewer && viewer === owner.userId) {
                const includeDetails = includePrivacy === "1" || includePrivacy === "true";
                if (!includeDetails)
                    return { success: true, data };
                const detailed = [];
                for (const tokenId of data) {
                    const decision = await this.privacy.resolvePolicy(owner.userId, "BADGE", String(tokenId));
                    detailed.push({
                        tokenId,
                        visibility: decision.visibility,
                        redaction: decision.redaction,
                        unlistedPublicId: decision.unlistedPublicId,
                    });
                }
                return { success: true, data: detailed };
            }
            const settings = await this.privacy.getSettings(owner.userId);
            const results = [];
            for (const tokenId of data) {
                const decision = await this.privacy.resolvePolicy(owner.userId, "BADGE", String(tokenId));
                const canView = this.privacy.canView(viewer, owner.userId, decision, null);
                if (!canView || decision.visibility !== "PUBLIC")
                    continue;
                if (decision.redaction !== "FULL") {
                    results.push(tokenId);
                }
            }
            if (!results.length && settings.defaultAchievementVisibility !== "PUBLIC") {
                return { success: true, data: [] };
            }
            return { success: true, data: results };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err?.message || "Failed to fetch badges");
        }
    }
    async profile(address, req) {
        if (!(0, viem_1.isAddress)(address))
            throw new common_1.BadRequestException("Invalid address");
        try {
            const checksum = (0, viem_1.getAddress)(address);
            const data = await this.achievo.getUserProfile(checksum);
            const user = await this.prisma.user.findFirst({
                where: { primaryWallet: checksum },
                select: { displayName: true, userId: true },
            });
            const lookupAchusrId = data.achusrId || user?.userId || "";
            if (lookupAchusrId) {
                const viewer = await this.resolveViewer(req);
                if (!viewer || viewer !== lookupAchusrId) {
                    const settings = await this.privacy.getSettings(lookupAchusrId);
                    if (settings.defaultProfileVisibility !== "PUBLIC") {
                        throw new common_1.NotFoundException("PROFILE_NOT_AVAILABLE");
                    }
                }
            }
            const usernameRow = lookupAchusrId
                ? await this.prisma.username.findFirst({
                    where: { achusrId: lookupAchusrId, status: "ACTIVE" },
                    orderBy: { createdAt: "desc" },
                })
                : null;
            return {
                success: true,
                data: {
                    ...data,
                    achusrId: lookupAchusrId,
                    username: usernameRow?.username ?? data.username,
                    displayName: user?.displayName ?? "",
                    walletAddress: checksum,
                },
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err?.message || "Failed to fetch profile");
        }
    }
};
exports.AchievoController = AchievoController;
__decorate([
    (0, common_1.Get)("tasks/:address"),
    __param(0, (0, common_1.Param)("address")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AchievoController.prototype, "tasks", null);
__decorate([
    (0, common_1.Get)("badges/:address"),
    __param(0, (0, common_1.Param)("address")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("includePrivacy")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], AchievoController.prototype, "badges", null);
__decorate([
    (0, common_1.Get)("profile/:address"),
    __param(0, (0, common_1.Param)("address")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AchievoController.prototype, "profile", null);
exports.AchievoController = AchievoController = __decorate([
    (0, common_1.Controller)("achievo"),
    __metadata("design:paramtypes", [onchainServiceV11_1.OnchainServiceV11,
        achievoData_service_1.AchievoDataService,
        prisma_service_1.PrismaService,
        privacy_service_1.PrivacyPolicyService,
        jwt_1.JwtService])
], AchievoController);

export const AchievoController = exports.AchievoController as any;
export type AchievoController = any;
