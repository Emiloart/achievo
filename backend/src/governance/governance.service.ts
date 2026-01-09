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
var GovernanceSanityCheckService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceSanityCheckService = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const anchoring_service_1 = require("../anchoring/anchoring.service");
const orgRegistry_service_1 = require("../organizations/orgRegistry.service");
const ACCESS_CONTROL_ABI = [
    {
        inputs: [
            { internalType: "bytes32", name: "role", type: "bytes32" },
            { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
];
const ANCHOR_ADMIN_ABI = [
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "operator",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
];
function toBooleanEnv(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === "")
        return fallback;
    return String(raw).toLowerCase() === "true";
}
function normalizeAddress(raw) {
    if (!raw)
        return "";
    const value = raw.startsWith("0x") ? raw : `0x${raw}`;
    return value.toLowerCase();
}
let GovernanceSanityCheckService = GovernanceSanityCheckService_1 = class GovernanceSanityCheckService {
    constructor(orgRegistry, anchoring) {
        this.orgRegistry = orgRegistry;
        this.anchoring = anchoring;
        this.logger = new common_1.Logger(GovernanceSanityCheckService_1.name);
    }
    onModuleInit() {
        if (!toBooleanEnv("GOVERNANCE_SANITY_CHECK_ENABLED", false))
            return;
        void this.runChecks();
    }
    isStrict() {
        return toBooleanEnv("GOVERNANCE_STRICT", false);
    }
    async runChecks() {
        const strict = this.isStrict();
        const timelock = normalizeAddress(process.env.TIMELOCK_ADDRESS);
        if (!timelock) {
            const message = "TIMELOCK_ADDRESS is not set for governance sanity checks.";
            if (strict)
                throw new Error(message);
            this.logger.warn(message);
            return;
        }
        await this.checkOrgRegistry(timelock, strict);
        await this.checkAnchorRegistry(timelock, strict);
    }
    async checkOrgRegistry(timelock, strict) {
        const registry = this.orgRegistry.getRegistryAddressSafe();
        if (!registry) {
            this.logger.warn("Org registry address not configured; skipping governance check.");
            return;
        }
        try {
            const client = (0, viem_1.createPublicClient)({
                transport: (0, viem_1.http)(this.orgRegistry.getRpcUrl()),
                chain: {
                    id: this.orgRegistry.getChainId(),
                    name: "OrgRegistryGovernance",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: { default: { http: [this.orgRegistry.getRpcUrl()] } },
                },
            });
            const hasAdmin = (await client.readContract({
                address: registry,
                abi: ACCESS_CONTROL_ABI,
                functionName: "hasRole",
                args: ["0x0000000000000000000000000000000000000000000000000000000000000000", timelock],
            }));
            if (!hasAdmin) {
                const message = `OrgRegistry admin mismatch: timelock ${timelock} does not hold DEFAULT_ADMIN_ROLE.`;
                if (strict)
                    throw new Error(message);
                this.logger.error(message);
            }
        }
        catch (error) {
            const message = `OrgRegistry governance check failed: ${error?.message || "unknown error"}`;
            if (strict)
                throw new Error(message);
            this.logger.error(message);
        }
    }
    async checkAnchorRegistry(timelock, strict) {
        const registry = this.anchoring.getRegistryAddressSafe();
        if (!registry) {
            this.logger.warn("Anchor registry address not configured; skipping governance check.");
            return;
        }
        try {
            const client = (0, viem_1.createPublicClient)({
                transport: (0, viem_1.http)(this.anchoring.getRpcUrl()),
                chain: {
                    id: this.anchoring.getChainId(),
                    name: "AnchorRegistryGovernance",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: { default: { http: [this.anchoring.getRpcUrl()] } },
                },
            });
            const owner = normalizeAddress((await client.readContract({
                address: registry,
                abi: ANCHOR_ADMIN_ABI,
                functionName: "owner",
                args: [],
            })));
            const operator = normalizeAddress((await client.readContract({
                address: registry,
                abi: ANCHOR_ADMIN_ABI,
                functionName: "operator",
                args: [],
            })));
            if (owner && owner !== timelock) {
                const message = `AnchorRegistry owner mismatch: expected ${timelock}, got ${owner}`;
                if (strict)
                    throw new Error(message);
                this.logger.error(message);
            }
            if (operator && operator !== timelock) {
                const message = `AnchorRegistry operator mismatch: expected ${timelock}, got ${operator}`;
                if (strict)
                    throw new Error(message);
                this.logger.error(message);
            }
        }
        catch (error) {
            const message = `AnchorRegistry governance check failed: ${error?.message || "unknown error"}`;
            if (strict)
                throw new Error(message);
            this.logger.error(message);
        }
    }
};
exports.GovernanceSanityCheckService = GovernanceSanityCheckService;
exports.GovernanceSanityCheckService = GovernanceSanityCheckService = GovernanceSanityCheckService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orgRegistry_service_1.OrgRegistryService,
        anchoring_service_1.AnchoringService])
], GovernanceSanityCheckService);

export const GovernanceSanityCheckService = exports.GovernanceSanityCheckService as any;
export type GovernanceSanityCheckService = any;
