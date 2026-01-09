/**
 * Deployment artifact loader helpers.
 *
 * Reads deployment JSON files from known local directories.
 */
import { readFileSync } from "fs";
import { join } from "path";

/** Parsed deployment JSON payload. */
export type DeploymentRecord = Record<string, any>;

function tryRead(path: string): DeploymentRecord | null {
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as DeploymentRecord;
  } catch {
    return null;
  }
}

/** Reads a deployment JSON file from known locations. */
export function readDeploymentFile(fileName: string): DeploymentRecord | null {
  const candidates = [
    join(process.cwd(), "deployments", "base-sepolia", fileName),
    join(process.cwd(), "deployments", fileName),
  ];
  for (const path of candidates) {
    const found = tryRead(path);
    if (found) return found;
  }
  return null;
}

/** Reads the anchor registry deployment record if available. */
export function readAnchorRegistryDeployment(): DeploymentRecord | null {
  const candidates = [
    join(process.cwd(), "deployments", "base-sepolia", "anchorRegistry.json"),
    join(process.cwd(), "deployments", "anchor-registry.base-sepolia.json"),
  ];
  for (const path of candidates) {
    const found = tryRead(path);
    if (found) return found;
  }
  return null;
}
