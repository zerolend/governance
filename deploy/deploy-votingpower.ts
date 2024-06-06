import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZERO_ADDRESS } from "../test/fixtures/utils";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployment = await deploy("VotingPowerCombined", {
    from: deployer,
    contract: "VotingPowerCombined",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "init",
        args: [deployer, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS],
      },
    },
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", { address: deployment.address });
}

main.tags = ["VotingPowerCombined"];
export default main;
