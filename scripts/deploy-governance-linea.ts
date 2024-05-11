import hre from "hardhat";
import { ZERO_ADDRESS } from "../test/fixtures/utils";

const main = async function () {
  const [deployer] = await hre.ethers.getSigners();

  const safe = "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A";

  const VestedZeroNFT = await hre.ethers.getContractFactory("VestedZeroNFT");
  const StakingBonus = await hre.ethers.getContractFactory("StakingBonus");
  const TransparentUpgradeableProxy = await hre.ethers.getContractFactory(
    "TransparentUpgradeableProxy"
  );
  const PoolVoter = await hre.ethers.getContractFactory("PoolVoter");
  const OmnichainStaking = await hre.ethers.getContractFactory(
    "OmnichainStaking"
  );
  const airdropContractFC = await hre.ethers.getContractFactory(
    "AirdropRewarder"
  );
  const LockerToken = await hre.ethers.getContractFactory("LockerToken");
  const zero = await hre.ethers.getContractAt(
    "ZeroLend",
    "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7"
  );

  // implementations
  const airdropContractImpl = await airdropContractFC.deploy();
  const stakingBonusImpl = await StakingBonus.deploy();
  const omnichainStakingImpl = await OmnichainStaking.deploy();
  const lockerTokenImpl = await LockerToken.deploy();
  const poolVoterImpl = await PoolVoter.deploy();
  const vestedZeroNFTImpl = await VestedZeroNFT.deploy();

  console.log("stakingBonusImpl", stakingBonusImpl.target);
  console.log("airdropContractImpl", airdropContractImpl.target);
  console.log("omnichainStakingImpl", omnichainStakingImpl.target);
  console.log("lockerTokenImpl", lockerTokenImpl.target);
  console.log("poolVoterImpl", poolVoterImpl.target);
  console.log("vestedZeroNFTImpl", vestedZeroNFTImpl.target);

  await vestedZeroNFTImpl.waitForDeployment();

  // proxies
  const stakingBonusProxy = await TransparentUpgradeableProxy.deploy(
    stakingBonusImpl.target,
    safe,
    "0x"
  );
  const airdropContractProxy = await TransparentUpgradeableProxy.deploy(
    airdropContractImpl.target,
    safe,
    "0x"
  );
  const poolVoterProxy = await TransparentUpgradeableProxy.deploy(
    poolVoterImpl.target,
    safe,
    "0x"
  );
  const omnichainStakingProxy = await TransparentUpgradeableProxy.deploy(
    omnichainStakingImpl.target,
    safe,
    "0x"
  );
  const lockerTokenProxy = await TransparentUpgradeableProxy.deploy(
    lockerTokenImpl.target,
    safe,
    "0x"
  );
  const vestedZeroNFTProxy = await TransparentUpgradeableProxy.deploy(
    vestedZeroNFTImpl.target,
    safe,
    "0x"
  );

  const stakingBonus = await hre.ethers.getContractAt(
    "StakingBonus",
    stakingBonusProxy.target
  );
  const omnichainStaking = await hre.ethers.getContractAt(
    "OmnichainStaking",
    omnichainStakingProxy.target
  );
  const lockerToken = await hre.ethers.getContractAt(
    "LockerToken",
    lockerTokenProxy.target
  );
  const poolVoter = await hre.ethers.getContractAt(
    "PoolVoter",
    poolVoterProxy.target
  );
  const vestedZeroNFT = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    vestedZeroNFTProxy.target
  );
  const airdropContract = await hre.ethers.getContractAt(
    "AirdropRewarder",
    airdropContractProxy.target
  );

  await vestedZeroNFTProxy.waitForDeployment();

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
  await omnichainStaking.init(
    ZERO_ADDRESS,
    lockerToken.target,
    ZERO_ADDRESS,
    zero.target,
    poolVoter.target,
    86400 * 30
  );

  const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const startDate = Math.floor(
    new Date("06 May 2024 07:30:00 UTC").getTime() / 1000
  ); // 10 mins
  // const startDate = Math.floor(Date.now() / 1000) + 60 * 10; // 10 mins

  await airdropContract.initialize(
    zero.target,
    lockerToken.target,
    vestedZeroNFT.target,
    startDate,
    endDate
  );
  await poolVoter.init(omnichainStaking.target, zero.target);

  console.log("stakingBonus", stakingBonusProxy.target);
  console.log("omnichainStaking", omnichainStakingProxy.target);
  console.log("lockerToken", lockerTokenProxy.target);
  console.log("zero", zero.target);
  console.log("poolVoter", poolVoter.target);
  console.log("vestedZeroNFT", vestedZeroNFTProxy.target);
  console.log("airdropContract", airdropContractProxy.target);

  if (hre.network.name != "hardhat") {
    // Verify contract programmatically
    await hre.run("verify:verify", { address: stakingBonusImpl.target });
    await hre.run("verify:verify", { address: omnichainStakingImpl.target });
    await hre.run("verify:verify", { address: airdropContractImpl.target });
    await hre.run("verify:verify", { address: lockerTokenImpl.target });
    await hre.run("verify:verify", { address: poolVoterImpl.target });
    await hre.run("verify:verify", { address: vestedZeroNFTImpl.target });

    // Verify contract programmatically
    await hre.run("verify:verify", {
      address: airdropContractProxy.target,
      constructorArguments: [airdropContractImpl.target, safe, "0x"],
    });
    await hre.run("verify:verify", {
      address: stakingBonus.target,
      constructorArguments: [stakingBonusImpl.target, safe, "0x"],
    });
    await hre.run("verify:verify", {
      address: poolVoter.target,
      constructorArguments: [poolVoterImpl.target, safe, "0x"],
    });
    await hre.run("verify:verify", {
      address: omnichainStaking.target,
      constructorArguments: [omnichainStakingImpl.target, safe, "0x"],
    });
    await hre.run("verify:verify", {
      address: lockerToken.target,
      constructorArguments: [lockerTokenImpl.target, safe, "0x"],
    });
    await hre.run("verify:verify", {
      address: vestedZeroNFT.target,
      constructorArguments: [vestedZeroNFTImpl.target, safe, "0x"],
    });
  }
};

main();
