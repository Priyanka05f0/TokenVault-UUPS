const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V2 → V3", function () {
  let token, vaultV2, vaultV3, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("MockToken", "MTK");
    await token.waitForDeployment();

    // Mint tokens to user
    await token.mint(user.address, 1000);

    // Deploy V2 directly
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.deployProxy(
      TokenVaultV2,
      [await token.getAddress(), owner.address, 500],
      { initializer: "initialize", kind: "uups" }
    );
    await vaultV2.waitForDeployment();

    // User deposits
    await token.connect(user).approve(await vaultV2.getAddress(), 1000);
    await vaultV2.connect(user).deposit(1000);
  });

  it("should preserve balances after upgrade to V3", async function () {
    const balanceBefore = await vaultV2.balanceOf(user.address);
    const totalBefore = await vaultV2.totalDeposits();

    // Upgrade to V3
    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(
      await vaultV2.getAddress(),
      TokenVaultV3
    );

    const balanceAfter = await vaultV3.balanceOf(user.address);
    const totalAfter = await vaultV3.totalDeposits();

    expect(balanceAfter).to.equal(balanceBefore);
    expect(totalAfter).to.equal(totalBefore);
  });

  it("should enforce withdrawal delay in V3", async function () {
    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(
      await vaultV2.getAddress(),
      TokenVaultV3
    );

    // Set withdrawal delay to 1 day
    await vaultV3.connect(owner).setWithdrawalDelay(24 * 60 * 60);

    // User requests withdrawal
    await vaultV3.connect(user).requestWithdrawal(200);

    // Try withdrawing too early
    await expect(
      vaultV3.connect(user).executeWithdrawal()
    ).to.be.revertedWith("Withdrawal delay not passed");

    // Fast forward time by 1 day
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    // Now withdrawal should succeed
    await vaultV3.connect(user).executeWithdrawal();

    const balance = await vaultV3.balanceOf(user.address);
    expect(balance).to.be.lt(950); // user initially had 950 after fee
  });

  it("should allow admin emergency withdrawal", async function () {
    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(
      await vaultV2.getAddress(),
      TokenVaultV3
    );

    const balanceBefore = await vaultV3.balanceOf(user.address);
    expect(balanceBefore).to.be.gt(0);

    // Admin forces emergency withdrawal
    await vaultV3.connect(owner).emergencyWithdraw(user.address);

    const balanceAfter = await vaultV3.balanceOf(user.address);
    expect(balanceAfter).to.equal(0);
  });

  it("should not allow non-admin to call emergencyWithdraw", async function () {
    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(
      await vaultV2.getAddress(),
      TokenVaultV3
    );

    await expect(
      vaultV3.connect(user).emergencyWithdraw(user.address)
    ).to.be.reverted;
  });
});
