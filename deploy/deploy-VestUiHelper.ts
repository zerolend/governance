import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
dotenv.config();

const VESTED_NFT_ADDRESS = "";
const OMNICHAIN_STAKING = "";

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
