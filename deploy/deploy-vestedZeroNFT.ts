import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const TOKEN_ADDRESS = "";
const STAKING_BONUS_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (TOKEN_ADDRESS.length && STAKING_BONUS_ADDRESS.length) {
    await deploy("VestedZeroNFT", {
      from: deployer,
      contract: "VestedZeroNFT",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [TOKEN_ADDRESS, STAKING_BONUS_ADDRESS],
        },
      },
      autoMine: true,
      log: true,
    });
  } else {
    throw new Error("Invalid address for locker/stakingBonus");
  }
}

main.tags = ["VestedZeroNFT"];
export default main;
