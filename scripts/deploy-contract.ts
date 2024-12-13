import hre, { ethers } from "hardhat";

const main = async function () {
  const factory = await ethers.getContractFactory("OmnichainStakingToken");
  const contract = await factory
    .deploy
    // "0x9fa72ea96591e486ff065e7c8a89282dedfa6c12"
    ();

  console.log("deployed to", contract.target);

  await contract.waitForDeployment();

  // Verify contract programmatically
  await hre.run("verify:verify", {
    address: contract.target,
    // constructorArguments: [contract.target],
  });
};

main();
