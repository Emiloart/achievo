// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameRegistryService = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const accounts_1 = require("viem/accounts");
const achievo_abi_1 = require("../../../packages/achievo-abi");
const achievo_config_1 = require("../../../packages/achievo-config");
let UsernameRegistryService = class UsernameRegistryService {
    constructor() {
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(achievo_config_1.BASE_SEPOLIA_RPC),
        });
    }
    getOperatorAccount() {
        const raw = process.env.ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY || process.env.USERNAME_OPERATOR_PRIVATE_KEY || "";
        if (!raw) {
            throw new common_1.InternalServerErrorException("ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY not configured");
        }
        const key = raw.startsWith("0x") ? raw : `0x${raw}`;
        return (0, accounts_1.privateKeyToAccount)(key);
    }
    getWalletClient() {
        const account = this.getOperatorAccount();
        return (0, viem_1.createWalletClient)({
            account,
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(achievo_config_1.BASE_SEPOLIA_RPC),
        });
    }
    async ownerOfUsername(username) {
        const owner = (await this.publicClient.readContract({
            address: achievo_config_1.ACHIEVO_USERNAME_REGISTRY_ADDRESS,
            abi: achievo_abi_1.achievoUsernameRegistryV1Abi,
            functionName: "ownerOfUsername",
            args: [username],
        }));
        return owner;
    }
    async transferUsername(from, to, username) {
        const walletClient = this.getWalletClient();
        const hash = await walletClient.writeContract({
            address: achievo_config_1.ACHIEVO_USERNAME_REGISTRY_ADDRESS,
            abi: achievo_abi_1.achievoUsernameRegistryV1Abi,
            functionName: "transferUsername",
            args: [from, to, username],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
};
exports.UsernameRegistryService = UsernameRegistryService;
exports.UsernameRegistryService = UsernameRegistryService = __decorate([
    (0, common_1.Injectable)()
], UsernameRegistryService);

export const UsernameRegistryService = exports.UsernameRegistryService as any;
export type UsernameRegistryService = any;
