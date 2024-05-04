import hre, { ethers } from "hardhat";
import * as fs from "fs";
import { BytesLike, parseEther } from "ethers";
import data from "./airdropData.json";
import {
  BalanceLeaf,
  BalanceTree,
} from "../test/airdrop-utils/merkle-tree/BalanceTree";

type ChainInfo = {
  name: string;
  earlyZero: string;
};

type AddressInfo = {
  address: string;
  claimedAmount: string;
  claimableAmount: string;
  totalPoints: string;
  chain: ChainInfo[];
  proofs?: string[];
};

type MerkleProofType = {
  root: BytesLike;
  addressData: AddressInfo[];
};

let airdropData = data as { [key: string]: AddressInfo };
let itemsLength = Object.keys(data).length;
async function main() {
  let parsedData: MerkleProofType;
  let leaves: BalanceLeaf[] = [];

  for (let i = 1; i < itemsLength; i++) {
    let item = airdropData[String(i)];

    const account = item.address;
    const amount = BigInt(item.totalPoints);
    leaves.push({ account, amount });
  }

  const tree = new BalanceTree(leaves);
  const merkleRoot = tree.getHexRoot();
  parsedData = {
    root: merkleRoot,
    addressData: [],
  };

  let addressData = [];
  for (let i = 1; i < itemsLength; i++) {
    let element = airdropData[String(i)];
    const proofs = tree.getProof(element.address, BigInt(element.totalPoints));
    parsedData.addressData.push({
      ...element,
      proofs,
    });
  }

  const stringifiedData = JSON.stringify(parsedData, null, 2);
  fs.writeFileSync("scripts/airdropDataWithProofs.json", stringifiedData);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
