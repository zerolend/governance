import hre from "hardhat";
import { parseEther } from "ethers";

const VESTED_ZERO_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const HARISH_ADDRESS = "0xe5CECC31e72F4ecCd717a17b4E62Cb6b4C5125df";
const HARISH_TOKEN_ID = 209


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

  // Since Current allo: 100M. Actual allo: 120M.
  const amount = parseEther("20000000");

  const detail = await vest.tokenIdToLockDetails(HARISH_TOKEN_ID);
  const personDetails = {
    who: HARISH_ADDRESS,
    pending: amount,
    upfront: 0,
    linearDuration: detail.linearDuration,
    cliffDuration: detail.cliffDuration,
    unlockDate: detail.unlockDate,
    hasPenalty: detail.hasPenalty,
    category: detail.category,
  }
  const tx = await vest.mint(
    personDetails.who,
    personDetails.pending,
    personDetails.upfront,
    personDetails.linearDuration,
    personDetails.cliffDuration,
    personDetails.unlockDate,
    personDetails.hasPenalty,
    personDetails.category
  );

  console.log("Vest minted for: ", tx.hash);
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
