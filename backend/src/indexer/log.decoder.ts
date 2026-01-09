/**
 * Log decoder for multi-contract event streams.
 *
 * Produces stable decoded events for projection and audit storage.
 */
import { decodeEventLog } from "viem";

/** Contract decode configuration for log decoding. */
export type ContractConfig = {
  key: string;
  address: `0x${string}`;
  abi: any[];
};

/** Decoded log representation for storage and projection. */
export type DecodedLog = {
  contractKey: string;
  eventName: string;
  args: Record<string, any>;
};

function normalizeValue(value: any): any {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    const keys = Object.keys(value).filter((key) => Number.isNaN(Number(key))).sort();
    const out: Record<string, any> = {};
    for (const key of keys) {
      out[key] = normalizeValue(value[key]);
    }
    return out;
  }
  if (typeof value === "string" && value.startsWith("0x")) return value.toLowerCase();
  return value;
}

/** Decodes logs against a configured ABI set. */
export class LogDecoder {
  private readonly byAddress = new Map<string, ContractConfig>();

  constructor(contracts: ContractConfig[]) {
    for (const contract of contracts) {
      this.byAddress.set(contract.address.toLowerCase(), contract);
    }
  }

  decode(log: { address: string; data: `0x${string}`; topics: `0x${string}`[] }): DecodedLog | null {
    const contract = this.byAddress.get(log.address.toLowerCase());
    if (!contract) return null;
    try {
      const decoded = decodeEventLog({
        abi: contract.abi as any,
        data: log.data,
        topics: log.topics as any,
      }) as { eventName: string; args?: Record<string, any> };
      return {
        contractKey: contract.key,
        eventName: decoded.eventName,
        args: normalizeValue(decoded.args || {}),
      };
    } catch {
      return null;
    }
  }
}
