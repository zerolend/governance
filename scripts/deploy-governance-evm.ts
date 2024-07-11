import hre from "hardhat";
import { ZERO_ADDRESS } from "../test/fixtures/utils";

const safe = "0xa01AfbE9D874241F3697CB83FAe59977F0Aa2741";
const token = "0x861Af65B499ac38FC767547FeD9C44BBa8515a4f";
const incentivesController = "0x94Dc19a5bd17E84d90E63ff3fBA9c3B76E5E4012";

const main = async function () {
  const [deployer] = await hre.ethers.getSigners();

  const VestedZeroNFT = await hre.ethers.getContractFactory("VestedZeroNFT");
  const StakingBonus = await hre.ethers.getContractFactory("StakingBonus");
  const TransferStrategyZERO = await hre.ethers.getContractFactory(
    "TransferStrategyZERO"
  );
  const TransparentUpgradeableProxy = await hre.ethers.getContractFactory(
    "TransparentUpgradeableProxy"
  );
  const OmnichainStaking = await hre.ethers.getContractFactory(
    "OmnichainStakingToken"
  );
  const LockerToken = await hre.ethers.getContractFactory("LockerToken");
  const zero = await hre.ethers.getContractAt("ZeroLend", token);

  // implementations
  const stakingBonusImpl = await StakingBonus.deploy();
  const omnichainStakingImpl = await OmnichainStaking.deploy();
  const lockerTokenImpl = await LockerToken.deploy();
  const vestedZeroNFTImpl = await VestedZeroNFT.deploy();

  console.log("stakingBonusImpl", stakingBonusImpl.target);
  console.log("omnichainStakingImpl", omnichainStakingImpl.target);
  console.log("lockerTokenImpl", lockerTokenImpl.target);
  console.log("vestedZeroNFTImpl", vestedZeroNFTImpl.target);

  await vestedZeroNFTImpl.waitForDeployment();

  // proxies
  const stakingBonusProxy = await TransparentUpgradeableProxy.deploy(
    stakingBonusImpl.target,
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

  // implementations
  const transferStrategyZERO = await TransferStrategyZERO.deploy(
    incentivesController,
    vestedZeroNFTProxy.target,
    token
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
  const vestedZeroNFT = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    vestedZeroNFTProxy.target
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
    ZERO_ADDRESS,
    86400 * 30
  );

  console.log("stakingBonus", stakingBonusProxy.target);
  console.log("omnichainStaking", omnichainStakingProxy.target);
  console.log("lockerToken", lockerTokenProxy.target);
  console.log("zero", zero.target);
  console.log("transferStrategyZERO", transferStrategyZERO.target);
  console.log("vestedZeroNFT", vestedZeroNFTProxy.target);
  console.log("---done---");

  // transfer ownership
  console.log("transfering ownership");
  await stakingBonus.transferOwnership(safe);
  await omnichainStaking.transferOwnership(safe);
  await transferStrategyZERO.transferOwnership(safe);
  await vestedZeroNFT.grantRole(await vestedZeroNFT.DEFAULT_ADMIN_ROLE(), safe);
  await vestedZeroNFT.renounceRole(
    await vestedZeroNFT.DEFAULT_ADMIN_ROLE(),
    deployer.address
  );

  if (hre.network.name != "hardhat") {
    // Verify contract programmatically
    await hre.run("verify:verify", { address: stakingBonusImpl.target });
    await hre.run("verify:verify", { address: omnichainStakingImpl.target });
    await hre.run("verify:verify", { address: lockerTokenImpl.target });
    await hre.run("verify:verify", { address: vestedZeroNFTImpl.target });

    // Verify contract programmatically
    await hre.run("verify:verify", {
      address: transferStrategyZERO.target,
      constructorArguments: [
        incentivesController,
        vestedZeroNFTProxy.target,
        token,
      ],
    });
    await hre.run("verify:verify", {
      address: stakingBonus.target,
      constructorArguments: [stakingBonusImpl.target, safe, "0x"],
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
