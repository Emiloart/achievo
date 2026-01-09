import { createHash, createHmac, randomUUID } from "crypto";
import type { E2ERuntime } from "./runtime";

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

function sha256Hex(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function signAdminRequest(params: {
  runtime: E2ERuntime;
  method: string;
  path: string;
  body?: any;
  nonce?: string;
  ts?: number;
}) {
  const ts = params.ts ?? Math.floor(Date.now() / 1000);
  const nonce = params.nonce ?? randomUUID();
  const bodyHash = params.body === undefined ? sha256Hex("") : sha256Hex(stableStringify(params.body));
  const payload = `${params.method.toUpperCase()}\n${params.path}\n${ts}\n${nonce}\n${bodyHash}`;
  const signature = createHmac("sha256", params.runtime.admin.hmacSecret).update(payload).digest("hex");
  return {
    "x-admin-key": params.runtime.admin.apiKey,
    "x-admin-ts": String(ts),
    "x-admin-nonce": nonce,
    "x-admin-sig": signature,
  };
}
