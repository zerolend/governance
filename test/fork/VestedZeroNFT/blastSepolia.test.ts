import { expect } from "chai";
import { e18, initMainnetUser } from "../../fixtures/utils";
import { setup } from "./setup";
import { VestedZeroNFT, ZeroLend } from "../../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { setForkBlock } from "../utils";
import { getNetworkDetails } from "./constants";
import { Contract, parseEther, parseUnits } from "ethers";
import { ethers } from "hardhat";

const FORK = process.env.FORK === "true";
const FORKED_NETWORK = process.env.FORKED_NETWORK ?? "";

if (FORK) {
  describe("VestedZeroNFT", () => {
    let now: number;
    let ant: SignerWithAddress;
    let deployer: SignerWithAddress;
    let deployerForked: SignerWithAddress;
    let vest: VestedZeroNFT;
    let zero: Contract;

    beforeEach(async () => {
      [deployerForked] = await ethers.getSigners();
      const networkDetails = getNetworkDetails(FORKED_NETWORK);
      await setForkBlock(networkDetails.BLOCK_NUMBER);
      const deployment = await setup(networkDetails);
      vest = deployment.vestedZeroNFT;
      zero = deployment.zero;
      now = Math.floor(Date.now() / 1000);

      //Creating mainnet users
      ant = await initMainnetUser(networkDetails.ant, parseEther("1"));
      deployer = await initMainnetUser(
        networkDetails.deployer,
        parseEther("1")
      );
    });

    describe("mint() without penalties", () => {
      beforeEach(async () => {
        expect(await vest.lastTokenId()).to.equal(0);

        // deployer should be able to mint a nft for another user
        await zero
          .connect(deployer)
          .transfer(deployerForked.address, e18 * 20n);
        await zero.connect(deployerForked).approve(vest.target, e18 * 20n);

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
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(0n);
        expect(res.pending).to.equal(0n);

        await vest.claim(1);
        expect(await vest.claimed(1)).to.equal(0);
        expect(await vest.unclaimed(1)).to.equal(e18 * 20n);
      });
      it("should claim only the cliff at the unlock date", async function () {
        await time.increaseTo(now + 1000);
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(e18 * 5n);
        expect(res.pending).to.equal(0n);

        expect(await vest.claim.staticCall(1)).to.eq(e18 * 5n);
        await vest.claim(1);
        expect(await vest.claimed(1)).to.equal(e18 * 5n);
        expect(await vest.unclaimed(1)).to.equal(e18 * 15n);
      });
      it("should claim only the cliff after the unlock date within the cliff duration", async function () {
        await time.increaseTo(now + 1000 + 250);
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(e18 * 5n);
        expect(res.pending).to.equal(0n);

        expect(await vest.claim.staticCall(1)).to.eq(e18 * 5n);
        await vest.claim(1);
        expect(await vest.claimed(1)).to.equal(e18 * 5n);
        expect(await vest.unclaimed(1)).to.equal(e18 * 15n);
      });
      it("should claim the cliff and a bit of the linear vesting once cliff gets over", async function () {
        await time.increaseTo(now + 1000 + 500 + 10);
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(e18 * 5n);
        expect(res.pending).to.greaterThan(0n);
        expect(res.pending).to.lessThan(e18);

        expect(await vest.claim.staticCall(1)).to.greaterThan(e18 * 5n);
        expect(await vest.claim.staticCall(1)).to.lessThan(e18 * 6n);
        await vest.claim(1);
        expect(await vest.claimed(1)).to.greaterThan(e18 * 5n);
        expect(await vest.claimed(1)).to.lessThan(e18 * 6n);
        expect(await vest.unclaimed(1)).to.lessThan(e18 * 15n);
        expect(await vest.unclaimed(1)).to.greaterThan(e18 * 14n);
      });
      it("should half the linear distribution mid way through", async function () {
        await time.increaseTo(now + 1000 + 500 + 500);
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(e18 * 5n);
        expect(res.pending).to.equal((e18 * 75n) / 10n);

        const expected = (e18 * 125n) / 100n;
        expect(await vest.claim.staticCall(1)).to.greaterThanOrEqual(expected);
        await vest.claim(1);
        expect(await vest.claimed(1)).to.greaterThanOrEqual(expected);
        expect(await vest.unclaimed(1)).to.lessThanOrEqual((e18 * 75n) / 10n);
      });
      it("should claim everything after the linear distribution date is done", async function () {
        await time.increaseTo(now + 1000 + 500 + 1000);
        const res = await vest.claimable(1);
        expect(res.upfront).to.equal(e18 * 5n);
        expect(res.pending).to.equal(e18 * 15n);

        expect(await vest.claim.staticCall(1)).to.eq(e18 * 20n);
        await vest.claim(1);
        expect(await vest.claimed(1)).to.equal(e18 * 20n);
        expect(await vest.unclaimed(1)).to.equal(0);
      });
      it("handle multiple claims across equal intervals of time", async function () {
        expect(await vest.claim.staticCall(1)).to.eq(0);
        await vest.claim(1);

        // trigger the cliff
        await time.increaseTo(now + 1000);
        expect(await vest.claim.staticCall(1)).to.eq(e18 * 5n);
        await vest.claim(1);
        expect(await vest.claim.staticCall(1)).to.eq(0);

        // stay within the cliff
        await time.increaseTo(now + 1000 + 500);
        expect(await vest.claim.staticCall(1)).to.eq(0);
        await vest.claim(1);

        // stay within the cliff and claim something linear
        await time.increaseTo(now + 1000 + 500 + 500);
        expect(await vest.claim.staticCall(1)).to.greaterThan(
          (e18 * 74n) / 10n
        );
        expect(await vest.claim.staticCall(1)).to.lessThan((e18 * 75n) / 10n);
        await vest.claim(1);

        await time.increaseTo(now + 1000 + 500 + 1000);
        expect(await vest.claim.staticCall(1)).to.greaterThan(
          (e18 * 74n) / 10n
        );
        expect(await vest.claim.staticCall(1)).to.lessThan((e18 * 75n) / 10n);
        await vest.claim(1);
        expect(await vest.claim.staticCall(1)).to.eq(0);
      });
    });

    describe("mint() with penalties", () => {
      beforeEach(async () => {
        expect(await vest.lastTokenId()).to.equal(0);

        // deployer should be able to mint a nft for another user
        await zero
          .connect(deployer)
          .transfer(deployerForked.address, e18 * 20n);
        await zero.connect(deployerForked).approve(vest.target, e18 * 20n);

        await vest.mint(
          ant.address,
          e18 * 20n, // 20 ZERO linear vesting
          0, // 0 ZERO upfront
          1000, // linear duration - 1000 seconds
          0, // cliff duration - 0 seconds
          now + 1000, // unlock date
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
        await time.increaseTo(lockDetails.unlockDate + 1n);
        const penaltyAmount = await vest.penalty(1);

        expect(penaltyAmount).to.eq(0n);
      });

      it("Should return the penalty amount close to 25% if unlock period is reached", async function () {
        const lockDetails = await vest.tokenIdToLockDetails(1);
        await time.increaseTo(lockDetails.unlockDate);
        const penaltyAmount = await vest.penalty(1);

        expect(penaltyAmount).to.eq(e18 * 5n);
      });

      it("should claim some amount with penalty at halfway through", async function () {
        await time.increaseTo(now + 800);
        expect(await vest.claim.staticCall(1)).to.closeTo(
          12400000000000000000n,
          parseUnits("1", 16)
        );
      });
    });

    it("Should update cliff durations for multiple tokens", async function () {
      await zero.connect(deployer).transfer(deployerForked.address, e18 * 15n);
      await zero.connect(deployerForked).approve(vest.target, e18 * 15n);

      await vest.mint(
        ant.address,
        e18 * 10n,
        e18 * 5n,
        1000,
        500,
        now + 1000,
        false,
        0
      );

      const tokenIds = [1, 2];
      const linearDurations = [100, 200];
      const cliffDurations = [50, 80];

      // Call the updateCliffDuration function
      await vest.updateCliffDuration(tokenIds, linearDurations, cliffDurations);

      // Check if cliff durations are updated correctly
      for (let i = 0; i < tokenIds.length; i++) {
        const lockDetails = await vest.tokenIdToLockDetails(tokenIds[i]);
        expect(lockDetails.cliffDuration).to.equal(cliffDurations[i]);
        expect(lockDetails.linearDuration).to.equal(linearDurations[i]);
      }
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


  it("Should allow staking bonus to claim unvested tokens", async function () {
    await zero.connect(deployer).transfer(deployerForked.address, e18 * 20n);
    await zero.connect(deployerForked).approve(vest.target, e18 * 20n);

    await vest.mint(
      ant.address,
      e18 * 15n,
      e18 * 5n,
      1000,
      500,
      now + 1000,
      false,
      0
    );

    const stakingBonusSigner = await initMainnetUser(
      await vest.stakingBonus(),
      parseEther("1")
    );

    const expectedPending = await vest.unclaimed(1);

    await vest.connect(stakingBonusSigner).claimUnvested(1);

    const stakingBonusBalance = await zero.balanceOf(
      stakingBonusSigner.address
    );
    expect(stakingBonusBalance).to.equal(expectedPending);
  });
  });
}
