// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofAnchorService = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const accounts_1 = require("viem/accounts");
const achievo_config_1 = require("../../../packages/achievo-config");
const achievo_abi_1 = require("../../../packages/achievo-abi");
let ProofAnchorService = class ProofAnchorService {
    constructor() {
        this.rpcUrl = process.env.RPC_URL || achievo_config_1.BASE_SEPOLIA_RPC;
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(this.rpcUrl),
        });
    }
    isEnabled() {
        return String(process.env.PROOF_ANCHOR_ENABLED || "").toLowerCase() === "true";
    }
    getContractAddress() {
        const addr = process.env.PROOF_ANCHOR_CONTRACT_ADDRESS || "";
        if (!addr)
            throw new common_1.InternalServerErrorException("PROOF_ANCHOR_CONTRACT_ADDRESS not configured");
        const value = addr.startsWith("0x") ? addr : `0x${addr}`;
        return value;
    }
    getOperatorAccount() {
        const raw = process.env.PROOF_ANCHOR_OPERATOR_PRIVATE_KEY || "";
        if (!raw)
            throw new common_1.InternalServerErrorException("PROOF_ANCHOR_OPERATOR_PRIVATE_KEY not configured");
        const key = raw.startsWith("0x") ? raw : `0x${raw}`;
        return (0, accounts_1.privateKeyToAccount)(key);
    }
    getWalletClient() {
        const account = this.getOperatorAccount();
        return (0, viem_1.createWalletClient)({
            account,
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(this.rpcUrl),
        });
    }
    async anchorHash(hash) {
        if (!this.isEnabled())
            throw new common_1.BadRequestException("ANCHORING_DISABLED");
        const contract = this.getContractAddress();
        const walletClient = this.getWalletClient();
        const txHash = await walletClient.writeContract({
            address: contract,
            abi: achievo_abi_1.proofAnchorRegistryAbi,
            functionName: "anchor",
            args: [hash],
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        const block = receipt.blockNumber ? await this.publicClient.getBlock({ blockNumber: receipt.blockNumber }) : null;
        const anchoredAt = block ? new Date(Number(block.timestamp) * 1000) : new Date();
        const chainIdRaw = Number(process.env.PROOF_ANCHOR_CHAIN_ID || chains_1.baseSepolia.id);
        const chainId = Number.isFinite(chainIdRaw) ? chainIdRaw : chains_1.baseSepolia.id;
        return { txHash, chainId, contract, anchoredAt };
    }
};
exports.ProofAnchorService = ProofAnchorService;
exports.ProofAnchorService = ProofAnchorService = __decorate([
    (0, common_1.Injectable)()
], ProofAnchorService);

export const ProofAnchorService = exports.ProofAnchorService as any;
export type ProofAnchorService = any;
