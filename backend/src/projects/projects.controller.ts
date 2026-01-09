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
exports.InvoicesPublicController = exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const projects_service_1 = require("./projects.service");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_request_1 = require("../auth/auth.request");
let ProjectsController = class ProjectsController {
    constructor(projects, jwt, prisma) {
        this.projects = projects;
        this.jwt = jwt;
        this.prisma = prisma;
    }
    async resolveAchusrId(req) {
        try {
            const decoded = await (0, auth_request_1.resolveJwtFromRequest)(req, this.jwt);
            if (!decoded?.sub)
                return null;
            const user = decoded?.sub
                ? await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } })
                : null;
            return user?.userId || null;
        }
        catch {
            return null;
        }
    }
    async share(slug) {
        const data = await this.projects.resolveShareLink(slug);
        return { success: true, data };
    }
    async create(body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const project = await this.projects.createProject(body, user.userId);
        return { success: true, data: project };
    }
    async list(req, status, role) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: true, data: [] };
        const data = await this.projects.listProjects(user.userId, status, role);
        return { success: true, data };
    }
    async byGoal(goalId, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: true, data: [] };
        const data = await this.projects.listProjectsByGoal(goalId, user.userId);
        return { success: true, data };
    }
    async get(slug, req) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.projects.getProjectBySlug(slug, viewerAchusrId);
        return { success: true, data };
    }
    async update(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateProject(slug, user.userId, body);
        return { success: true, data };
    }
    async members(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.projects.listMembers(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
    async addMember(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.addMember(slug, user.userId, body?.handle || "", body?.role);
        return { success: true, data };
    }
    async updateMember(slug, target, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateMemberRole(slug, user.userId, target, body?.role || "");
        return { success: true, data };
    }
    async removeMember(slug, target, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.removeMember(slug, user.userId, target);
        return { success: true, data };
    }
    async leave(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.leaveProject(slug, user.userId);
        return { success: true, data };
    }
    async attachGoals(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.attachGoals(slug, user.userId, body?.goalIds || []);
        return { success: true, data };
    }
    async detachGoal(slug, goalId, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.detachGoal(slug, user.userId, goalId);
        return { success: true, data };
    }
    async goals(slug, req) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.projects.listGoals(slug, viewerAchusrId);
        return { success: true, data };
    }
    async activity(slug, req, page, limit) {
        const viewerAchusrId = await this.resolveAchusrId(req);
        const data = await this.projects.getProjectActivity(slug, viewerAchusrId, page, limit);
        return { success: true, ...data };
    }
    async startTimeEntry(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.startTimeEntry(slug, user.userId, body || {});
        return { success: true, data };
    }
    async stopTimeEntry(slug, id, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.stopTimeEntry(slug, user.userId, id);
        return { success: true, data };
    }
    async createTimeEntry(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.createTimeEntry(slug, user.userId, body || {});
        return { success: true, data };
    }
    async updateTimeEntry(slug, id, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateTimeEntry(slug, user.userId, id, body || {});
        return { success: true, data };
    }
    async deleteTimeEntry(slug, id, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.deleteTimeEntry(slug, user.userId, id);
        return { success: true, data };
    }
    async listTimeEntries(slug, req, from, to, mine, billable, goalId) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return {
                success: true,
                data: { entries: [], summary: { totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 } },
            };
        const data = await this.projects.listTimeEntries(slug, user.userId, { from, to, mine, billable, goalId });
        return { success: true, data };
    }
    async getBillingSettings(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.getBillingSettings(slug, user.userId);
        return { success: true, data };
    }
    async updateBillingSettings(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateBillingSettings(slug, user.userId, body || {});
        return { success: true, data };
    }
    async listInvoices(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: true, data: [] };
        const data = await this.projects.listInvoices(slug, user.userId);
        return { success: true, data };
    }
    async getInvoice(slug, invoiceId, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.getInvoiceDetail(slug, user.userId, invoiceId);
        return { success: true, data };
    }
    async createInvoice(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.createInvoice(slug, user.userId, body || {});
        return { success: true, data };
    }
    async generateInvoice(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.generateInvoiceFromTime(slug, user.userId, body || {});
        return { success: true, data };
    }
    async updateInvoice(slug, invoiceId, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateInvoice(slug, user.userId, invoiceId, body || {});
        return { success: true, data };
    }
    async markInvoiceSent(slug, invoiceId, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateInvoice(slug, user.userId, invoiceId, { status: "SENT" });
        return { success: true, data };
    }
    async markInvoicePaid(slug, invoiceId, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateInvoice(slug, user.userId, invoiceId, { status: "PAID" });
        return { success: true, data };
    }
    async createShare(slug, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.createShareLink(slug, user.userId, body);
        return { success: true, data };
    }
    async listShares(slug, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.listShareLinks(slug, user.userId);
        return { success: true, data };
    }
    async updateShare(slug, id, body, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.updateShareLink(slug, user.userId, id, body);
        return { success: true, data };
    }
    async deleteShare(slug, id, req) {
        const userId = req.user?.sub;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
        if (!user)
            return { success: false, error: "Unauthorized" };
        const data = await this.projects.deleteShareLink(slug, user.userId, id);
        return { success: true, data };
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)("share/:slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "share", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("role")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)("by-goal/:goalId"),
    __param(0, (0, common_1.Param)("goalId")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "byGoal", null);
__decorate([
    (0, common_1.Get)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(":slug/members"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "members", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/members"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addMember", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)(":slug/members/:achusrId"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("achusrId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateMember", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)(":slug/members/:achusrId"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("achusrId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/leave"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "leave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/goals"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "attachGoals", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)(":slug/goals/:goalId"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("goalId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "detachGoal", null);
__decorate([
    (0, common_1.Get)(":slug/goals"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "goals", null);
__decorate([
    (0, common_1.Get)(":slug/activity"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "activity", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/time-entries/start"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "startTimeEntry", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/time-entries/:id/stop"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "stopTimeEntry", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/time-entries"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createTimeEntry", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)(":slug/time-entries/:id"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateTimeEntry", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)(":slug/time-entries/:id"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteTimeEntry", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":slug/time-entries"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)("from")),
    __param(3, (0, common_1.Query)("to")),
    __param(4, (0, common_1.Query)("mine")),
    __param(5, (0, common_1.Query)("billable")),
    __param(6, (0, common_1.Query)("goalId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listTimeEntries", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":slug/billing/settings"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getBillingSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Put)(":slug/billing/settings"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateBillingSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":slug/invoices"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":slug/invoices/:invoiceId"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("invoiceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/invoices"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/invoices/generate-from-time"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "generateInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)(":slug/invoices/:invoiceId"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("invoiceId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateInvoice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/invoices/:invoiceId/mark-sent"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("invoiceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "markInvoiceSent", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/invoices/:invoiceId/mark-paid"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("invoiceId")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "markInvoicePaid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(":slug/share-links"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)(":slug/share-links"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listShares", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)(":slug/share-links/:id"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)(":slug/share-links/:id"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteShare", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.Controller)("projects"),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], ProjectsController);
let InvoicesPublicController = class InvoicesPublicController {
    constructor(projects) {
        this.projects = projects;
    }
    async publicInvoice(slug) {
        const data = await this.projects.resolvePublicInvoice(slug);
        return { success: true, data };
    }
};
exports.InvoicesPublicController = InvoicesPublicController;
__decorate([
    (0, common_1.Get)("public/:slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvoicesPublicController.prototype, "publicInvoice", null);
exports.InvoicesPublicController = InvoicesPublicController = __decorate([
    (0, common_1.Controller)("invoices"),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], InvoicesPublicController);

export const InvoicesPublicController = exports.InvoicesPublicController as any;
export const ProjectsController = exports.ProjectsController as any;
export type InvoicesPublicController = any;
export type ProjectsController = any;
