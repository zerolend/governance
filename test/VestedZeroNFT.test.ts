import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VestedZeroNFT, ZeroLend } from "../types";
import { e18, initMainnetUser } from "./fixtures/utils";
import { lock, parseEther, parseUnits } from "ethers";
import { ethers } from "hardhat";

describe("VestedZeroNFT", () => {
  let ant: SignerWithAddress;
  let deployer: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;
  let zero: ZeroLend;

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    ant = deployment.ant;
    deployer = deployment.deployer;
    vest = deployment.vestedZeroNFT;
    zero = await ethers.getContractAt("ZeroLend", await deployment.zero.target);

    await zero.whitelist(vest.target, true);
  });

  describe("mint() without penalties", () => {
    beforeEach(async () => {
      expect(await vest.lastTokenId()).to.equal(0);
      now = Math.floor(Date.now() / 1000);

      // deployer should be able to mint a nft for another user
      await vest.mint(
        ant.address,
        e18 * 15n, // 15 ZERO linear vesting
        e18 * 5n, // 5 ZERO upfront
        1000, // linear duration - 1000 seconds
        500, // cliff duration - 500 seconds
        now + 1000, // unlock date
        false, // penalty -> false
        0
      );

      expect(await vest.lastTokenId()).to.equal(1);
    });

    it("should mint one nft properly for a user", async function () {
      expect(await vest.balanceOf(ant)).to.equal(1);
      expect(await vest.ownerOf(1)).to.equal(ant.address);
      expect(await vest.tokenOfOwnerByIndex(ant.address, 0)).to.equal(1);
    });

    it("should not claim any rewards before the unlock date", async function () {
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(0n);
      expect(res.pending).to.equal(0n);

      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.equal(0);
      expect(await vest.unclaimed(1)).to.equal(e18 * 20n);
    });
    it("should claim only the cliff at the unlock date", async function () {
      await time.increaseTo(now + 1000);
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(0n);

      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(e18 * 5n);
      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.equal(e18 * 5n);
      expect(await vest.unclaimed(1)).to.equal(e18 * 15n);
    });
    it("should claim only the cliff after the unlock date within the cliff duration", async function () {
      await time.increaseTo(now + 1000 + 250);
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(0n);

      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(e18 * 5n);
      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.equal(e18 * 5n);
      expect(await vest.unclaimed(1)).to.equal(e18 * 15n);
    });
    it("should claim the cliff and a bit of the linear vesting once cliff gets over", async function () {
      await time.increaseTo(now + 1000 + 500 + 10);
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.greaterThan(0n);
      expect(res.pending).to.lessThan(e18);

      expect(await vest["claim(uint256)"].staticCall(1)).to.greaterThan(
        e18 * 5n
      );
      expect(await vest["claim(uint256)"].staticCall(1)).to.lessThan(e18 * 6n);
      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.greaterThan(e18 * 5n);
      expect(await vest.claimed(1)).to.lessThan(e18 * 6n);
      expect(await vest.unclaimed(1)).to.lessThan(e18 * 15n);
      expect(await vest.unclaimed(1)).to.greaterThan(e18 * 14n);
    });
    it("should half the linear distribution mid way through", async function () {
      await time.increaseTo(now + 1000 + 500 + 500);
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal((e18 * 75n) / 10n);

      const expt = (e18 * 125n) / 100n;
      expect(await vest["claim(uint256)"].staticCall(1)).to.greaterThanOrEqual(
        expt
      );
      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.greaterThanOrEqual(expt);
      expect(await vest.unclaimed(1)).to.lessThanOrEqual((e18 * 75n) / 10n);
    });
    it("should claim everything after the linear distribution date is done", async function () {
      await time.increaseTo(now + 1000 + 500 + 1000);
      const res = await vest["claimable(uint256)"](1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(e18 * 15n);

      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(e18 * 20n);
      await vest["claim(uint256)"](1);
      expect(await vest.claimed(1)).to.equal(e18 * 20n);
      expect(await vest.unclaimed(1)).to.equal(0);
    });
    it("handle multiple claims across equal intervals of time", async function () {
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(0);
      await vest["claim(uint256)"](1);

      // trigger the cliff
      await time.increaseTo(now + 1000);
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(e18 * 5n);
      await vest["claim(uint256)"](1);
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(0);

      // stay within the cliff
      await time.increaseTo(now + 1000 + 500);
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(0);
      await vest["claim(uint256)"](1);

      // stay within the cliff and claim something linear
      await time.increaseTo(now + 1000 + 500 + 500);
      expect(await vest["claim(uint256)"].staticCall(1)).to.greaterThan(
        (e18 * 74n) / 10n
      );
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(
        (e18 * 75n) / 10n
      );
      await vest["claim(uint256)"](1);

      await time.increaseTo(now + 1000 + 500 + 1000);
      expect(await vest["claim(uint256)"].staticCall(1)).to.greaterThan(
        (e18 * 74n) / 10n
      );
      expect(await vest["claim(uint256)"].staticCall(1)).to.lessThan(
        (e18 * 75n) / 10n
      );
      await vest["claim(uint256)"](1);
      expect(await vest["claim(uint256)"].staticCall(1)).to.eq(0);
    });
    it("should split a token correctly", async function () {
      // Split the token
      const token1LockDetailsBefore = await vest.tokenIdToLockDetails(1);
      expect(token1LockDetailsBefore.pending).to.equal(15000000000000000000n);
      expect(token1LockDetailsBefore.upfront).to.equal(5000000000000000000n);
      await vest.connect(ant).split(1, 5000);

      // Check the token details after splitting
      const token1LockDetails = await vest.tokenIdToLockDetails(1);
      const token2LockDetails = await vest.tokenIdToLockDetails(2);

      // Assert the correctness of the split
      expect(token1LockDetails.pending).to.equal(7500000000000000000n);
      expect(token2LockDetails.pending).to.equal(7500000000000000000n);
      expect(token1LockDetails.upfront).to.equal(2500000000000000000n);
      expect(token2LockDetails.upfront).to.equal(2500000000000000000n);
      expect(token1LockDetails.pendingClaimed).to.equal(0);
      expect(token2LockDetails.pendingClaimed).to.equal(0);
      expect(token1LockDetails.upfrontClaimed).to.equal(0);
      expect(token2LockDetails.upfrontClaimed).to.equal(0);
    });
  });

  describe("mint() with penalties", () => {
    beforeEach(async () => {
      expect(await vest.lastTokenId()).to.equal(0);

      // deployer should be able to mint a nft for another user
      await vest.mint(
        ant.address,
        e18 * 20n, // 20 ZERO linear vesting
        0, // 0 ZERO upfront
        1000, // linear duration - 1000 seconds
        0, // cliff duration - 0 seconds
        0, // unlock date
        true, // penalty -> false
        0
      );

      expect(await vest.lastTokenId()).to.equal(1);
    });

    it("should mint one nft properly for a user", async function () {
      expect(await vest.balanceOf(ant)).to.equal(1);
      expect(await vest.ownerOf(1)).to.equal(ant.address);
      expect(await vest.tokenOfOwnerByIndex(ant.address, 0)).to.equal(1);
    });

    it("Should return the correct penalty amount 0 if unlock period is passed", async function () {
      const lockDetails = await vest.tokenIdToLockDetails(1);
      await time.increaseTo(
        lockDetails.unlockDate +
          lockDetails.cliffDuration +
          lockDetails.linearDuration +
          1n
      );
      const penaltyAmount = await vest.penalty(1);

      expect(penaltyAmount).to.eq(0n);
    });

    it("Should return the penalty amount close to 25% if unlock period is reached", async function () {
      const lockDetails = await vest.tokenIdToLockDetails(1);
      await time.increaseTo(
        lockDetails.unlockDate +
          lockDetails.cliffDuration +
          lockDetails.linearDuration
      );
      const penaltyAmount = await vest.penalty(1);

      expect(penaltyAmount).to.eq(e18 * 5n);
    });

    it("should claim some amount with penalty at halfway through", async function () {
      await zero.whitelist(await vest.stakingBonus(), true);
      await time.increaseTo(now + 1300);
      expect(await vest["claim(uint256)"].staticCall(1)).to.closeTo(
        20000000000000000000n,
        parseUnits("1", 17)
      );
    });
  });

  it("Should update cliff durations for multiple tokens", async function () {
    await vest.mint(ant.address, e18 * 10n, e18 * 5n, 1000, 500, 0, false, 0);
    await vest.mint(ant.address, e18 * 20n, e18 * 5n, 1000, 500, 0, false, 0);

    await vest.mint(ant.address, e18 * 30n, e18 * 5n, 1000, 500, 0, false, 0);

    const tokenIds = [1, 2, 3];
    const linearDurations = [100, 200, 150];
    const cliffDurations = [50, 80, 60];

    // Call the updateCliffDuration function
    await vest.updateCliffDuration(tokenIds, linearDurations, cliffDurations);

    // Check if cliff durations are updated correctly
    for (let i = 0; i < tokenIds.length; i++) {
      const lockDetails = await vest.tokenIdToLockDetails(tokenIds[i]);
      expect(lockDetails.cliffDuration).to.equal(cliffDurations[i]);
      expect(lockDetails.linearDuration).to.equal(linearDurations[i]);
    }
  });

  it("Should return true for supported interfaces", async function () {
    // Check if the contract supports ERC165 interface
    const supportsERC165 = await vest.supportsInterface("0x01ffc9a7");
    expect(supportsERC165).to.be.true;

    // Check if the contract supports ERC721 interface
    const supportsERC721 = await vest.supportsInterface("0x80ac58cd");
    expect(supportsERC721).to.be.true;

    // Check if the contract supports ERC721Enumerable interface
    const supportsERC721Enumerable = await vest.supportsInterface("0x780e9d63");
    expect(supportsERC721Enumerable).to.be.true;
  });

  it("Should return correct royalty information", async function () {
    const [royaltyReceiverSigner] = await ethers.getSigners();
    const tokenId = 1;
    const salePrice = parseEther("1"); // Assuming sale price in Ether
    const expectedRoyaltyAmount =
      (salePrice * (await vest.royaltyFraction())) / (await vest.denominator());

    const [royaltyReceiver, royaltyAmount] = await vest.royaltyInfo(
      tokenId,
      salePrice
    );

    expect(royaltyReceiver).to.equal(royaltyReceiverSigner.address); // Assuming the royalty receiver address
    expect(royaltyAmount).to.equal(expectedRoyaltyAmount);
  });

  it("Should return correct token URI", async function () {
    const tokenId = 1;
    const expectedTokenURI = "tokenId"; // Assuming the base URI and token ID

    const tokenURI = await vest.tokenURI(tokenId);

    expect(tokenURI).to.equal(expectedTokenURI);
  });

  it("Should allow staking bonus to claim unvested tokens", async function () {
    const stakingBonusSigner = await initMainnetUser(
      await vest.stakingBonus(),
      parseEther("1")
    );
    await zero.whitelist(stakingBonusSigner.address, true);
    await vest.mint(ant.address, e18 * 15n, e18 * 5n, 1000, 500, 0, false, 0);
    const expectedPending = await vest.unclaimed(1);
    await vest.connect(stakingBonusSigner).claimUnvested(1);

    const stakingBonusBalance = await zero.balanceOf(
      stakingBonusSigner.address
    );
    expect(stakingBonusBalance).to.equal(expectedPending);
  });

  it("Should toggle pause state", async function () {
    const initialPauseState = await vest.paused();

    await vest.togglePause();
    const pauseStateAfterToggle = await vest.paused();

    expect(pauseStateAfterToggle).to.equal(!initialPauseState);
  });

  it("Should freeze/unfreeze a token", async function () {
    await vest.mint(ant.address, e18 * 15n, e18 * 5n, 1000, 500, 0, false, 0);
    const tokenId = 1;
    const initialFrozenState = await vest.frozen(tokenId);

    await vest.freeze(tokenId, !initialFrozenState);
    const frozenStateAfterToggle = await vest.frozen(tokenId);

    expect(frozenStateAfterToggle).to.equal(!initialFrozenState);
  });
});
