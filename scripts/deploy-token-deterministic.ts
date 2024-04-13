import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("i am", deployer.address);

  const factory = await hre.ethers.getContractAt(
    "Create2Factory",
    "0x317e6B6BCa8862F514D1FA28488DCd9211731aCC"
  );

  const salt =
    "0x599102631c83a7907f8fbbd0d5bca19b4a7567462855abd4360ee119be27ee3d";

  const cFactory = await hre.ethers.getContractFactory("ZeroLendTest");
  const contract = await factory.deploy(cFactory.bytecode, salt);

  console.log(contract.hash);
  // console.log(contract.target, await contract.deploymentTransaction());
  // await contract.waitForDeployment();

  // if (hre.network.name != "hardhat") {
  //   // Verify contract programmatically
  //   await hre.run("verify:verify", {
  //     address: "0xf1f6A34A9B4b62D12728d3c63cafCE49682bF9E0",
  //   });
  // }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
