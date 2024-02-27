import hre from "hardhat";
import { deployGovernance } from "./governance";

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
  const GaugeIncentiveController = await hre.ethers.getContractFactory(
    "GaugeIncentiveController"
  );

  const aggregator = await MockAggregator.deploy(1e8);
  const eligibilityCriteria = await MockEligibilityCriteria.deploy();
  const tokens = await lending.protocolDataProvider.getReserveTokensAddresses(
    lending.erc20.target
  );

  const factory = await LendingPoolGaugeFactory.deploy();
  const guageImpl = await GaugeIncentiveController.deploy();
  const poolVoter = await PoolVoter.deploy();

  // get instances
  const aToken = await hre.ethers.getContractAt("AToken", tokens.aTokenAddress);
  const varToken = await hre.ethers.getContractAt(
    "AToken",
    tokens.variableDebtTokenAddress
  );

  // init instances
  await factory.setAddresses(
    guageImpl.target,
    governance.zero.target,
    eligibilityCriteria.target,
    aggregator.target,
    lending.protocolDataProvider.target
  );
  await lending.aclManager.addPoolAdmin(factory.target);
  await poolVoter.init(
    governance.omnichainStaking.target,
    governance.zero.target
  );

  // create gauge for the test token
  await factory.createGauge(lending.erc20.target);

  // register the gauge in the factory
  const gauges = await factory.gauges(lending.erc20.target);
  await poolVoter.registerGauge(lending.erc20.target, gauges.splitterGauge);

  const aTokenGauge = await hre.ethers.getContractAt(
    "GaugeIncentiveController",
    gauges.aTokenGauge
  );
  const varTokenGauge = await hre.ethers.getContractAt(
    "GaugeIncentiveController",
    gauges.varTokenGauge
  );

  return {
    ant: governance.ant,
    factory,
    governance,
    lending,
    varToken,
    poolVoter,
    aToken,
    aTokenGauge,
    varTokenGauge,
    eligibilityCriteria,
    aggregator,
  };
}
