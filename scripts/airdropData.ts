import * as fs from "fs";
import { BytesLike, parseEther } from "ethers";
import data from "./data.json";
import * as mongo from "mongodb";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";

import zksync from "./a.json";

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

// Connection URL
const url = "mongodb://127.0.0.1:27017";
const client = new mongo.MongoClient(url);

let airdropData = data as AddressInput[];

const excludedWallets = zksync.filter((a) => {
  if (
    a.address.toLowerCase() ===
    "0xb76F765A785eCa438e1d95f594490088aFAF9acc".toLowerCase()
  )
    return false;

  if (
    a.address.toLowerCase() ===
    "0xBE2F0354D970265BFc36D383af77F72736b81B54".toLowerCase()
  )
    return false;
  return (
    airdropData.findIndex(
      (b) => a.address.toLowerCase() == b.wallet.toLowerCase()
    ) == -1
  );
});

airdropData = [
  ...airdropData,
  ...excludedWallets.map((a) => ({
    wallet: a.address,
    zero: a.data,
    skewed: a.data,
    usd: a.data,
  })),
];

console.log("got", excludedWallets.length);

// airdropData = airdropData.filter((a) => a.usd > 5);
console.log(airdropData.reduce((prev, curr) => prev + curr.zero, 0));

let itemsLength = Object.keys(airdropData).length;
async function main() {
  let parsedData: MerkleProofType;
  let leaves: BalanceLeaf[] = [];

  await client.connect();
  const db = client.db("merkle");
  const collection = db.collection("proofs");

  console.log("hit", airdropData.length);

  for (let i = 0; i < itemsLength; i++) {
    let item = airdropData[i];

    const account = item.wallet;
    const amount = parseEther(Math.floor(item.zero).toString());
    leaves.push({ account, amount });
  }

  const tree = new BalanceTree(leaves);
  const merkleRoot = tree.getHexRoot();
  parsedData = {
    root: merkleRoot,
    addressData: [],
  };

  console.log("Connected successfully to server");
  console.log("working on proofs");

  const proofsData = [];
  for (let i = 0; i < itemsLength; i++) {
    const element = airdropData[i];
    const proofs = tree.getProof(
      element.wallet,
      parseEther(Math.floor(element.zero).toString())
    );

    proofsData.push({
      address: element.wallet.toLowerCase(),
      totalAmount: parseEther(Math.floor(element.zero).toString()).toString(),
      proofs,
    });
  }

  console.log("writing to db");
  await collection.drop();

  const batch = 1000;
  for (let index = 0; index < proofsData.length / batch; index++) {
    console.log("work", index);
    const elements = proofsData.slice(batch * index, batch * (index + 1));
    await collection.bulkWrite(
      elements.map((e) => ({ insertOne: { document: e } }))
    );
  }

  console.log("done", merkleRoot);

  // const stringifiedData = JSON.stringify(parsedData);
  // fs.writeFileSync(
  //   "scripts/earlyZeroAirdropDataWithProofs.json",
  //   stringifiedData
  // );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
