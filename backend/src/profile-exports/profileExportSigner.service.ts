// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileExportSignerService = void 0;
const common_1 = require("@nestjs/common");
const accounts_1 = require("viem/accounts");
const viem_1 = require("viem");
let ProfileExportSignerService = class ProfileExportSignerService {
    getPrivateKey() {
        const raw = process.env.PROFILE_EXPORT_SIGNER_PRIVATE_KEY || "";
        if (!raw)
            throw new common_1.InternalServerErrorException("PROFILE_EXPORT_SIGNER_PRIVATE_KEY not configured");
        const key = raw.startsWith("0x") ? raw : `0x${raw}`;
        return key;
    }
    buildMessage(snapshotHash) {
        return `Achievo Profile Export:\n${snapshotHash}`;
    }
    async signSnapshot(snapshotHash) {
        if (!snapshotHash)
            throw new common_1.BadRequestException("SNAPSHOT_HASH_REQUIRED");
        const account = (0, accounts_1.privateKeyToAccount)(this.getPrivateKey());
        const message = this.buildMessage(snapshotHash);
        const signature = await account.signMessage({ message });
        return {
            signatureType: "EIP191",
            signerAddress: account.address,
            signature,
            message,
        };
    }
    async verifySnapshot(snapshotHash, signature, signerAddress) {
        if (!snapshotHash)
            throw new common_1.BadRequestException("SNAPSHOT_HASH_REQUIRED");
        const message = this.buildMessage(snapshotHash);
        const valid = await (0, viem_1.verifyMessage)({
            address: signerAddress,
            message,
            signature,
        });
        return { valid };
    }
};
exports.ProfileExportSignerService = ProfileExportSignerService;
exports.ProfileExportSignerService = ProfileExportSignerService = __decorate([
    (0, common_1.Injectable)()
], ProfileExportSignerService);

export const ProfileExportSignerService = exports.ProfileExportSignerService as any;
export type ProfileExportSignerService = any;
