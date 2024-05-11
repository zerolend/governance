import hre from "hardhat";

const OmnichainStakingAddress = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const ZERO_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const staking = await hre.ethers.getContractAt(
    "OmnichainStaking",
    OmnichainStakingAddress
  );

  const zero = await hre.ethers.getContractAt("ZeroLend", ZERO_ADDRESS);

  const e18 = 10n ** 18n;
  await zero.transfer(OmnichainStakingAddress, 100000000n * e18);
  await zero.transfer(
    "0xD676c56A93Fe2a05233Ce6EAFEfDe2bd4017B3eA",
    1000000000n * e18
  );

  const tx = await staking.notifyRewardAmount(
    await zero.balanceOf(staking.target)
  );
  console.log(tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
