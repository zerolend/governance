import { ethers } from "hardhat";

async function main() {
  const ZeroToken = await ethers.getContractFactory("EarlyZERO");
  const token = await ZeroToken.deploy();

  console.log("Flash loan contract deployed: ", token.target);

  const ZeroNFT = await ethers.getContractFactory("VestedZeroNFT");
  const nft = await ZeroNFT.deploy();

  console.log("Flash loan contract deployed: ", nft.target);
  await nft.init(token.target, "0x0000000000000000000000000000000000000000");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
