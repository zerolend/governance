import hre from "hardhat";
import { e18 } from "../test/fixtures/utils";

async function main() {
  const [deployer, ant, whale] = await hre.ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);

  const earlyZERO = await hre.ethers.getContractAt(
    "EarlyZERO",
    "0x842e8915613560Db4113d952038090b088f0fC05"
  );
  const earlyZEROVesting = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    "0xCc82a671d37DbB278fd88D9028C53476E7854eDE"
  );

  earlyZEROVesting.mint(
    deployer.address,
    e18 * 15n, // 15 ZERO linear vesting
    e18 * 5n, // 5 ZERO upfront
    1000, // linear duration - 1000 seconds
    500, // cliff duration - 500 seconds
    now + 1000, // unlock date
    false, // penalty -> false
    0
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
