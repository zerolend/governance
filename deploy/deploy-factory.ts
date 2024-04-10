import hre, { ethers } from "hardhat";

async function main() {
  const Create2Factory = await ethers.getContractFactory("Create2Factory");
  const contract = await Create2Factory.deploy();
  console.log("contract deployed", contract.target);

  // verify contract for tesnet & mainnet
  if (process.env.NODE_ENV != "test") {
    // Verify contract programmatically
    await hre.run("verify:verify", {
      address: contract.target,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
