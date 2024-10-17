import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
dotenv.config();

const VESTED_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const OMNICHAIN_STAKING_TOKEN = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const OMNICHAIN_STAKING_LP = "0x0374ae8e866723adae4a62dce376129f292369b4";

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const vestui = await deploy("VestUiHelperV3", {
    from: deployer,
    contract: "VestUiHelper",
    args: [VESTED_NFT_ADDRESS, OMNICHAIN_STAKING_TOKEN, OMNICHAIN_STAKING_LP],
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", {
    address: vestui.address,
    constructorArguments: [
      VESTED_NFT_ADDRESS,
      OMNICHAIN_STAKING_TOKEN,
      OMNICHAIN_STAKING_LP,
    ],
  });
};

deployAirdropRewarder.tags = ["VestUiHelper"];
export default deployAirdropRewarder;
