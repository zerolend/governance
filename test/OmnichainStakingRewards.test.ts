import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  LockerToken,
  OmnichainStaking,
  StakingBonus,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { e18 } from "./fixtures/utils";
import { ethers } from "hardhat";
import { parseEther } from "ethers";

describe("Omnichain Staking Unit tests", () => {
  let ant: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;
  let stakingBonus: StakingBonus;
  let zero: ZeroLend;
  let lockerToken: LockerToken;
  let omniStaking: OmnichainStaking;

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    ant = deployment.ant;
    zero = deployment.zero;
    vest = deployment.vestedZeroNFT;
    stakingBonus = deployment.stakingBonus;
    lockerToken = deployment.lockerToken;
    omniStaking = deployment.omnichainStaking;
    now = Math.floor(Date.now() / 1000);

    await zero.whitelist(vest.target, true);
    await zero.whitelist(omniStaking.target, true);
    await zero.whitelist(stakingBonus.target, true);
    await zero.whitelist(lockerToken.target, true);

    await zero.transfer(omniStaking.target, parseEther("100"));

    await omniStaking.setRewardsDuration(86400 * 14);
    await omniStaking.notifyRewardAmount(parseEther("1"));

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

    await vest
      .connect(ant)
      ["safeTransferFrom(address,address,uint256)"](
        ant.address,
        stakingBonus.target,
        1
      );
    expect(await omniStaking.balanceOf(ant.address)).greaterThan(
      (e18 * 199n) / 10n
    );
  });

  it("should give rewards for staking vests", async () => {
    expect(await zero.balanceOf(ant.address)).to.equal(0);
    await expect(omniStaking.connect(ant).getReward()).to.emit(
      omniStaking,
      "RewardPaid"
    );
    expect(await zero.balanceOf(ant.address)).to.be.greaterThan(0);
  });
});
