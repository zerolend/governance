import { HardhatRuntimeEnvironment } from "hardhat/types";

const ZERO_TOKEN_ADDRESS = "";
const OMNICHAIN_STAKING_ADDRESS = "";
const STAKING_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    ZERO_TOKEN_ADDRESS.length &&
    OMNICHAIN_STAKING_ADDRESS.length &&
    STAKING_ADDRESS.length
  ) {
    await deploy("LockerLP", {
      from: deployer,
      contract: "LockerToken",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            ZERO_TOKEN_ADDRESS,
            OMNICHAIN_STAKING_ADDRESS,
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

main.tags = ["LockerLP"];
export default main;
