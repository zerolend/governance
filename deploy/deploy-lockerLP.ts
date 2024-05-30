import { HardhatRuntimeEnvironment } from "hardhat/types";

const LP_TOKEN_ADDRESS = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const OMNICHAIN_STAKING_ADDRESS = "0xf36F8089D7dDc4522a1c10C8dA41555aCDcCCb4D";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    LP_TOKEN_ADDRESS.length &&
    OMNICHAIN_STAKING_ADDRESS.length  ) {
    const deployment = await deploy("LockerLP", {
      from: deployer,
      contract: "LockerLP",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [LP_TOKEN_ADDRESS, OMNICHAIN_STAKING_ADDRESS],
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
