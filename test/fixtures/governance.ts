import hre from "hardhat";
import { deployLendingPool } from "./lending";
import { ZERO_ADDRESS, supply } from "./utils";

export async function deployGovernance() {
  const lendingPool = await deployLendingPool();

  // Contracts are deployed using the first signer/account by default
  const [deployer, ant, whale] = await hre.ethers.getSigners();

  // Deploy contracts
  const EarlyZERO = await hre.ethers.getContractFactory("EarlyZERO");
  const EarlyZEROVesting = await hre.ethers.getContractFactory(
    "EarlyZEROVesting"
  );
  const ZeroLendToken = await hre.ethers.getContractFactory("ZeroLend");
  const VestedZeroNFT = await hre.ethers.getContractFactory("VestedZeroNFT");
  const StakingBonus = await hre.ethers.getContractFactory("StakingBonus");
  const OmnichainStaking = await hre.ethers.getContractFactory(
    "OmnichainStaking"
  );
  const LockerToken = await hre.ethers.getContractFactory("LockerToken");

  const stakingBonus = await StakingBonus.deploy();
  const omnichainStaking = await OmnichainStaking.deploy();
  const lockerToken = await LockerToken.deploy();
  const lockerLP = await LockerToken.deploy();
  const earlyZERO = await EarlyZERO.deploy();
  const earlyZEROVesting = await EarlyZEROVesting.deploy();
  const zero = await ZeroLendToken.deploy();
  const vestedZeroNFT = await VestedZeroNFT.deploy();

  console.log("stakingBonus", stakingBonus.target);
  console.log("omnichainStaking", omnichainStaking.target);
  console.log("lockerToken", lockerToken.target);
  console.log("lockerLP", lockerLP.target);
  console.log("earlyZERO", earlyZERO.target);
  console.log("earlyZEROVesting", earlyZEROVesting.target);
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
  await lockerToken.init(
    zero.target,
    omnichainStaking.target,
    stakingBonus.target
  );
  await earlyZEROVesting.init(
    earlyZERO.target,
    lockerToken.target,
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
  await earlyZERO.addwhitelist(earlyZEROVesting.target, true);

  return {
    ant,
    deployer,
    earlyZERO,
    lending: lendingPool,
    lockerToken,
    lockerLP,
    omnichainStaking,
    stakingBonus,
    vestedZeroNFT,
    whale,
    zero,
  };
}
