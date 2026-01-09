/**
 * Shared configuration resolver for Achievo v1.1.
 *
 * Resolves contract addresses from environment variables with deployment-file fallback.
 */

/**
 * Reads a deployment address from known deployment file locations.
 */
function readDeploymentAddress(fileName) {
  try {
    // Lazy-load Node modules to keep this module compatible with non-Node bundlers.
    // eslint-disable-next-line global-require
    const fs = require("fs");
    // eslint-disable-next-line global-require
    const path = require("path");
    const candidates = [
      path.join(process.cwd(), "deployments", "base-sepolia", fileName),
      path.join(process.cwd(), "deployments", fileName),
    ];
    for (const filePath of candidates) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(raw);
        if (json?.address) return json.address;
      } catch {
        // Ignore missing or invalid deployment files.
      }
    }
  } catch {
    // Ignore environments without filesystem access.
  }
  return "";
}

/**
 * Resolves a required address or throws with a clear configuration error.
 */
function requireEnv(name, fallbackName, deploymentFile) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (value) return value;
  const deploymentValue = deploymentFile ? readDeploymentAddress(deploymentFile) : "";
  if (deploymentValue) return deploymentValue;
  const names = fallbackName ? `${name} or ${fallbackName}` : name;
  throw new Error(`Missing env ${names} for Achievo v1.1`);
}

const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC || process.env.RPC_URL || "https://sepolia.base.org";
const ACHIEVO_CORE_V11_ADDRESS = requireEnv("NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS", null, "achievoCore.json");
const ACHIEVO_BADGE_V11_ADDRESS = requireEnv("NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS", null, "achievoBadge.json");
const ACHIEVO_IDENTITY_ADDRESS = requireEnv("NEXT_PUBLIC_IDENTITY_ADDRESS", "ACHIEVO_IDENTITY_ADDRESS");
const ACHIEVO_USERNAME_REGISTRY_ADDRESS = requireEnv(
  "NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS",
  "ACHIEVO_USERNAME_REGISTRY_ADDRESS",
);

module.exports = {
  BASE_SEPOLIA_RPC,
  ACHIEVO_CORE_V11_ADDRESS,
  ACHIEVO_BADGE_V11_ADDRESS,
  ACHIEVO_IDENTITY_ADDRESS,
  ACHIEVO_USERNAME_REGISTRY_ADDRESS,
};
