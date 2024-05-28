import { HardhatRuntimeEnvironment } from "hardhat/types";

const ODOS_ROUTER = "";
const NILE_ROUTER = "";
const ZERO_TOKEN_ADDRESS = "";
const LP_TOKEN_LOCKER = "";
const SLIPPAGE = 0; // 0.01% = 1

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    ZERO_TOKEN_ADDRESS.length &&
    ODOS_ROUTER.length &&
    NILE_ROUTER.length &&
    LP_TOKEN_LOCKER.length &&
    SLIPPAGE
  ) {
    await deploy("Zap", {
      from: deployer,
      contract: "Zap",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "init",
          args: [
            deployer,
            ODOS_ROUTER,
            NILE_ROUTER,
            LP_TOKEN_LOCKER,
            ZERO_TOKEN_ADDRESS,
            SLIPPAGE,
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

main.tags = ["Zap"];
export default main;
