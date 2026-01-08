const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V1 → V2", function () {
  let token, vaultV1, vaultV2, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("MockToken", "MTK");
    await token.waitForDeployment();

    // Mint tokens to user
    await token.mint(user.address, 1000);

    // Deploy V1
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    vaultV1 = await upgrades.deployProxy(
      TokenVaultV1,
      [await token.getAddress(), owner.address, 500], // 5% fee
      { initializer: "initialize", kind: "uups" }
    );
    await vaultV1.waitForDeployment();

    // User deposits into V1
    await token.connect(user).approve(await vaultV1.getAddress(), 1000);
    await vaultV1.connect(user).deposit(1000);
  });

  it("should preserve balances after upgrade", async function () {
    const balanceBefore = await vaultV1.balanceOf(user.address);
    const totalBefore = await vaultV1.totalDeposits();

    // Upgrade to V2
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(
      await vaultV1.getAddress(),
      TokenVaultV2
    );

    const balanceAfter = await vaultV2.balanceOf(user.address);
    const totalAfter = await vaultV2.totalDeposits();

    expect(balanceAfter).to.equal(balanceBefore);
    expect(totalAfter).to.equal(totalBefore);
  });

  it("should expose new V2 functionality after upgrade", async function () {
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(
      await vaultV1.getAddress(),
      TokenVaultV2
    );

    // Set yield rate (admin only)
    await vaultV2.connect(owner).setYieldRate(1000); // 10%
    expect(await vaultV2.getYieldRate()).to.equal(1000);
  });

  it("should not allow non-admin to set yield rate", async function () {
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(
      await vaultV1.getAddress(),
      TokenVaultV2
    );

    await expect(
      vaultV2.connect(user).setYieldRate(1000)
    ).to.be.reverted;
  });

  it("should pause and unpause deposits in V2", async function () {
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(
      await vaultV1.getAddress(),
      TokenVaultV2
    );

    // Grant pauser role to owner
    const PAUSER_ROLE = await vaultV2.PAUSER_ROLE();
    await vaultV2.connect(owner).grantRole(PAUSER_ROLE, owner.address);

    // Pause deposits
    await vaultV2.connect(owner).pauseDeposits();
    expect(await vaultV2.isDepositsPaused()).to.equal(true);

    // Try deposit while paused
    await token.mint(user.address, 100);
    await token.connect(user).approve(await vaultV2.getAddress(), 100);

    await expect(
      vaultV2.connect(user).deposit(100)
    ).to.be.revertedWith("Deposits are paused");

    // Unpause deposits
    await vaultV2.connect(owner).unpauseDeposits();
    await vaultV2.connect(user).deposit(100);

    const balance = await vaultV2.balanceOf(user.address);
    expect(balance).to.be.gt(0);
  });

  it("should allow yield claiming in V2", async function () {
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(
      await vaultV1.getAddress(),
      TokenVaultV2
    );

    // Set yield rate
    await vaultV2.connect(owner).setYieldRate(1000); // 10%

    // First call initializes yield tracking
    await vaultV2.connect(user).claimYield();

    // Move time forward by 1 year
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    // Second call actually claims yield
    await vaultV2.connect(user).claimYield();

    const balance = await vaultV2.balanceOf(user.address);
    expect(balance).to.be.gt(950); // original credited balance was 950
  });
});
