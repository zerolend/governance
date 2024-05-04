import { HardhatRuntimeEnvironment } from "hardhat/types";

const ZERO_TOKEN_ADDRESS = "";
const VESTED_ZERO_ADDRESS = "";
const LOCKER_TOKEN_ADDRESS = "";
const INITIAL_BPS = 2000;

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    ZERO_TOKEN_ADDRESS.length &&
    LOCKER_TOKEN_ADDRESS.length &&
    VESTED_ZERO_ADDRESS.length &&
    INITIAL_BPS
  ) {
    await deploy("StakingBonus", {
      from: deployer,
      contract: "StakingBonus",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            ZERO_TOKEN_ADDRESS,
            LOCKER_TOKEN_ADDRESS,
            VESTED_ZERO_ADDRESS,
            INITIAL_BPS,
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

main.tags = ["StakingBonus"];
export default main;
