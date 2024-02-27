import { expect } from "chai";
import { deployLendingPool } from "./fixtures/lending";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployCore } from "./fixtures/governance";

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
      zero,
      lockerToken,
      stakingBonus,
      vestedZeroNFT,
      earlyZERO,
    } = await loadFixture(deployCore);

    expect(await lockerToken.underlying()).eq(zero.target);
    expect(await lockerToken.staking()).eq(stakingBonus.target);

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
});
