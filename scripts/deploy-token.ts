import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("i am", deployer.address);

  const factory = await hre.ethers.getContractFactory("ZeroLend");
  const contract = await factory.deploy();

  console.log(contract.target, await contract.deploymentTransaction());
  await contract.waitForDeployment();

  if (hre.network.name != "hardhat") {
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
