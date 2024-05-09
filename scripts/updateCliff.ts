import { ethers } from "hardhat";

const VESTED_ZERO_NFT_ADDRESS = "";
const LINEAR_DURATION = 0;
const CLIFF_DURATION = 0;

async function main() {
  if (VESTED_ZERO_NFT_ADDRESS.length && LINEAR_DURATION && CLIFF_DURATION) {
    const vestContract = await ethers.getContractAt(
      "VestedZeroNFT",
      VESTED_ZERO_NFT_ADDRESS
    );

    const tokenIds: number[] = [];
    const linearDuration = tokenIds.map((item) => LINEAR_DURATION);
    const cliffDuration = tokenIds.map((item) => CLIFF_DURATION);

    await vestContract.updateCliffDuration(
      tokenIds,
      linearDuration,
      cliffDuration
    );
  } else {
    throw new Error("Invalid arguments");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
