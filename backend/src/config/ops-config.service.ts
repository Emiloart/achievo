/**
 * Operational configuration validation and startup reporting.
 *
 * Performs deployment compatibility checks and emits a masked config report.
 */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrgRegistryService } from "../organizations/orgRegistry.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";

const ORG_REGISTRY_ABI = [
  {
    inputs: [],
    name: "createOrgFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ANCHOR_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "isAnchored",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

function maskSecret(value?: string | null) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return "***";
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function computeDirectoryHash(dir: string) {
  const files = readdirSync(dir).filter((file) => file.endsWith(".json")).sort();
  const hashes = files.map((file) => {
    const content = readFileSync(join(dir, file));
    const digest = createHash("sha256").update(content).digest("hex");
    return `${file}:${digest}`;
  });
  return createHash("sha256").update(hashes.join("|")).digest("hex");
}

@Injectable()
export class OpsConfigService implements OnModuleInit {
  private readonly logger = new Logger(OpsConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgRegistry: OrgRegistryService,
    private readonly anchoring: AnchoringService,
  ) {}

  async onModuleInit() {
    this.validateConfig();
    await this.logStartupReport();
    if (toBooleanEnv("DEPLOYMENT_COMPAT_CHECK_ENABLED", false)) {
      await this.verifyDeployments();
    }
  }

  private isStrict() {
    return toBooleanEnv("CONFIG_STRICT", false);
  }

  private validateConfig() {
    const errors: string[] = [];
    const orgRequired = toBooleanEnv("ORG_CREATE_REQUIRED", false);
    if (orgRequired) {
      const registry = this.orgRegistry.getRegistryAddressSafe();
      if (!registry) errors.push("ORG_REGISTRY_ADDRESS is required when ORG_CREATE_REQUIRED=true");
      if (!this.orgRegistry.getRpcUrl()) errors.push("ORG_CREATE_RPC_URL is required when ORG_CREATE_REQUIRED=true");
    }

    const anchoringEnabled = toBooleanEnv("ANCHORING_ENABLED", false);
    if (anchoringEnabled) {
      const registry = this.anchoring.getRegistryAddressSafe();
      if (!registry) errors.push("ANCHOR_REGISTRY_ADDRESS is required when ANCHORING_ENABLED=true");
      if (!process.env.ANCHOR_OPERATOR_PRIVATE_KEY) {
        errors.push("ANCHOR_OPERATOR_PRIVATE_KEY is required when ANCHORING_ENABLED=true");
      }
      if (!this.anchoring.getRpcUrl()) errors.push("ANCHOR_RPC_URL is required when ANCHORING_ENABLED=true");
    }

    const indexerEnabled = toBooleanEnv("INDEXER_ENABLED", false);
    if (indexerEnabled) {
      if (!process.env.INDEXER_RPC_URL) errors.push("INDEXER_RPC_URL is required when INDEXER_ENABLED=true");
      const startBlock = Number(process.env.INDEXER_START_BLOCK ?? "");
      if (!Number.isFinite(startBlock) || startBlock < 0) {
        errors.push("INDEXER_START_BLOCK must be set when INDEXER_ENABLED=true");
      }
    }

    const governanceCheck = toBooleanEnv("GOVERNANCE_SANITY_CHECK_ENABLED", false);
    if (governanceCheck) {
      if (!process.env.TIMELOCK_ADDRESS) errors.push("TIMELOCK_ADDRESS is required for governance sanity checks");
      if (!process.env.MULTISIG_ADDRESS) errors.push("MULTISIG_ADDRESS is required for governance sanity checks");
    }

    const adminKey = process.env.ADMIN_API_KEY;
    const adminSecret = process.env.ADMIN_HMAC_SECRET;
    if ((adminKey && !adminSecret) || (!adminKey && adminSecret)) {
      errors.push("ADMIN_API_KEY and ADMIN_HMAC_SECRET must both be set for admin endpoints");
    }

    if (errors.length) {
      const message = `Config validation failed: ${errors.join("; ")}`;
      if (this.isStrict()) throw new Error(message);
      this.logger.error(message);
    }
  }

  private async logStartupReport() {
    const report = {
      service: "backend",
      chainId: Number(process.env.CHAIN_ID || 0) || null,
      features: {
        orgCreateRequired: toBooleanEnv("ORG_CREATE_REQUIRED", false),
        anchoringEnabled: toBooleanEnv("ANCHORING_ENABLED", false),
        indexerEnabled: toBooleanEnv("INDEXER_ENABLED", false),
        chainActionsEnabled: toBooleanEnv("CHAIN_ACTIONS_ENABLED", true),
        monitoringEnabled: toBooleanEnv("MONITORING_ENABLED", false),
        governanceSanityCheck: toBooleanEnv("GOVERNANCE_SANITY_CHECK_ENABLED", false),
      },
      chain: {
        orgRegistry: this.orgRegistry.getRegistryAddressSafe(),
        anchorRegistry: this.anchoring.getRegistryAddressSafe(),
        orgChainId: this.orgRegistry.getChainId(),
        anchorChainId: this.anchoring.getChainId(),
      },
      confirmationsRequired: toNumberEnv("CHAIN_CONFIRMATIONS_REQUIRED", 20),
      indexer: {
        startBlock: Number(process.env.INDEXER_START_BLOCK || 0) || 0,
        batchSize: Number(process.env.INDEXER_BATCH_SIZE || 0) || 0,
      },
      secrets: {
        adminKey: maskSecret(process.env.ADMIN_API_KEY),
        adminHmac: maskSecret(process.env.ADMIN_HMAC_SECRET),
        anchorOperator: maskSecret(process.env.ANCHOR_OPERATOR_PRIVATE_KEY),
      },
    };
    this.logger.log(JSON.stringify({ message: "startup_config", report }));

    const expectedHash = process.env.DEPLOYMENTS_HASH_BASE_SEPOLIA || "";
    const baseDir = join(process.cwd(), "deployments", "base-sepolia");
    const fallbackDir = join(process.cwd(), "deployments");
    const baseExists = existsSync(baseDir);
    const fallbackExists = existsSync(fallbackDir);
    if (!baseExists && !fallbackExists) {
      if (expectedHash) {
        const message = "Deployment hash check failed: deployments directory not found";
        if (this.isStrict()) throw new Error(message);
        this.logger.error(message);
      } else {
        this.logger.log(JSON.stringify({ message: "deployments_hash_skipped", reason: "missing_directory" }));
      }
      return;
    }
    try {
      if (baseExists) {
        const hash = computeDirectoryHash(baseDir);
        this.logger.log(JSON.stringify({ message: "deployments_hash", hash, path: baseDir }));
        if (expectedHash && expectedHash !== hash) {
          await this.prisma.operationalAlert.create({
            data: {
              severity: "CRITICAL",
              type: "CONFIG_MISMATCH",
              message: "Deployment artifact hash mismatch",
              details: { expectedHash, actualHash: hash },
            },
          });
          if (this.isStrict()) throw new Error("DEPLOYMENTS_HASH_MISMATCH");
        }
        return;
      }
      const hash = computeDirectoryHash(fallbackDir);
      this.logger.log(JSON.stringify({ message: "deployments_hash", hash, path: fallbackDir }));
      if (expectedHash && expectedHash !== hash) {
        await this.prisma.operationalAlert.create({
          data: {
            severity: "CRITICAL",
            type: "CONFIG_MISMATCH",
            message: "Deployment artifact hash mismatch",
            details: { expectedHash, actualHash: hash },
          },
        });
        if (this.isStrict()) throw new Error("DEPLOYMENTS_HASH_MISMATCH");
      }
    } catch (error: any) {
      const message = `Deployment hash check failed: ${error?.message || "unknown"}`;
      if (this.isStrict()) throw new Error(message);
      this.logger.error(message);
    }
  }

  private async verifyDeployments() {
    const strict = this.isStrict();
    const failures: string[] = [];

    const orgRegistry = this.orgRegistry.getRegistryAddressSafe();
    if (orgRegistry) {
      try {
        const rpc = getRpcClient({
          chainId: this.orgRegistry.getChainId(),
          rpcUrl: this.orgRegistry.getRpcUrl(),
          name: "Compat-Org",
        });
        const chainId = await rpc.getChainId();
        if (chainId !== this.orgRegistry.getChainId()) {
          failures.push("Org registry RPC chainId mismatch");
        }
        const bytecode = await rpc.getBytecode(orgRegistry);
        if (!bytecode || bytecode === "0x") {
          failures.push("Org registry address has no code");
        }
        await rpc.readContract({
          address: orgRegistry,
          abi: ORG_REGISTRY_ABI as any,
          functionName: "createOrgFee",
          args: [],
        });
      } catch (error: any) {
        if (!isRpcUnavailableError(error)) {
          failures.push(`Org registry compatibility check failed: ${error?.message || "unknown"}`);
        }
      }
    }

    const anchorRegistry = this.anchoring.getRegistryAddressSafe();
    if (anchorRegistry) {
      try {
        const rpc = getRpcClient({
          chainId: this.anchoring.getChainId(),
          rpcUrl: this.anchoring.getRpcUrl(),
          name: "Compat-Anchor",
        });
        const chainId = await rpc.getChainId();
        if (chainId !== this.anchoring.getChainId()) {
          failures.push("Anchor registry RPC chainId mismatch");
        }
        const bytecode = await rpc.getBytecode(anchorRegistry);
        if (!bytecode || bytecode === "0x") {
          failures.push("Anchor registry address has no code");
        }
        await rpc.readContract({
          address: anchorRegistry,
          abi: ANCHOR_REGISTRY_ABI as any,
          functionName: "isAnchored",
          args: ["0x" + "00".repeat(32)],
        });
      } catch (error: any) {
        if (!isRpcUnavailableError(error)) {
          failures.push(`Anchor registry compatibility check failed: ${error?.message || "unknown"}`);
        }
      }
    }

    const timelock = process.env.TIMELOCK_ADDRESS || "";
    if (timelock) {
      try {
        const rpc = getRpcClient({
          chainId: this.orgRegistry.getChainId(),
          rpcUrl: this.orgRegistry.getRpcUrl(),
          name: "Compat-Timelock",
        });
        const code = await rpc.getBytecode(timelock as `0x${string}`);
        if (!code || code === "0x") {
          failures.push("Timelock address has no code");
        }
      } catch (error: any) {
        if (!isRpcUnavailableError(error)) {
          failures.push(`Timelock compatibility check failed: ${error?.message || "unknown"}`);
        }
      }
    }

    if (failures.length) {
      await this.prisma.operationalAlert.create({
        data: {
          severity: "CRITICAL",
          type: "CONFIG_MISMATCH",
          message: failures.join("; "),
          details: { failures },
        },
      });
      if (strict) throw new Error(`Deployment compatibility failed: ${failures.join("; ")}`);
      this.logger.error(`Deployment compatibility failed: ${failures.join("; ")}`);
    }
  }
}
