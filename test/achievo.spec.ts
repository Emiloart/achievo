import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;
before(async () => {
  ({ ethers } = await network.connect());
});

describe("Achievo end-to-end", function () {
  it("mints a badge after self verification", async function () {
    const [deployer] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", deployer.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    const goalCID = "ipfs://goal-cid";
    await (await core.createGoal(goalCID)).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;

    // must submit evidence before verification
    await (await core.submitProof(goalId, "ipfs://evidence-cid")).wait();
    await (await core.selfVerify(goalId)).wait();

    const tokenURI = "ipfs://token-uri";
    await (await core.mintBadge(goalId, tokenURI)).wait();

    expect(await badge.ownerOf(goalId)).to.equal(deployer.address);
  });

  it("reaches peer verification threshold (5) and mints", async function () {
    const [creator, a1, a2, a3, a4] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", creator.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    // Create goal
    await (await core.connect(creator).createGoal("ipfs://goal")).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;
    // Submit evidence first
    await (await core.connect(creator).submitProof(goalId, "ipfs://evidence")).wait();
    // Creator must approve first in peer path
    await (await core.connect(creator).approve(goalId)).wait();
    // Collect approvals from four peers (default threshold is 5 total)
    await (await core.connect(a1).approve(goalId)).wait();
    await (await core.connect(a2).approve(goalId)).wait();
    await (await core.connect(a3).approve(goalId)).wait();
    await (await core.connect(a4).approve(goalId)).wait();

    expect(await core.isVerified(goalId)).to.equal(true);

    await (await core.connect(creator).mintBadge(goalId, "ipfs://badge")).wait();

    expect(await badge.ownerOf(goalId)).to.equal(creator.address);
  });

  it("rejects minting before verification", async function () {
    const [creator] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", creator.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    await (await core.connect(creator).createGoal("ipfs://goal")).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;

    await expect(core.connect(creator).mintBadge(goalId, "ipfs://badge")).to.be.revertedWith("Not verified yet");
  });

  it("enforces creator-only proof submission and one approval per address", async function () {
    const [creator, other] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", creator.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    await (await core.connect(creator).createGoal("ipfs://goal")).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;

    await expect(core.connect(other).submitProof(goalId, "ipfs://evidence")).to.be.revertedWith("Not creator");
    // without evidence and creator self-approval, approval should revert
    await expect(core.connect(other).approve(goalId)).to.be.revertedWith("evidence required");
    await (await core.connect(creator).submitProof(goalId, "ipfs://evidence")).wait();
    await expect(core.connect(other).approve(goalId)).to.be.revertedWith("Creator must approve first");
    await (await core.connect(creator).approve(goalId)).wait();
    await (await core.connect(other).approve(goalId)).wait();
    await expect(core.connect(other).approve(goalId)).to.be.revertedWith("Already approved");
  });

  it("restricts AUTO verify to authorized verifiers", async function () {
    const [owner, notOwner, verifier2] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", owner.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    await (await core.connect(owner).createGoal("ipfs://goal")).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;

    const zeroHash = ethers.ZeroHash;
    // must submit evidence before AUTO verification
    await expect(core.connect(notOwner).verifyAuto(goalId, zeroHash)).to.be.revertedWith("evidence required");
    await (await core.connect(owner).submitProof(goalId, "ipfs://evidence")).wait();
    await expect(core.connect(notOwner).verifyAuto(goalId, zeroHash)).to.be.revertedWith("Not verifier");
    await (await core.connect(owner).setAutoVerifier(verifier2.address, true)).wait();
    await expect(core.connect(owner).verifyAuto(goalId, zeroHash)).to.be.revertedWith("dataHash empty");
    const autoHash = ethers.id("achievo-auto-test");
    await (await core.connect(owner).verifyAuto(goalId, autoHash)).wait();
    const goal = await core.getGoal(goalId);
    expect(goal.autoVerifier).to.equal(owner.address);
    expect(goal.autoDataHash).to.equal(autoHash);
    expect(goal.autoVerifiedAt).to.be.greaterThan(0n);

    // second authorized verifier should also work
    const autoHash2 = ethers.id("achievo-auto-test-2");
    await (await core.connect(owner).createGoal("ipfs://goal2")).wait();
    const goalId2 = (await core.nextGoalId()) - 1n;
    await (await core.connect(owner).submitProof(goalId2, "ipfs://evidence2")).wait();
    await (await core.connect(verifier2).verifyAuto(goalId2, autoHash2)).wait();
    const goal2 = await core.getGoal(goalId2);
    expect(goal2.autoVerifier).to.equal(verifier2.address);
  });

  it("prevents double minting of the same badge", async function () {
    const [creator] = await ethers.getSigners();

    const Badge = await ethers.getContractFactory("BadgeSBT");
    const badge = await Badge.deploy("Achievo Badge", "ACHV", creator.address);
    await badge.waitForDeployment();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await badge.setCore(await core.getAddress())).wait();
    await (await core.setBadge(await badge.getAddress())).wait();

    await (await core.createGoal("ipfs://goal-cid")).wait();
    const nextId = await core.nextGoalId();
    const goalId = nextId - 1n;

    await (await core.submitProof(goalId, "ipfs://evidence")).wait();
    await (await core.selfVerify(goalId)).wait();
    await (await core.mintBadge(goalId, "ipfs://token-uri")).wait();

    await expect(core.mintBadge(goalId, "ipfs://token-uri-2")).to.be.revertedWith("Badge already minted");
  });

  it("validates peer threshold bounds and owner-only access", async function () {
    const [owner, other] = await ethers.getSigners();

    const Core = await (await ethers.getContractFactory("AchievoCore")).deploy();
    await Core.waitForDeployment();

    await expect(Core.connect(owner).setPeerThreshold(4)).to.be.revertedWith("threshold out of range");
    await expect(Core.connect(owner).setPeerThreshold(51)).to.be.revertedWith("threshold out of range");
    await (await Core.connect(owner).setPeerThreshold(6)).wait();

    await expect(Core.connect(other).setPeerThreshold(6)).to.be.revertedWith("Not owner");
  });

  it("restricts peer approvals to allowed peers", async function () {
    const [creator, allowed, blocked] = await ethers.getSigners();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await core.connect(creator).createGoal("ipfs://goal")).wait();
    const goalId = (await core.nextGoalId()) - 1n;
    await (await core.connect(creator).submitProof(goalId, "ipfs://evidence")).wait();
    await (await core.connect(creator).setPeerAllowList(goalId, [allowed.address], true)).wait();

    await expect(core.connect(blocked).approve(goalId)).to.be.revertedWith("Not allowed");
    await (await core.connect(creator).approve(goalId)).wait();
    await (await core.connect(allowed).approve(goalId)).wait();

    const goal = await core.getGoal(goalId);
    expect(goal.peersRestricted).to.equal(true);
  });

  it("creates goal with peers in a single call", async function () {
    const [creator, peer] = await ethers.getSigners();

    const Core = await ethers.getContractFactory("AchievoCore");
    const core = await Core.deploy();
    await core.waitForDeployment();

    await (await core.connect(creator).createGoalWithPeers("ipfs://goal", [peer.address], true)).wait();
    const goalId = (await core.nextGoalId()) - 1n;
    await (await core.connect(creator).submitProof(goalId, "ipfs://evidence")).wait();
    await (await core.connect(creator).approve(goalId)).wait();
    await (await core.connect(peer).approve(goalId)).wait();
  });
});
