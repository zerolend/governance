import { expect } from "chai";
import { e18, deployCore } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VestedZeroNFT } from "../typechain-types";

describe("VestedZeroNFT", () => {
  let ant: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;

  beforeEach(async () => {
    const deployment = await loadFixture(deployCore);
    ant = deployment.ant;
    vest = deployment.vestedZeroNFT;
    now = Math.floor(Date.now() / 1000);
  });

  describe("mint() without penalties", () => {
    beforeEach(async () => {
      expect(await vest.lastTokenId()).to.equal(0);

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

      const expt = (e18 * 125n) / 100n;
      expect(await vest.claim.staticCall(1)).to.greaterThanOrEqual(expt);
      await vest.claim(1);
      expect(await vest.claimed(1)).to.greaterThanOrEqual(expt);
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
      expect(await vest.claim.staticCall(1)).to.greaterThan((e18 * 74n) / 10n);
      expect(await vest.claim.staticCall(1)).to.lessThan((e18 * 75n) / 10n);
      await vest.claim(1);

      await time.increaseTo(now + 1000 + 500 + 1000);
      expect(await vest.claim.staticCall(1)).to.greaterThan((e18 * 74n) / 10n);
      expect(await vest.claim.staticCall(1)).to.lessThan((e18 * 75n) / 10n);
      await vest.claim(1);
      expect(await vest.claim.staticCall(1)).to.eq(0);
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

    it("should claim 50% with penalty at halfway through", async function () {
      await time.increaseTo(now + 1000);
      expect(await vest.claim.staticCall(1)).to.eq(0);

      await time.increaseTo(now + 1000 + 500);
      expect(await vest.claim.staticCall(1)).to.eq(e18 * 10n);
      await vest.claim(1);
      expect(await vest.claim.staticCall(1)).to.eq(0);
    });
  });
});
