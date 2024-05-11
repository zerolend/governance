import hre from "hardhat";
import * as fs from "fs";
import { parseEther } from "ethers";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const vest = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12"
  );

  const tx = await vest.updateCliffDuration(
    [60570, 60538], // tokenIds
    [180 * 86400, 180 * 86400], // linear
    [90 * 86400, 90 * 86400] // cliff
  );
  console.log(tx.hash);

  // const tx = await vest.freeze(
  //   277, // tokenIds
  //   true
  // );
  // console.log(tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
