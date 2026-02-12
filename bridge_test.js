const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge end-to-end (TokenA)", function () {
  let tokenA, bridgeA;
  let wrapped, bridgeB;
  let user, validator, relayer;

  before(async function () {
    const signers = await ethers.getSigners();
    [user, validator, relayer] = signers;

    // -------------------------
    // Deploy TokenA (REAL TOKEN)
    // -------------------------
    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.connect(user).deploy(
      user.address,
      ethers.parseEther("1000")
    );
    await tokenA.waitForDeployment();

    // -------------------------
    // Deploy BridgeA
    // -------------------------
    const BridgeA = await ethers.getContractFactory("BridgeA");
    bridgeA = await BridgeA.deploy(
      tokenA.target,
      validator.address,
      relayer.address
    );
    await bridgeA.waitForDeployment();

    // -------------------------
    // Deploy WrappedToken
    // -------------------------
    const WrappedToken = await ethers.getContractFactory("WrappedToken");
    wrapped = await WrappedToken.deploy(
      ethers.ZeroAddress,
      user.address
    );
    await wrapped.waitForDeployment();

    // -------------------------
    // Deploy BridgeB
    // -------------------------
    const BridgeB = await ethers.getContractFactory("BridgeB");
    bridgeB = await BridgeB.deploy(
      wrapped.target,
      validator.address,
      relayer.address
    );
    await bridgeB.waitForDeployment();

    // Link wrapped token to bridgeB
    await wrapped.connect(user).setBridge(bridgeB.target);
  });

  it("locks → mints → burns → releases", async function () {
    const amount = ethers.parseEther("10");

    // Approve + lock on A
    await tokenA.connect(user).approve(bridgeA.target, amount);
    await bridgeA.connect(user).lock(amount);

    // Validator signs mint
    const nonceA = await bridgeA.globalNonce();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const mintMessage = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256"],
      [user.address, amount, nonceA, bridgeB.target, chainId]
    );

    const mintSig = await validator.signMessage(
      ethers.getBytes(mintMessage)
    );

    // Relayer mints on B
    await bridgeB
      .connect(relayer)
      .mint(user.address, amount, nonceA, mintSig);

    expect(await wrapped.balanceOf(user.address)).to.equal(amount);

    // Burn on B
    await bridgeB.connect(user).burn(amount);

    // Validator signs release
    const nonceB = await bridgeB.globalNonce();

    const releaseMessage = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256"],
      [user.address, amount, nonceB, bridgeA.target, chainId]
    );

    const releaseSig = await validator.signMessage(
      ethers.getBytes(releaseMessage)
    );

    // Relayer releases on A
    await bridgeA
      .connect(relayer)
      .release(user.address, amount, nonceB, releaseSig);

    // Final balance check
    expect(await tokenA.balanceOf(user.address)).to.equal(
      ethers.parseEther("1000")
    );
  });
});
