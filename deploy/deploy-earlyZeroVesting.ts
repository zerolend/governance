import { HardhatRuntimeEnvironment } from "hardhat/types";

const EARLY_ZERO_TOKEN_ADDRESS = "";
const LOCKER_TOKEN_ADDRESS = "";
const STAKING_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    EARLY_ZERO_TOKEN_ADDRESS.length &&
    LOCKER_TOKEN_ADDRESS.length &&
    STAKING_ADDRESS.length
  ) {
    await deploy("EarlyZEROVesting", {
      from: deployer,
      contract: "EarlyZEROVesting",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            EARLY_ZERO_TOKEN_ADDRESS,
            LOCKER_TOKEN_ADDRESS,
            STAKING_ADDRESS
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

main.tags = ["EarlyZEROVesting"];
export default main;
