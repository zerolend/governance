import { HardhatRuntimeEnvironment } from "hardhat/types";

const ODOS_ROUTER = "0x2d8879046f1559E53eb052E949e9544bCB72f414";
const WETH = "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f";
const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const LP_TOKEN_LOCKER = "0xB4cc21FBFb4822C6Fbe10Fc115444c1689F67f1E";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployment = await deploy("Zap", {
    from: deployer,
    contract: "Zap",
    args: [ODOS_ROUTER, LP_TOKEN_LOCKER, ZERO_TOKEN_ADDRESS, WETH],
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", {
    address: deployment.address,
    constructorArguments: [
      ODOS_ROUTER,
      LP_TOKEN_LOCKER,
      ZERO_TOKEN_ADDRESS,
      WETH,
    ],
  });
}

main.tags = ["Zap"];
export default main;
