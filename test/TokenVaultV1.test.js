const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TokenVaultV1", function () {
  let token, vault, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("MockToken", "MTK");
    await token.waitForDeployment();

    // Mint tokens to user
    await token.mint(user.address, 1000);

    // Deploy TokenVaultV1 as UUPS proxy
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    vault = await upgrades.deployProxy(
      TokenVaultV1,
      [await token.getAddress(), owner.address, 500], // 5% fee
      { initializer: "initialize", kind: "uups" }
    );
    await vault.waitForDeployment();
  });

  it("should initialize with correct parameters", async function () {
    expect(await vault.getDepositFee()).to.equal(500);
    expect(await vault.getImplementationVersion()).to.equal("V1");
  });

  it("should allow deposits and update balances", async function () {
    await token.connect(user).approve(await vault.getAddress(), 1000);
    await vault.connect(user).deposit(1000);

    // 5% fee → credited = 950
    expect(await vault.balanceOf(user.address)).to.equal(950);
  });

  it("should deduct deposit fee correctly", async function () {
    await token.connect(user).approve(await vault.getAddress(), 1000);
    await vault.connect(user).deposit(1000);

    expect(await vault.totalDeposits()).to.equal(950);
  });

  it("should allow withdrawals and update balances", async function () {
    await token.connect(user).approve(await vault.getAddress(), 1000);
    await vault.connect(user).deposit(1000);

    await vault.connect(user).withdraw(500);
    expect(await vault.balanceOf(user.address)).to.equal(450);
  });

  it("should prevent withdrawal of more than balance", async function () {
    await token.connect(user).approve(await vault.getAddress(), 1000);
    await vault.connect(user).deposit(1000);

    await expect(vault.connect(user).withdraw(2000)).to.be.revertedWith(
      "Insufficient balance"
    );
  });

  it("should prevent reinitialization", async function () {
    await expect(
      vault.initialize(await token.getAddress(), owner.address, 100)
    ).to.be.reverted;
  });
});
