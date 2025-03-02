import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync } from "fs";

interface Partner {
  user: string;
  gravity: number;
}

// Read and parse the CSV file
const csvData = readFileSync("scripts/partners.csv", "utf-8");
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
});

// Process and merge duplicates
const mergedPartners = new Map<string, number>();

records.forEach((record: Partner) => {
  const user = record.user.toLowerCase(); // normalize addresses
  const gravity = Number(record.gravity);

  if (mergedPartners.has(user)) {
    // Add gravity to existing entry
    mergedPartners.set(user, mergedPartners.get(user)! + gravity);
  } else {
    // Create new entry
    mergedPartners.set(user, gravity);
  }
});

// Convert back to array and sort by gravity
const result = Array.from(mergedPartners.entries())
  .map(([user, gravity]) => ({ user, gravity }))
  .sort((a, b) => b.gravity - a.gravity);

// Write results to new file
const outputPath = "scripts/partners-merged.csv";
const csvOutput = [
  "user,gravity",
  ...result.map((p) => `${p.user},${p.gravity}`),
].join("\n");
writeFileSync(outputPath, csvOutput);

console.log(
  `Processed ${records.length} records into ${result.length} unique entries`
);
console.log(`Results written to ${outputPath}`);
