import { ethers, upgrades } from "hardhat";

const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7"; 
const STAKING_BONUS_ADDRESS = "0xD676c56A93Fe2a05233Ce6EAFEfDe2bd4017B3eA"; 
const VESTED_ZERO_NFT_PROXY = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";

async function main() {
  const VestedZeroNFT = await ethers.getContractFactory("VestedZeroNFT");

  console.log("Upgrading to new VestedZeroNFT implementation...");

  if (ZERO_TOKEN_ADDRESS.length && STAKING_BONUS_ADDRESS.length) {
    // Upgrade the proxy to the new implementation
    const upgradedContract = await upgrades.upgradeProxy(VESTED_ZERO_NFT_PROXY, VestedZeroNFT);

    // Re-initialize the contract with required arguments
    const tx = await upgradedContract.init(ZERO_TOKEN_ADDRESS, STAKING_BONUS_ADDRESS);
    await tx.wait();

    console.log("VestedZeroNFT upgraded and initialized at:", upgradedContract.address);
  } else {
    throw new Error("Invalid TOKEN_ADDRESS or STAKING_BONUS_ADDRESS");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});