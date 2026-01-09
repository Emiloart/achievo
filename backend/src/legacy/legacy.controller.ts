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
exports.LegacyController = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const achievoData_service_1 = require("../blockchain/achievoData.service");
let LegacyController = class LegacyController {
    constructor(data) {
        this.data = data;
    }
    async badges(address) {
        if (!(0, viem_1.isAddress)(address))
            throw new common_1.BadRequestException("Invalid address");
        const data = await this.data.getBadgesForUser(address, { version: "v1" });
        return { success: true, data };
    }
    async goalsByAddress(address) {
        if (!(0, viem_1.isAddress)(address))
            throw new common_1.BadRequestException("Invalid address");
        const data = await this.data.getGoalsForUser(address, { version: "v1" });
        return { success: true, data };
    }
    async goalById(goalId) {
        const numeric = Number(goalId);
        if (!Number.isFinite(numeric) || numeric <= 0)
            throw new common_1.BadRequestException("Invalid goalId");
        const data = await this.data.getGoalById(numeric, { version: "v1" });
        if (!data)
            return { success: true, data: null };
        return { success: true, data };
    }
};
exports.LegacyController = LegacyController;
__decorate([
    (0, common_1.Get)("badges/:address(0x[a-fA-F0-9]{40})"),
    __param(0, (0, common_1.Param)("address")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LegacyController.prototype, "badges", null);
__decorate([
    (0, common_1.Get)("goals/:address(0x[a-fA-F0-9]{40})"),
    __param(0, (0, common_1.Param)("address")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LegacyController.prototype, "goalsByAddress", null);
__decorate([
    (0, common_1.Get)("goals/:goalId(\\d+)"),
    __param(0, (0, common_1.Param)("goalId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LegacyController.prototype, "goalById", null);
exports.LegacyController = LegacyController = __decorate([
    (0, common_1.Controller)("legacy/v1"),
    __metadata("design:paramtypes", [achievoData_service_1.AchievoDataService])
], LegacyController);

export const LegacyController = exports.LegacyController as any;
export type LegacyController = any;
