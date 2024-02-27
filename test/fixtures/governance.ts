import hre from "hardhat";
import { ZERO_ADDRESS, deployLendingPool } from "./lending";

export const e18 = BigInt(10) ** 18n;

const supply = (100000000000n * e18) / 100n;

export async function deployCore() {
  const lendingPool = await deployLendingPool();

  // Contracts are deployed using the first signer/account by default
  const [deployer, ant, whale] = await hre.ethers.getSigners();

  // Deploy contracts
  const EarlyZERO = await hre.ethers.getContractFactory("EarlyZERO");
  const earlyZERO = await EarlyZERO.deploy();

  const ZeroLendToken = await hre.ethers.getContractFactory("ZeroLend");
  const zero = await ZeroLendToken.deploy();

  const VestedZeroNFT = await hre.ethers.getContractFactory("VestedZeroNFT");
  const vestedZeroNFT = await VestedZeroNFT.deploy();

  const StakingBonus = await hre.ethers.getContractFactory("StakingBonus");
  const stakingBonus = await StakingBonus.deploy();

  const OmnichainStaking = await hre.ethers.getContractFactory(
    "OmnichainStaking"
  );
  const omnichainStaking = await OmnichainStaking.deploy();

  const LockerToken = await hre.ethers.getContractFactory("LockerToken");
  const lockerToken = await LockerToken.deploy();
  const lockerLP = await LockerToken.deploy();

  // init contracts
  await vestedZeroNFT.init(zero.target, stakingBonus.target);
  await stakingBonus.init(
    zero.target,
    earlyZERO.target,
    lockerToken.target,
    vestedZeroNFT.target,
    2000
  );
  await lockerToken.init(
    zero.target,
    omnichainStaking.target,
    stakingBonus.target
  );
  // TODO use lp tokens
  await lockerLP.init(
    zero.target,
    omnichainStaking.target,
    stakingBonus.target
  );
  await omnichainStaking.init(
    ZERO_ADDRESS,
    lockerToken.target,
    lockerLP.target
  );

  // unpause zero
  await zero.togglePause(false);

  // give necessary approvals
  await zero.approve(vestedZeroNFT.target, 100n * supply);

  return {
    ant,
    deployer,
    earlyZERO,
    lendingPool,
    lockerToken,
    lockerLP,
    omnichainStaking,
    stakingBonus,
    vestedZeroNFT,
    whale,
    zero,
  };
}
