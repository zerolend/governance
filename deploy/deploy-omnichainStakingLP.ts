import { HardhatRuntimeEnvironment } from "hardhat/types";

const LOCKER_LP_ADDRESS = "0x1eF0D6c32b1516692134A485338c85350D4482D0";
const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const POOL_VOTER_ADDRESS = "0x2666951A62d82860E8e1385581E2FB7669097647";
const SECONDS_IN_THREE_DAYS = 86400 * 3;
const LP_ORACLE = "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647";
const ZERO_PYTH_AGGREGATOR = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    LOCKER_LP_ADDRESS.length &&
    ZERO_TOKEN_ADDRESS.length &&
    POOL_VOTER_ADDRESS.length &&
    SECONDS_IN_THREE_DAYS &&
    LP_ORACLE.length &&
    ZERO_PYTH_AGGREGATOR
  ) {
    const deployment = await deploy("OmnichainStakingLP", {
      from: deployer,
      contract: "OmnichainStakingLP",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            LOCKER_LP_ADDRESS,
            ZERO_TOKEN_ADDRESS,
            POOL_VOTER_ADDRESS,
            SECONDS_IN_THREE_DAYS,
            LP_ORACLE,
            ZERO_PYTH_AGGREGATOR,
          ],
        },
      },
      autoMine: true,
      log: true,
    });

    await hre.run("verify:verify", { address: deployment.address });
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["OmnichainStakingLP"];
export default main;
