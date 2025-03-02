import * as fs from "fs";
import csv from "csv-parser";
import * as fastcsv from "fast-csv";
import path from "path";

const inputFilePath = path.resolve(__dirname, "/s2snap.csv");
const inputFilePath2 = path.resolve(__dirname, "/partners.csv");
const outputFilePath = path.resolve(__dirname, "/s2-out.csv");

console.log(inputFilePath);

interface IRow {
  walletAddress: string;
  totalSupplyPoints: string;
  totalBorrowPoints: string;
  totalPoints: string;
  rank: string;
  boost: string;
  percentageAllocation: string;
}

interface IRowPartners {
  user: string;
  gravity: number;
}

const rows: IRowPartners[] = [];

// Read the CSV file
fs.createReadStream("./scripts/combined-merged.csv")
  .pipe(csv())
  .on("data", (row: IRowPartners) => {
    if (row.gravity > 0) rows.push(row);
  })
  .on("end", () => {
    // Sort by gravity descending once
    rows.sort((a, b) => Number(b.gravity) - Number(a.gravity));

    // Hardcode the split at 60% of addresses instead of gravity sum
    const cutoffIndex = 100;
    const topGroup = rows.slice(0, cutoffIndex);
    const bottomGroup = rows.slice(cutoffIndex);

    // Calculate total gravity in one pass
    const totalGravity = rows.reduce(
      (sum, row) => sum + Number(row.gravity),
      0
    );
    const bottomGroupGravity = bottomGroup.reduce(
      (sum, row) => sum + Number(row.gravity),
      0
    );

    const SKEW_FACTOR = 0.5; // Reduce top 100 wallets by 50% and give to bottom
    console.log("skewing data", totalGravity, rows.length);

    // Single map operation for final result
    const final = rows.map((row, index) => {
      let gravity =
        index < cutoffIndex
          ? // Top group: reduce by SKEW_FACTOR
            Number(row.gravity) * (1 - SKEW_FACTOR)
          : // Bottom group: increase proportionally
            Number(row.gravity) +
            totalGravity *
              SKEW_FACTOR *
              (Number(row.gravity) / bottomGroupGravity);

      if (row.user === "0x1fee198a3d28b2419bf0ab4bbbd6cc8f75368216") {
        gravity = Number(row.gravity);
      }

      return {
        address: row.user,
        gravity,
      };
    });

    const newTotalPoints = final.reduce((sum, row) => sum + row.gravity, 0);
    const finalAllocation = final.map((row) => {
      return {
        address: row.address,
        gravity: row.gravity,
        allocation: (2000000000 * row.gravity) / newTotalPoints,
      };
    });

    // Write results
    fs.writeFileSync(
      "./scripts/skewed-distribution.json",
      JSON.stringify(finalAllocation)
    );

    const ws = fs.createWriteStream("./scripts/skewed-distribution.csv");
    fastcsv
      .write(finalAllocation, { headers: true })
      .pipe(ws)
      .on("finish", () => {
        console.log(`Processed ${rows.length} addresses`);
        console.log(`Split at index ${cutoffIndex}`);
        console.log("Results written to skewed-distribution.csv and .json");
      });
  });
