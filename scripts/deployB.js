const hre = require("hardhat");

async function main() {
  const [deployer, validator, relayer] = await hre.ethers.getSigners();

  const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  const wrappedToken = await WrappedToken.deploy(
    deployer.address, 
    deployer.address  
  );
  await wrappedToken.waitForDeployment();

  const BridgeB = await hre.ethers.getContractFactory("BridgeB");
  const bridgeB = await BridgeB.deploy(
    await wrappedToken.getAddress(),
    validator.address,
    relayer.address
  );
  await bridgeB.waitForDeployment();

  const tx = await wrappedToken.setBridge(await bridgeB.getAddress());
  await tx.wait();

  console.log("WrappedToken deployed to:", await wrappedToken.getAddress());
  console.log("BridgeB deployed to:", await bridgeB.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
