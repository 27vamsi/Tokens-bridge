const hre = require("hardhat");

async function main() {
  const [deployer, validator, relayer] = await hre.ethers.getSigners();

  // Deploy TokenA
  const TokenA = await hre.ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy(
    deployer.address,
    hre.ethers.parseEther("1000000")
  );
  await tokenA.waitForDeployment();

  // Deploy BridgeA
  const BridgeA = await hre.ethers.getContractFactory("BridgeA");
  const bridgeA = await BridgeA.deploy(
    await tokenA.getAddress(),
    validator.address,
    relayer.address
  );
  await bridgeA.waitForDeployment();

  console.log("TokenA deployed to:", await tokenA.getAddress());
  console.log("BridgeA deployed to:", await bridgeA.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
