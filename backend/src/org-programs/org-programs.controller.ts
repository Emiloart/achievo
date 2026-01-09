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
exports.OrgProgramsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const org_rbac_guard_1 = require("../org-rbac/org-rbac.guard");
const org_rbac_decorator_1 = require("../org-rbac/org-rbac.decorator");
const org_programs_service_1 = require("./org-programs.service");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_request_1 = require("../auth/auth.request");
let OrgProgramsController = class OrgProgramsController {
    constructor(programs, jwt, prisma) {
        this.programs = programs;
        this.jwt = jwt;
        this.prisma = prisma;
    }
    async resolveAchusrId(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } })
                : null;
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async createProgram(orgId, body, req) {
        const actorUserId = req.achusrId;
        const data = await this.programs.createProgram(orgId, actorUserId, body || {});
        return { success: true, data };
    }
    async updateProgram(orgId, programId, body, req) {
        const actorUserId = req.achusrId;
        const data = await this.programs.updateProgram(orgId, programId, actorUserId, body || {});
        return { success: true, data };
    }
    async createMilestone(orgId, programId, body, req) {
        const actorUserId = req.achusrId;
        const data = await this.programs.createMilestone(orgId, programId, actorUserId, body || {});
        return { success: true, data };
    }
    async publishProgram(orgId, programId, req) {
        const actorUserId = req.achusrId;
        const data = await this.programs.publishProgram(orgId, programId, actorUserId);
        return { success: true, data };
    }
    async getProgram(orgId, slug, token, req) {
        const viewer = await this.resolveAchusrId(req);
        const data = await this.programs.getProgramBySlug(orgId, slug, viewer, token || null);
        return { success: true, data };
    }
};
exports.OrgProgramsController = OrgProgramsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN"),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgProgramsController.prototype, "createProgram", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN"),
    (0, common_1.Patch)(":programId"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("programId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgProgramsController.prototype, "updateProgram", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN"),
    (0, common_1.Post)(":programId/milestones"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("programId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgProgramsController.prototype, "createMilestone", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN"),
    (0, common_1.Post)(":programId/publish"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("programId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrgProgramsController.prototype, "publishProgram", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("slug")),
    __param(2, (0, common_1.Query)("token")),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgProgramsController.prototype, "getProgram", null);
exports.OrgProgramsController = OrgProgramsController = __decorate([
    (0, common_1.Controller)("orgs/:orgId/programs"),
    __metadata("design:paramtypes", [org_programs_service_1.OrgProgramsService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], OrgProgramsController);

export const OrgProgramsController = exports.OrgProgramsController as any;
export type OrgProgramsController = any;
