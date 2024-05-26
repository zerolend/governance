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
import { parseEther } from "ethers";

describe.only("Omnichain Staking Unit tests", () => {
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

    // send 100 ZERO
    await zero.transfer(omniStaking.target, parseEther("100"));
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

  it("should update the lock duration for an existing lock", async () => {
    const oldLockDetails = await lockerToken.locked(1);
    expect(
      ((oldLockDetails.end - oldLockDetails.start) * 100n) / (86400n * 365n)
    ).to.closeTo(400, 5);
    await omniStaking.connect(ant).increaseLockDuration(0, 1, 86400 * 365 * 3);
    const newLockDetails = await lockerToken.locked(1);
    expect(
      ((newLockDetails.end - newLockDetails.start) * 100n) / (86400n * 365n)
    ).to.closeTo(300, 5);
  });

  it("should update the lock amount for an existing lock", async () => {
    await zero.transfer(ant.address, e18 * 100n);
    const oldLockDetails = await lockerToken.locked(1);
    expect(oldLockDetails.amount).to.eq(e18 * 20n);
    await zero.connect(ant).approve(omniStaking.target, 25n * e18);
    await omniStaking.connect(ant).increaseLockAmount(0, 1, e18 * 25n);
    const newLockDetails = await lockerToken.locked(1);
    expect(newLockDetails.amount).to.eq(45n * e18);
  });
});
