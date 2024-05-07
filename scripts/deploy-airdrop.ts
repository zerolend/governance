import hre, { ethers } from "hardhat";

const main = async function () {
  const airdropContractFC = await ethers.getContractFactory("AirdropRewarder");
  const airdropContract = await airdropContractFC.deploy();

  console.log("deployed to", airdropContract.target);

  await airdropContract.waitForDeployment();

  // Verify contract programmatically
  await hre.run("verify:verify", { address: airdropContract.target });

  const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const startDate = Math.floor(Date.now() / 1000) + 60 * 10; // 10 mins

  const tx = await airdropContract.initialize(
    "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7", // address _rewardToken,
    "0x2e9D2684cf661d847BCA276Cb19907a9a03d25B6", // address _locker,
    "0x1a73b0cA6592FE4D484D7B138E5fdCFf93CD7cA8", // address _vestedZeroNFT,
    startDate, // uint256 _unlockDate,
    endDate // uint256 _endDate
  );

  console.log(tx.hash);
};

main();
