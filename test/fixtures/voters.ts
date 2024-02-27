import hre from "hardhat";
import { deployGovernance } from "./governance";

export async function deployVoters() {
  const governance = await deployGovernance();
  const lending = governance.lending;

  const PoolVoter = await hre.ethers.getContractFactory("PoolVoter");
  const MockEligibilityCriteria = await hre.ethers.getContractFactory(
    "MockEligibilityCriteria"
  );
  const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
  const GaugeIncentiveController = await hre.ethers.getContractFactory(
    "GaugeIncentiveController"
  );

  const aggregator = await MockAggregator.deploy(1e8);
  const eligibilityCriteria = await MockEligibilityCriteria.deploy();
  const tokens = await lending.protocolDataProvider.getReserveTokensAddresses(
    lending.erc20.target
  );

  const poolVoter = await PoolVoter.deploy();
  const aTokenGauge = await GaugeIncentiveController.deploy();
  const varTokenGauge = await GaugeIncentiveController.deploy();

  // get instances
  const aToken = await hre.ethers.getContractAt("AToken", tokens.aTokenAddress);
  const varToken = await hre.ethers.getContractAt(
    "AToken",
    tokens.variableDebtTokenAddress
  );

  // init instances
  await aTokenGauge.init(
    aToken.target,
    governance.zero,
    eligibilityCriteria.target,
    aggregator.target
  );
  await varTokenGauge.init(
    varToken.target,
    governance.zero,
    eligibilityCriteria.target,
    aggregator.target
  );

  // set controllers
  await aToken.setIncentivesController(aTokenGauge.target);
  await varToken.setIncentivesController(varTokenGauge.target);

  return {
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
