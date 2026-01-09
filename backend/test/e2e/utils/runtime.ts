import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type E2ERuntime = {
  chain: {
    rpcUrl: string;
    chainId: number;
    mnemonic: string;
    accounts: Array<{ name: string; address: string; privateKey: string }>;
    pid?: number | null;
  };
  deployments: {
    orgRegistry: string;
    orgCreateFee: string;
    treasury: string;
    anchorRegistry: string;
    anchorOperator: string;
    usernameRegistry: string;
    usernameOperator: string;
    identity: string;
  };
  db: {
    databaseUrl: string;
    schema: string;
    adminUrl?: string;
  };
  backend?: {
    pid: number;
    port: number;
    baseUrl: string;
    logPath?: string;
  } | null;
  admin: {
    apiKey: string;
    hmacSecret: string;
  };
};

export function runtimePath() {
  return join(__dirname, "..", ".runtime.json");
}

export function readRuntime(): E2ERuntime {
  const path = runtimePath();
  if (!existsSync(path)) {
    throw new Error(`E2E runtime file not found at ${path}`);
  }
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as E2ERuntime;
}

export function writeRuntime(data: E2ERuntime) {
  const path = runtimePath();
  writeFileSync(path, JSON.stringify(data, null, 2));
}
