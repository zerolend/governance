import { ethers } from "hardhat";

const main = async function () {
  const airdropContract = await ethers.getContractAt(
    "AirdropRewarder",
    "0x569982A604cA61fa425fD924ADF08BE9e4f3035f"
  );

  const tx = await airdropContract.setMerkleRoot(
    "0xa631696da4b7941974408658688acb764c6a17198aa270a7f667572767fe5e01"
  );
  console.log(tx.hash);
};

main();
