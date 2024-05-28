import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const INCENTIVE_CONTROLLER = "0x28F6899fF643261Ca9766ddc251b359A2d00b945";
const POOL_VOTER = "0x5346e9ab27D7874Db95993667D1Cb8338913f0aF";
const VESTED_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const ZERO_TOKEN = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const PROTOCOL_DATA_PROVIDER = "0x67f93d36792c49a4493652B91ad4bD59f428AD15";
const SECONDS_IN_SIX_MONTHS = 51536000/2;


const deployLendingPoolGaugeFactory = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    INCENTIVE_CONTROLLER.length &&
    POOL_VOTER.length &&
    VESTED_NFT_ADDRESS.length &&
    ZERO_TOKEN.length &&
    PROTOCOL_DATA_PROVIDER.length &&
    SECONDS_IN_SIX_MONTHS 
  ) {
    const gaugeFactoryDeployment = await deploy("LendingPoolGaugeFactory", {
      from: deployer,
      contract: "LendingPoolGaugeFactory",
      args: [
        INCENTIVE_CONTROLLER,
        VESTED_NFT_ADDRESS,
        POOL_VOTER,
        ZERO_TOKEN,
        PROTOCOL_DATA_PROVIDER,
        SECONDS_IN_SIX_MONTHS,
      ],
      autoMine: true,
      log: true,
    });

    const gaugeFactoryContract = await ethers.getContractAt("LendingPoolGaugeFactory", gaugeFactoryDeployment.address);
    
    const gauge = await gaugeFactoryContract.createGauge("0x176211869cA2b568f2A7D4EE941E073a821EE1ff", "0xFF679e5B4178A2f74A56f0e2c0e1FA1C80579385")
    console.log("Gauge:", gauge);
  } else {
    throw new Error("Invalid arguments");
  }
};

deployLendingPoolGaugeFactory.tags = ["LendingPoolGaugeFactory"];
export default deployLendingPoolGaugeFactory;
