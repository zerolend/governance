import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ZERO_ADDRESS } from "../test/fixtures/utils";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

const deployScript = async function (hre: HardhatRuntimeEnvironment) {
  // Initialize the wallet.
  const wallet = await hre.deployer.getWallet(PRIVATE_KEY);

  const deployer = hre.deployer.setWallet(wallet);

  // Deploy contracts
  const EarlyZERO = await hre.deployer.loadArtifact("EarlyZERO");
  const EarlyZEROVesting = await hre.deployer.loadArtifact("EarlyZEROVesting");
  const ZeroLendToken = await hre.deployer.loadArtifact("ZeroLend");
  const VestedZeroNFT = await hre.deployer.loadArtifact("VestedZeroNFT");
  const StakingBonus = await hre.deployer.loadArtifact("StakingBonus");
  const OmnichainStaking = await hre.deployer.loadArtifact("OmnichainStaking");
  const LockerToken = await hre.deployer.loadArtifact("LockerToken");

  const stakingBonus = await hre.deployer.deploy(StakingBonus);
  const omnichainStaking = await hre.deployer.deploy(OmnichainStaking);
  const lockerToken = await hre.deployer.deploy(LockerToken);
  const lockerLP = await hre.deployer.deploy(LockerToken);
  const earlyZERO = await hre.deployer.deploy(EarlyZERO);
  const earlyZEROVesting = await hre.deployer.deploy(EarlyZEROVesting);
  const zero = await hre.deployer.deploy(ZeroLendToken);
  const vestedZeroNFT = await hre.deployer.deploy(VestedZeroNFT);

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
};

export default deployScript;
