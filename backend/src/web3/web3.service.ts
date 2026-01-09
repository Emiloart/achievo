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
exports.Web3Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const viem_1 = require("viem");
let Web3Service = class Web3Service {
    constructor(config) {
        this.config = config;
        const rpcUrl = this.config.get("RPC_URL");
        const chainId = this.config.get("CHAIN_ID");
        if (!rpcUrl || !chainId) {
            throw new Error("RPC_URL and CHAIN_ID must be set");
        }
        this.publicClient = (0, viem_1.createPublicClient)({
            transport: (0, viem_1.http)(rpcUrl),
            chain: {
                id: chainId,
                name: "ConfiguredChain",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: { default: { http: [rpcUrl] } },
            },
        });
    }
};
exports.Web3Service = Web3Service;
exports.Web3Service = Web3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], Web3Service);

export const Web3Service = exports.Web3Service as any;
export type Web3Service = any;
