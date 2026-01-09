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
exports.PartyFeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PartyFeedService = class PartyFeedService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addFeedItemForUserParties(params) {
        const { achusrId, type, payload } = params;
        if (!achusrId)
            return;
        const createdAt = params.createdAt ?? new Date();
        const memberships = await this.prisma.partyMember.findMany({
            where: { achusrId, status: "ACTIVE" },
            select: { partyId: true },
        });
        if (memberships.length) {
            await this.prisma.partyFeedItem.createMany({
                data: memberships.map((member) => ({
                    partyId: member.partyId,
                    achusrId,
                    type,
                    payload: payload,
                    createdAt,
                })),
            });
        }
        await this.prisma.userActivity.create({
            data: {
                achusrId,
                type,
                payload: payload,
                createdAt,
            },
        });
    }
};
exports.PartyFeedService = PartyFeedService;
exports.PartyFeedService = PartyFeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PartyFeedService);

export const PartyFeedService = exports.PartyFeedService as any;
export type PartyFeedService = any;
