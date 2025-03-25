import hre from "hardhat";
import { parseEther } from "ethers";

const VESTED_ZERO_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const GAFOOR_ADDRESS = "0xe5CECC31e72F4ecCd717a17b4E62Cb6b4C5125df";

async function main() {
  if (!VESTED_ZERO_NFT_ADDRESS.length) {
    throw new Error("Invalid Vest Address");
  }
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const vest = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    VESTED_ZERO_NFT_ADDRESS
  );

  const allocation = parseEther("233333333");
  const upfront = 0;
  const cliffDuration = Math.floor(Date.now() / 1000); // Current timestamp
  const unlockDate = Math.floor(Date.now() / 1000); // Current timestamp
  const linearDuration = Math.floor(new Date("2025-05-06").getTime() / 1000) - unlockDate; // Duration until May 06, 2025
  const hasPenalty = false;
  const category = 2; // NORMAL category

  console.log("Minting NFT for Gafoor's allocation...");

  const tx = await vest.mint(
    GAFOOR_ADDRESS,
    allocation,
    upfront,
    linearDuration,
    cliffDuration,
    unlockDate,
    hasPenalty,
    category
  );

  await tx.wait();
  console.log("Vest minted for: ", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
