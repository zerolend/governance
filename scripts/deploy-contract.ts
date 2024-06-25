import hre, { ethers } from "hardhat";

const main = async function () {
  const factory = await ethers.getContractFactory("OmnichainStakingToken");
  const contract = await factory.deploy();

  console.log("deployed to", contract.target);

  await contract.waitForDeployment();

  // Verify contract programmatically
  await hre.run("verify:verify", { address: contract.target });
};

main();
