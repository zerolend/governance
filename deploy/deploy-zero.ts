import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ZeroLend", {
    from: deployer,
    contract: "ZeroLend",
    autoMine: true,
    log: true,
  });
}

main.tags = ["ZeroLend"];
export default main;
