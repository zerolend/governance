import { HardhatRuntimeEnvironment } from "hardhat/types";

const INCENTIVE_CONTROLLER = "0x28F6899fF643261Ca9766ddc251b359A2d00b945";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [INCENTIVE_CONTROLLER];

  const deployment = await deploy("TransferStrategySimple", {
    from: deployer,
    contract: "TransferStrategySimple",
    args,
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", {
    address: deployment.address,
    constructorArguments: args,
  });
}

main.tags = ["TransferStrategySimple"];
export default main;
