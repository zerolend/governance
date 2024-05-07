import * as fs from "fs";
import { BytesLike, parseEther } from "ethers";
import data from "./earlyZero.json";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";

type AddressInfo = {
  address: string;
  totalAmount: string;
  proofs?: string[];
};

type AddressInput = {
  wallet: string;
  zero: number;
  skewed: number;
  usd: number;
};

type MerkleProofType = {
  root: BytesLike;
  addressData: AddressInfo[];
};

let airdropData = data as AddressInput[];
airdropData = airdropData.filter((a) => a.usd > 5);
let itemsLength = Object.keys(airdropData).length;
async function main() {
  let parsedData: MerkleProofType;
  let leaves: BalanceLeaf[] = [];

  console.log("hit", airdropData.length);
  for (let i = 0; i < itemsLength; i++) {
    let item = airdropData[i];

    const account = item.wallet;
    const amount = parseEther(Math.floor(item.skewed).toString());
    leaves.push({ account, amount });
  }

  const tree = new BalanceTree(leaves);
  const merkleRoot = tree.getHexRoot();
  parsedData = {
    root: merkleRoot,
    addressData: [],
  };

  console.log("working on proofs");
  for (let i = 0; i < itemsLength; i++) {
    const element = airdropData[i];
    const proofs = tree.getProof(
      element.wallet,
      parseEther(Math.floor(element.skewed).toString())
    );
    parsedData.addressData.push({
      address: element.wallet,
      totalAmount: parseEther(Math.floor(element.zero).toString()).toString(),
      proofs,
    });
  }

  console.log("done");

  const stringifiedData = JSON.stringify(parsedData);
  fs.writeFileSync(
    "scripts/earlyZeroAirdropDataWithProofs.json",
    stringifiedData
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
