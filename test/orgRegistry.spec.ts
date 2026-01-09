import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;
before(async () => {
  ({ ethers } = await network.connect());
});

describe("AchievoOrgRegistry", function () {
  it("validates handles and enforces uniqueness", async () => {
    const [admin, treasury, creator] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AchievoOrgRegistry");
    const registry = await Registry.deploy(0, treasury.address, admin.address);
    await registry.waitForDeployment();

    await expect(registry.connect(creator).createOrg("ab", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "InvalidHandle",
    );
    await expect(registry.connect(creator).createOrg("bad--name", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "InvalidHandle",
    );
    await expect(registry.connect(creator).createOrg("-badname", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "InvalidHandle",
    );
    await expect(registry.connect(creator).createOrg("badname-", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "InvalidHandle",
    );

    await (await registry.connect(creator).createOrg("good-name", { value: 0 })).wait();
    await expect(registry.connect(creator).createOrg("good-name", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "HandleTaken",
    );
  });

  it("charges fee, forwards to treasury, and refunds excess", async () => {
    const [admin, treasury, creator] = await ethers.getSigners();
    const fee = ethers.parseEther("0.01");
    const Registry = await ethers.getContractFactory("AchievoOrgRegistry");
    const registry = await Registry.deploy(fee, treasury.address, admin.address);
    await registry.waitForDeployment();

    await expect(registry.connect(creator).createOrg("fee-test", { value: fee - 1n })).to.be.revertedWithCustomError(
      registry,
      "InsufficientFee",
    );

    const beforeTreasury = await ethers.provider.getBalance(treasury.address);
    const tx = await registry.connect(creator).createOrg("fee-test", { value: fee + 123n });
    await tx.wait();
    const afterTreasury = await ethers.provider.getBalance(treasury.address);
    expect(afterTreasury - beforeTreasury).to.equal(fee);

    const registryBalance = await ethers.provider.getBalance(await registry.getAddress());
    expect(registryBalance).to.equal(0n);
  });

  it("restricts admin functions", async () => {
    const [admin, treasury, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AchievoOrgRegistry");
    const registry = await Registry.deploy(0, treasury.address, admin.address);
    await registry.waitForDeployment();

    await expect(registry.connect(other).setCreateOrgFee(1)).to.be.revertedWithCustomError(
      registry,
      "AccessControlUnauthorizedAccount",
    );
    await expect(registry.connect(other).setTreasury(other.address)).to.be.revertedWithCustomError(
      registry,
      "AccessControlUnauthorizedAccount",
    );
    await expect(registry.connect(other).pause()).to.be.revertedWithCustomError(
      registry,
      "AccessControlUnauthorizedAccount",
    );

    await (await registry.connect(admin).setCreateOrgFee(2)).wait();
    await (await registry.connect(admin).pause()).wait();
    await expect(registry.connect(other).createOrg("paused", { value: 0 })).to.be.revertedWithCustomError(
      registry,
      "EnforcedPause",
    );
    await (await registry.connect(admin).unpause()).wait();
  });
});
