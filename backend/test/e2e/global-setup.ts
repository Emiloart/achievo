import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { spawn } from "child_process";
import { applyTestEnv } from "../testEnv";
import { startLocalChain } from "./utils/localChain";
import { prepareTestDb } from "./utils/testDb";
import { writeRuntime } from "./utils/runtime";

function repoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(current, "hardhat.config.ts")) || existsSync(join(current, "hardhat.config.js"))) {
      return current;
    }
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return resolve(process.cwd(), "..");
}

async function runDeploy(params: { rpcUrl: string; operator: string; treasury: string }) {
  const root = repoRoot();
  const hardhatCli = join(root, "node_modules", "hardhat", "dist", "src", "cli.js");
  const useHardhatCli = existsSync(hardhatCli);
  const command = useHardhatCli ? process.execPath : process.platform === "win32" ? "npx" : "npx";
  const args = useHardhatCli
    ? [hardhatCli, "run", "scripts/deploy-e2e-local.ts", "--network", "localhost"]
    : ["hardhat", "run", "scripts/deploy-e2e-local.ts", "--network", "localhost"];
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      command,
      args,
      {
        cwd: root,
        env: {
          ...process.env,
          LOCALHOST_RPC_URL: params.rpcUrl,
          E2E_ANCHOR_OPERATOR: params.operator,
          E2E_ORG_TREASURY: params.treasury,
          E2E_ORG_FEE: "1000000000000000",
        },
        stdio: "inherit",
        shell: !useHardhatCli && process.platform === "win32",
      },
    );
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`deploy-e2e-local failed with code ${code}`));
    });
  });

  const deploymentPath = join(root, "contracts", "deployments", "local", "e2e.json");
  const deploymentRaw = readFileSync(deploymentPath, "utf8");
  return JSON.parse(deploymentRaw) as {
    orgRegistry: string;
    orgCreateFee: string;
    treasury: string;
    anchorRegistry: string;
    anchorOperator: string;
    usernameRegistry: string;
    usernameOperator: string;
    identity: string;
    chainId: number;
  };
}

module.exports = async () => {
  applyTestEnv();

  const chain = await startLocalChain();
  const operator = chain.accounts.find((a) => a.name === "operator") || chain.accounts[4];
  const treasury = chain.accounts.find((a) => a.name === "treasury") || chain.accounts[3];
  const deploy = await runDeploy({ rpcUrl: chain.rpcUrl, operator: operator.address, treasury: treasury.address });
  const db = await prepareTestDb();

  writeRuntime({
    chain: {
      rpcUrl: chain.rpcUrl,
      chainId: chain.chainId,
      mnemonic: chain.mnemonic,
      accounts: chain.accounts,
      pid: chain.process.pid,
    },
    deployments: {
      orgRegistry: deploy.orgRegistry,
      orgCreateFee: deploy.orgCreateFee,
      treasury: deploy.treasury,
      anchorRegistry: deploy.anchorRegistry,
      anchorOperator: deploy.anchorOperator,
      usernameRegistry: deploy.usernameRegistry,
      usernameOperator: deploy.usernameOperator,
      identity: deploy.identity,
    },
    db: {
      databaseUrl: db.databaseUrl,
      schema: db.schema,
      adminUrl: db.adminUrl,
    },
    backend: null,
    admin: {
      apiKey: "e2e-admin-key",
      hmacSecret: "e2e-admin-secret",
    },
  });
};
