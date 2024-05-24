import { HardhatRuntimeEnvironment } from "hardhat/types";

const LP_TOKEN_ADDRESS = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const OMNICHAIN_STAKING_ADDRESS = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const STAKING_ADDRESS = "0xD676c56A93Fe2a05233Ce6EAFEfDe2bd4017B3eA";

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
