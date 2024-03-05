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

  beforeEach(async () => {
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
});
