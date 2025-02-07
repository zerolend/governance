import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    AirdropRewarderS2,
  LockerToken,
  VestedZeroNFT,
  ZeroLend,
} from "../types";
import { deployProxy } from "./airdrop-utils/deploy";

import {
  BalanceLeaf,
  BalanceTree,
} from "./airdrop-utils/merkle-tree/BalanceTree";
import { ethers } from "hardhat";
import { AddressLike, parseEther } from "ethers";
import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { initProxy } from "./fixtures/utils";

describe("Airdrop Tests", async () => {
  let airdropRewarderS2: AirdropRewarderS2;
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

    airdropRewarderS2 = await initProxy<AirdropRewarderS2>("AirdropRewarderS2");
    await airdropRewarderS2.initialize(
      zero.target,
      vest.target,
      1739024867,
      1739111267,
      [user1.address, user2.address],
    );
    await airdropRewarderS2.setMerkleRoot(tree.getHexRoot());
    await zero.whitelist(airdropRewarderS2.target, true);
    await zero.transfer(airdropRewarderS2.target, parseEther("100"));
    await zero.whitelist(locker.target, true);
  });

  it("Cannot claim with wrong amount", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarderS2
        .connect(user1)
        .claim(leaves[0].account, parseEther("0.5"), proof)
    ).to.be.revertedWithCustomError(airdropRewarderS2, "InvalidMerkleProof");
  });

  it("Cannot claim with other user", async () => {
    const proof = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarderS2
        .connect(user1)
        .claim(leaves[1].account, parseEther("2"), proof)
    ).to.be.revertedWithCustomError(airdropRewarderS2, "InvalidMerkleProof");
  });

  it("Cannot claim for address other proof", async () => {
    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarderS2.claim(leaves[0].account, parseEther("2"), proof1)
    ).to.be.revertedWithCustomError(airdropRewarderS2, "InvalidMerkleProof");
  });

  it("Can claim and lock successfully", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarderS2.claim(
      leaves[0].account,
      parseEther("1"),
      proof0
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsTransferred")
      .withArgs(leaves[0].account, parseEther("0.4"));
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsLocked")
      .withArgs(leaves[0].account, parseEther("0.6"));
  });

  it("Can claim successfully", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarderS2.claim(
      leaves[0].account,
      parseEther("1"),
      proof0
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsTransferred")
      .withArgs(leaves[0].account, parseEther("0.4"));
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsLocked")
      .withArgs(leaves[0].account, parseEther("0.6"));
  });

  it("Cannot claim again", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    const claimTransaction = airdropRewarderS2.claim(
      leaves[0].account,
      parseEther("1"),
      proof0
    );
    await expect(claimTransaction)
      .to.emit(airdropRewarderS2, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));
    await expect(
      airdropRewarderS2.claim(
        leaves[0].account,
        parseEther("1"),
        proof0
      )
    ).to.be.revertedWithCustomError(airdropRewarderS2, "RewardsAlreadyClaimed");
  });

  it("can claim for multiple users", async () => {
    const proof0 = tree.getProof(leaves[0].account, leaves[0].amount);
    await expect(
      airdropRewarderS2.claim(
        leaves[0].account,
        parseEther("1"),
        proof0
      )
    )
      .to.emit(airdropRewarderS2, "RewardsClaimed")
      .withArgs(leaves[0].account, parseEther("1"));

    const proof1 = tree.getProof(leaves[1].account, leaves[1].amount);
    await expect(
      airdropRewarderS2.claim(
        leaves[1].account,
        parseEther("2"),
        proof1
      )
    )
      .to.emit(airdropRewarderS2, "RewardsClaimed")
      .withArgs(leaves[1].account, parseEther("2"));
  });
});
