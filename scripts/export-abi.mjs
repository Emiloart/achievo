// scripts/export-abi.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, "..");

const targets = [
  {
    artifact: join(root, "artifacts/contracts/AchievoIdentity.sol/AchievoIdentity.json"),
    out: join(root, "deployments/abi/AchievoIdentity.json"),
  },
  {
    artifact: join(root, "artifacts/contracts/AchievoUsernameRegistryV1.sol/AchievoUsernameRegistryV1.json"),
    out: join(root, "deployments/abi/AchievoUsernameRegistryV1.json"),
  },
  {
    artifact: join(root, "artifacts/contracts/AchievoCore.sol/AchievoCore.json"),
    out: join(root, "deployments/abi/AchievoCore.json"),
  },
  {
    artifact: join(root, "artifacts/contracts/BadgeSBT.sol/BadgeSBT.json"),
    out: join(root, "deployments/abi/BadgeSBT.json"),
  },
];

for (const { artifact, out } of targets) {
  const artifactJson = JSON.parse(readFileSync(artifact, "utf8"));
  const abi = artifactJson.abi ?? [];

  const outDir = dirname(out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(out, JSON.stringify({ abi }, null, 2));
  console.log(`Exported ABI -> ${out}`);
}
