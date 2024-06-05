import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
dotenv.config();

const VESTED_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const OMNICHAIN_STAKING_TOKEN = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const OMNICHAIN_STAKING_LP = "0xf36F8089D7dDc4522a1c10C8dA41555aCDcCCb4D";

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    VESTED_NFT_ADDRESS.length &&
    OMNICHAIN_STAKING_TOKEN.length &&
    OMNICHAIN_STAKING_LP.length
  ) {
    const vestUIDeployment = await deploy("VestedZeroUiHelper", {
      from: deployer,
      contract: "VestedZeroUiHelper",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [
            VESTED_NFT_ADDRESS,
            OMNICHAIN_STAKING_TOKEN,
            OMNICHAIN_STAKING_LP,
          ],
        },
      },
      autoMine: true,
      log: true,
    });

    await hre.run("verify:verify", {
      address: vestUIDeployment.address,
    });
  } else {
    throw new Error("Invalid address for vest");
  }
};

deployAirdropRewarder.tags = ["VestUiHelper"];
export default deployAirdropRewarder;
