import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;
before(async () => {
  ({ ethers } = await network.connect());
});

describe("AchievoBadgeV12 + AchievoCoreV11", function () {
  it("mints via core with MINTER_ROLE", async function () {
    const [deployer] = await ethers.getSigners();

    const Core = await ethers.getContractFactory("AchievoCoreV11");
    const core = await Core.deploy();
    await core.waitForDeployment();

    const Badge = await ethers.getContractFactory("AchievoBadgeV12");
    const badge = await Badge.deploy(deployer.address, await core.getAddress(), "Achievo Badge V1.2", "ACHB");
    await badge.waitForDeployment();

    await (await core.setBadge(await badge.getAddress())).wait();

    await (await core.createGoal("ipfs://goal")).wait();
    const goalId = (await core.nextGoalId()) - 1n;
    await (await core.submitProof(goalId, "ipfs://evidence")).wait();
    await (await core.selfVerify(goalId)).wait();
    await (await core.mintBadge(goalId, "ipfs://badge")).wait();

    expect(await badge.ownerOf(goalId)).to.equal(deployer.address);
  });

  it("restricts mint to MINTER_ROLE", async function () {
    const [admin, other] = await ethers.getSigners();
    const Badge = await ethers.getContractFactory("AchievoBadgeV12");
    const badge = await Badge.deploy(admin.address, admin.address, "Achievo Badge V1.2", "ACHB");
    await badge.waitForDeployment();

    await expect(badge.connect(other).mint(other.address, 1, "ipfs://badge")).to.be.revertedWithCustomError(
      badge,
      "AccessControlUnauthorizedAccount",
    );
  });
});
