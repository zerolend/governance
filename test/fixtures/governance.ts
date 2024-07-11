import hre from "hardhat";
import { deployLendingPool } from "./lending";
import { initProxy, supply } from "./utils";
import {
  LockerToken,
  ZeroLend,
  OmnichainStakingToken,
  PoolVoter,
  StakingBonus,
  VestedZeroNFT,
} from "../../types";
import { LockerLP } from "../../typechain-types";

export async function deployGovernance() {
  const lendingPool = await deployLendingPool();
  // Contracts are deployed using the first signer/account by default
  const [deployer, ant, whale] = await hre.ethers.getSigners();

  // Deploy contracts
  const ZeroLendTokenF = await hre.ethers.getContractFactory("ZeroLend");

  const zero: ZeroLend = await ZeroLendTokenF.deploy();
  const stakingBonus = await initProxy<StakingBonus>("StakingBonus");
  const staking = await initProxy<OmnichainStakingToken>(
    "OmnichainStakingToken"
  );
  const lockerLP = await initProxy<LockerLP>("LockerLP");
  const lockerToken = await initProxy<LockerToken>("LockerToken");
  const poolVoter = await initProxy<PoolVoter>("PoolVoter");
  const vestedZeroNFT = await initProxy<VestedZeroNFT>("VestedZeroNFT");

  // init contracts
  await vestedZeroNFT.init(zero.target, stakingBonus.target);
  await stakingBonus.init(
    zero.target,
    lockerToken.target,
    vestedZeroNFT.target,
    2000
  );

  await lockerToken.init(zero.target, staking.target);
  await lockerLP.init(zero.target, staking.target); // TODO: add a simple LP token
  await poolVoter.init(staking.target, zero.target);
  await staking.init(
    lockerToken.target,
    zero.target,
    poolVoter.target,
    86400 * 14, // 14 days
    deployer.address,
    deployer.address
  );

  // unpause zero
  await zero.togglePause(false);

  // give necessary approvals
  await zero.approve(vestedZeroNFT.target, 100n * supply);

  return {
    ant,
    deployer,
    lockerToken,
    lending: lendingPool,
    lockerLP,
    omnichainStaking: staking,
    stakingBonus,
    vestedZeroNFT,
    whale,
    zero,
    poolVoter,
  };
}
