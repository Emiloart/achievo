// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainVerifyService = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const achievo_config_1 = require("../../../packages/achievo-config");
const achievo_abi_1 = require("../../../packages/achievo-abi");
const rpc_client_1 = require("../chain/reliability/rpc.client");
const rpc_errors_1 = require("../chain/reliability/rpc.errors");
function toBooleanEnv(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === "")
        return fallback;
    return String(raw).toLowerCase() === "true";
}
function normalizeAddress(raw) {
    if (!raw)
        return "";
    return raw.startsWith("0x") ? raw : `0x${raw}`;
}
function normalizeHash(raw) {
    if (!raw)
        return "";
    const value = raw.startsWith("0x") ? raw : `0x${raw}`;
    return value.toLowerCase();
}
let ChainVerifyService = class ChainVerifyService {
    constructor() {
        this.rpcUrl = process.env.VERIFY_CHAIN_RPC_URL || process.env.RPC_URL || achievo_config_1.BASE_SEPOLIA_RPC;
        this.client = (0, rpc_client_1.getRpcClient)({
            chainId: this.resolveChainId(),
            rpcUrl: this.rpcUrl,
            name: "VerifyChain",
        });
    }
    strictMode() {
        return toBooleanEnv("VERIFY_STRICT_MODE", false);
    }
    resolveContract(contract) {
        const envFallback = process.env.VERIFY_ANCHOR_REGISTRY_ADDRESS ||
            process.env.ANCHOR_REGISTRY_ADDRESS ||
            process.env.VERIFY_PROOF_ANCHOR_CONTRACT ||
            process.env.PROOF_ANCHOR_CONTRACT_ADDRESS ||
            "";
        const value = contract || envFallback;
        return normalizeAddress(value);
    }
    resolveChainId() {
        const raw = Number(process.env.VERIFY_CHAIN_ID || process.env.ANCHOR_CHAIN_ID || process.env.PROOF_ANCHOR_CHAIN_ID || chains_1.baseSepolia.id);
        return Number.isFinite(raw) ? raw : chains_1.baseSepolia.id;
    }
    async verifyAnchor(params) {
        if (!params.hash)
            return { anchorPresent: false, anchorVerified: false };
        const address = this.resolveContract(params.contract);
        if (!address)
            return { anchorPresent: false, anchorVerified: false };
        const hash = normalizeHash(params.hash);
        if (params.txHash) {
            const txResult = await this.verifyAnchorTx({ txHash: params.txHash, contract: address });
            if (txResult.anchorVerified === "unknown") {
                return {
                    anchorPresent: false,
                    anchorVerified: "unknown",
                    chainId: this.resolveChainId(),
                    contract: address,
                };
            }
            if (!txResult.anchorPresent) {
                return {
                    anchorPresent: false,
                    anchorVerified: txResult.anchorVerified,
                    chainId: this.resolveChainId(),
                    contract: address,
                    txHash: txResult.txHash || normalizeHash(params.txHash),
                };
            }
            if (txResult.hash && normalizeHash(txResult.hash) !== hash) {
                return {
                    anchorPresent: false,
                    anchorVerified: false,
                    chainId: this.resolveChainId(),
                    contract: address,
                    txHash: txResult.txHash || normalizeHash(params.txHash),
                };
            }
            return {
                anchorPresent: true,
                anchorVerified: txResult.anchorVerified,
                submitter: txResult.submitter || null,
                timestamp: txResult.timestamp || null,
                kind: txResult.kind ?? null,
                chainId: this.resolveChainId(),
                contract: address,
                hash,
                txHash: txResult.txHash || normalizeHash(params.txHash),
            };
        }
        try {
            const [submitter, timestamp, kindRaw] = (await this.client.readContract({
                address: address,
                abi: achievo_abi_1.achievoAnchorRegistryAbi,
                functionName: "records",
                args: [hash],
            }));
            const ts = Number(timestamp);
            const present = Number.isFinite(ts) && ts > 0;
            return {
                anchorPresent: present,
                anchorVerified: present,
                submitter: submitter,
                timestamp: present ? ts : null,
                kind: Number(kindRaw),
                chainId: this.resolveChainId(),
                contract: address,
            };
        }
        catch (error) {
            if ((0, rpc_errors_1.isRpcUnavailableError)(error)) {
                if (this.strictMode()) {
                    throw new common_1.ServiceUnavailableException("CHAIN_VERIFICATION_FAILED");
                }
                return {
                    anchorPresent: false,
                    anchorVerified: "unknown",
                    chainId: this.resolveChainId(),
                    contract: address,
                };
            }
            try {
                const present = (await this.client.readContract({
                    address: address,
                    abi: achievo_abi_1.achievoAnchorRegistryAbi,
                    functionName: "isAnchored",
                    args: [hash],
                }));
                return {
                    anchorPresent: Boolean(present),
                    anchorVerified: Boolean(present),
                    chainId: this.resolveChainId(),
                    contract: address,
                };
            }
            catch (fallbackError) {
                if (this.strictMode()) {
                    throw new common_1.ServiceUnavailableException("CHAIN_VERIFICATION_FAILED");
                }
                return {
                    anchorPresent: false,
                    anchorVerified: "unknown",
                    chainId: this.resolveChainId(),
                    contract: address,
                };
            }
        }
    }
    async verifyAnchorTx(params) {
        if (!params.txHash)
            return { anchorPresent: false, anchorVerified: false };
        const address = this.resolveContract(params.contract);
        if (!address)
            return { anchorPresent: false, anchorVerified: false };
        const txHash = normalizeHash(params.txHash);
        try {
            const receipt = await this.client.getTransactionReceipt(txHash);
            const success = receipt.status === "success";
            let decoded = null;
            for (const log of receipt.logs) {
                if (log.address.toLowerCase() !== address.toLowerCase())
                    continue;
                try {
                    const event = (0, viem_1.decodeEventLog)({
                        abi: achievo_abi_1.achievoAnchorRegistryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (event.eventName !== "Anchored")
                        continue;
                    const args = event.args;
                    decoded = {
                        hash: args.hash,
                        submitter: args.submitter,
                        timestamp: Number(args.timestamp),
                        kind: Number(args.kind),
                    };
                    break;
                }
                catch {
                    // Ignore non-matching logs.
                }
            }
            if (!success) {
                return {
                    anchorPresent: false,
                    anchorVerified: false,
                    chainId: this.resolveChainId(),
                    contract: address,
                    txHash,
                };
            }
            return {
                anchorPresent: Boolean(decoded?.hash),
                anchorVerified: Boolean(decoded?.hash),
                submitter: decoded?.submitter || null,
                timestamp: decoded?.timestamp || null,
                kind: decoded?.kind ?? null,
                chainId: this.resolveChainId(),
                contract: address,
                hash: decoded?.hash || null,
                txHash,
            };
        }
        catch (error) {
            if (this.strictMode()) {
                throw new common_1.ServiceUnavailableException("CHAIN_VERIFICATION_FAILED");
            }
            return {
                anchorPresent: false,
                anchorVerified: "unknown",
                chainId: this.resolveChainId(),
                contract: address,
                txHash,
            };
        }
    }
};
exports.ChainVerifyService = ChainVerifyService;
exports.ChainVerifyService = ChainVerifyService = __decorate([
    (0, common_1.Injectable)()
], ChainVerifyService);

export const ChainVerifyService = exports.ChainVerifyService as any;
export type ChainVerifyService = any;
