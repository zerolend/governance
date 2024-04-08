import { ethers } from "hardhat";
import { INetworkDetails } from "./constants";
import { initMainnetUser } from "../fixtures/utils";
import { parseEther } from "ethers";

export async function getGovernanceContracts(networkDetails: INetworkDetails) {
  const {
    EarlyZERO,
    EarlyZEROVesting,
    ZeroLend,
    StakingBonus,
    OmnichainStaking,
    LockerToken,
    LockerLP,
    VestedZeroNFT,
  } = networkDetails;

  const earlyZERO = await ethers.getContractAt(
    EarlyZERO.name,
    EarlyZERO.address
  );
  const earlyZEROVesting = await ethers.getContractAt(
    EarlyZEROVesting.name,
    EarlyZEROVesting.address
  );
  const zero = await ethers.getContractAt(ZeroLend.name, ZeroLend.address);
  const stakingBonus = await ethers.getContractAt(
    StakingBonus.name,
    StakingBonus.address
  );
  const omnichainStaking = await ethers.getContractAt(
    OmnichainStaking.name,
    OmnichainStaking.address
  );
  const lockerToken = await ethers.getContractAt(
    LockerToken.name,
    LockerToken.address
  );
  const lockerLP = await ethers.getContractAt(
    LockerLP.name,
    LockerToken.address
  );

  let vestedZeroNFT;
  if (VestedZeroNFT.address == "") {
    const VestedZeroNFT = await ethers.getContractFactory("VestedZeroNFT");
    vestedZeroNFT = await VestedZeroNFT.deploy();
    await vestedZeroNFT.init(zero.target, stakingBonus.target);
  } else {
    vestedZeroNFT = await ethers.getContractAt(
      VestedZeroNFT.name,
      VestedZeroNFT.address
    );
  }

  return {
    earlyZERO,
    earlyZEROVesting,
    lockerToken,
    lockerLP,
    omnichainStaking,
    stakingBonus,
    vestedZeroNFT,
    zero,
  };
}

export async function getLendingPoolContracts(networkDetails: INetworkDetails) {
  const {
    PoolConfigurator,
    ERC20,
    Pool,
    AaveOracle,
    PoolAddressesProvider,
    ACLManager,
    AaveProtocolDataProvider,
  } = networkDetails;

  const configurator = await ethers.getContractAt(
    PoolConfigurator.name,
    PoolConfigurator.address
  );
  const erc20 = await ethers.getContractAt(ERC20.name, ERC20.address);
  const pool = await ethers.getContractAt(Pool.name, Pool.address);
  const oracle = await ethers.getContractAt(
    AaveOracle.name,
    AaveOracle.address
  );

  const addressesProvider = await ethers.getContractAt(
    PoolAddressesProvider.name,
    PoolAddressesProvider.address
  );
  const aclManager = await ethers.getContractAt(
    ACLManager.name,
    ACLManager.address
  );

  const protocolDataProvider = await ethers.getContractAt(
    AaveProtocolDataProvider.name,
    AaveProtocolDataProvider.address
  );

  return {
    configurator,
    erc20,
    pool,
    oracle,
    addressesProvider,
    aclManager,
    protocolDataProvider,
  };
}

export async function getPoolVoterContracts(networkDetails: INetworkDetails) {
  const governance = await getGovernanceContracts(networkDetails);
  const lending = await getLendingPoolContracts(networkDetails);

  const MockEligibilityCriteria = await ethers.getContractFactory(
    "MockEligibilityCriteria"
  );
  const LendingPoolGaugeFactory = await ethers.getContractFactory(
    "LendingPoolGaugeFactory"
  );
  const MockAggregator = await ethers.getContractFactory(
    "contracts/tests/MockAggregator.sol:MockAggregator"
  );
  const GaugeIncentiveController = await ethers.getContractFactory(
    "GaugeIncentiveController"
  );

  const aggregator = await MockAggregator.deploy(1e8);
  const eligibilityCriteria = await MockEligibilityCriteria.deploy();
  const tokens = await lending.protocolDataProvider.getReserveTokensAddresses(
    lending.erc20.target
  );

  const factory = await LendingPoolGaugeFactory.deploy();

  const guageImpl = await GaugeIncentiveController.deploy();

  const PoolVoter = await ethers.getContractFactory("PoolVoter");
  const poolVoter = await PoolVoter.deploy();

  // get instances
  const aToken = await ethers.getContractAt("AToken", tokens.aTokenAddress);
  const varToken = await ethers.getContractAt(
    "AToken",
    tokens.variableDebtTokenAddress
  );

  // init instances
  await factory.setAddresses(
    guageImpl.target,
    governance.zero.target,
    eligibilityCriteria.target,
    lending.oracle.target,
    governance.vestedZeroNFT.target,
    lending.protocolDataProvider.target
  );

  const deployer = await initMainnetUser(
    "0x0F6e98A756A40dD050dC78959f45559F98d3289d",
    parseEther("1")
  );
  await lending.aclManager.connect(deployer).addPoolAdmin(factory.target);

  await poolVoter.init(
    governance.omnichainStaking.target,
    governance.zero.target
  );

  await factory.createGauge(await lending.erc20.getAddress());

  const gauges = await factory.gauges(lending.erc20.target);
  await poolVoter.registerGauge(lending.erc20.target, gauges.splitterGauge);

  const aTokenGauge = await ethers.getContractAt(
    "GaugeIncentiveController",
    gauges.aTokenGauge
  );
  const varTokenGauge = await ethers.getContractAt(
    "GaugeIncentiveController",
    gauges.varTokenGauge
  );

  return {
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
