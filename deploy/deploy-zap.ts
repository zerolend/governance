import { HardhatRuntimeEnvironment } from "hardhat/types";

const ODOS_ROUTER = "0x2d8879046f1559E53eb052E949e9544bCB72f414";
const WETH = "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f";
const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const LP_TOKEN_LOCKER = (await get("LockerLP")).address;

  const deployment = await deploy("ZapLockerLP", {
    from: deployer,
    contract: "ZapLockerLP",
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
