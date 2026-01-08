const { ethers, upgrades } = require("hardhat");

async function main() {
  // 🔐 YOUR PROXY ADDRESS (from deploy-v1 output)
  const proxyAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log("Upgrading TokenVault from V1 to V2...");

  // Get the new implementation contract (V2)
  const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");

  // Perform the upgrade
  const upgraded = await upgrades.upgradeProxy(proxyAddress, TokenVaultV2);

  // Wait until deployment is complete
  await upgraded.waitForDeployment();

  console.log("✅ TokenVault upgraded to V2 at:", await upgraded.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });
