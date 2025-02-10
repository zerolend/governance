import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ethers } from "hardhat";
dotenv.config();

// load wallet private key from env file
const TOKEN_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";
const VESTED_NFT_ADDRESS = "0x1a73b0cA6592FE4D484D7B138E5fdCFf93CD7cA8";
const UNLOCK_DATE = Math.floor(Date.now() / 1000) + 60 * 30; // 30 mins
const END_DATE = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    TOKEN_ADDRESS.length &&
    VESTED_NFT_ADDRESS.length &&
    UNLOCK_DATE &&
    END_DATE
  ) {
    const airdropDeployment = await deploy("AirdropRewarderS2", {
      from: deployer,
      contract: "AirdropRewarderS2",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [TOKEN_ADDRESS, VESTED_NFT_ADDRESS, UNLOCK_DATE, END_DATE],
        },
      },
      autoMine: true,
      log: true,
    });

    const airdropContract = await ethers.getContractAt(
      "AirdropRewarderS2",
      airdropDeployment.address
    );

    const merkleRoot = "0xf4315ef985567785e1208205030935f71b2bb9d17f6d4a689b9e0722ad37a543";
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

deployAirdropRewarder.tags = ["AirdropS2"];
export default deployAirdropRewarder;
