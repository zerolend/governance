import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  LockerToken,
  OmnichainStaking,
  StakingBonus,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { e18 } from "./fixtures/utils";

describe("SPoolVoter", () => {
  let ant: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;
  let stakingBonus: StakingBonus;
  let zero: ZeroLend;
  let locker: LockerToken;
  let omniStaking: OmnichainStaking;

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    ant = deployment.ant;
    zero = deployment.zero;
    vest = deployment.vestedZeroNFT;
    stakingBonus = deployment.stakingBonus;
    locker = deployment.lockerToken;
    omniStaking = deployment.omnichainStaking;
    now = Math.floor(Date.now() / 1000);
  });

  describe("onERC721Received() - stake nft", () => {
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

    it("should mint one vested nft properly for a user", async function () {
      expect(await vest.balanceOf(ant)).to.equal(1);
      expect(await vest.ownerOf(1)).to.equal(ant.address);
      expect(await vest.tokenOfOwnerByIndex(ant.address, 0)).to.equal(1);
    });
  });
});
