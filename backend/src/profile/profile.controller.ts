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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const onchainServiceV11_1 = require("../blockchain/onchainServiceV11");
const jwt_1 = require("@nestjs/jwt");
const goalStatus_1 = require("../achievo/goalStatus");
const questEngine_service_1 = require("../quests/questEngine.service");
const quest_types_1 = require("../quests/quest.types");
const auth_request_1 = require("../auth/auth.request");
let ProfileController = class ProfileController {
    constructor(prisma, achievo, jwt, questEngine) {
        this.prisma = prisma;
        this.achievo = achievo;
        this.jwt = jwt;
        this.questEngine = questEngine;
    }
    async resolveUser(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            return decoded?.sub || null;
        }
        catch {
            return null;
        }
    }
    async me(req) {
        const userId = await this.resolveUser(req);
        const user = userId
            ? await this.prisma.user.findUnique({
                where: { id: userId },
                select: { displayName: true, primaryWallet: true, userId: true },
            })
            : null;
        const wallet = user?.primaryWallet || req.user?.address;
        if (!wallet) {
            return {
                success: true,
                data: {
                    displayName: "",
                    userId: "",
                    username: "",
                    achusrId: "",
                    achievoId: "",
                    walletAddress: "",
                    bio: "",
                    about: "",
                    avatar: "",
                    goalsCount: 0,
                    badgesCount: 0,
                    pendingApprovals: 0,
                    verifiedGoalsCount: 0,
                    inProgressGoalsCount: 0,
                    totalXP: 0,
                    level: 1,
                },
            };
        }
        const tasksRaw = await this.achievo.getGoalsByCreator(wallet);
        const tasks = tasksRaw.map(goalStatus_1.withStatus);
        const badges = await this.achievo.getBadgesByOwner(wallet);
        const profile = await this.achievo.getUserProfile(wallet);
        const achusrId = user?.userId || profile.achusrId || "";
        const usernameRow = user?.userId
            ? await this.prisma.username.findFirst({
                where: { achusrId: user.userId, status: "ACTIVE" },
                orderBy: { createdAt: "desc" },
            })
            : null;
        const goalsCount = tasks.length;
        const badgesCount = badges.length;
        const verifiedGoalsCount = tasks.filter((t) => t.status === goalStatus_1.GoalStatus.VERIFIED || t.status === goalStatus_1.GoalStatus.BADGED).length;
        const inProgressGoalsCount = tasks.filter((t) => t.status === goalStatus_1.GoalStatus.SUBMITTED || t.status === goalStatus_1.GoalStatus.PENDING_PEER).length;
        const pendingApprovals = tasks.filter((t) => t.status === goalStatus_1.GoalStatus.SUBMITTED || t.status === goalStatus_1.GoalStatus.PENDING_PEER).length;
        const goalMetrics = (0, goalStatus_1.computeXpAndLevel)(tasks);
        const totals = achusrId
            ? await this.questEngine.getTotalXpAndLevel(achusrId, goalMetrics.xp)
            : { totalXp: goalMetrics.xp, level: (0, goalStatus_1.computeLevelFromXp)(goalMetrics.xp) };
        const totalXP = totals.totalXp;
        const level = totals.level;
        if (achusrId) {
            const toDate = (seconds) => seconds && seconds > 0 ? new Date(seconds * 1000) : undefined;
            void this.questEngine.recordEvent({ achusrId, eventType: quest_types_1.QuestEventType.DAILY_LOGIN }).catch(() => { });
            for (const goal of tasks) {
                void this.questEngine
                    .recordEvent({
                    achusrId,
                    eventType: quest_types_1.QuestEventType.GOAL_CREATED,
                    eventDate: toDate(goal.createdAt),
                    metadata: { refType: "goal", refId: goal.id },
                })
                    .catch(() => { });
                if (goal.verified || goal.badgeMinted) {
                    const verifiedAt = goal.autoVerifiedAt && goal.autoVerifiedAt > 0 ? goal.autoVerifiedAt : goal.createdAt;
                    void this.questEngine
                        .recordEvent({
                        achusrId,
                        eventType: quest_types_1.QuestEventType.GOAL_VERIFIED,
                        eventDate: toDate(verifiedAt),
                        metadata: { refType: "goal", refId: goal.id },
                    })
                        .catch(() => { });
                }
            }
            for (const badgeId of badges) {
                void this.questEngine
                    .recordEvent({
                    achusrId,
                    eventType: quest_types_1.QuestEventType.BADGE_MINTED,
                    metadata: { refType: "badge", refId: badgeId },
                })
                    .catch(() => { });
            }
        }
        return {
            success: true,
            data: {
                displayName: user?.displayName ?? "",
                userId: user?.userId ?? "",
                username: usernameRow?.username ?? profile.username,
                walletAddress: wallet,
                achusrId,
                achievoId: achusrId,
                bio: profile.bio,
                about: profile.about,
                avatar: profile.avatar,
                goalsCount,
                badgesCount,
                pendingApprovals,
                verifiedGoalsCount,
                inProgressGoalsCount,
                totalXP,
                level,
            },
        };
    }
    async update(body, req) {
        const userId = await this.resolveUser(req);
        if (!userId)
            throw new Error("Unauthorized");
        const displayName = (body.displayName || "").trim();
        await this.prisma.user.update({
            where: { id: userId },
            data: { displayName },
        });
        return { success: true };
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "me", null);
__decorate([
    (0, common_1.Put)("me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "update", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)("profile"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        onchainServiceV11_1.OnchainServiceV11,
        jwt_1.JwtService,
        questEngine_service_1.QuestEngineService])
], ProfileController);

export const ProfileController = exports.ProfileController as any;
export type ProfileController = any;
