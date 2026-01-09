// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileExportPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
let ProfileExportPdfService = class ProfileExportPdfService {
    async renderPdf(snapshot, meta) {
        const doc = new pdfkit_1.default({ size: "A4", margin: 40 });
        const chunks = [];
        const title = "Achievo Verifiable Profile Export";
        const profileUrl = `${meta.baseUrl.replace(/\/$/, "")}/exports/${meta.publicId}`;
        return new Promise((resolve, reject) => {
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.fontSize(18).text(title, { align: "left" });
            doc.moveDown(0.5);
            doc
                .fontSize(12)
                .fillColor("#444")
                .text(`Generated: ${new Date(snapshot.generatedAt * 1000).toISOString()}`);
            doc.moveDown();
            doc.fillColor("#000");
            doc.fontSize(14).text("Identity");
            doc.fontSize(11).text(`User ID: ${snapshot.userId}`);
            if (snapshot.username)
                doc.text(`Username: ${snapshot.username}`);
            if (snapshot.displayName)
                doc.text(`Display name: ${snapshot.displayName}`);
            if (snapshot.walletAddress)
                doc.text(`Wallet: ${snapshot.walletAddress}`);
            doc.moveDown();
            doc.fontSize(14).text("Badges");
            if (!snapshot.badges.length) {
                doc.fontSize(11).fillColor("#666").text("No badges recorded.");
            }
            else {
                doc.fontSize(11).fillColor("#000");
                snapshot.badges.forEach((badge) => {
                    doc.text(`- Token #${badge.tokenId} (${badge.contractAddress})`);
                });
            }
            doc.moveDown();
            doc.fontSize(14).fillColor("#000").text("Validations");
            if (!snapshot.validatedAchievements.length) {
                doc.fontSize(11).fillColor("#666").text("No validations recorded.");
            }
            else {
                doc.fontSize(11).fillColor("#000");
                snapshot.validatedAchievements.forEach((item) => {
                    doc.text(`- ${item.title} (${item.status}) by ${item.validatorWallet}`);
                });
            }
            doc.moveDown();
            doc.fontSize(14).fillColor("#000").text("Proof Summary");
            if (!snapshot.proofArtifacts.length) {
                doc.fontSize(11).fillColor("#666").text("No proofs recorded.");
            }
            else {
                doc.fontSize(11).fillColor("#000");
                snapshot.proofArtifacts.slice(0, 10).forEach((proof) => {
                    doc.text(`- ${proof.kind} ${proof.sha256}`);
                });
                if (snapshot.proofArtifacts.length > 10) {
                    doc.text(`+ ${snapshot.proofArtifacts.length - 10} more`);
                }
            }
            doc.moveDown();
            doc.fontSize(14).fillColor("#000").text("Verification");
            doc.fontSize(10).fillColor("#000").text(`Snapshot hash: ${meta.snapshotHash}`);
            doc.text(`Signer: ${meta.signerAddress}`);
            doc.text(`Signature: ${meta.signature}`);
            if (meta.anchorTxHash)
                doc.text(`Anchor TX: ${meta.anchorTxHash}`);
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor("#444").text(`Verify at: ${profileUrl}`);
            qrcode_1.default.toBuffer(profileUrl, { type: "png", margin: 1, scale: 4 })
                .then((qrBuffer) => {
                doc.image(qrBuffer, doc.page.width - 140, doc.y - 40, { width: 100 });
                doc.end();
            })
                .catch(() => {
                doc.end();
            });
        });
    }
};
exports.ProfileExportPdfService = ProfileExportPdfService;
exports.ProfileExportPdfService = ProfileExportPdfService = __decorate([
    (0, common_1.Injectable)()
], ProfileExportPdfService);

export const ProfileExportPdfService = exports.ProfileExportPdfService as any;
export type ProfileExportPdfService = any;
