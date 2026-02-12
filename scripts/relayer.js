const { ethers } = require("ethers");
require("dotenv").config();

const BridgeAAbi = require("../abi/BridgeA.json");
const BridgeBAbi = require("../abi/BridgeB.json");

const providerA = new ethers.JsonRpcProvider(process.env.RPC_A);
const providerB = new ethers.JsonRpcProvider(process.env.RPC_B);

const validatorWallet = new ethers.Wallet(process.env.VALIDATOR_PK);
const relayerWalletA = new ethers.Wallet(process.env.RELAYER_PK, providerA);
const relayerWalletB = new ethers.Wallet(process.env.RELAYER_PK, providerB);

const bridgeA = new ethers.Contract(
  process.env.BRIDGE_A,
  BridgeAAbi.abi,
  providerA
);

const bridgeB = new ethers.Contract(
  process.env.BRIDGE_B,
  BridgeBAbi.abi,
  providerB
);

console.log("Relayer started...");

bridgeA.on("Locked", async (user, amount, nonce) => {
  try {
    console.log("Locked:", user, amount.toString(), nonce.toString());

    const chainIdB = (await providerB.getNetwork()).chainId;

    const message = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256"],
      [user, amount, nonce, process.env.BRIDGE_B, chainIdB]
    );

    const signature = await validatorWallet.signMessage(
      ethers.getBytes(message)
    );

    const tx = await bridgeB
      .connect(relayerWalletB)
      .mint(user, amount, nonce, signature);

    await tx.wait();
    console.log("Minted on Chain B");
  } catch (err) {
    console.error("A → B error:", err);
  }
});

bridgeB.on("Burned", async (user, amount, nonce) => {
  try {
    console.log("Burned:", user, amount.toString(), nonce.toString());

    const chainIdA = (await providerA.getNetwork()).chainId;

    const message = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256"],
      [user, amount, nonce, process.env.BRIDGE_A, chainIdA]
    );

    const signature = await validatorWallet.signMessage(
      ethers.getBytes(message)
    );

    const tx = await bridgeA
      .connect(relayerWalletA)
      .release(user, amount, nonce, signature);

    await tx.wait();
    console.log("Released on Chain A");
  } catch (err) {
    console.error("B → A error:", err);
  }
});
