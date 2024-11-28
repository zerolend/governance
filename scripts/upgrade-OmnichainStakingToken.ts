import hre from "hardhat";

async function main() {

  const omnichainStakingTokenProxy = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
  const omnichainStakingTokenFactory = await hre.ethers.getContractFactory("OmnichainStakingToken");
  const omnichainStakingToken = await hre.upgrades.upgradeProxy(omnichainStakingTokenProxy, omnichainStakingTokenFactory);

  console.log(`---- Your proxy upgrade is done ----${await omnichainStakingToken.getAddress()}`);
  
  if (hre.network.name != "hardhat") {
    // Verify contract programmatically
    await hre.run("verify:verify", {
      address: hre.upgrades.erc1967.getImplementationAddress(omnichainStakingTokenProxy)
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
