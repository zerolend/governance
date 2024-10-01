import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const timelock = await hre.ethers.getContractAt(
    "TimelockControllerEnumerable",
    "0x00000Ab6Ee5A6c1a7Ac819b01190B020F7c6599d"
  );

  const tx = await timelock.schedule
    .populateTransaction
    // recall.to, // address target,
    // 0, // uint256 value,
    // recall.data, // bytes calldata data,
    // "0x0000000000000000000000000000000000000000000000000000000000000000", // bytes32 predecessor,
    // "0x0000000000000000000000000000000000000000000000000000000000000000", // bytes32 salt,
    // 86400 * 5 // uint256 delay
    ();

  console.log(tx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
