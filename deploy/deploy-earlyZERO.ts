import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main(hre: HardhatRuntimeEnvironment) {

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("EarlyZERO", {
    from: deployer,
    contract: "EarlyZERO",
    autoMine: true,
    log: true,
  });
}

main.tags = ["EarlyZERO"];
export default main;
