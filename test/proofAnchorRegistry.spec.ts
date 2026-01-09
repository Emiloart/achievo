import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ProofAnchorRegistry", () => {
  it("anchors a hash via operator", async () => {
    const [owner, operator] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("ProofAnchorRegistry");
    const registry = await Registry.connect(owner).deploy(operator.address);
    await registry.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("proof-1"));
    const tx = await registry.connect(operator).anchor(hash);
    await expect(tx).to.emit(registry, "ProofAnchored");

    const info = await registry.getAnchor(hash);
    expect(info.submitter).to.equal(operator.address);
    expect(info.timestamp).to.not.equal(0);
  });

  it("rejects non-operators", async () => {
    const [owner, operator, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("ProofAnchorRegistry");
    const registry = await Registry.connect(owner).deploy(operator.address);
    await registry.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("proof-2"));
    await expect(registry.connect(other).anchor(hash)).to.be.revertedWithCustomError(registry, "NotOperator");
  });

  it("prevents duplicate anchors", async () => {
    const [owner, operator] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("ProofAnchorRegistry");
    const registry = await Registry.connect(owner).deploy(operator.address);
    await registry.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("proof-3"));
    await registry.connect(operator).anchor(hash);
    await expect(registry.connect(operator).anchor(hash)).to.be.revertedWithCustomError(registry, "AlreadyAnchored");
  });
});
