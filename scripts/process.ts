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
fs.createReadStream("./scripts/s2snap.csv")
  .pipe(csv())
  .on("data", (row: IRow) =>
    rows.push({ user: row.walletAddress, gravity: Number(row.totalPoints) })
  )
  .on("end", () => {
    fs.createReadStream("./scripts/partners-merged.csv")
      .pipe(csv())
      .on("data", (row: IRowPartners) => rows.push(row))
      .on("end", () => {
        // Create a map to merge duplicates
        const mergedRows = new Map<string, number>();

        // Process and merge duplicates
        rows.forEach((row) => {
          const user = row.user.toLowerCase(); // normalize addresses
          const gravity = Number(row.gravity);

          if (mergedRows.has(user)) {
            // Add gravity to existing entry
            mergedRows.set(user, mergedRows.get(user)! + gravity);
          } else {
            // Create new entry
            mergedRows.set(user, gravity);
          }
        });

        // Convert back to array and sort by gravity
        const result = Array.from(mergedRows.entries())
          .map(([user, gravity]) => ({
            user,
            gravity,
          }))
          .sort((a, b) => b.gravity - a.gravity); // Sort descending by gravity

        // Write results to new file
        const ws = fs.createWriteStream("./scripts/combined-merged.csv");

        fastcsv
          .write(result, { headers: true })
          .pipe(ws)
          .on("finish", () => {
            console.log(
              `Processed ${rows.length} records into ${result.length} unique entries`
            );
            console.log(
              "CSV file successfully processed and saved to combined-merged.csv"
            );
          });
      });
  });
