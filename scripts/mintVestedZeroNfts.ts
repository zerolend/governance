import hre from "hardhat";
import * as fs from "fs";

const VESTED_ZERO_NFT_ADDRESS = "";

async function main() {
  if (!VESTED_ZERO_NFT_ADDRESS.length) {
    throw new Error("Invalid Vest Address");
  }
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const vest = await hre.ethers.getContractAt(
    "VestedZeroNFT",
    VESTED_ZERO_NFT_ADDRESS
  );

  // Initialize an empty array to store the parsed data
  const parsedData: any[] = [];

  // Read the CSV file
  fs.readFile("scripts/vestList.csv", "utf8", (err: any, data: string) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    // Split the CSV data into rows
    const rows = data.trim().split("\n");

    // Extract the header row to get the column names
    const headers = rows[0].split(",");

    // Iterate over the rows starting from index 1 (skipping the header)
    for (let i = 1; i < rows.length; i++) {
      let [
        totalTokens,
        walletAddress,
        upFrontPercentage,
        cliffDays,
        vestingDays,
        upfrontTokens,
        supplyUpfrontPercentage,
        supplyTotalPercentage,
      ] = rows[i].split(",");

      let rowData = {
        who: walletAddress,
        pending: parseInt(totalTokens) - parseInt(upfrontTokens),
        upfront: parseInt(upfrontTokens),
        linearDuration: parseInt(vestingDays) * 86400,
        cliffDuration: parseInt(cliffDays) * 86400,
        unlockDate: 0,
        hasPenalty: false,
        category: 0,
      };

      parsedData.push(rowData);
    }
  });

  for (let i = 0; i < parsedData.length; i++) {
    const {
      who,
      pending,
      upfront,
      linearDuration,
      cliffDuration,
      unlockDate,
      hasPenalty,
      category,
    } = parsedData[i];

    await vest.mint(
      who,
      pending,
      upfront,
      linearDuration,
      cliffDuration,
      unlockDate,
      hasPenalty,
      category
    );
    console.log("Vest minted for: ", who);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
