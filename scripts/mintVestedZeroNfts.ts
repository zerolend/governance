import hre from "hardhat";

const VESTED_ZERO_NFT_ADDRESS = "";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const vest = await hre.ethers.getContractAt("VestedZeroNFT", VESTED_ZERO_NFT_ADDRESS);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
