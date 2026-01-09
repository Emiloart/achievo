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
exports.RiskEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const LOOKBACK_DAYS = 30;
const MIN_EVENTS_FOR_PATTERN = 10;
const PROOF_REUSE_MIN = 3;
const USERNAME_FLIP_MIN = 6;
function parseIntEnv(name, fallback) {
    const raw = Number(process.env[name]);
    if (!Number.isFinite(raw))
        return fallback;
    return Math.max(0, Math.floor(raw));
}
function parseFloatEnv(name, fallback) {
    const raw = Number(process.env[name]);
    if (!Number.isFinite(raw))
        return fallback;
    return raw;
}
function clamp(value, min = 0, max = 100) {
    if (!Number.isFinite(value))
        return min;
    if (value < min)
        return min;
    if (value > max)
        return max;
    return Math.round(value);
}
function severityFromRatio(ratio) {
    if (!Number.isFinite(ratio) || ratio <= 0)
        return 1;
    const scaled = Math.min(2, ratio) * 5;
    return Math.max(1, Math.min(10, Math.ceil(scaled)));
}
function resolveRiskLevel(score) {
    if (score >= 70)
        return "HIGH";
    if (score >= 30)
        return "MEDIUM";
    return "LOW";
}
let RiskEngineService = class RiskEngineService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    isEnabled() {
        const raw = String(process.env.RISK_ENGINE_ENABLED || "true").toLowerCase();
        return raw !== "false" && raw !== "0";
    }
    buildLookbackStart(now) {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);
        return start;
    }
    async evaluateVelocityBurst(userId, events) {
        const thresholdCount = parseIntEnv("RISK_VELOCITY_THRESHOLD_COUNT", 25);
        const thresholdMinutes = parseIntEnv("RISK_VELOCITY_THRESHOLD_MINUTES", 10);
        if (events.length < thresholdCount)
            return null;
        const windowMs = Math.max(1, thresholdMinutes) * 60 * 1000;
        let maxCount = 0;
        let left = 0;
        let bestWindow = null;
        for (let right = 0; right < events.length; right += 1) {
            const rightTime = events[right].occurredAt.getTime();
            while (rightTime - events[left].occurredAt.getTime() > windowMs) {
                left += 1;
            }
            const count = right - left + 1;
            if (count > maxCount) {
                maxCount = count;
                bestWindow = { start: events[left].occurredAt, end: events[right].occurredAt };
            }
        }
        if (maxCount < thresholdCount)
            return null;
        const ratio = maxCount / Math.max(1, thresholdCount);
        const severity = severityFromRatio(ratio);
        return {
            type: client_1.RiskSignalType.VELOCITY_BURST,
            severity,
            evidence: {
                maxCount,
                thresholdCount,
                thresholdMinutes,
                windowStart: bestWindow?.start?.toISOString() || null,
                windowEnd: bestWindow?.end?.toISOString() || null,
            },
        };
    }
    async evaluateRepetitiveActions(events) {
        if (events.length < MIN_EVENTS_FOR_PATTERN)
            return null;
        const threshold = parseFloatEnv("RISK_REPEAT_DOMINANCE_RATIO", 0.9);
        const counts = new Map();
        for (const event of events) {
            counts.set(event.type, (counts.get(event.type) || 0) + 1);
        }
        let topType = "";
        let topCount = 0;
        for (const [type, count] of counts.entries()) {
            if (count > topCount) {
                topCount = count;
                topType = type;
            }
        }
        const ratio = topCount / events.length;
        if (ratio < threshold)
            return null;
        const severity = clamp(Math.ceil(((ratio - threshold) / Math.max(0.01, 1 - threshold)) * 10), 1, 10);
        return {
            type: client_1.RiskSignalType.REPETITIVE_ACTIONS,
            severity,
            evidence: {
                dominantType: topType,
                dominantRatio: Number(ratio.toFixed(2)),
                totalEvents: events.length,
                distribution: Array.from(counts.entries()).map(([type, count]) => ({ type, count })),
            },
        };
    }
    async evaluateProofReuse(userId) {
        const proofs = await this.prisma.proofArtifact.findMany({
            where: { userId },
            select: { sha256: true },
        });
        if (!proofs.length)
            return null;
        const hashes = Array.from(new Set(proofs.map((proof) => proof.sha256)));
        if (!hashes.length)
            return null;
        const allProofs = await this.prisma.proofArtifact.findMany({
            where: { sha256: { in: hashes } },
            select: { sha256: true, userId: true },
        });
        const stats = new Map();
        for (const proof of allProofs) {
            const entry = stats.get(proof.sha256) || { count: 0, users: new Set() };
            entry.count += 1;
            entry.users.add(proof.userId);
            stats.set(proof.sha256, entry);
        }
        const reused = Array.from(stats.entries())
            .filter(([, entry]) => entry.count >= PROOF_REUSE_MIN || entry.users.size >= 2)
            .sort((a, b) => b[1].count - a[1].count);
        if (!reused.length)
            return null;
        const maxCount = reused[0][1].count;
        const severity = clamp(Math.ceil(maxCount / 2), 1, 10);
        return {
            type: client_1.RiskSignalType.PROOF_REUSE,
            severity,
            evidence: {
                hashes: reused.slice(0, 3).map(([hash, entry]) => ({
                    sha256: hash,
                    count: entry.count,
                    uniqueUsers: entry.users.size,
                })),
            },
        };
    }
    async evaluateValidationCollusion(userId, lookback) {
        const approvals = await this.prisma.validationAttestation.findMany({
            where: {
                status: "APPROVED",
                issuedAt: { gte: lookback },
                request: { claimantUserId: userId },
            },
            select: { validatorWallet: true },
        });
        if (!approvals.length)
            return null;
        const threshold = parseIntEnv("RISK_PAIR_APPROVAL_THRESHOLD", 10);
        const counts = new Map();
        for (const approval of approvals) {
            const wallet = approval.validatorWallet.toLowerCase();
            counts.set(wallet, (counts.get(wallet) || 0) + 1);
        }
        const repeats = Array.from(counts.entries())
            .filter(([, count]) => count >= threshold)
            .sort((a, b) => b[1] - a[1]);
        if (!repeats.length)
            return null;
        const maxCount = repeats[0][1];
        const severity = severityFromRatio(maxCount / Math.max(1, threshold));
        return {
            type: client_1.RiskSignalType.VALIDATION_COLLUSION,
            severity,
            evidence: {
                threshold,
                topValidators: repeats.slice(0, 3).map(([wallet, count]) => ({ wallet, count })),
            },
        };
    }
    async evaluateUsernameFlip(userId, lookback) {
        const orders = await this.prisma.usernameOrder.findMany({
            where: { makerAchusrId: userId, createdAt: { gte: lookback } },
            select: { status: true },
        });
        if (!orders.length)
            return null;
        const cancelled = orders.filter((order) => order.status === "CANCELLED").length;
        const total = orders.length;
        if (cancelled < USERNAME_FLIP_MIN)
            return null;
        const ratio = cancelled / Math.max(1, total);
        const severity = clamp(Math.ceil((cancelled / USERNAME_FLIP_MIN) * 5), 1, 10);
        return {
            type: client_1.RiskSignalType.USERNAME_FLIP_ABUSE,
            severity,
            evidence: {
                cancelled,
                total,
                ratio: Number(ratio.toFixed(2)),
            },
        };
    }
    async recompute(userId) {
        const now = new Date();
        if (!this.isEnabled()) {
            const existing = await this.prisma.userRiskProfile.findUnique({ where: { userId } });
            if (existing)
                return existing;
            return this.prisma.userRiskProfile.create({
                data: {
                    userId,
                    riskVersion: "1",
                    riskScore: 0,
                    riskLevel: "LOW",
                    signals: [],
                    lastEvaluatedAt: now,
                },
            });
        }
        const lookback = this.buildLookbackStart(now);
        const events = await this.prisma.userActivityEvent.findMany({
            where: { userId, occurredAt: { gte: lookback } },
            orderBy: { occurredAt: "asc" },
            select: { occurredAt: true, type: true, refId: true },
        });
        const signals = [];
        const velocity = await this.evaluateVelocityBurst(userId, events);
        if (velocity)
            signals.push(velocity);
        const repetitive = await this.evaluateRepetitiveActions(events);
        if (repetitive)
            signals.push(repetitive);
        const proofReuse = await this.evaluateProofReuse(userId);
        if (proofReuse)
            signals.push(proofReuse);
        const collusion = await this.evaluateValidationCollusion(userId, lookback);
        if (collusion)
            signals.push(collusion);
        const usernameFlip = await this.evaluateUsernameFlip(userId, lookback);
        if (usernameFlip)
            signals.push(usernameFlip);
        signals.sort((a, b) => b.severity - a.severity);
        const riskPoints = signals.reduce((sum, signal) => sum + signal.severity * 10, 0);
        const riskScore = clamp(riskPoints, 0, 100);
        const riskLevel = resolveRiskLevel(riskScore);
        const profile = await this.prisma.userRiskProfile.upsert({
            where: { userId },
            update: {
                riskVersion: "1",
                riskScore,
                riskLevel,
                signals: signals,
                lastEvaluatedAt: now,
            },
            create: {
                userId,
                riskVersion: "1",
                riskScore,
                riskLevel,
                signals: signals,
                lastEvaluatedAt: now,
            },
        });
        if (signals.length) {
            await this.prisma.riskSignalEvent.createMany({
                data: signals.map((signal) => ({
                    userId,
                    type: signal.type,
                    severity: signal.severity,
                    evidence: signal.evidence,
                })),
            });
        }
        return profile;
    }
    async getRiskProfile(userId) {
        const existing = await this.prisma.userRiskProfile.findUnique({ where: { userId } });
        if (existing)
            return existing;
        return this.recompute(userId);
    }
    async listHighRisk(minRisk) {
        const risk = Math.max(0, Math.min(100, Math.floor(minRisk)));
        return this.prisma.userRiskProfile.findMany({
            where: { riskScore: { gte: risk } },
            orderBy: { riskScore: "desc" },
            take: 100,
        });
    }
    toDto(profile) {
        return {
            userId: profile.userId,
            riskVersion: profile.riskVersion,
            riskScore: profile.riskScore,
            riskLevel: profile.riskLevel,
            signals: profile.signals || [],
            lastEvaluatedAt: profile.lastEvaluatedAt ? new Date(profile.lastEvaluatedAt).toISOString() : null,
            engineEnabled: this.isEnabled(),
        };
    }
};
exports.RiskEngineService = RiskEngineService;
exports.RiskEngineService = RiskEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskEngineService);

export const RiskEngineService = exports.RiskEngineService as any;
export type RiskEngineService = any;
