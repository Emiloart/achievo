// @ts-nocheck
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Joi = __importStar(require("joi"));
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const health_module_1 = require("./health/health.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const web3_module_1 = require("./web3/web3.module");
const goals_module_1 = require("./goals/goals.module");
const auto_module_1 = require("./auto/auto.module");
const files_module_1 = require("./files/files.module");
const profile_module_1 = require("./profile/profile.module");
const achievo_module_1 = require("./achievo/achievo.module");
const identity_module_1 = require("./identity/identity.module");
const usernames_module_1 = require("./usernames/usernames.module");
const quests_module_1 = require("./quests/quests.module");
const parties_module_1 = require("./parties/parties.module");
const leaderboard_module_1 = require("./leaderboard/leaderboard.module");
const projects_module_1 = require("./projects/projects.module");
const proofs_module_1 = require("./proofs/proofs.module");
const validations_module_1 = require("./validations/validations.module");
const profileExports_module_1 = require("./profile-exports/profileExports.module");
const consistency_module_1 = require("./consistency/consistency.module");
const privacy_module_1 = require("./privacy/privacy.module");
const risk_module_1 = require("./risk/risk.module");
const endorsements_module_1 = require("./endorsements/endorsements.module");
const verify_module_1 = require("./verify/verify.module");
const org_rbac_module_1 = require("./org-rbac/org-rbac.module");
const org_audit_module_1 = require("./org-audit/org-audit.module");
const organizations_module_1 = require("./organizations/organizations.module");
const org_programs_module_1 = require("./org-programs/org-programs.module");
const org_submissions_module_1 = require("./org-submissions/org-submissions.module");
const metrics_module_1 = require("./metrics/metrics.module");
const indexer_module_1 = require("./indexer/indexer.module");
const legacy_module_1 = require("./legacy/legacy.module");
const chain_actions_module_1 = require("./chain-actions/chain-actions.module");
const governance_module_1 = require("./governance/governance.module");
const admin_tools_module_1 = require("./admin-tools/admin-tools.module");
const admin_auth_module_1 = require("./admin-auth/admin-auth.module");
const admin_gateway_module_1 = require("./admin-gateway/admin-gateway.module");
const monitoring_module_1 = require("./monitoring/monitoring.module");
const ops_config_module_1 = require("./config/ops-config.module");
const metrics_interceptor_1 = require("./common/interceptors/metrics.interceptor");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const request_logger_middleware_1 = require("./common/middleware/request-logger.middleware");
const slow_request_middleware_1 = require("./common/middleware/slow-request.middleware");
const csrf_guard_1 = require("./security/csrf/csrf.guard");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware, request_logger_middleware_1.RequestLoggerMiddleware, slow_request_middleware_1.SlowRequestMiddleware).forRoutes("*");
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
                ignoreEnvFile: false,
                validationSchema: Joi.object({
                    DATABASE_URL: Joi.string().required(),
                    JWT_SECRET: Joi.string().required(),
                    AUTH_ACCESS_TTL_MINUTES: Joi.number().integer().optional(),
                    AUTH_REFRESH_TTL_DAYS: Joi.number().integer().optional(),
                    AUTH_NONCE_TTL_MINUTES: Joi.number().integer().optional(),
                    COOKIE_SECURE: Joi.string().allow("").optional(),
                    CORS_ORIGINS: Joi.string().allow("").optional(),
                    RPC_URL: Joi.string().required(),
                    BASE_SEPOLIA_RPC_URL: Joi.string().allow("").optional(),
                    BASE_SEPOLIA_RPC: Joi.string().allow("").optional(),
                    CHAIN_ID: Joi.number().integer().required(),
                    RPC_MAX_RETRIES: Joi.number().integer().optional(),
                    RPC_BACKOFF_BASE_MS: Joi.number().integer().optional(),
                    RPC_BACKOFF_MAX_MS: Joi.number().integer().optional(),
                    RPC_CB_FAILURE_THRESHOLD: Joi.number().integer().optional(),
                    RPC_CB_COOLDOWN_MS: Joi.number().integer().optional(),
                    CORE_ADDRESS: Joi.string().allow("").optional(),
                    BADGE_ADDRESS: Joi.string().allow("").optional(),
                    IDENTITY_ADDRESS: Joi.string().allow("").optional(),
                    ACHIEVO_USERNAME_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    USERNAME_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    USERNAME_REGISTRY_CHAIN_ID: Joi.number().integer().optional(),
                    USERNAME_REGISTRY_RPC_URL: Joi.string().allow("").optional(),
                    USERNAME_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    USERNAME_SETTLEMENT_MODE: Joi.string().allow("").optional(),
                    USERNAME_MAX_OPEN_ORDERS: Joi.number().integer().optional(),
                    USERNAME_RELIST_COOLDOWN_SECONDS: Joi.number().integer().optional(),
                    USERNAME_READ_MAX_LAG_BLOCKS: Joi.number().integer().optional(),
                    ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    VERIFIER_PK: Joi.string().allow("").optional(),
                    PINATA_JWT: Joi.string().allow("").optional(),
                    WEB3_STORAGE_TOKEN: Joi.string().allow("").optional(),
                    REQUEST_BODY_LIMIT_MB: Joi.number().integer().optional(),
                    LOG_LEVEL: Joi.string().allow("").optional(),
                    DOCS_ENABLED: Joi.string().allow("").optional(),
                    METRICS_ENABLED: Joi.string().allow("").optional(),
                    THROTTLE_TTL: Joi.number().integer().optional(),
                    THROTTLE_LIMIT: Joi.number().integer().optional(),
                    THROTTLE_AUTH_TTL: Joi.number().integer().optional(),
                    THROTTLE_AUTH_LIMIT: Joi.number().integer().optional(),
                    THROTTLE_SENSITIVE_TTL: Joi.number().integer().optional(),
                    THROTTLE_SENSITIVE_LIMIT: Joi.number().integer().optional(),
                    THROTTLE_ADMIN_TTL: Joi.number().integer().optional(),
                    THROTTLE_ADMIN_LIMIT: Joi.number().integer().optional(),
                    SLOW_REQUEST_WARN_MS: Joi.number().integer().optional(),
                    PROOF_STORAGE_DRIVER: Joi.string().allow("").optional(),
                    PROOF_LOCAL_DIR: Joi.string().allow("").optional(),
                    PROOF_MAX_SIZE_MB: Joi.number().optional(),
                    AUTO_ANCHOR_PROOFS: Joi.string().allow("").optional(),
                    PROOF_ANCHOR_ENABLED: Joi.string().allow("").optional(),
                    PROOF_ANCHOR_CHAIN_ID: Joi.number().integer().optional(),
                    PROOF_ANCHOR_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    PROOF_ANCHOR_CONTRACT_ADDRESS: Joi.string().allow("").optional(),
                    ANCHORING_ENABLED: Joi.string().allow("").optional(),
                    ANCHOR_CHAIN_ID: Joi.number().integer().optional(),
                    ANCHOR_RPC_URL: Joi.string().allow("").optional(),
                    ANCHOR_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    ANCHOR_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    ANCHOR_BATCH_SIZE: Joi.number().integer().optional(),
                    ANCHOR_QUEUE_ENABLED: Joi.string().allow("").optional(),
                    CHAIN_ACTIONS_ENABLED: Joi.string().allow("").optional(),
                    CHAIN_ACTIONS_WORKER_ENABLED: Joi.string().allow("").optional(),
                    CHAIN_ACTIONS_POLL_INTERVAL_MS: Joi.number().integer().optional(),
                    CHAIN_CONFIRMATIONS_REQUIRED: Joi.number().integer().optional(),
                    CHAIN_ACTIONS_RPC_URL: Joi.string().allow("").optional(),
                    HEALTH_INDEXER_LAG_WARN_BLOCKS: Joi.number().integer().optional(),
                    HEALTH_INDEXER_LAG_FAIL_BLOCKS: Joi.number().integer().optional(),
                    HEALTH_CHAIN_LATENCY_WARN_MS: Joi.number().integer().optional(),
                    HEALTH_CHAIN_LATENCY_FAIL_MS: Joi.number().integer().optional(),
                    HEALTH_PENDING_CHAIN_ACTIONS_WARN: Joi.number().integer().optional(),
                    HEALTH_PENDING_CHAIN_ACTIONS_FAIL: Joi.number().integer().optional(),
                    HEALTH_STUCK_ACTION_AGE_MINUTES: Joi.number().integer().optional(),
                    MONITORING_ENABLED: Joi.string().allow("").optional(),
                    MONITORING_INTERVAL_MS: Joi.number().integer().optional(),
                    MONITORING_DEDUPE_MINUTES: Joi.number().integer().optional(),
                    GOVERNANCE_SANITY_CHECK_ENABLED: Joi.string().allow("").optional(),
                    GOVERNANCE_STRICT: Joi.string().allow("").optional(),
                    AWS_REGION: Joi.string().allow("").optional(),
                    AWS_ACCESS_KEY_ID: Joi.string().allow("").optional(),
                    AWS_SECRET_ACCESS_KEY: Joi.string().allow("").optional(),
                    S3_BUCKET: Joi.string().allow("").optional(),
                    VALIDATION_EIP712_CHAIN_ID: Joi.number().integer().optional(),
                    VALIDATION_EIP712_DOMAIN_NAME: Joi.string().allow("").optional(),
                    VALIDATION_EIP712_DOMAIN_VERSION: Joi.string().allow("").optional(),
                    VALIDATION_ANCHOR_ENABLED: Joi.string().allow("").optional(),
                    VALIDATION_ANCHOR_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    VALIDATION_ANCHOR_CONTRACT_ADDRESS: Joi.string().allow("").optional(),
                    VALIDATION_PUBLIC_READ: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_SIGNER_PRIVATE_KEY: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_SIGNER_ADDRESS: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_CHAIN_ID: Joi.number().integer().optional(),
                    PROFILE_EXPORT_DOMAIN: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_SIGNING_MODE: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_ANCHOR_ENABLED: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_ANCHOR_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_ANCHOR_CONTRACT_ADDRESS: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_STORAGE_DRIVER: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_LOCAL_DIR: Joi.string().allow("").optional(),
                    PROFILE_EXPORT_PUBLIC_BASE_URL: Joi.string().allow("").optional(),
                    RISK_ENGINE_ENABLED: Joi.string().allow("").optional(),
                    RISK_VELOCITY_THRESHOLD_COUNT: Joi.number().integer().optional(),
                    RISK_VELOCITY_THRESHOLD_MINUTES: Joi.number().integer().optional(),
                    RISK_REPEAT_DOMINANCE_RATIO: Joi.number().optional(),
                    RISK_PAIR_APPROVAL_THRESHOLD: Joi.number().integer().optional(),
                    ADMIN_API_KEY: Joi.string().allow("").optional(),
                    ADMIN_HMAC_SECRET: Joi.string().allow("").optional(),
                    ADMIN_TS_SKEW_SECONDS: Joi.number().integer().optional(),
                    ADMIN_ACCESS_TTL_MIN: Joi.number().integer().optional(),
                    ADMIN_REFRESH_TTL_DAYS: Joi.number().integer().optional(),
                    ADMIN_LOCKOUT_ATTEMPTS: Joi.number().integer().optional(),
                    ADMIN_LOCKOUT_WINDOW_MIN: Joi.number().integer().optional(),
                    ADMIN_LOCKOUT_DURATION_MIN: Joi.number().integer().optional(),
                    ADMIN_CSRF_TTL_MIN: Joi.number().integer().optional(),
                    ADMIN_BOOTSTRAP_EMAIL: Joi.string().allow("").optional(),
                    ADMIN_BOOTSTRAP_PASSWORD: Joi.string().allow("").optional(),
                    ADMIN_INDEXER_MAX_RANGE: Joi.number().integer().optional(),
                    ADMIN_REBUILD_BATCH_SIZE: Joi.number().integer().optional(),
                    ENDORSEMENTS_ENABLED: Joi.string().allow("").optional(),
                    ENDORSEMENTS_DAILY_LIMIT: Joi.number().integer().optional(),
                    ENDORSEMENTS_MIN_ACCOUNT_AGE_DAYS: Joi.number().integer().optional(),
                    ENDORSEMENTS_MIN_CREDIBILITY_FOR_WEIGHT: Joi.number().integer().optional(),
                    VERIFY_PORTAL_ENABLED: Joi.string().allow("").optional(),
                    VERIFY_CHAIN_RPC_URL: Joi.string().allow("").optional(),
                    VERIFY_CHAIN_ID: Joi.number().integer().optional(),
                    VERIFY_PROOF_ANCHOR_CONTRACT: Joi.string().allow("").optional(),
                    VERIFY_ANCHOR_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    VERIFY_PROFILE_EXPORT_SIGNER_ADDRESS: Joi.string().allow("").optional(),
                    VERIFY_STRICT_MODE: Joi.string().allow("").optional(),
                    ORG_SUBMISSION_ANCHOR_ENABLED: Joi.string().allow("").optional(),
                    ORG_SUBMISSION_ANCHOR_CHAIN_ID: Joi.number().integer().optional(),
                    ORG_SUBMISSION_ANCHOR_OPERATOR_PRIVATE_KEY: Joi.string().allow("").optional(),
                    ORG_SUBMISSION_ANCHOR_CONTRACT_ADDRESS: Joi.string().allow("").optional(),
                    ORG_CREATE_REQUIRED: Joi.string().allow("").optional(),
                    ORG_CREATE_CHAIN_ID: Joi.number().integer().optional(),
                    ORG_CREATE_RPC_URL: Joi.string().allow("").optional(),
                    ORG_REGISTRY_ADDRESS: Joi.string().allow("").optional(),
                    ORG_TREASURY: Joi.string().allow("").optional(),
                    INDEXER_ENABLED: Joi.string().allow("").optional(),
                    INDEXER_CHAIN_ID: Joi.number().integer().optional(),
                    INDEXER_RPC_URL: Joi.string().allow("").optional(),
                    INDEXER_FINALITY_DEPTH: Joi.number().integer().optional(),
                    INDEXER_START_BLOCK: Joi.number().integer().optional(),
                    INDEXER_BATCH_SIZE: Joi.number().integer().optional(),
                    MULTISIG_ADDRESS: Joi.string().allow("").optional(),
                    TIMELOCK_ADDRESS: Joi.string().allow("").optional(),
                    CONFIG_STRICT: Joi.string().allow("").optional(),
                    DEPLOYMENT_COMPAT_CHECK_ENABLED: Joi.string().allow("").optional(),
                    DEPLOYMENTS_HASH_BASE_SEPOLIA: Joi.string().allow("").optional(),
                    E2E_RPC_FAIL_MODE: Joi.string().allow("").optional(),
                    PORT: Joi.number().default(4000),
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const ttlRaw = Number(config.get("THROTTLE_TTL"));
                    const limitRaw = Number(config.get("THROTTLE_LIMIT"));
                    const ttlSeconds = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 60;
                    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 120;
                    return {
                        throttlers: [
                            {
                                name: "default",
                                ttl: ttlSeconds * 1000,
                                limit,
                            },
                        ],
                    };
                },
            }),
            prisma_module_1.PrismaModule,
            web3_module_1.Web3Module,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            goals_module_1.GoalsModule,
            auto_module_1.AutoModule,
            files_module_1.FilesModule,
            profile_module_1.ProfileModule,
            achievo_module_1.AchievoModule,
            identity_module_1.IdentityModule,
            usernames_module_1.UsernamesModule,
            quests_module_1.QuestsModule,
            parties_module_1.PartiesModule,
            leaderboard_module_1.LeaderboardModule,
            projects_module_1.ProjectsModule,
            proofs_module_1.ProofsModule,
            validations_module_1.ValidationsModule,
            profileExports_module_1.ProfileExportsModule,
            consistency_module_1.ConsistencyModule,
            privacy_module_1.PrivacyModule,
            risk_module_1.RiskModule,
            endorsements_module_1.EndorsementsModule,
            verify_module_1.VerifyModule,
            metrics_module_1.MetricsModule,
            org_rbac_module_1.OrgRbacModule,
            org_audit_module_1.OrgAuditModule,
            organizations_module_1.OrganizationsModule,
            org_programs_module_1.OrgProgramsModule,
            org_submissions_module_1.OrgSubmissionsModule,
            chain_actions_module_1.ChainActionsModule,
            governance_module_1.GovernanceModule,
            admin_tools_module_1.AdminToolsModule,
            admin_auth_module_1.AdminAuthModule,
            admin_gateway_module_1.AdminGatewayModule,
            monitoring_module_1.MonitoringModule,
            ops_config_module_1.OpsConfigModule,
            indexer_module_1.IndexerModule,
            legacy_module_1.LegacyModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: csrf_guard_1.CsrfGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: metrics_interceptor_1.MetricsInterceptor },
        ],
    })
], AppModule);

export const AppModule = exports.AppModule as any;
export type AppModule = any;
