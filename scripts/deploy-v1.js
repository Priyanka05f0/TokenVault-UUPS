const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // Deploy mock token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Mock Token", "MOCK");
  await token.waitForDeployment();

  console.log("MockERC20 deployed to:", await token.getAddress());

  // Deploy TokenVault V1 as UUPS Proxy
  const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");

  const vault = await upgrades.deployProxy(
    TokenVaultV1,
    [
      await token.getAddress(), // token
      deployer.address,         // admin
      500                       // 5% deposit fee
    ],
    { kind: "uups" }
  );

  await vault.waitForDeployment();

  // ⭐ THIS IS THE PROXY ADDRESS ⭐
  console.log("TokenVault PROXY deployed to:", await vault.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
