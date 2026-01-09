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
exports.ValidatorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const viem_1 = require("viem");
let ValidatorsService = class ValidatorsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeWallet(raw) {
        const trimmed = (raw || "").trim();
        if (!trimmed || !(0, viem_1.isAddress)(trimmed))
            throw new common_1.BadRequestException("INVALID_WALLET");
        return (0, viem_1.getAddress)(trimmed).toLowerCase();
    }
    async registerValidator(input) {
        const walletAddress = this.normalizeWallet(input.walletAddress);
        const displayName = (input.displayName || "").trim();
        if (!displayName)
            throw new common_1.BadRequestException("DISPLAY_NAME_REQUIRED");
        if (!["INDIVIDUAL", "ORGANIZATION"].includes(input.type))
            throw new common_1.BadRequestException("INVALID_TYPE");
        const profile = await this.prisma.validatorProfile.upsert({
            where: { walletAddress },
            update: {
                displayName,
                type: input.type,
                bio: input.bio || null,
                website: input.website || null,
                userId: input.userId || undefined,
            },
            create: {
                walletAddress,
                displayName,
                type: input.type,
                bio: input.bio || null,
                website: input.website || null,
                userId: input.userId || null,
            },
        });
        return profile;
    }
    async getValidatorProfile(walletAddressRaw) {
        const walletAddress = this.normalizeWallet(walletAddressRaw);
        const profile = await this.prisma.validatorProfile.findUnique({ where: { walletAddress } });
        if (!profile)
            throw new common_1.NotFoundException("VALIDATOR_NOT_FOUND");
        const approvals = await this.prisma.validationAttestation.count({
            where: { validatorWallet: walletAddress, status: "APPROVED" },
        });
        const rejections = await this.prisma.validationAttestation.count({
            where: { validatorWallet: walletAddress, status: "REJECTED" },
        });
        const revoked = await this.prisma.validationAttestation.count({
            where: { validatorWallet: walletAddress, status: "REVOKED" },
        });
        return {
            profile,
            stats: { approvals, rejections, revoked },
        };
    }
    async resolveUserIdForWallet(walletAddressRaw) {
        const walletAddress = this.normalizeWallet(walletAddressRaw);
        const wallet = await this.prisma.wallet.findUnique({
            where: { address: (0, viem_1.getAddress)(walletAddress) },
            select: { userId: true },
        });
        if (!wallet?.userId)
            return null;
        const user = await this.prisma.user.findUnique({ where: { id: wallet.userId }, select: { userId: true } });
        return user?.userId || null;
    }
};
exports.ValidatorsService = ValidatorsService;
exports.ValidatorsService = ValidatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ValidatorsService);

export const ValidatorsService = exports.ValidatorsService as any;
export type ValidatorsService = any;
