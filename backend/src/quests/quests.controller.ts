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
exports.QuestsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const questEngine_service_1 = require("./questEngine.service");
let QuestsController = class QuestsController {
    constructor(prisma, questEngine) {
        this.prisma = prisma;
        this.questEngine = questEngine;
    }
    async me(req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const summary = await this.questEngine.getQuestSummary(user.userId);
        return { success: true, data: summary };
    }
    async claim(userQuestId, req) {
        const userId = req.user?.sub;
        if (!userId)
            throw new common_1.BadRequestException("Unauthorized");
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            throw new common_1.BadRequestException("User not found");
        const result = await this.questEngine.claimQuest(userQuestId, user.userId);
        return { success: true, data: result };
    }
};
exports.QuestsController = QuestsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuestsController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)("claim/:userQuestId"),
    __param(0, (0, common_1.Param)("userQuestId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuestsController.prototype, "claim", null);
exports.QuestsController = QuestsController = __decorate([
    (0, common_1.Controller)("quests"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        questEngine_service_1.QuestEngineService])
], QuestsController);

export const QuestsController = exports.QuestsController as any;
export type QuestsController = any;
