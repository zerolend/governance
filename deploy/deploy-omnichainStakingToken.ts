import { ZeroAddress } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const ZERO_TOKEN_ADDRESS = "";
const LOCKER_TOKEN_ADDRESS = "";
const LOCKER_LP_ADDRESS = "";
const POOL_VOTER_ADDRESS = "";
const SECONDS_IN_SIX_MONTHS = 31536000/2;

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    ZERO_TOKEN_ADDRESS.length &&
    LOCKER_TOKEN_ADDRESS.length &&
    LOCKER_LP_ADDRESS.length
  ) {
    await deploy("OmnichainStakingToken", {
      from: deployer,
      contract: "OmnichainStakingToken",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            ZeroAddress,
            LOCKER_TOKEN_ADDRESS,
            LOCKER_LP_ADDRESS,
            ZERO_TOKEN_ADDRESS,
            POOL_VOTER_ADDRESS,
            SECONDS_IN_SIX_MONTHS
          ],
        },
      },
      autoMine: true,
      log: true,
    });
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["OmnichainStakingToken"];
export default main;
