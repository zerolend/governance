import { HardhatRuntimeEnvironment } from "hardhat/types";

const NILE_AMM = "0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d";
const ZERO_PRICE_FEED = "0x15Fc7b4982A11c5CB63379cD0b2CE57f3e9C08f9";
const ETH_PRICE_FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

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
