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
import { AbiCoder, parseEther } from "ethers";
import { e18 } from "./fixtures/utils";

describe("StakingBonus", () => {
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
      await zero.whitelist(vest.target, true);
      await zero.whitelist(stakingBonus.target, true);
      await zero.whitelist(locker.target, true);     

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

    it("should lock and stake a nft properly for the user", async function () {
      await zero.whitelist(zero.target, true);
      
      // stake nft on behalf of the ant
      expect(
        await vest
          .connect(ant)
          ["safeTransferFrom(address,address,uint256)"](
            ant.address,
            stakingBonus.target,
            1
          )
      );

      expect(await omniStaking.balanceOf(ant.address)).greaterThan(
        (e18 * 199n) / 10n
      );
      expect(await omniStaking.tokenPower(1)).greaterThan(e18 * 19n);
      expect(await locker.balanceOf(omniStaking.target)).eq(1);
    });

    it("should only lock a nft properly for the user", async function () {
      const encoder = AbiCoder.defaultAbiCoder();
      const data = encoder.encode(["bool", "address", "uint256"], [false, ant.address, 31536000*4]); 
      
      // stake nft on behalf of the ant
      expect(
        await vest
          .connect(ant)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            ant.address,
            stakingBonus.target,
            1,
            data
          )
      );

      expect(await omniStaking.balanceOf(ant.address)).eq(0);
      expect(await omniStaking.tokenPower(1)).eq(0);
      expect(await locker.balanceOf(ant.address)).eq(1);
    });

    it("should give a user a bonus if the bonus contract is well funded", async function () {
      // fund some bonus tokens into the staking bonus contract
      await zero.transfer(stakingBonus.target, e18 * 100n);

      // give a 50% bonus
      await stakingBonus.setBonusBps(5000);

      // stake nft on behalf of the ant
      expect(
        await vest
          .connect(ant)
          ["safeTransferFrom(address,address,uint256)"](
            ant.address,
            stakingBonus.target,
            1
          )
      );

      // the staking contract should've awarded more zero for staking unvested tokens
      // 20 zero + 20% bonus = 24 zero... ->> which means about 23.999 voting power
      expect(await locker.balanceOfNFT(1)).to.closeTo(parseEther("24"), parseEther("0.1"));
    });
  });
});
