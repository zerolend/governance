import { HardhatRuntimeEnvironment } from "hardhat/types";

const ZERO_TOKEN_ADDRESS = "";
const OMNICHAIN_STAKING_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (ZERO_TOKEN_ADDRESS.length && OMNICHAIN_STAKING_ADDRESS.length) {
    await deploy("PoolVoter", {
      from: deployer,
      contract: "PoolVoter",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [OMNICHAIN_STAKING_ADDRESS, ZERO_TOKEN_ADDRESS],
        },
      },
      autoMine: true,
      log: true,
    });
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["PoolVoter"];
export default main;
