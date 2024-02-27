import { expect } from "chai";
import { e18, deployCore } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VestedZeroNFT } from "../typechain-types";

describe.only("VestedZeroNFT", () => {
  let ant: SignerWithAddress;
  let vestedZeroNFT: VestedZeroNFT;
  let now: number;
  let upfront: () => Promise<bigint>;
  let pending: () => Promise<bigint>;

  beforeEach(async () => {
    const deployment = await loadFixture(deployCore);
    ant = deployment.ant;
    vestedZeroNFT = deployment.vestedZeroNFT;
    now = Math.floor(Date.now() / 1000);
    upfront = async () => (await vestedZeroNFT.claimable(1))[0];
    pending = async () => (await vestedZeroNFT.claimable(1))[0];
  });

  describe("mint() without penalties", () => {
    beforeEach(async () => {
      expect(await vestedZeroNFT.lastTokenId()).to.equal(0);

      // deployer should be able to mint a nft for another user
      await vestedZeroNFT.mint(
        ant.address,
        e18 * 15n, // 15 ZERO linear vesting
        e18 * 5n, // 5 ZERO upfront
        1000, // linear duration - 1000 seconds
        500, // cliff duration - 500 seconds
        now + 1000, // unlock date
        false, // penalty -> false
        0
      );

      expect(await vestedZeroNFT.lastTokenId()).to.equal(1);
    });

    it("should mint one nft properly for a user", async function () {
      expect(await vestedZeroNFT.balanceOf(ant)).to.equal(1);
      expect(await vestedZeroNFT.ownerOf(1)).to.equal(ant.address);
      expect(await vestedZeroNFT.tokenOfOwnerByIndex(ant.address, 0)).to.equal(
        1
      );
    });

    it("should not claim any rewards before the unlock date", async function () {
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(0n);
      expect(res.pending).to.equal(0n);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.equal(0);
      expect(await vestedZeroNFT.unclaimed(1)).to.equal(e18 * 20n);
    });
    it("should claim only the cliff at the unlock date", async function () {
      await time.increaseTo(now + 1000);
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(0n);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.equal(e18 * 5n);
      expect(await vestedZeroNFT.unclaimed(1)).to.equal(e18 * 15n);
    });
    it("should claim only the cliff after the unlock date within the cliff duration", async function () {
      await time.increaseTo(now + 1000 + 250);
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(0n);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.equal(e18 * 5n);
      expect(await vestedZeroNFT.unclaimed(1)).to.equal(e18 * 15n);
    });
    it("should claim the cliff and a bit of the linear vesting once cliff gets over", async function () {
      await time.increaseTo(now + 1000 + 500 + 10);
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.greaterThan(0n);
      expect(res.pending).to.lessThan(e18);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.greaterThan(e18 * 5n);
      expect(await vestedZeroNFT.claimed(1)).to.lessThan(e18 * 6n);
      expect(await vestedZeroNFT.unclaimed(1)).to.lessThan(e18 * 15n);
      expect(await vestedZeroNFT.unclaimed(1)).to.greaterThan(e18 * 14n);
    });
    it("should half the linear distribution mid way through", async function () {
      await time.increaseTo(now + 1000 + 500 + 500);
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal((e18 * 75n) / 10n);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.greaterThanOrEqual(
        (e18 * 125n) / 100n
      );
      expect(await vestedZeroNFT.unclaimed(1)).to.lessThanOrEqual(
        (e18 * 75n) / 10n
      );
    });
    it("should claim everything after the linear distribution date is done", async function () {
      await time.increaseTo(now + 1000 + 500 + 1000);
      const res = await vestedZeroNFT.claimable(1);
      expect(res.upfront).to.equal(e18 * 5n);
      expect(res.pending).to.equal(e18 * 15n);

      await vestedZeroNFT.claim(1);
      expect(await vestedZeroNFT.claimed(1)).to.equal(e18 * 20n);
      expect(await vestedZeroNFT.unclaimed(1)).to.equal(0);
    });
  });

  describe("mint() with penalties", () => {
    beforeEach(async () => {
      expect(await vestedZeroNFT.lastTokenId()).to.equal(0);

      // deployer should be able to mint a nft for another user
      await vestedZeroNFT.mint(
        ant.address,
        e18 * 20n, // 20 ZERO linear vesting
        0, // 0 ZERO upfront
        1000, // linear duration - 1000 seconds
        0, // cliff duration - 0 seconds
        now + 1000, // unlock date
        true, // penalty -> false
        0
      );

      expect(await vestedZeroNFT.lastTokenId()).to.equal(1);
    });

    it("should mint one nft properly for a user", async function () {
      expect(await vestedZeroNFT.balanceOf(ant)).to.equal(1);
      expect(await vestedZeroNFT.ownerOf(1)).to.equal(ant.address);
      expect(await vestedZeroNFT.tokenOfOwnerByIndex(ant.address, 0)).to.equal(
        1
      );
    });
  });
});
