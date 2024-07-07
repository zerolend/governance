import { ethers } from "hardhat";
import { VestedZeroNFT } from "../types";

const VESTED_ZERO_NFT_ADDRESS = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
const LINEAR_DURATION = 86400 * 91;
const CLIFF_DURATION = 86400 * 90;
const tokenIds: number[] = [];

async function main() {
  if (VESTED_ZERO_NFT_ADDRESS.length && LINEAR_DURATION && CLIFF_DURATION) {
    const vestContract = await ethers.getContractAt(
      "VestedZeroNFT",
      VESTED_ZERO_NFT_ADDRESS
    );

    const lastTokenId = await vestContract.lastTokenId();

    const tokenPromises = [];
    for (let i = 0; i < lastTokenId; i++) {
      tokenPromises.push(getAirdropTokenId(i, vestContract));
    }

    await Promise.all(tokenPromises);

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

async function getAirdropTokenId(i: number, vestContract: VestedZeroNFT) {
  const tokenToLockDetails = await vestContract.tokenIdToLockDetails(i);
  if (tokenToLockDetails.category === 3n) {
    if (tokenToLockDetails.cliffDuration > 86400n * 90n) {
      tokenIds.push(i);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
