import { ZeroAddress } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const ZERO_TOKEN_ADDRESS = "";
const LOCKER_TOKEN_ADDRESS = "";
const LOCKER_LP_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    ZERO_TOKEN_ADDRESS.length &&
    LOCKER_TOKEN_ADDRESS.length &&
    LOCKER_LP_ADDRESS.length
  ) {
    await deploy("OmnichainStaking", {
      from: deployer,
      contract: "OmnichainStaking",
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

main.tags = ["OmnichainStaking"];
export default main;
