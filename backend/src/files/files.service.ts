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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let FilesService = class FilesService {
    constructor(config) {
        this.config = config;
        this.pinataJwt = this.config.get("PINATA_JWT");
        this.w3sToken = this.config.get("WEB3_STORAGE_TOKEN");
    }
    async pinJson(body) {
        if (this.pinataJwt)
            return this.pinataJson(body);
        if (!this.w3sToken)
            throw new common_1.InternalServerErrorException("No IPFS token configured");
        const blob = Buffer.from(JSON.stringify(body));
        return this.web3StorageUpload(blob, "application/json");
    }
    async pinFile(file) {
        if (this.w3sToken) {
            return this.web3StorageUpload(file.buffer, file.mimetype);
        }
        if (this.pinataJwt) {
            return this.pinataFile(file);
        }
        throw new common_1.InternalServerErrorException("No IPFS token configured");
    }
    async web3StorageUpload(buffer, contentType) {
        const res = await fetch("https://api.web3.storage/upload", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.w3sToken}`,
                "Content-Type": contentType,
            },
            body: new Uint8Array(buffer),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new common_1.InternalServerErrorException(text || `Web3.Storage upload failed: ${res.status}`);
        }
        const json = await res.json();
        const cid = json.cid || json.value?.cid;
        if (!cid)
            throw new common_1.InternalServerErrorException("No CID returned by Web3.Storage");
        return { cid, uri: `ipfs://${cid}` };
    }
    async pinataJson(body) {
        const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.pinataJwt}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new common_1.InternalServerErrorException(text || `Pinata upload failed: ${res.status}`);
        }
        const out = await res.json();
        const cid = out.IpfsHash || out.cid;
        if (!cid)
            throw new common_1.InternalServerErrorException("No CID returned by Pinata");
        return { cid, uri: `ipfs://${cid}` };
    }
    async pinataFile(file) {
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(file.buffer)]), file.originalname ?? "upload.bin");
        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.pinataJwt}`,
            },
            body: form,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new common_1.InternalServerErrorException(text || `Pinata file upload failed: ${res.status}`);
        }
        const out = await res.json();
        const cid = out.IpfsHash || out.cid;
        if (!cid)
            throw new common_1.InternalServerErrorException("No CID returned by Pinata");
        return { cid, uri: `ipfs://${cid}` };
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FilesService);

export const FilesService = exports.FilesService as any;
export type FilesService = any;
