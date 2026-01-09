// @ts-nocheck
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndorsementWeightService = void 0;
const common_1 = require("@nestjs/common");
function parseIntEnv(name, fallback) {
    const raw = Number(process.env[name]);
    if (!Number.isFinite(raw))
        return fallback;
    return Math.max(0, Math.floor(raw));
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
let EndorsementWeightService = class EndorsementWeightService {
    minCredibility() {
        return parseIntEnv("ENDORSEMENTS_MIN_CREDIBILITY_FOR_WEIGHT", 10);
    }
    minAccountAgeDays() {
        return parseIntEnv("ENDORSEMENTS_MIN_ACCOUNT_AGE_DAYS", 7);
    }
    computeWeight(params) {
        const { credibilityScore, riskScore, accountAgeDays, mutualWithinWindow } = params;
        const minCred = this.minCredibility();
        const minAge = this.minAccountAgeDays();
        if (credibilityScore < minCred || accountAgeDays < minAge) {
            return {
                computedWeight: 0,
                reason: "THRESHOLD",
                riskFactor: 100 - Math.floor(riskScore * 0.5),
            };
        }
        const base = clamp(credibilityScore, 0, 100);
        const riskFactor = clamp(100 - Math.floor(riskScore * 0.5), 0, 100);
        let weight = Math.floor((base * riskFactor) / 100);
        if (mutualWithinWindow) {
            weight = Math.floor(weight * 0.7);
        }
        return {
            computedWeight: clamp(weight, 0, 100),
            reason: mutualWithinWindow ? "MUTUAL" : "BASE",
            riskFactor,
        };
    }
};
exports.EndorsementWeightService = EndorsementWeightService;
exports.EndorsementWeightService = EndorsementWeightService = __decorate([
    (0, common_1.Injectable)()
], EndorsementWeightService);

export const EndorsementWeightService = exports.EndorsementWeightService as any;
export type EndorsementWeightService = any;
