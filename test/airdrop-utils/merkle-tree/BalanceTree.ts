import { ethers } from "hardhat";
import { MerkleTree } from "./MerkleTree";
import { AddressLike, BytesLike } from "ethers";

export type BalanceLeaf = { account: AddressLike; amount: bigint };

export class BalanceTree {
  private readonly tree: MerkleTree;
  constructor(balances: BalanceLeaf[]) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount }, index) => {
        return BalanceTree.toNode(account, amount);
      })
    );
  }

  public static verifyProof(
    index: number | BigInt,
    account: string,
    amount: BigInt,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(account, amount);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(abi.encode(index, account, amount))
  public static toNode(account: AddressLike, amount: BigInt): Buffer {
    return Buffer.from(
      ethers
        .solidityPackedKeccak256(["address", "uint256"], [account, amount])
        .substr(2),
      "hex"
    );
  }

  public getHexRoot(): BytesLike {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getProof(account: AddressLike, amount: BigInt): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(account, amount));
  }
}
