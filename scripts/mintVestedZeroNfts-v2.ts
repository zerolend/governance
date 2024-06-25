import hre from "hardhat";
import * as fs from "fs";
import { parseEther } from "ethers";

const VESTED_ZERO_NFT_ADDRESS = "0x9fa72ea96591e486ff065e7c8a89282dedfa6c12";
const ZERO_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";

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

  const zero = await hre.ethers.getContractAt("ZeroLend", ZERO_ADDRESS);
  await zero.approve(vest, parseEther("100000000"));

  // Initialize an empty array to store the parsed data
  const parsedData: any[] = [];

  // Read the CSV file
  console.log("reading file");
  fs.readFile(
    "scripts/vestList.csv",
    "utf8",
    async (err: any, data: string) => {
      if (err) {
        console.error("Error reading file:", err);
        return;
      }

      // Split the CSV data into rows
      const rows = data.trim().split("\n");

      // Iterate over the rows starting from index 1 (skipping the header)
      for (let i = 1; i < rows.length; i++) {
        const [
          walletAddress,
          totalTokens,
          ,
          cliffDays,
          vestingDays,
          upfrontTokens,
        ] = rows[i].split(",");

        const rowData = {
          who: walletAddress,
          pending: parseEther(
            (parseInt(totalTokens) - parseInt(upfrontTokens)).toString()
          ),
          upfront: parseEther(upfrontTokens),
          linearDuration: parseInt(vestingDays) * 86400,
          cliffDuration: parseInt(cliffDays) * 86400,
          unlockDate: Math.floor(Date.now() / 1000),
          hasPenalty: false,
          category: 0,
        };

        parsedData.push(rowData);
      }

      console.log("working on", parsedData.length);
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

        console.log(
          who,
          pending,
          upfront,
          linearDuration,
          cliffDuration,
          unlockDate,
          hasPenalty,
          category
        );

        const tx = await vest.mint(
          who,
          pending,
          upfront,
          linearDuration,
          cliffDuration,
          0, // Math.floor(Date.now() / 1000) + 60, // unlockDate,
          hasPenalty,
          category
        );
        // // console.log("Vest minted for: ", tx);
        console.log("Vest minted for: ", tx.hash);
        await tx.wait();
      }
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
