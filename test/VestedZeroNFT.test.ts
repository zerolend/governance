import { expect } from "chai";
import { e18, deployCore } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VestedZeroNFT } from "../typechain-types";

describe.only("VestedZeroNFT", () => {
  let ant: SignerWithAddress;
  let vestedZeroNFT: VestedZeroNFT;
  let now: number;

  beforeEach(async () => {
    const deployment = await loadFixture(deployCore);
    ant = deployment.ant;
    vestedZeroNFT = deployment.vestedZeroNFT;
    now = Math.floor(Date.now() / 1000);
  });

  describe("mint()", () => {
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

    it("should not claim any rewards for the user before the unlock date", async function () {
      const claimable = async () => (await vestedZeroNFT.claimable(1))[0];
      expect(await claimable()).to.equal(0);
      await time.increaseTo(now + 1000);
      expect(await claimable()).to.equal(e18 * 5n);
      await time.increaseTo(now + 1000 + 250);
      expect(await claimable()).to.equal(e18 * 5n);
      await time.increaseTo(now + 1000 + 500);
      expect(await claimable()).to.equal(e18 * 5n);
      await time.increaseTo(now + 1000 + 1500);
      expect(await claimable()).to.equal(e18 * 20n);
    });
  });
});
