import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const timelock = await hre.ethers.getContractAt(
    "TimelockControllerEnumerable",
    "0x00000Ab6Ee5A6c1a7Ac819b01190B020F7c6599d"
  );

  const atoken = await hre.ethers.getContractAt(
    "IATokenWithRecall",
    "0x508C39Cd02736535d5cB85f3925218E5e0e8F07A"
  );
  const blah = await hre.ethers.getContractAt(
    "OmnichainStakingLP",
    "0x508C39Cd02736535d5cB85f3925218E5e0e8F07A"
  );

  console.log(
    await blah.init.populateTransaction(
      "0x8bB8B092f3f872a887F377f73719c665Dd20Ab06",
      "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7",
      "0x2666951A62d82860E8e1385581E2FB7669097647",
      604800,
      "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647",
      "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054",
      "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A",
      "0xc0400264e71Fc9367719BE7bAdF228eac8fEdAB4"
    )
  );

  const recall = await atoken.recall.populateTransaction(
    "0xaa862f977d6916a1e89e856fc11fd99a2f2fabf8",
    "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A",
    132318528697
  );

  const tx = await timelock.schedule.populateTransaction(
    recall.to, // address target,
    0, // uint256 value,
    recall.data, // bytes calldata data,
    "0x0000000000000000000000000000000000000000000000000000000000000000", // bytes32 predecessor,
    "0x0000000000000000000000000000000000000000000000000000000000000000", // bytes32 salt,
    86400 * 5 // uint256 delay
  );

  console.log(tx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
