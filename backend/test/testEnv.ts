import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { URL } from "url";

export const DEFAULT_TEST_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://achievo_test:achievo_test@localhost:54321/achievo_test?schema=public",
  JWT_SECRET: "achievo_test_jwt_secret",
  RPC_URL: "http://localhost:8545",
  CHAIN_ID: "84532",
  ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
  ADMIN_BOOTSTRAP_PASSWORD: "admin-password-123",
};

function testRoot(rootDir?: string) {
  return rootDir || join(__dirname, "..");
}

function parseEnvFile(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadTestEnv(rootDir?: string) {
  const root = testRoot(rootDir);
  const candidates = [".env.test.local", ".env.test", ".env.test.example"];
  for (const name of candidates) {
    const filePath = join(root, name);
    if (existsSync(filePath)) {
      return {
        file: filePath,
        env: {
          ...DEFAULT_TEST_ENV,
          ...parseEnvFile(filePath),
        },
      };
    }
  }
  return {
    file: null,
    env: { ...DEFAULT_TEST_ENV },
  };
}

export function applyTestEnv(rootDir?: string) {
  const { file, env } = loadTestEnv(rootDir);
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  process.env.NODE_ENV = "test";
  return { file, env };
}

export function assertIsolatedTestDatabaseUrl(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid Postgres URL for test execution");
  }

  const databaseName = parsed.pathname.replace(/^\/+/, "");
  const usesHarnessPort = parsed.port === "54321";
  const looksLikeTestDatabase = /test/i.test(databaseName);

  if (databaseName === "achievo" || (!looksLikeTestDatabase && !usesHarnessPort)) {
    throw new Error(
      `Refusing to run backend tests against DATABASE_URL for database \"${databaseName || "unknown"}\" at ${parsed.host}. ` +
        "Use backend/.env.test(.local) or backend/.env.test.example with an isolated test database.",
    );
  }
}
