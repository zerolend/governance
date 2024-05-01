import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  AirdropRewarder,
  LockerToken,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { deployProxy } from "./airdrop-utils/deploy";

import {
  BalanceLeaf,
  BalanceTree,
} from "./airdrop-utils/merkle-tree/BalanceTree";
import { ethers } from "hardhat";
import { AddressLike, parseEther } from "ethers";
import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";

describe("Airdrop Tests", async () => {
  let airdropRewarder: AirdropRewarder;
  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let tree: BalanceTree;
  let leaves: BalanceLeaf[] = [];
  let accounts: SignerWithAddress[];
  let locker: LockerToken;
  let zero: ZeroLend;
  let vest: VestedZeroNFT;

  beforeEach("Deploy Airdrop Contracts", async () => {
    accounts = await ethers.getSigners();
    [owner, user1, user2, user3] = accounts;
    leaves = [user1.address, user2.address].map((account, i) => ({
      account: <AddressLike>account,
      amount: parseEther((i + 1).toString()), // user1: 1, user2: 2
    }));
    tree = new BalanceTree(leaves);
    const governance = await deployGovernance();
    locker = governance.lockerToken;
    zero = governance.zero;
    vest = governance.vestedZeroNFT;

    await zero.whitelist(governance.lockerToken.target, true);
    await zero.whitelist(vest.target, true);

    airdropRewarder = (await deployProxy(
      "AirdropRewarder",
      "initialize(address,address,address)",
      zero.target,
      locker.target,
      vest.target
    )) as unknown as AirdropRewarder;
    await airdropRewarder.setMerkleRoot(tree.getHexRoot());
    await zero.whitelist(airdropRewarder.target, true);
    await zero.transfer(airdropRewarder.target, parseEther("100"));
    await zero.whitelist(locker.target, true);
  });

  it("Cannot claim with wrong amount", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder
        .connect(user1)
        .claim(leaves[0].account, parseEther("0.5"), proof, true, 0)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Cannot claim with other user", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder
        .connect(user1)
        .claim(leaves[1].account, parseEther("2"), proof, true, 0)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Cannot claim for address other proof", async () => {
    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarder.claim(leaves[0].account, parseEther("2"), proof1, true, 0)
    ).to.be.revertedWithCustomError(airdropRewarder, "InvalidMerkleProof");
  });

  it("Can claim and lock successfully", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarder.claim(
      leaves[0].account,
      parseEther("1"),
      proof0,
      true,
      31536000
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsTransferred")
      .withArgs(leaves[0].account, parseEther("0.4"));
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsLocked")
      .withArgs(leaves[0].account, parseEther("0.6"));
  });

  it("Can claim successfully", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarder.claim(
      leaves[0].account,
      parseEther("1"),
      proof0,
      true,
      31536000
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsTransferred")
      .withArgs(leaves[0].account, parseEther("0.4"));
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsLocked")
      .withArgs(leaves[0].account, parseEther("0.6"));
  });

  it("Cannot claim again", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarder.claim(
      leaves[0].account,
      parseEther("1"),
      proof0,
      false,
      31536000
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(
      airdropRewarder.claim(
        leaves[0].account,
        parseEther("1"),
        proof0,
        true,
        31536000
      )
    ).to.be.revertedWithCustomError(airdropRewarder, "RewardsAlreadyClaimed");
  });

  it("can claim for multiple users", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarder.claim(
        leaves[0].account,
        parseEther("1"),
        proof0,
        true,
        31536000
      )
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));

    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarder.claim(
        leaves[1].account,
        parseEther("2"),
        proof1,
        true,
        31536000
      )
    )
      .to.emit(airdropRewarder, "RewardsClaimed")
      .withArgs(leaves[1].account, parseEther("2"));
  });
});
