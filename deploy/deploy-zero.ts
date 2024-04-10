import { ethers } from "hardhat";

async function main() {
  const ZeroToken = await ethers.getContractFactory("ZeroLend");
  const token = await ZeroToken.deploy();

  console.log("contract deployed", token.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
