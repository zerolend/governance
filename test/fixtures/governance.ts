import hre from "hardhat";
import { deployLendingPool } from "./lending";
import { ZERO_ADDRESS, supply } from "./utils";
import {
  LockerLP,
  LockerToken,
  OmnichainStaking,
  PoolVoter,
  StakingBonus,
  VestedZeroNFT,
} from "../../typechain-types";

const initProxy = async <T>(contract: string): Promise<T> => {
  const instanceF = await hre.ethers.getContractFactory(contract);
  const instance = await instanceF.deploy();

  const [deployer] = await hre.ethers.getSigners();

  const TransparentUpgradeableProxy = await hre.ethers.getContractFactory(
    "TransparentUpgradeableProxy"
  );

  const proxy = await TransparentUpgradeableProxy.deploy(
    instance,
    deployer.address,
    "0x"
  );

  return (await hre.ethers.getContractAt(contract, proxy.target)) as T;
};

export async function deployGovernance() {
  const lendingPool = await deployLendingPool();

  // Contracts are deployed using the first signer/account by default
  const [deployer, ant, whale] = await hre.ethers.getSigners();

  // Deploy contracts
  const ZeroLendToken = await hre.ethers.getContractFactory("ZeroLend");

  const zero = await ZeroLendToken.deploy();
  const stakingBonus = await initProxy<StakingBonus>("StakingBonus");
  const staking = await initProxy<OmnichainStaking>("OmnichainStaking");
  const lockerLP = await initProxy<LockerLP>("LockerLP");
  const lockerToken = await initProxy<LockerToken>("LockerToken");
  const poolVoter = await initProxy<PoolVoter>("PoolVoter");
  const vestedZeroNFT = await initProxy<VestedZeroNFT>("VestedZeroNFT");

  console.log("stakingBonus", stakingBonus.target);
  console.log("omnichainStaking", staking.target);
  console.log("lockerToken", lockerToken.target);
  console.log("lockerLP", lockerLP.target);
  console.log("zero", zero.target);
  console.log("vestedZeroNFT", vestedZeroNFT.target);

  // init contracts
  await vestedZeroNFT.init(zero.target, stakingBonus.target);
  await stakingBonus.init(
    zero.target,
    lockerToken.target,
    vestedZeroNFT.target,
    2000
  );
  await lockerToken.init(zero.target, staking.target);

  // TODO use lp tokens
  await lockerLP.init(zero.target, staking.target);

  await poolVoter.init(staking.target, zero.target);

  await staking.init(
    ZERO_ADDRESS,
    lockerToken.target,
    lockerLP.target,
    zero.target,
    poolVoter.target,
    86400 * 14, // 7 days
    ZERO_ADDRESS,
    ZERO_ADDRESS
  );

  // unpause zero
  await zero.togglePause(false);

  // give necessary approvals
  await zero.approve(vestedZeroNFT.target, 100n * supply);

  return {
    ant,
    deployer,
    lending: lendingPool,
    lockerToken,
    lockerLP,
    omnichainStaking: staking,
    stakingBonus,
    vestedZeroNFT,
    whale,
    zero,
    poolVoter,
  };
}
