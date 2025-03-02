import { BytesLike, parseEther } from "ethers";
import * as fs from "fs";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";

import data from "./skewed-distribution.json";

type AddressInfo = {
  address: string;
  totalAmount: string;
  proofs?: string[];
};

type MerkleProofType = {
  root: BytesLike;
  addressData: MerkleProofDataType[];
};

export interface MerkleProofDataType {
  address: string;
  totalAmount: string;
  proofs: string[];
}

type Obj = {
  address: string;
  allocation: string;
};

// Transform JSON data to the required format
let formattedData: Obj[] = (data as any)
  .map((d: any) => ({
    address: d.address,
    allocation: parseFloat(d.allocation).toFixed(4),
  }))
  .filter((a: any) => Number(a.allocation) > 0);

console.log(
  formattedData.reduce((prev, curr) => prev + Number(curr.allocation), 0)
);

let itemsLength = formattedData.length;

async function main() {
  let leaves: BalanceLeaf[] = [];

  console.log("Processing formatted data");

  for (let i = 0; i < itemsLength; i++) {
    let item = formattedData[i];

    const account = item.address;
    const amount = parseEther(item.allocation);
    leaves.push({ account, amount });
  }

  const tree = new BalanceTree(leaves);
  const merkleRoot = tree.getHexRoot();

  console.log("Generated Merkle Tree Root:", merkleRoot);

  const outputStream = fs.createWriteStream("./output1.json");
  outputStream.write('{"root":"' + merkleRoot + '", "addressData":[\n');

  for (let i = 0; i < itemsLength; i++) {
    const element = formattedData[i];
    // console.log("getting proof for", element.address, element.allocation);
    const proofs = tree.getProof(
      element.address,
      parseEther(element.allocation)
    );

    const record: MerkleProofDataType = {
      address: element.address.toLowerCase(),
      totalAmount: parseEther(element.allocation.toString()).toString(),
      proofs,
    };

    outputStream.write(
      JSON.stringify(record) + (i < itemsLength - 1 ? ",\n" : "\n")
    );
  }
  outputStream.write("]}");
  outputStream.end();

  console.log("Output written to output.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
