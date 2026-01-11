/**
 * Admin action intent tracking for two-step commits.
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createHash } from "crypto";

function stableStringify(value: any): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as any)[key])}`);
  return `{${entries.join(",")}}`;
}

function hashPayload(action: string, payload: any) {
  return createHash("sha256").update(`${action}:${stableStringify(payload ?? {})}`).digest("hex");
}

@Injectable()
export class AdminIntentService {
  constructor(private readonly prisma: PrismaService) {}

  computePayloadHash(action: string, payload: any) {
    return hashPayload(action, payload);
  }

  async createIntent(params: {
    adminUserId: string;
    action: string;
    payload: any;
    confirmPhrase: string;
    ttlMinutes: number;
  }) {
    const payloadHash = hashPayload(params.action, params.payload);
    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000);
    const intent = await this.prisma.adminActionIntent.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        payloadHash,
        confirmPhrase: params.confirmPhrase,
        expiresAt,
      },
    });
    return intent;
  }

  async consumeIntent(params: {
    adminUserId: string;
    intentId: string;
    payload: any;
    confirmPhrase: string;
  }) {
    const intent = await this.prisma.adminActionIntent.findUnique({ where: { id: params.intentId } });
    if (!intent) throw new BadRequestException("ADMIN_INTENT_NOT_FOUND");
    if (intent.adminUserId !== params.adminUserId) {
      throw new BadRequestException("ADMIN_INTENT_FORBIDDEN");
    }
    if (intent.usedAt) throw new BadRequestException("ADMIN_INTENT_USED");
    if (intent.expiresAt.getTime() < Date.now()) throw new BadRequestException("ADMIN_INTENT_EXPIRED");
    const expectedHash = hashPayload(intent.action, params.payload);
    if (intent.payloadHash !== expectedHash) {
      throw new BadRequestException("ADMIN_INTENT_PAYLOAD_MISMATCH");
    }
    if (intent.confirmPhrase !== params.confirmPhrase) {
      throw new BadRequestException("ADMIN_INTENT_CONFIRMATION_INVALID");
    }
    await this.prisma.adminActionIntent.update({
      where: { id: intent.id },
      data: { usedAt: new Date() },
    });
    return intent;
  }
}
