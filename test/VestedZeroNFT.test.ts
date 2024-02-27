import { expect } from "chai";
import { e18, deployCore } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VestedZeroNFT } from "../typechain-types";

describe.only("VestedZeroNFT", () => {
  let ant: SignerWithAddress;
  let vestedZeroNFT: VestedZeroNFT;
  let now: number;
  let claimable: () => Promise<bigint>;

  beforeEach(async () => {
    const deployment = await loadFixture(deployCore);
    ant = deployment.ant;
    vestedZeroNFT = deployment.vestedZeroNFT;
    now = Math.floor(Date.now() / 1000);
    claimable = async () => (await vestedZeroNFT.claimable(1))[0];
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
      expect(await claimable()).to.equal(0);
    });
    it("should claim only the cliff at the unlock date", async function () {
      await time.increaseTo(now + 1000);
      expect(await claimable()).to.equal(e18 * 5n);
    });
    it("should claim only the cliff after the unlock date within the cliff duration", async function () {
      await time.increaseTo(now + 1000 + 250);
      expect(await claimable()).to.equal(e18 * 5n);
    });
    it("should claim the cliff and a bit of the linea vesting once cliff gets over", async function () {
      await time.increaseTo(now + 1000 + 500);
      expect(await claimable()).to.equal(e18 * 5n);
    });
    it("should half the linear distribution mid way through", async function () {
      await time.increaseTo(now + 1000 + 500 + 500);
      expect(await claimable()).to.equal(e18 * 5n);
    });
    it("should claim everything after the linear distribution date is done", async function () {
      await time.increaseTo(now + 1000 + 500 + 1000);
      expect(await claimable()).to.equal(e18 * 20n);
    });
  });

  describe("mint() with penalties", () => {
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
