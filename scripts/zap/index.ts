import hre from "hardhat";
import { assembleTx, generateQuote } from "./odos";
import { parseEther } from "ethers";

const WETH = "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f";
const ZERO = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const LP_TOKEN = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const ZAP_ADDRESS = "0x73ad3d747A5aAd679C0FEC0aDFc47176eEf8dF68";

async function main() {
  const contract = await hre.ethers.getContractAt("Zap", ZAP_ADDRESS);

  // user set input on how much eth and zero the user would like to
  // stake into DLP
  const ethToSend = parseEther("0.01");
  const zeroToSend = parseEther("0");
  const lockDuration = 86400 * 365;

  const inputTokens = [];
  if (ethToSend > 0n) inputTokens.push({});

  // get quote from odos
  const quote = await generateQuote({
    chainId: hre.network.config.chainId || 59144,
    inputTokens: [
      ...(ethToSend > 0
        ? [
            {
              tokenAddress: WETH,
              amount: ethToSend.toString(),
            },
          ]
        : []),
      ...(zeroToSend > 0
        ? [
            {
              tokenAddress: ZERO,
              amount: zeroToSend.toString(),
            },
          ]
        : []),
    ],
    outputTokens: [
      {
        tokenAddress: LP_TOKEN,
        proportion: 1,
      },
    ],
    userAddr: contract.target.toString(),
  });

  if (!quote) throw new Error("invalid quote from odos");

  // prepare tx from odos
  const txData = await assembleTx(contract.target.toString(), quote);
  if (!txData) throw new Error("invalid assemble from odos");

  console.log("got from odos", txData.transaction);

  const tx = await contract.zapAndStake(
    lockDuration,
    zeroToSend,
    0,
    txData.transaction.data,
    {
      value: ethToSend,
    }
  );

  console.log(tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
