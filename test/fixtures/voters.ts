import hre from "hardhat";
import { deployGovernance } from "./governance";
import { ZERO_ADDRESS } from "./utils";

export async function deployVoters() {
  const governance = await deployGovernance();
  const lending = governance.lending;

  const PoolVoter = await hre.ethers.getContractFactory("PoolVoter");

  const MockEligibilityCriteria = await hre.ethers.getContractFactory(
    "MockEligibilityCriteria"
  );
  const LendingPoolGaugeFactory = await hre.ethers.getContractFactory(
    "LendingPoolGaugeFactory"
  );
  const MockAggregator = await hre.ethers.getContractFactory(
    "contracts/tests/MockAggregator.sol:MockAggregator"
  );

  const aggregator = await MockAggregator.deploy(1e8);
  const eligibilityCriteria = await MockEligibilityCriteria.deploy();
  const tokens = await lending.protocolDataProvider.getReserveTokensAddresses(
    lending.erc20.target
  );

  const poolVoter = await PoolVoter.deploy();

  // get instances
  const aToken = await hre.ethers.getContractAt("AToken", tokens.aTokenAddress);
  const varToken = await hre.ethers.getContractAt(
    "AToken",
    tokens.variableDebtTokenAddress
  );

  const factory = await LendingPoolGaugeFactory.deploy(
    lending.rewardsController.target, // address _incentivesController,
    governance.vestedZeroNFT.target, // address _vestedZERO,
    poolVoter.target, // address _voter,
    governance.zero.target, // address _zero,
    lending.protocolDataProvider.target // address _dataProvider
  );

  // init instances
  await poolVoter.init(
    governance.omnichainStaking.target,
    governance.zero.target
  );

  // create gauge for the test token
  await factory.createGauge(lending.erc20.target, ZERO_ADDRESS);

  // register the gauge in the factory
  const gauge = await factory.gauges(lending.erc20.target);
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
