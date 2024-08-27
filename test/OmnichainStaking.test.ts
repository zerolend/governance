import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  LockerToken,
  OmnichainStakingToken,
  StakingBonus,
  VestedZeroNFT,
  ZeroLend,
} from "../types";
import { e18 } from "./fixtures/utils";
import { AbiCoder, parseEther } from "ethers";

describe("Omnichain Staking Unit tests", () => {
  let ant: SignerWithAddress;
  let deployer: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;
  let stakingBonus: StakingBonus;
  let zero: ZeroLend;
  let lockerToken: LockerToken;
  let omniStaking: OmnichainStakingToken;

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    deployer = deployment.deployer;
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
    await zero.connect(deployer).approve(omniStaking.target, parseEther("1"))
    await omniStaking.connect(deployer).notifyRewardAmount(parseEther("1"));

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

    const encoder = AbiCoder.defaultAbiCoder();
    const data = encoder.encode(
      ["bool", "address", "uint256"],
      [true, ant.address, 365 * 86400 * 1]
    );

    await vest
      .connect(ant)
      ["safeTransferFrom(address,address,uint256,bytes)"](
        ant.address,
        stakingBonus.target,
        1,
        data
      );

    expect(await omniStaking.balanceOf(ant.address)).greaterThan(
      (e18 * 49n) / 10n
    );
  });

  it("should update the lock duration for an existing lock", async () => {
    const oldLockDetails = await lockerToken.locked(1);
    expect(
      ((oldLockDetails.end - oldLockDetails.start) * 100n) / (86400n * 365n)
    ).to.closeTo(100, 5);

    await omniStaking.connect(ant).increaseLockDuration(1, 86400 * 365 * 3);
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
    await omniStaking.connect(ant).increaseLockAmount(1, e18 * 25n);
    const newLockDetails = await lockerToken.locked(1);
    expect(newLockDetails.amount).to.eq(45n * e18);
  });

  it("should be able to unstake and withdraw for an existing lock", async () => {
    await zero.transfer(ant.address, e18  * 100n);
    const lockDetails = await lockerToken.locked(1);
    expect(lockDetails.amount).to.eq(e18 * 20n);});
});
