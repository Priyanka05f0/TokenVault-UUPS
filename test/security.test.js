const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Security Tests", function () {
  let owner, attacker;
  let token, vaultV1, vaultV2, vaultV3;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock Token", "MOCK");
    await token.waitForDeployment();

    // Deploy V1
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    vaultV1 = await upgrades.deployProxy(
      TokenVaultV1,
      [await token.getAddress(), owner.address, 500], // 5% fee
      { kind: "uups" }
    );
    await vaultV1.waitForDeployment();

    // Mint tokens for testing
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.connect(owner).approve(await vaultV1.getAddress(), ethers.parseEther("1000"));
  });

  it("should prevent direct initialization of implementation contracts", async function () {
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    const impl = await TokenVaultV1.deploy();
    await impl.waitForDeployment();

    await expect(
      impl.initialize(await token.getAddress(), owner.address, 500)
    ).to.be.reverted;
  });

  it("should prevent unauthorized upgrades", async function () {
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");

    await expect(
      upgrades.upgradeProxy(await vaultV1.getAddress(), TokenVaultV2.connect(attacker))
    ).to.be.reverted;
  });

  it("should use storage gaps for future upgrades (no layout collision)", async function () {
    // Deposit in V1
    await vaultV1.deposit(ethers.parseEther("100"));

    // Upgrade to V2
    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(await vaultV1.getAddress(), TokenVaultV2);

    // Balance should remain unchanged
    const balanceV2 = await vaultV2.balanceOf(owner.address);
    expect(balanceV2).to.equal(ethers.parseEther("95")); // after 5% fee

    // Upgrade to V3
    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(await vaultV2.getAddress(), TokenVaultV3);

    const balanceV3 = await vaultV3.balanceOf(owner.address);
    expect(balanceV3).to.equal(balanceV2);
  });

  it("should not allow storage layout collisions across versions", async function () {
    await vaultV1.deposit(ethers.parseEther("200"));

    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(await vaultV1.getAddress(), TokenVaultV2);

    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(await vaultV2.getAddress(), TokenVaultV3);

    const bal = await vaultV3.balanceOf(owner.address);
    expect(bal).to.equal(ethers.parseEther("190")); // 5% fee deducted
  });

  it("should prevent function selector clashing", async function () {
    const version = await vaultV1.getImplementationVersion();
    expect(version).to.equal("V1");

    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(await vaultV1.getAddress(), TokenVaultV2);

    const version2 = await vaultV2.getImplementationVersion();
    expect(version2).to.equal("V2");

    const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(await vaultV2.getAddress(), TokenVaultV3);

    const version3 = await vaultV3.getImplementationVersion();
    expect(version3).to.equal("V3");
  });
});
