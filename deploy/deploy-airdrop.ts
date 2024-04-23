import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ethers, getNamedAccounts } from "hardhat";
import { ZERO_ADDRESS, supply } from "../test/fixtures/utils";
import { parseEther } from "ethers";
import { deployProxy } from "../test/airdrop-utils/deploy";
import { AirdropRewarder } from "../typechain-types";
import data from "../test/airdrop-utils/mock-data/airdropData.json";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";
import { airdrop } from "../typechain-types/contracts";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";
const TOKEN_ADDRESS = "";
const LOCKER_ADDRESS = "";

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  if (TOKEN_ADDRESS.length && LOCKER_ADDRESS.length) {
    // Deploy contracts
    const airdropContractFactory = await hre.ethers.getContractFactory(
      "AirdropRewarder"
    );
    const airdropContract = await airdropContractFactory.deploy();
    console.log("\nDeployed At", airdropContract.target);

    // Initialize Airdrop
    await airdropContract.initialize(TOKEN_ADDRESS, LOCKER_ADDRESS);
    console.log("\nAirdrop Initialized");
    

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
    console.log("\nInvalid locker or token address");
  }
};

deployAirdropRewarder.tags = ["DeployAirdrop"];
export default deployAirdropRewarder;
