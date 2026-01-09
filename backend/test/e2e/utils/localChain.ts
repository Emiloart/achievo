import { spawn, spawnSync } from "child_process";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import net from "net";
import { existsSync } from "fs";
import { join, resolve } from "path";

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";
const DEFAULT_CHAIN_ID = 31337;
const DEFAULT_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
];

export type LocalChain = {
  rpcUrl: string;
  chainId: number;
  mnemonic: string;
  accounts: Array<{ name: string; address: string; privateKey: string }>;
  process: ReturnType<typeof spawn>;
  stop: () => Promise<void>;
  mineBlocks: (count: number) => Promise<void>;
};

function hasCommand(command: string) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

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

function buildAccounts() {
  const names = ["deployer", "user", "validator", "treasury", "operator", "exportSigner"];
  return DEFAULT_KEYS.map((key, idx) => {
    const account = privateKeyToAccount(key as `0x${string}`);
    return {
      name: names[idx] || `account${idx}`,
      address: account.address,
      privateKey: key,
    };
  });
}

function findRepoRoot(start: string) {
  let current = start;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(current, "hardhat.config.ts")) || existsSync(join(current, "hardhat.config.js"))) {
      return current;
    }
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return resolve(start, "..");
}

async function waitForRpc(rpcUrl: string, timeoutMs = 60000) {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await client.getBlockNumber();
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error("RPC did not become ready in time");
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

export async function startLocalChain(): Promise<LocalChain> {
  const chainId = DEFAULT_CHAIN_ID;
  const mnemonic = DEFAULT_MNEMONIC;
  const portRaw = Number(process.env.E2E_CHAIN_PORT || 0);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : await getFreePort();
  const rpcUrl = `http://127.0.0.1:${port}`;

  const repoRoot = findRepoRoot(process.cwd());
  const useAnvil = hasCommand("anvil");
  const hardhatCli = resolve(repoRoot, "node_modules", "hardhat", "dist", "src", "cli.js");
  const useHardhatCli = existsSync(hardhatCli);
  let command: string;
  let args: string[];
  let cwd: string | undefined;

  if (useAnvil) {
    command = "anvil";
    args = ["--mnemonic", mnemonic, "--chain-id", String(chainId), "--port", String(port), "--block-time", "1"];
    cwd = repoRoot;
  } else if (useHardhatCli) {
    command = process.execPath;
    args = [hardhatCli, "node", "--hostname", "127.0.0.1", "--port", String(port)];
    cwd = repoRoot;
  } else {
    command = process.platform === "win32" ? "npx" : "npx";
    args = ["hardhat", "node", "--hostname", "127.0.0.1", "--port", String(port)];
    cwd = repoRoot;
  }

  const useShell = process.platform === "win32" && command !== process.execPath;
  const hardhatNetwork = useAnvil ? undefined : "hardhat";
  const child = spawn(command, args, {
    cwd,
    stdio: "ignore",
    shell: useShell,
    env: {
      ...process.env,
      ...(hardhatNetwork ? { HARDHAT_NETWORK: hardhatNetwork } : {}),
      LOCALHOST_RPC_URL: rpcUrl,
    },
  });
  child.unref();

  await waitForRpc(rpcUrl, 60000);

  const client = createPublicClient({ transport: http(rpcUrl) });

  return {
    rpcUrl,
    chainId,
    mnemonic,
    accounts: buildAccounts(),
    process: child,
    stop: async () => {
      if (child.killed) return;
      child.kill();
    },
    mineBlocks: async (count: number) => {
      const total = Math.max(1, Math.floor(count));
      const request = (method: string, params?: unknown[]) =>
        (client as unknown as { request: (payload: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
          method,
          params,
        });
      try {
        await request("anvil_mine", [total]);
        return;
      } catch {
        // ignore
      }
      try {
        await request("hardhat_mine", ["0x" + total.toString(16)]);
        return;
      } catch {
        // ignore
      }
      for (let i = 0; i < total; i += 1) {
        await request("evm_mine", []);
      }
    },
  };
}
