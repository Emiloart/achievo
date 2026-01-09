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
exports.OrgSubmissionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/jwt.guard");
const org_rbac_guard_1 = require("../org-rbac/org-rbac.guard");
const org_rbac_decorator_1 = require("../org-rbac/org-rbac.decorator");
const org_submissions_service_1 = require("./org-submissions.service");
let OrgSubmissionsController = class OrgSubmissionsController {
    constructor(submissions) {
        this.submissions = submissions;
    }
    async createSubmission(orgId, programId, milestoneId, body, req) {
        const userId = req.achusrId;
        const data = await this.submissions.createSubmission(orgId, programId, milestoneId, userId, body || {});
        return { success: true, data };
    }
    async listSubmissions(orgId, status, programId, userId) {
        const data = await this.submissions.listSubmissions(orgId, { status, programId, userId });
        return { success: true, data };
    }
    async reviewSubmission(orgId, submissionId, body, req) {
        const reviewerUserId = req.achusrId;
        const data = await this.submissions.reviewSubmission(orgId, submissionId, reviewerUserId, body || {});
        return { success: true, data };
    }
    async issueValidation(orgId, body, req) {
        const actorUserId = req.achusrId;
        const data = await this.submissions.issueOrgValidation(orgId, actorUserId, body || {});
        return { success: true, data };
    }
};
exports.OrgSubmissionsController = OrgSubmissionsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN", "REVIEWER", "MEMBER"),
    (0, common_1.Post)("programs/:programId/milestones/:milestoneId/submissions"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("programId")),
    __param(2, (0, common_1.Param)("milestoneId")),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgSubmissionsController.prototype, "createSubmission", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN", "REVIEWER"),
    (0, common_1.Get)("submissions"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("programId")),
    __param(3, (0, common_1.Query)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], OrgSubmissionsController.prototype, "listSubmissions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN", "REVIEWER"),
    (0, common_1.Post)("submissions/:submissionId/review"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Param)("submissionId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgSubmissionsController.prototype, "reviewSubmission", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, org_rbac_guard_1.OrgGuard),
    (0, org_rbac_decorator_1.OrgRoles)("OWNER", "ADMIN", "REVIEWER"),
    (0, common_1.Post)("validations/issue"),
    __param(0, (0, common_1.Param)("orgId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrgSubmissionsController.prototype, "issueValidation", null);
exports.OrgSubmissionsController = OrgSubmissionsController = __decorate([
    (0, common_1.Controller)("orgs/:orgId"),
    __metadata("design:paramtypes", [org_submissions_service_1.OrgSubmissionsService])
], OrgSubmissionsController);

export const OrgSubmissionsController = exports.OrgSubmissionsController as any;
export type OrgSubmissionsController = any;
