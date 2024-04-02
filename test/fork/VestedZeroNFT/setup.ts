import { ethers } from "hardhat";
import { getLendingPoolContracts } from "./helper";
import { getContractAddresses } from "./constants";


export async function setup(network: string) {
  const networkAddresses = getContractAddresses(network);
  const {
    EarlyZERO,
    EarlyZEROVesting,
    ZeroLend,
    StakingBonus,
    OmnichainStaking,
    LockerToken,
    LockerLP,
  } = networkAddresses;

  const lendingPool = await getLendingPoolContracts(networkAddresses);

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

  //Deploying and initializing the VestedZeroNFT contract
  const VestedZeroNFT = await ethers.getContractFactory("VestedZeroNFT");

  const vestedZeroNFT = await VestedZeroNFT.deploy();
  await vestedZeroNFT.init(zero.target, stakingBonus.target);

  //Logging Contract Addresses
  console.log("stakingBonus", stakingBonus.target);
  console.log("omnichainStaking", omnichainStaking.target);
  console.log("lockerToken", lockerToken.target);
  console.log("lockerLP", lockerLP.target);
  console.log("earlyZERO", earlyZERO.target);
  console.log("earlyZEROVesting", earlyZEROVesting.target);
  console.log("zero", zero.target);
  console.log("vestedZeroNFT", vestedZeroNFT.target);

  return {
    earlyZERO,
    lending: lendingPool,
    lockerToken,
    lockerLP,
    omnichainStaking,
    stakingBonus,
    vestedZeroNFT,
    zero,
  };
}
