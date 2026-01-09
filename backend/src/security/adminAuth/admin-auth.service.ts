/**
 * Verifies admin API requests using API key, HMAC signature, and nonce replay protection.
 *
 * Security boundary: rejects unsigned, stale, or replayed requests before controller execution.
 */
import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { createHmac, createHash, timingSafeEqual } from "crypto";

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

function sha256Hex(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function normalizeHeader(value: string | string[] | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] : value;
}

function stableStringify(value: any): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
}

function constantTimeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
/** Validates admin keys, signatures, timestamps, and nonces for replay protection. */
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private getSecret() {
    const secret = process.env.ADMIN_HMAC_SECRET || "";
    if (!secret) throw new ServiceUnavailableException("ADMIN_HMAC_SECRET_REQUIRED");
    return secret;
  }

  private getApiKey() {
    const key = process.env.ADMIN_API_KEY || "";
    if (!key) throw new ServiceUnavailableException("ADMIN_API_KEY_REQUIRED");
    return key;
  }

  private getSkewSeconds() {
    return toNumberEnv("ADMIN_TS_SKEW_SECONDS", 120);
  }

  private bodyHash(req: any) {
    if (!req || req.body === undefined || req.body === null) return sha256Hex("");
    if (Buffer.isBuffer(req.body)) return sha256Hex(req.body);
    if (typeof req.body === "string") return sha256Hex(req.body);
    if (Array.isArray(req.body) && req.body.length === 0) return sha256Hex("");
    if (typeof req.body === "object" && Object.keys(req.body).length === 0) return sha256Hex("");
    return sha256Hex(stableStringify(req.body));
  }

  private buildPayload(req: any, ts: string, nonce: string, bodyHash: string) {
    const method = String(req.method || "GET").toUpperCase();
    const path = req.originalUrl || req.url || "";
    return `${method}\n${path}\n${ts}\n${nonce}\n${bodyHash}`;
  }

  private computeSignature(secret: string, payload: string) {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  private async ensureNonce(nonce: string, ts: number, path: string) {
    try {
      await this.prisma.adminRequestNonce.create({
        data: {
          nonce,
          ts,
          path,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("ADMIN_NONCE_REPLAY");
      }
      throw error;
    }
  }

  async verifyRequest(req: any) {
    const expectedKey = this.getApiKey();
    const providedKey =
      normalizeHeader(req.headers?.["x-admin-key"]) || normalizeHeader(req.headers?.["x-admin-api-key"]);
    if (!providedKey || String(providedKey) !== expectedKey) {
      throw new ForbiddenException("ADMIN_KEY_INVALID");
    }

    const tsRaw = normalizeHeader(req.headers?.["x-admin-ts"]);
    const nonce = normalizeHeader(req.headers?.["x-admin-nonce"]);
    const signature = normalizeHeader(req.headers?.["x-admin-sig"]);
    if (!tsRaw || !nonce || !signature) {
      throw new ForbiddenException("ADMIN_SIGNATURE_REQUIRED");
    }

    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) {
      throw new ForbiddenException("ADMIN_TIMESTAMP_INVALID");
    }

    const now = Math.floor(Date.now() / 1000);
    const skew = this.getSkewSeconds();
    if (Math.abs(now - ts) > skew) {
      throw new ForbiddenException("ADMIN_TIMESTAMP_SKEW");
    }

    const secret = this.getSecret();
    const bodyHash = this.bodyHash(req);
    const payload = this.buildPayload(req, String(tsRaw), nonce, bodyHash);
    const expectedSig = this.computeSignature(secret, payload);

    if (!constantTimeEquals(expectedSig, String(signature).toLowerCase())) {
      throw new ForbiddenException("ADMIN_SIGNATURE_INVALID");
    }

    await this.ensureNonce(nonce, ts, req.originalUrl || req.url || "");
    req.adminKeyHash = sha256Hex(String(providedKey));
  }
}
