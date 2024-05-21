import { HardhatRuntimeEnvironment } from "hardhat/types";

const LP_TOKEN_ADDRESS = "";
const OMNICHAIN_STAKING_ADDRESS = "";
const STAKING_ADDRESS = "";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    LP_TOKEN_ADDRESS.length &&
    OMNICHAIN_STAKING_ADDRESS.length &&
    STAKING_ADDRESS.length
  ) {
    const deployment = await deploy("LockerLP", {
      from: deployer,
      contract: "LockerToken",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [LP_TOKEN_ADDRESS, OMNICHAIN_STAKING_ADDRESS, STAKING_ADDRESS],
        },
      },
      autoMine: true,
      log: true,
    });

    await hre.run("verify:verify", {address: deployment.address});    
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["LockerLP"];
export default main;
