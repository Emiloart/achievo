import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("AchievoIdentity", () => {
  it("registers a new identity", async () => {
    const [alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AchievoIdentity");
    const identity = await Factory.deploy();
    await identity.waitForDeployment();

    const tx = await identity.connect(alice).register();
    await expect(tx).to.emit(identity, "IdentityRegistered").withArgs(1n, alice.address);

    const id = await identity.getUserId(alice.address);
    expect(id).to.equal(1n);

    const info = await identity.walletInfo(alice.address);
    expect(info[0]).to.equal(1n);
    expect(info[1]).to.equal(1);
  });

  it("manages recovery and primary wallet changes", async () => {
    const [alice, recovery, newPrimary] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("AchievoIdentity")).deploy();
    await identity.waitForDeployment();

    await identity.connect(alice).register();
    await identity.connect(alice).setRecoveryKey(recovery.address);

    expect(await identity.recoveryWallet(1n)).to.equal(recovery.address);

    await identity.connect(recovery).updatePrimaryWallet(newPrimary.address);
    expect(await identity.primaryWallet(1n)).to.equal(newPrimary.address);
    expect(await identity.getUserId(newPrimary.address)).to.equal(1n);
    expect(await identity.getUserId(alice.address)).to.equal(0n);
  });

  it("adds and removes sub wallets", async () => {
    const [alice, recovery, sub1] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("AchievoIdentity")).deploy();
    await identity.waitForDeployment();

    await identity.connect(alice).register();
    await identity.connect(alice).setRecoveryKey(recovery.address);

    await identity.connect(recovery).addSubWallet(sub1.address);
    expect(await identity.getUserId(sub1.address)).to.equal(1n);

    let subs = await identity.subWallets(1n);
    expect(subs).to.deep.equal([sub1.address]);

    await identity.connect(recovery).removeSubWallet(sub1.address);
    subs = await identity.subWallets(1n);
    expect(subs).to.deep.equal([]);
    expect(await identity.getUserId(sub1.address)).to.equal(0n);
  });

  it("prevents duplicate registrations", async () => {
    const [alice] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("AchievoIdentity")).deploy();
    await identity.waitForDeployment();

    await identity.connect(alice).register();
    await expect(identity.connect(alice).register()).to.be.revertedWithCustomError(identity, "AlreadyLinked");
  });

  it("stores on-chain profile data", async () => {
    const [alice, recovery, sub, bob] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("AchievoIdentity")).deploy();
    await identity.waitForDeployment();

    await identity.connect(alice).register();
    await identity.connect(alice).setProfile("userA", "bioA", "aboutA", "ipfs://avatarA");
    let profile = await identity.getProfile(1n);
    expect(profile.username).to.equal("usera");
    expect(profile.bio).to.equal("bioA");
    expect(profile.avatar).to.equal("ipfs://avatarA");

    await identity.connect(alice).setRecoveryKey(recovery.address);
    await identity.connect(recovery).setProfile("userB", "bioB", "aboutB", "ipfs://avatarB");
    profile = await identity.getProfile(1n);
    expect(profile.username).to.equal("userb");

    await identity.connect(alice).addSubWallet(sub.address);
    await expect(
      identity.connect(sub).setProfile("userC", "bioC", "aboutC", "ipfs://avatarC"),
    ).to.be.revertedWithCustomError(identity, "NotAuthorized");

    await identity.connect(bob).register();
    await expect(identity.connect(bob).setProfile("userB", "bio", "about", "ipfs://avatar")).to.be.revertedWith(
      "username taken",
    );
  });

  it("releases and transfers username", async () => {
    const [alice, bob] = await ethers.getSigners();
    const identity = await (await ethers.getContractFactory("AchievoIdentity")).deploy();
    await identity.waitForDeployment();

    await identity.connect(alice).register();
    await identity.connect(bob).register();

    await identity.connect(alice).setProfile("userA", "bioA", "aboutA", "ipfs://avatarA");
    expect((await identity.getProfile(1n)).username).to.equal("usera");
    expect(await identity.userIdByUsername("userA")).to.equal(1n);

    // release
    await identity.connect(alice).releaseUsername();
    expect((await identity.getProfile(1n)).username).to.equal("");
    expect(await identity.userIdByUsername("userA")).to.equal(0n);

    // set again and transfer to bob
    await identity.connect(alice).setProfile("userA", "", "", "");
    await identity.connect(alice).transferUsername(2n);
    expect((await identity.getProfile(1n)).username).to.equal("");
    expect((await identity.getProfile(2n)).username).to.equal("usera");
    expect(await identity.userIdByUsername("userA")).to.equal(2n);
  });
});
