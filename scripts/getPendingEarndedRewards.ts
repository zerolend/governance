import hre from "hardhat";
import fs from "fs";
import { resolve } from "path";
import { AddressLike, formatEther, parseEther } from "ethers";
import multicallAbi from "./data/multicall-abi.json";

const main = async function () {
  const OmnichainStakingToken = await hre.ethers.getContractAt(
    "OmnichainStakingToken",
    "0xf374229a18ff691406f99ccbd93e8a3f16b68888"
  );

  const multicall = new hre.ethers.Contract(
    "0xcA11bde05977b3631167028862bE2a173976CA11",
    new hre.ethers.Interface(multicallAbi),
    hre.ethers.provider
  );

  const balncesCsv = fs.readFileSync(resolve(__dirname, "./data/balances.csv"));
  const lines = balncesCsv
    .toString()
    .split("\n")
    .map((l) => l.split('","').map((c) => c.replace(/[",]/g, "")))
    .map((c) => [c[0], Number(c[1])]);

  fs.writeFileSync(
    resolve(__dirname, "./data/results.csv"),
    "address,balance,earned\n"
  );

  const batchSizes = 1000;
  for (let i = 0; i < lines.length; i += batchSizes) {
    console.log(`Processing ${i} to ${i + batchSizes}`);
    const batch = lines.slice(i, i + batchSizes);
    // Process each batch

    const calls = batch.map(([address]) => ({
      target: OmnichainStakingToken.target,
      allowFailure: false,
      callData: OmnichainStakingToken.interface.encodeFunctionData("earned", [
        address as AddressLike,
      ]),
    }));

    const results: { success: boolean; returnData: string }[] =
      await multicall.aggregate3.staticCall(calls);

    const parsed = results.map((result, index) => {
      const earned = OmnichainStakingToken.interface.decodeFunctionResult(
        "earned",
        result.returnData
      );
      return {
        address: batch[index][0],
        earned: Number(formatEther(earned[0].toString())),
        balance: batch[index][1],
      };
    });

    const data = parsed
      .map((p) => `${p.address},${p.balance},${p.earned}\n`)
      .join("");

    fs.writeFileSync(resolve(__dirname, "./data/results.csv"), data, {
      flag: "a",
    });
  }
};

main();
