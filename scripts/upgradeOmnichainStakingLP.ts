import hre from "hardhat";

async function main() {

  const omnichainStakingLPProxy = "0x0374ae8e866723ADAE4A62DcE376129F292369b4";
  const omnichainStakingLPFactory = await hre.ethers.getContractFactory("OmnichainStakingLP");
  const omnichainStakingLP = await hre.upgrades.upgradeProxy(omnichainStakingLPProxy, omnichainStakingLPFactory);

  console.log(`---- Your proxy upgrade is done ----${await omnichainStakingLP.getAddress()}`);
  
  if (hre.network.name != "hardhat") {
    // Verify contract programmatically
    await hre.run("verify:verify", {
      address: hre.upgrades.erc1967.getImplementationAddress(omnichainStakingLPProxy)
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
