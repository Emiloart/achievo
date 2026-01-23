const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const defaultEnv = {
  DATABASE_URL: "postgresql://achievo_test:achievo_test@localhost:54321/achievo_test?schema=public",
  JWT_SECRET: "achievo_test_jwt_secret",
  RPC_URL: "http://localhost:8545",
  CHAIN_ID: "84532",
  ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
  ADMIN_BOOTSTRAP_PASSWORD: "admin-password-123",
};

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadTestEnv() {
  const candidates = [".env.test.local", ".env.test", ".env.test.example"];
  for (const name of candidates) {
    const fullPath = path.join(root, name);
    if (fs.existsSync(fullPath)) {
      return { file: fullPath, env: parseEnvFile(fullPath) };
    }
  }
  return { file: null, env: {} };
}

function run(command, env) {
  const result = spawnSync(command, {
    cwd: root,
    env,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

async function main() {
  const { file, env: fileEnv } = loadTestEnv();
  if (!file) {
    console.warn("No .env.test(.local) or .env.test.example found. Using default test env.");
  }

  const env = {
    ...process.env,
    ...defaultEnv,
    ...fileEnv,
    NODE_ENV: "test",
  };

  try {
    run("docker compose -f docker-compose.test.yml up -d", env);
    run("node scripts/wait-for-postgres.cjs", env);
    run("npm run test:integration", env);
  } finally {
    try {
      run("docker compose -f docker-compose.test.yml down -v", env);
    } catch {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
