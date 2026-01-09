// CJS entry to avoid Webpack import.meta issues
const achievoCoreV11Abi = require("./achievoCoreV11.abi.json");
const achievoBadgeV11Abi = require("./achievoBadgeV11.abi.json");
const achievoUsernameRegistryV1Abi = require("./achievoUsernameRegistryV1.abi.json");
const achievoOrgRegistryAbi = require("./achievoOrgRegistry.abi.json");
const proofAnchorRegistryAbi = require("./proofAnchorRegistry.abi.json");
const achievoAnchorRegistryAbi = require("./achievoAnchorRegistry.abi.json");

module.exports = {
  achievoCoreV11Abi,
  achievoBadgeV11Abi,
  achievoUsernameRegistryV1Abi,
  achievoOrgRegistryAbi,
  proofAnchorRegistryAbi,
  achievoAnchorRegistryAbi,
};
