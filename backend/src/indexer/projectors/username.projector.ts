/**
 * Username registry projector for ownership state.
 *
 * Maintains a canonical projection keyed by handle hash and chain id.
 */
import { PrismaService } from "../../prisma/prisma.service";
import type { DecodedEventRow } from "./projector.types";
import { normalizeUsername } from "../../../../packages/username";

const ZERO = "0x0000000000000000000000000000000000000000";

function normalizeAddress(value: any) {
  const text = String(value || "").toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
}

/** Projects username ownership state from registry transfer events. */
export class UsernameOwnershipProjector {
  constructor(private readonly prisma: PrismaService) {}

  async process(events: DecodedEventRow[]) {
    for (const event of events) {
      if (!["UsernameClaimed", "UsernameTransferred", "UsernameReleased"].includes(event.eventName)) continue;
      const rawUsername = String(event.args.username || "");
      if (!rawUsername) continue;
      const normalized = normalizeUsername(rawUsername);
      const owner =
        event.eventName === "UsernameReleased" ? ZERO : normalizeAddress(event.args.owner || event.args.to);

      if (owner === ZERO) {
        await this.prisma.usernameOwnership.updateMany({
          where: { chainId: event.chainId, handleHash: normalized.handleHash },
          data: { removed: true, ownerAddress: ZERO, updatedAtBlock: event.blockNumber, txHash: event.txHash },
        });
        continue;
      }

      await this.prisma.usernameOwnership.upsert({
        where: {
          chainId_handleHash: {
            chainId: event.chainId,
            handleHash: normalized.handleHash,
          },
        },
        update: {
          normalized: normalized.normalized,
          ownerAddress: owner,
          updatedAtBlock: event.blockNumber,
          txHash: event.txHash,
          removed: false,
        },
        create: {
          chainId: event.chainId,
          handleHash: normalized.handleHash,
          normalized: normalized.normalized,
          ownerAddress: owner,
          updatedAtBlock: event.blockNumber,
          txHash: event.txHash,
          removed: false,
        },
      });
    }
  }
}
