import { ethers } from "hardhat";
import { deployGovernance } from "./governance";
import { ZERO_ADDRESS } from "./utils";

export async function deployVoters() {
  const secondsIn6Months = 15780000;
  const governance = await deployGovernance();
  const lending = governance.lending;
  const poolVoter = governance.poolVoter;

  const MockEligibilityCriteria = await ethers.getContractFactory(
    "MockEligibilityCriteria"
  );
  const LendingPoolGaugeFactory = await ethers.getContractFactory(
    "LendingPoolGaugeFactory"
  );
  const MockAggregator = await ethers.getContractFactory(
    "contracts/tests/MockAggregator.sol:MockAggregator"
  );

  const aggregator = await MockAggregator.deploy(1e8);
  const eligibilityCriteria = await MockEligibilityCriteria.deploy();
  const tokens = await lending.protocolDataProvider.getReserveTokensAddresses(
    lending.erc20.target
  );


  // get instances
  const aToken = await ethers.getContractAt("AToken", tokens.aTokenAddress);
  const varToken = await ethers.getContractAt(
    "AToken",
    tokens.variableDebtTokenAddress
  );

  const factory = await LendingPoolGaugeFactory.deploy(
    lending.rewardsController.target, // address _incentivesController,
    governance.vestedZeroNFT.target, // address _vestedZERO,
    poolVoter.target, // address _voter,
    governance.zero.target, // address _zero,
    lending.protocolDataProvider.target, // address _dataProvider
    secondsIn6Months
  );

  await lending.emissionManager.setEmissionAdmin(lending.erc20.target, governance.deployer.address)
  await lending.emissionManager.setRewardOracle(lending.erc20.target, aggregator.target);
  await lending.emissionManager.setEmissionAdmin(governance.zero.target, governance.deployer.address)
  await lending.emissionManager.setRewardOracle(governance.zero.target, aggregator.target);

  // create gauge for the test token
  await factory.createGauge(lending.erc20.target, aggregator.target);

  // register the gauge in the factory
  const gauge = await factory.gauges(lending.erc20.target);

  const gaugeContract = await ethers.getContractAt("LendingPoolGaugeV2", gauge);
  
  const emissionManagerProxy = await ethers.getContractAt("EmissionManagerProxy", await gaugeContract.emissionManagerProxy());
  
  await emissionManagerProxy.setWhitelist(gauge, true);
  await lending.emissionManager.setEmissionAdmin(governance.zero.target, emissionManagerProxy.target);
  await poolVoter.registerGauge(lending.erc20.target, gauge);

  return {
    ant: governance.ant,
    factory,
    governance,
    lending,
    varToken,
    poolVoter,
    aToken,
    gauge,
    eligibilityCriteria,
    aggregator,
  };
}
