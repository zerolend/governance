import { expect } from "chai";
import { deployLendingPool } from "./fixtures/lending";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployGovernance } from "./fixtures/governance";
import { deployVoters } from "./fixtures/voters";

describe("Deployment Checks", function () {
  it("Should deploy lending pool properly", async function () {
    const { owner, pool, addressesProvider, aclManager } = await loadFixture(
      deployLendingPool
    );

    expect(await aclManager.isPoolAdmin(owner.address)).eq(true);
    expect(await pool.ADDRESSES_PROVIDER()).eq(addressesProvider.target);
  });

  it("Should init governance properly", async function () {
    const {
      deployer,
      earlyZERO,
      lockerLP,
      lockerToken,
      omnichainStaking,
      stakingBonus,
      vestedZeroNFT,
      zero,
    } = await loadFixture(deployGovernance);

    expect(await lockerToken.underlying()).eq(zero.target);
    expect(await lockerToken.staking()).eq(omnichainStaking.target);

    expect(await omnichainStaking.lpLocker()).eq(lockerLP.target);
    expect(await omnichainStaking.tokenLocker()).eq(lockerToken.target);

    expect(await stakingBonus.zero()).eq(zero.target);
    expect(await stakingBonus.earlyZERO()).eq(earlyZERO.target);
    expect(await stakingBonus.vestedZERO()).eq(vestedZeroNFT.target);

    expect(await vestedZeroNFT.zero()).eq(zero.target);
    expect(await vestedZeroNFT.lastTokenId()).eq(0);
    expect(await vestedZeroNFT.denominator()).eq(10000);
    expect(await vestedZeroNFT.royaltyReceiver()).eq(deployer.address);
    expect(await vestedZeroNFT.royaltyFraction()).eq(100);
    expect(await vestedZeroNFT.stakingBonus()).eq(stakingBonus.target);
  });

  it("Should init voter properly", async function () {
    const {
      aggregator,
      aToken,
      aTokenGauge,
      eligibilityCriteria,
      lending,
      governance,
      poolVoter,
      varToken,
      varTokenGauge,
    } = await loadFixture(deployVoters);

    expect(await poolVoter.staking()).eq(governance.omnichainStaking.target);
    expect(await poolVoter.reward()).eq(governance.zero.target);
    expect(await poolVoter.totalWeight()).eq(0);
    // expect(await poolVoter.lzEndpoint()).eq(governance.zero.target);
    // expect(await poolVoter.mainnetEmissions()).eq(governance.zero.target);

    expect(await aToken.getIncentivesController()).eq(aTokenGauge.target);
    expect(await varToken.getIncentivesController()).eq(varTokenGauge.target);
  });
});
