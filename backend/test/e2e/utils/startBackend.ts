import { spawn, type ChildProcess } from "child_process";
import { createWriteStream, mkdirSync, type WriteStream } from "fs";
import { join } from "path";
import net from "net";
import { readRuntime, writeRuntime, type E2ERuntime } from "./runtime";
import { waitUntil } from "./waitUntil";

function resolveBackendDir() {
  return process.cwd();
}

let currentChild: ChildProcess | null = null;
let currentLogStream: WriteStream | null = null;

async function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        return reject(new Error("Failed to acquire port"));
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function buildEnv(runtime: E2ERuntime, options?: { rpcFailMode?: boolean }) {
  const operator = runtime.chain.accounts.find((a) => a.name === "operator") || runtime.chain.accounts[4];
  const exporter = runtime.chain.accounts.find((a) => a.name === "exportSigner") || runtime.chain.accounts[5];
  const dummyCore = "0x0000000000000000000000000000000000000001";
  const dummyBadge = "0x0000000000000000000000000000000000000002";
  const usernameRegistry = runtime.deployments.usernameRegistry;
  const usernameOperatorKey =
    operator?.privateKey || runtime.chain.accounts[4]?.privateKey || runtime.chain.accounts[0]?.privateKey;

  return {
    NODE_ENV: "test",
    JWT_SECRET: "e2e-secret",
    RPC_URL: runtime.chain.rpcUrl,
    CHAIN_ID: String(runtime.chain.chainId),
    BASE_SEPOLIA_RPC_URL: runtime.chain.rpcUrl,
    CORE_ADDRESS: dummyCore,
    BADGE_ADDRESS: dummyBadge,
    IDENTITY_ADDRESS: runtime.deployments.identity,
    NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS: dummyCore,
    NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS: dummyBadge,
    NEXT_PUBLIC_IDENTITY_ADDRESS: runtime.deployments.identity,
    NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS: usernameRegistry,
    ACHIEVO_USERNAME_REGISTRY_ADDRESS: usernameRegistry,
    USERNAME_REGISTRY_ADDRESS: usernameRegistry,
    USERNAME_REGISTRY_CHAIN_ID: String(runtime.chain.chainId),
    USERNAME_REGISTRY_RPC_URL: runtime.chain.rpcUrl,
    USERNAME_SETTLEMENT_MODE: "OPERATOR",
    USERNAME_OPERATOR_PRIVATE_KEY: usernameOperatorKey,
    ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY: usernameOperatorKey,
    USERNAME_REGISTRY_OPERATOR_PRIVATE_KEY: usernameOperatorKey,
    ORG_CREATE_REQUIRED: "true",
    ORG_CREATE_CHAIN_ID: String(runtime.chain.chainId),
    ORG_CREATE_RPC_URL: runtime.chain.rpcUrl,
    ORG_REGISTRY_ADDRESS: runtime.deployments.orgRegistry,
    ANCHORING_ENABLED: "true",
    ANCHOR_CHAIN_ID: String(runtime.chain.chainId),
    ANCHOR_RPC_URL: runtime.chain.rpcUrl,
    ANCHOR_OPERATOR_PRIVATE_KEY: operator?.privateKey || runtime.chain.accounts[4].privateKey,
    ANCHOR_REGISTRY_ADDRESS: runtime.deployments.anchorRegistry,
    ANCHOR_BATCH_SIZE: "5",
    ANCHOR_QUEUE_ENABLED: "true",
    CHAIN_ACTIONS_ENABLED: "true",
    CHAIN_ACTIONS_WORKER_ENABLED: "true",
    CHAIN_ACTIONS_POLL_INTERVAL_MS: "1500",
    CHAIN_CONFIRMATIONS_REQUIRED: "2",
    CHAIN_ACTIONS_RPC_URL: runtime.chain.rpcUrl,
    INDEXER_ENABLED: "true",
    INDEXER_CHAIN_ID: String(runtime.chain.chainId),
    INDEXER_RPC_URL: runtime.chain.rpcUrl,
    INDEXER_FINALITY_DEPTH: "2",
    INDEXER_START_BLOCK: "0",
    INDEXER_BATCH_SIZE: "200",
    VALIDATION_EIP712_CHAIN_ID: String(runtime.chain.chainId),
    VALIDATION_EIP712_DOMAIN_NAME: "Achievo",
    VALIDATION_EIP712_DOMAIN_VERSION: "1",
    VALIDATION_PUBLIC_READ: "true",
    PROFILE_EXPORT_SIGNER_PRIVATE_KEY: exporter?.privateKey || runtime.chain.accounts[5]?.privateKey,
    PROFILE_EXPORT_SIGNER_ADDRESS: exporter?.address || runtime.chain.accounts[5]?.address,
    VERIFY_PROFILE_EXPORT_SIGNER_ADDRESS: exporter?.address || runtime.chain.accounts[5]?.address,
    VERIFY_CHAIN_RPC_URL: runtime.chain.rpcUrl,
    VERIFY_CHAIN_ID: String(runtime.chain.chainId),
    VERIFY_ANCHOR_REGISTRY_ADDRESS: runtime.deployments.anchorRegistry,
    VERIFY_PORTAL_ENABLED: "true",
    PROFILE_EXPORT_STORAGE_DRIVER: "LOCAL",
    PROFILE_EXPORT_LOCAL_DIR: join(resolveBackendDir(), "storage", "e2e-exports"),
    PROOF_STORAGE_DRIVER: "LOCAL",
    PROOF_LOCAL_DIR: join(resolveBackendDir(), "storage", "e2e-proofs"),
    REQUEST_BODY_LIMIT_MB: "2",
    THROTTLE_TTL: "60",
    THROTTLE_LIMIT: "1000",
    THROTTLE_AUTH_TTL: "60",
    THROTTLE_AUTH_LIMIT: "1000",
    THROTTLE_SENSITIVE_TTL: "60",
    THROTTLE_SENSITIVE_LIMIT: "1000",
    THROTTLE_ADMIN_TTL: "60",
    THROTTLE_ADMIN_LIMIT: "1000",
    METRICS_ENABLED: "false",
    MONITORING_ENABLED: "false",
    GOVERNANCE_SANITY_CHECK_ENABLED: "false",
    DEPLOYMENT_COMPAT_CHECK_ENABLED: "false",
    CONFIG_STRICT: "false",
    ADMIN_API_KEY: runtime.admin.apiKey,
    ADMIN_HMAC_SECRET: runtime.admin.hmacSecret,
    ADMIN_TS_SKEW_SECONDS: "120",
    E2E_RPC_FAIL_MODE: options?.rpcFailMode ? "true" : "false",
  };
}

export async function startBackend(options?: { rpcFailMode?: boolean }) {
  const runtime = readRuntime();
  const backendDir = resolveBackendDir();
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const logDir = join(backendDir, "test", "e2e", "logs");
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, "backend.log");

  const child = spawn(process.execPath, ["-r", "ts-node/register/transpile-only", "src/main.ts"], {
    cwd: backendDir,
    env: {
      ...process.env,
      ...buildEnv(runtime, options),
      DATABASE_URL: runtime.db.databaseUrl,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.unref();

  const logStream = createWriteStream(logPath, { flags: "a" });
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  currentChild = child;
  currentLogStream = logStream;

  await waitUntil(
    async () => {
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) return false;
        const body = (await res.json()) as any;
        return Boolean(body?.ok);
      } catch {
        return false;
      }
    },
    { timeoutMs: 30000, intervalMs: 500, label: "wait_for_backend" },
  );

  runtime.backend = { pid: child.pid || 0, port, baseUrl, logPath };
  writeRuntime(runtime);

  return runtime.backend;
}

export async function stopBackend() {
  const runtime = readRuntime();
  if (!runtime.backend?.pid) return;
  try {
    process.kill(runtime.backend.pid);
  } catch {
    // ignore
  }
  if (currentLogStream) {
    try {
      currentLogStream.end();
    } catch {
      // ignore
    }
    currentLogStream = null;
  }
  currentChild = null;
  runtime.backend = null;
  writeRuntime(runtime);
}

export async function restartBackend(options?: { rpcFailMode?: boolean }) {
  await stopBackend();
  return startBackend(options);
}
