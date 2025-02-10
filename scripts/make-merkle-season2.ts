// import { BytesLike, parseEther } from "ethers";
// import * as fs from "fs";
// import {
//   BalanceLeaf,
//   BalanceTree,
// } from "../test/airdrop-utils/merkle-tree/BalanceTree";

// import data from "./airdropData.json";

// type AddressInfo = {
//   address: string;
//   totalAmount: string;
//   proofs?: string[];
// };

// type MerkleProofType = {
//   root: BytesLike;
//   addressData: AddressInfo[];
// };

// // Transform JSON data to the required format
// let formattedData = Object.entries(data).map(([userWallet, totalPoints]) => ({
//   userWallet,
//   totalPoints: parseFloat(totalPoints),
// }));

// console.log(
//   formattedData.reduce((prev, curr) => prev + curr.totalPoints, 0)
// );

// let itemsLength = formattedData.length;

// async function main() {
//   let leaves: BalanceLeaf[] = [];

//   console.log("Processing formatted data");

//   for (let i = 0; i < itemsLength; i++) {
//     let item = formattedData[i];

//     const account = item.userWallet;
//     const amount = parseEther(item.totalPoints.toString());
//     leaves.push({ account, amount });
//   }

//   const tree = new BalanceTree(leaves);
//   const merkleRoot = tree.getHexRoot();

//   console.log("Generated Merkle Tree Root:", merkleRoot);

//   const outputStream = fs.createWriteStream('./output.json');
//   outputStream.write('{"root":"' + merkleRoot + '", "addressData":[\n');

//   for (let i = 0; i < itemsLength; i++) {
//     const element = formattedData[i];
//     const proofs = tree.getProof(
//       element.userWallet,
//       parseEther(element.totalPoints.toString())
//     );

//     const record = {
//       address: element.userWallet.toLowerCase(),
//       totalAmount: parseEther(element.totalPoints.toString()).toString(),
//       proofs,
//     };

//     outputStream.write(JSON.stringify(record) + (i < itemsLength - 1 ? ',\n' : '\n'));
//   }
//   outputStream.write(']}');
//   outputStream.end();

//   console.log("Output written to output.json");
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

import { BytesLike, parseEther } from "ethers";
import * as fs from "fs";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";

import data from "./airdropData.json";

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

// Transform JSON data to the required format
let formattedData = Object.entries(data).map(([userWallet, totalPoints]) => ({
  userWallet,
  totalPoints: parseFloat(totalPoints),
}));

console.log(
  formattedData.reduce((prev, curr) => prev + curr.totalPoints, 0)
);

let itemsLength = formattedData.length;

async function main() {
  let leaves: BalanceLeaf[] = [];

  console.log("Processing formatted data");

  for (let i = 0; i < itemsLength; i++) {
    let item = formattedData[i];

    const account = item.userWallet;
    const amount = parseEther(item.totalPoints.toString());
    leaves.push({ account, amount });
  }

  const tree = new BalanceTree(leaves);
  const merkleRoot = tree.getHexRoot();

  console.log("Generated Merkle Tree Root:", merkleRoot);

  const outputStream = fs.createWriteStream('./output1.json');
  outputStream.write('{"root":"' + merkleRoot + '", "addressData":[\n');

  for (let i = 0; i < itemsLength; i++) {
    const element = formattedData[i];
    const proofs = tree.getProof(
      element.userWallet,
      parseEther(element.totalPoints.toString())
    );

    const record: MerkleProofDataType = {
      address: element.userWallet.toLowerCase(),
      totalAmount: parseEther(element.totalPoints.toString()).toString(),
      proofs,
    };

    outputStream.write(JSON.stringify(record) + (i < itemsLength - 1 ? ',\n' : '\n'));
  }
  outputStream.write(']}');
  outputStream.end();

  console.log("Output written to output.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
