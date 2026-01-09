/**
 * Badge transfer projector for legacy badge ownership enumeration.
 *
 * Applies idempotent updates based on decoded Transfer events.
 */
import { PrismaService } from "../../prisma/prisma.service";
import type { DecodedEventRow } from "./projector.types";

const ZERO = "0x0000000000000000000000000000000000000000";

function normalizeAddress(value: any) {
  const text = String(value || "").toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
}

function toTokenId(value: any) {
  return typeof value === "string" ? value : String(value || "0");
}

/** Projects badge ownership state from transfer events. */
export class LegacyBadgeProjector {
  constructor(private readonly prisma: PrismaService) {}

  async process(events: DecodedEventRow[]) {
    for (const event of events) {
      if (event.eventName !== "Transfer") continue;
      const from = normalizeAddress(event.args.from);
      const to = normalizeAddress(event.args.to);
      const tokenId = toTokenId(event.args.tokenId);
      const contractAddress = normalizeAddress(event.contractAddress);

      if (from !== ZERO) {
        await this.prisma.legacyOwnerBadgeToken.deleteMany({
          where: {
            chainId: event.chainId,
            contractAddress,
            ownerAddress: from,
            tokenId,
          },
        });
      }

      if (to === ZERO) {
        await this.prisma.legacyBadgeOwnership.updateMany({
          where: { chainId: event.chainId, contractAddress, tokenId },
          data: {
            ownerAddress: from,
            removed: true,
            lastUpdatedEventId: event.eventId,
          },
        });
        continue;
      }

      await this.prisma.legacyBadgeOwnership.upsert({
        where: {
          chainId_contractAddress_tokenId: {
            chainId: event.chainId,
            contractAddress,
            tokenId,
          },
        },
        update: {
          ownerAddress: to,
          removed: false,
          lastUpdatedEventId: event.eventId,
        },
        create: {
          chainId: event.chainId,
          contractAddress,
          tokenId,
          ownerAddress: to,
          lastUpdatedEventId: event.eventId,
          removed: false,
        },
      });

      await this.prisma.legacyOwnerBadgeToken.upsert({
        where: {
          chainId_contractAddress_ownerAddress_tokenId: {
            chainId: event.chainId,
            contractAddress,
            ownerAddress: to,
            tokenId,
          },
        },
        update: { updatedAt: new Date() },
        create: {
          chainId: event.chainId,
          contractAddress,
          ownerAddress: to,
          tokenId,
        },
      });
    }
  }
}
