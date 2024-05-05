import hre from "hardhat";

const OmnichainStakingAddress = "0x1705A36637678d2A972318E73E4f60658147BED9";
const ZERO_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const staking = await hre.ethers.getContractAt(
    "OmnichainStaking",
    OmnichainStakingAddress
  );

  const zero = await hre.ethers.getContractAt("ZeroLend", ZERO_ADDRESS);

  const tx = await staking.notifyRewardAmount(
    await zero.balanceOf(staking.target)
  );
  console.log(tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
