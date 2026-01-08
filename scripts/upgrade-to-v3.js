const { ethers, upgrades } = require("hardhat");

async function main() {
  // 🔐 Same proxy address
  const proxyAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log("Upgrading TokenVault from V2 to V3...");

  const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, TokenVaultV3);

  await upgraded.waitForDeployment();

  console.log("✅ TokenVault upgraded to V3 at:", await upgraded.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });
