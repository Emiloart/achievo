// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Eip712Service = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const ZERO_HASH = `0x${"0".repeat(64)}`;
let Eip712Service = class Eip712Service {
    constructor() {
        this.types = {
            ValidationAttestation: [
                { name: "requestId", type: "string" },
                { name: "claimantUserId", type: "string" },
                { name: "achievementId", type: "string" },
                { name: "badgeTokenId", type: "string" },
                { name: "validatorWallet", type: "address" },
                { name: "status", type: "string" },
                { name: "score", type: "uint256" },
                { name: "issuedAt", type: "uint64" },
                { name: "nonce", type: "string" },
                { name: "messageHash", type: "bytes32" },
            ],
        };
    }
    buildTypedData(params) {
        if (!params.requestId)
            throw new common_1.BadRequestException("REQUEST_ID_REQUIRED");
        if (!params.claimantUserId)
            throw new common_1.BadRequestException("CLAIMANT_REQUIRED");
        if (!params.validatorWallet)
            throw new common_1.BadRequestException("VALIDATOR_WALLET_REQUIRED");
        const validatorWallet = (0, viem_1.getAddress)(params.validatorWallet);
        const message = (params.message || "").trim();
        const messageHash = message ? (0, viem_1.keccak256)((0, viem_1.toBytes)(message)) : ZERO_HASH;
        const score = Number.isFinite(params.score) ? Math.max(0, Math.floor(params.score ?? 0)) : 0;
        const issuedAt = Math.floor(params.issuedAt);
        if (!issuedAt || issuedAt <= 0)
            throw new common_1.BadRequestException("INVALID_ISSUED_AT");
        const domain = {
            name: params.domainName,
            version: params.domainVersion,
            chainId: params.chainId,
            verifyingContract: params.verifyingContract || "0x0000000000000000000000000000000000000000",
        };
        const messagePayload = {
            requestId: params.requestId,
            claimantUserId: params.claimantUserId,
            achievementId: params.achievementId || "",
            badgeTokenId: params.badgeTokenId || "",
            validatorWallet,
            status: params.status,
            score,
            issuedAt,
            nonce: params.nonce,
            messageHash,
        };
        return {
            domain,
            types: this.types,
            primaryType: "ValidationAttestation",
            message: messagePayload,
            messageHash,
        };
    }
    recoverSigner(typedData, signature) {
        return (0, viem_1.recoverTypedDataAddress)({
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
            signature,
        });
    }
    hashTypedData(typedData) {
        return (0, viem_1.hashTypedData)({
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
        });
    }
};
exports.Eip712Service = Eip712Service;
exports.Eip712Service = Eip712Service = __decorate([
    (0, common_1.Injectable)()
], Eip712Service);

export const Eip712Service = exports.Eip712Service as any;
export type Eip712Service = any;
