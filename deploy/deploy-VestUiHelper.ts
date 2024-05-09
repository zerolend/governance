import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ethers } from "hardhat";
dotenv.config();

const VESTED_NFT_ADDRESS = "0x394FA2886a3a18b08FDf2C5be2B7977f99d28Feb";
const OMNICHAIN_STAKING = "0x69865827D1e6aEA50aBD545db2B7Bd34c3b95af7";

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (VESTED_NFT_ADDRESS.length && OMNICHAIN_STAKING.length) {
    const vestui = await deploy("VestedZeroUiHelper", {
      from: deployer,
      contract: "VestedZeroUiHelper",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [VESTED_NFT_ADDRESS, OMNICHAIN_STAKING],
        },
      },
      autoMine: true,
      log: true,
    });
    
    await hre.run("verify:verify", {
      address: vestui.address,
    });
  } else {
    throw new Error("Invalid address for vest");
  }

};

deployAirdropRewarder.tags = ["VestUiHelper"];
export default deployAirdropRewarder;
