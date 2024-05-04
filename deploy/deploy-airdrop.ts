import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ethers } from "hardhat";
import data from "../test/airdrop-utils/mock-data/airdropData.json";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";
dotenv.config();

// load wallet private key from env file
const TOKEN_ADDRESS = "";
const LOCKER_ADDRESS = "";
const VESTED_NFT_ADDRESS = "";
const UNLOCK_DATE = 0;
const END_DATE = 0;

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    TOKEN_ADDRESS.length &&
    LOCKER_ADDRESS.length &&
    VESTED_NFT_ADDRESS.length &&
    UNLOCK_DATE &&
    END_DATE
  ) {
    const airdropDeployment = await deploy("AirdropRewarder", {
      from: deployer,
      contract: "AirdropRewarder",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [TOKEN_ADDRESS, LOCKER_ADDRESS, VESTED_NFT_ADDRESS],
        },
      },
      autoMine: true,
      log: true,
    });

    const airdropContract = await ethers.getContractAt(
      "AirdropRewarder",
      airdropDeployment.address
    );

    // Set Merkle Root
    let leaves: BalanceLeaf[] = [];
    for (let index = 0; index < Object.keys(data).length; index++) {
      const account = Object.keys(data)[index];
      const amount = BigInt(Object.values(data)[index]);
      leaves.push({ account, amount });
    }

    const tree = new BalanceTree(leaves);
    const merkleRoot = tree.getHexRoot();
    await airdropContract.setMerkleRoot(merkleRoot);
    console.log("\nMerkle Root Set:", merkleRoot);

    // Whitelist airdrop contract for zero token
    const zero = await ethers.getContractAt("ZeroLend", TOKEN_ADDRESS);
    await zero.whitelist(airdropContract.target, true);
    console.log("\nWhitelisted Airdrop contract");
  } else {
    throw new Error("Invalid address for locker/token/vest");
  }
};

deployAirdropRewarder.tags = ["Airdrop"];
export default deployAirdropRewarder;
