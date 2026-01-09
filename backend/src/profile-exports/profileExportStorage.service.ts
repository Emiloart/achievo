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
exports.ProfileExportStorageService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const path_1 = require("path");
const crypto_1 = require("crypto");
function safeExtension(name) {
    if (!name)
        return "";
    const ext = (0, path_1.extname)((0, path_1.basename)(name)).slice(0, 12);
    return ext.replace(/[^a-zA-Z0-9.]/g, "");
}
class LocalDiskExportStorageAdapter {
    constructor(baseDir) {
        this.baseDir = baseDir;
        if (!(0, fs_1.existsSync)(baseDir)) {
            (0, fs_1.mkdirSync)(baseDir, { recursive: true });
        }
    }
    async saveFile(file) {
        const ext = safeExtension(file.originalName);
        const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const storageKey = `${dateKey}/${(0, crypto_1.randomUUID)()}${ext}`;
        const targetPath = (0, path_1.resolve)(this.baseDir, storageKey.split("/").join(path_1.sep));
        (0, fs_1.mkdirSync)((0, path_1.dirname)(targetPath), { recursive: true });
        const source = file.stream || (file.buffer ? stream_1.Readable.from(file.buffer) : null);
        if (!source)
            throw new common_1.BadRequestException("INVALID_FILE_STREAM");
        const sink = (0, fs_1.createWriteStream)(targetPath);
        await (0, promises_1.pipeline)(source, sink);
        return {
            storageKey,
            sizeBytes: file.size ?? file.buffer?.length ?? 0,
            mimeType: file.mimeType || "application/octet-stream",
        };
    }
    getFileStream(storageKey) {
        const targetPath = (0, path_1.resolve)(this.baseDir, storageKey.split("/").join(path_1.sep));
        const fs = require("fs");
        return fs.createReadStream(targetPath);
    }
}
class S3ExportStorageAdapter {
    async saveFile() {
        throw new common_1.InternalServerErrorException("S3 storage driver not configured");
    }
    getFileStream() {
        throw new common_1.InternalServerErrorException("S3 storage driver not configured");
    }
}
let ProfileExportStorageService = class ProfileExportStorageService {
    constructor() {
        const driver = (process.env.PROFILE_EXPORT_STORAGE_DRIVER || "LOCAL").toUpperCase();
        this.driver = driver;
        if (driver === "S3") {
            this.adapter = new S3ExportStorageAdapter();
            return;
        }
        const baseDir = process.env.PROFILE_EXPORT_LOCAL_DIR || (0, path_1.join)(process.cwd(), "storage", "exports");
        this.adapter = new LocalDiskExportStorageAdapter(baseDir);
    }
    getDriver() {
        return this.driver;
    }
    async saveFile(file) {
        if (!file.buffer && !file.stream)
            throw new common_1.BadRequestException("INVALID_FILE");
        return this.adapter.saveFile(file);
    }
    getFileStream(storageKey) {
        if (!this.adapter.getFileStream)
            throw new common_1.BadRequestException("STORAGE_NOT_AVAILABLE");
        return this.adapter.getFileStream(storageKey);
    }
};
exports.ProfileExportStorageService = ProfileExportStorageService;
exports.ProfileExportStorageService = ProfileExportStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ProfileExportStorageService);

export const ProfileExportStorageService = exports.ProfileExportStorageService as any;
export type ProfileExportStorageService = any;
