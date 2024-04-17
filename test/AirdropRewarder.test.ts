import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AirdropRewarder } from "../typechain-types";
import { deploy, deployProxy } from "./airdrop-utils/deploy";

import {
  BalanceLeaf,
  BalanceTree,
} from "./airdrop-utils/merkle-tree/BalanceTree";
import { ethers } from "hardhat";
import { AddressLike, Contract, parseEther } from "ethers";
import { expect } from "chai";

describe("Airdrop Tests", async () => {
  let airdropRewarder: AirdropRewarder;
  let airdropToken: Contract;
  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let tree: BalanceTree;
  let leaves: BalanceLeaf[];
  let accounts: SignerWithAddress[];

  beforeEach("Deploy Airdrop Contracts", async () => {
    accounts = await ethers.getSigners();
    [owner, user1, user2, user3] = accounts;
    leaves = [user1.address, user2.address].map((account, i) => ({
      account: <AddressLike>account,
      amount: parseEther((i + 1).toString()), // user1: 1, user2: 2
    }));
    tree = new BalanceTree(leaves);

    airdropToken = await deploy("MockReward", owner.address);
    await airdropToken.waitForDeployment();

    airdropRewarder = (await deployProxy(
      "AirdropRewarder",
      "initialize(bytes32,address)",
      tree.getHexRoot(),
      airdropToken.target
    )) as unknown as AirdropRewarder;

    await airdropToken.mint(airdropRewarder.target, parseEther("1000"));

    await airdropRewarder.setMerkleRoot(tree.getHexRoot());
  });

  it("Cannot claim with wrong amount", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder
        .connect(user1)
        .claim(leaves[0].account, parseEther("0.5"), proof)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Cannot claim with other user", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder
        .connect(user1)
        .claim(leaves[1].account, parseEther("2"), proof)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Cannot claim for address other proof", async () => {
    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("2"), proof1)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Can claim successfully", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("1"), proof0)
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
  });

  it("Cannot claim again", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("1"), proof0)
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("1"), proof0)
    )
      .to.be.revertedWithCustomError(airdropRewarder, "RewardsAlreadyClaimed")
  });

  it("can claim for multiple users", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("1"), proof0)
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));

    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarder.claim(leaves[1].account, parseEther("2"), proof1)
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[1].account, parseEther("2"));
  });
});
