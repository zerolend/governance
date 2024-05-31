import { HardhatRuntimeEnvironment } from "hardhat/types";

const ODOS_ROUTER = "0x2d8879046f1559E53eb052E949e9544bCB72f414";
const NILE_ROUTER = "0xAAA45c8F5ef92a000a121d102F4e89278a711Faa";
const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const LP_TOKEN_LOCKER = "0x1eF0D6c32b1516692134A485338c85350D4482D0";
const SLIPPAGE = 10; // 0.01% = 1

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
    const deployment = await deploy("Zap", {
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

    await hre.run("verify:verify", {address: deployment.address});    
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["Zap"];
export default main;
