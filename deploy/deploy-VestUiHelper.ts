import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
dotenv.config();

const VESTED_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const OMNICHAIN_STAKING_TOKEN = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const OMNICHAIN_STAKING_LP = "0x0374ae8e866723adae4a62dce376129f292369b4";
const LP_ORACLE = "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647";
const ZERO_ORACLE = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const vestui = await deploy("VestUiHelperZerolend", {
    from: deployer,
    contract: "VestUiHelper",
    args: [VESTED_NFT_ADDRESS, OMNICHAIN_STAKING_TOKEN, OMNICHAIN_STAKING_LP, LP_ORACLE, ZERO_ORACLE],
    autoMine: true,
    log: true,
  });

  await hre.run("verify:verify", {
    address: vestui.address,
    constructorArguments: [
      VESTED_NFT_ADDRESS,
      OMNICHAIN_STAKING_TOKEN,
      OMNICHAIN_STAKING_LP,
      LP_ORACLE,
      ZERO_ORACLE,
    ],
  });
};

deployAirdropRewarder.tags = ["VestUiHelper"];
export default deployAirdropRewarder;
