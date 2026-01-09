// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofHashService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let ProofHashService = class ProofHashService {
    hashBuffer(buffer) {
        const hash = (0, crypto_1.createHash)("sha256").update(buffer).digest("hex");
        return { sha256: `0x${hash}` };
    }
    async hashStream(stream) {
        const hash = (0, crypto_1.createHash)("sha256");
        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => hash.update(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve({ sha256: `0x${hash.digest("hex")}` }));
        });
    }
    canonicalizeUrl(raw) {
        const trimmed = (raw || "").trim();
        if (!trimmed)
            throw new common_1.BadRequestException("INVALID_URL");
        let url;
        try {
            url = new URL(trimmed);
        }
        catch {
            url = new URL(`https://${trimmed}`);
        }
        url.hash = "";
        url.protocol = url.protocol.toLowerCase();
        url.hostname = url.hostname.toLowerCase();
        if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
            url.port = "";
        }
        const path = url.pathname && url.pathname !== "/" ? url.pathname : "";
        const canonical = `${url.protocol}//${url.host}${path}${url.search}`;
        return canonical;
    }
    hashUrl(raw) {
        const canonical = this.canonicalizeUrl(raw);
        const hash = (0, crypto_1.createHash)("sha256").update(Buffer.from(canonical, "utf8")).digest("hex");
        return { canonical, sha256: `0x${hash}` };
    }
    hashText(raw) {
        const normalized = (raw || "").trim();
        if (!normalized)
            throw new common_1.BadRequestException("INVALID_TEXT");
        const hash = (0, crypto_1.createHash)("sha256").update(Buffer.from(normalized, "utf8")).digest("hex");
        return { sha256: `0x${hash}` };
    }
};
exports.ProofHashService = ProofHashService;
exports.ProofHashService = ProofHashService = __decorate([
    (0, common_1.Injectable)()
], ProofHashService);

export const ProofHashService = exports.ProofHashService as any;
export type ProofHashService = any;
