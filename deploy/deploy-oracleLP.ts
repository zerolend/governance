import { HardhatRuntimeEnvironment } from "hardhat/types";

const NILE_AMM = "0xAAA45c8F5ef92a000a121d102F4e89278a711Faa";
const ZERO_PRICE_FEED = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";
const ETH_PRICE_FEED = "0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [NILE_AMM, ZERO_PRICE_FEED, ETH_PRICE_FEED];

  const deployment = await deploy("LPOracle", {
    from: deployer,
    contract: "LPOracle",
    args,
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", {
    address: deployment.address,
    constructorArguments: args,
  });
}

main.tags = ["LPOracle"];
export default main;
