import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  GaugeIncentiveController,
  OmnichainStaking,
  Pool,
  PoolVoter,
  StakingBonus,
  TestnetERC20,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { e18 } from "./fixtures/utils";
import { deployVoters } from "./fixtures/voters";
import { ethers as hardhatEthers } from "hardhat";
import { ethers } from "ethers";

describe.only("PoolVoter", () => {
  let ant: SignerWithAddress;
  let now: number;
  let omniStaking: OmnichainStaking;
  let poolVoter: PoolVoter;
  let reserve: TestnetERC20;
  let stakingBonus: StakingBonus;
  let vest: VestedZeroNFT;
  let pool: Pool;
  let aTokenGauge: GaugeIncentiveController;
  let zero: ZeroLend;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, user1, user2] = await hardhatEthers.getSigners();

    const deployment = await loadFixture(deployVoters);
    ant = deployment.ant;
    now = Math.floor(Date.now() / 1000);
    omniStaking = deployment.governance.omnichainStaking;
    poolVoter = deployment.poolVoter;
    reserve = deployment.lending.erc20;
    stakingBonus = deployment.governance.stakingBonus;
    vest = deployment.governance.vestedZeroNFT;
    zero = deployment.governance.zero;
    pool = deployment.lending.pool;
    aTokenGauge = deployment.aTokenGauge;

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

    // stake nft on behalf of the ant
    await vest
      .connect(ant)
      ["safeTransferFrom(address,address,uint256)"](
        ant.address,
        stakingBonus.target,
        1
      );

    // there should now be some voting power for the user to play with
    expect(await omniStaking.balanceOf(ant.address)).greaterThan(e18 * 19n);
  });

  it("ant should be able to vote properly", async function () {
    expect(await poolVoter.totalWeight()).eq(0);
    await poolVoter.connect(ant).vote([reserve.target], [1e8]);
    expect(await poolVoter.totalWeight()).greaterThan(e18 * 19n);
  });

  describe("handleAction test", () => {
    it("supplying an asset with ZERO staked should give staking rewards", async function () {
      expect(await aTokenGauge.balanceOf(ant.address)).eq(0n);
      expect(await aTokenGauge.totalSupply()).eq(0);

      await reserve["mint(address,uint256)"](ant.address, e18 * 1000n);
      await reserve.connect(ant).approve(pool.target, e18 * 100n);
      await pool
        .connect(ant)
        .supply(reserve.target, e18 * 100n, ant.address, 0);

      expect(await aTokenGauge.balanceOf(ant.address)).eq(e18 * 100n);
      expect(await aTokenGauge.totalSupply()).eq(e18 * 100n);
    });
  });

  it("should initialize the contract correctly", async function () {
    expect(await poolVoter.staking()).to.equal(ethers.ZeroAddress);
    expect(await poolVoter.reward()).to.equal(ethers.ZeroAddress);
    expect(await poolVoter.totalWeight()).to.equal(0);
    expect(await poolVoter.lzEndpoint()).to.equal(ethers.ZeroAddress);
    expect(await poolVoter.mainnetEmissions()).to.equal(
      ethers.ZeroAddress
    );
    expect(await poolVoter.index()).to.equal(0);
  });

  it("should allow owner to reset contract", async function () {
    await poolVoter.reset();
    expect(await poolVoter.usedWeights(owner.address)).to.equal(0);
  });

  it("should allow user to vote", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.vote([user1.address], [100]);
    expect(await poolVoter.usedWeights(user1.address)).to.equal(100);
  });

  it("should allow owner to register gauge", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    expect(await poolVoter.gauges(user1.address)).to.equal(user2.address);
  });

  it("should update for a gauge", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    await poolVoter.updateFor(user2.address);
    expect(await poolVoter.supplyIndex(user2.address)).to.equal(
      await poolVoter.index()
    );
  });

  it("should distribute rewards to gauges", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    await poolVoter.notifyRewardAmount(100);
    await poolVoter["distribute()"]();
    expect(await poolVoter.claimable(user2.address)).to.equal(100);
  });

  it("should distribute rewards to specified gauges", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    await poolVoter.notifyRewardAmount(100);
    await poolVoter["distribute(address[])"]([user2.address]);
    expect(await poolVoter.claimable(user2.address)).to.equal(100);
  });

  it("should distribute specified token rewards to gauges", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    await poolVoter.notifyRewardAmount(100);
    await poolVoter["distributeEx(address)"](user1.address);
    expect(await poolVoter.claimable(user2.address)).to.equal(100);
  });

  it("should allow owner to distribute specified token rewards to specified gauges", async function () {
    await poolVoter.init(owner.address, user1.address);
    await poolVoter.registerGauge(user1.address, user2.address);
    await poolVoter.notifyRewardAmount(100);
    await poolVoter["distributeEx(address,uint256,uint256)"](user1.address, 0, 1);
    expect(await poolVoter.claimable(user2.address)).to.equal(100);
  });
});
