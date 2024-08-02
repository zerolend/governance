import {ethers, upgrades} from "hardhat";

const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const OMNICHAIN_STAKING_ADDRESS = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";

async function main() {

  const poolVoterProxy = "0x5346e9ab27D7874Db95993667D1Cb8338913f0aF"
  const poolVoter = await ethers.getContractFactory("PoolVoter");

  console.log("Upgradig to new PoolVoter implementation");

  if (ZERO_TOKEN_ADDRESS.length && OMNICHAIN_STAKING_ADDRESS.length) {

    const upgradedPoolVoter = await upgrades.upgradeProxy(poolVoterProxy, poolVoter);
    const tx = await upgradedPoolVoter.init(OMNICHAIN_STAKING_ADDRESS, ZERO_TOKEN_ADDRESS);
    await  tx.wait();

    console.log("PoolVoter upgraded to", upgradedPoolVoter.address);
  } else {
    throw new Error("Invalid init arguments");
  }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
