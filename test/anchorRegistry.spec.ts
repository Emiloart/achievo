import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;
before(async () => {
  ({ ethers } = await network.connect());
});

describe("AchievoAnchorRegistry", function () {
  it("anchors hashes with kind and blocks duplicates", async () => {
    const [owner, operator, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AchievoAnchorRegistry");
    const registry = await Registry.deploy(operator.address);
    await registry.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("anchor-1"));
    await expect(registry.connect(other).anchor(hash, 1)).to.be.revertedWithCustomError(registry, "NotOperator");

    await (await registry.connect(operator).anchor(hash, 1)).wait();
    const record = await registry.records(hash);
    expect(record.submitter).to.equal(operator.address);
    expect(record.kind).to.equal(1);
    expect(record.timestamp).to.be.greaterThan(0n);

    await expect(registry.connect(operator).anchor(hash, 1)).to.be.revertedWithCustomError(
      registry,
      "AlreadyAnchored",
    );
  });
});
