import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  EmissionsMainnet,
  LockerToken,
  PoolVoter,
  StakingBonus,
  TestnetERC20,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { deployVoters } from "./fixtures/voters";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { e18 } from "./fixtures/utils";

describe("EmissionsMainnet unit tests", () => {
  let ant: SignerWithAddress;
  let poolVoter: PoolVoter;
  let zeroToken: ZeroLend;
  let lockerToken: LockerToken;
  let emissionsContract: EmissionsMainnet;
  let vest: VestedZeroNFT;
  let stakingBonus: StakingBonus;
  let erc20: TestnetERC20;
  let now: number;

  beforeEach(async () => {
    now = Math.floor(Date.now() / 1000);

    const poolVoterContracts = await loadFixture(deployVoters);
    ant = poolVoterContracts.ant;
    poolVoter = poolVoterContracts.poolVoter;
    zeroToken = poolVoterContracts.governance.zero;
    vest = poolVoterContracts.governance.vestedZeroNFT;
    stakingBonus = poolVoterContracts.governance.stakingBonus;
    lockerToken = poolVoterContracts.governance.lockerToken;
    erc20 = poolVoterContracts.lending.erc20;

    // Whitelisting voter contracts
    await zeroToken.whitelist(vest.target, true);
    await zeroToken.whitelist(stakingBonus.target, true);
    await zeroToken.whitelist(lockerToken.target, true);
    await zeroToken.whitelist(poolVoter.target, true);

    // Voting for poolVoter
    await poolVoter
      .connect(ant)
      .vote([poolVoterContracts.lending.erc20.target], [1e8]);

    //Deploy Emissions Contract
    const emissionsMainnetFactory = await ethers.getContractFactory(
      "EmissionsMainnet"
    );
    emissionsContract = await emissionsMainnetFactory.deploy();

    // Init emissions contract
    await emissionsContract.initialize(zeroToken.target, poolVoter.target);

    // Setting Values
    const initialAllocation = 20000000000;
    await zeroToken.whitelist(emissionsContract.target, true);
    await zeroToken.whitelist(poolVoter.target, true);
    await zeroToken.approve(emissionsContract.target, initialAllocation);
    await emissionsContract.setTotalSupply(initialAllocation);

    const weeklyDividers = [
      1500, 1500, 1500, 1500, 1300, 1300, 1300, 1300, 1200, 1200, 1200, 1200,
      1100, 1100, 1100, 1100, 1000, 1000, 1000, 1000, 1001, 1001, 1001, 1001,
      1006, 1006, 1006, 1006, 1016, 1016, 1016, 1016, 1032, 1032, 1032, 1032,
      1056, 1056, 1056, 1056, 1088, 1088, 1088, 1088, 1130, 1130, 1130, 1130,
      1181, 1181, 1181, 1181, 1243, 1243, 1243, 1243, 1316, 1316, 1316, 1316,
      1401, 1401, 1401, 1401, 1499, 1499, 1499, 1499, 1609, 1609, 1609, 1609,
      1733, 1733, 1733, 1733, 1871, 1871, 1871, 1871, 2024, 2024, 2024, 2024,
      2192, 2192, 2192, 2192, 2375, 2375, 2375, 2375, 2574, 2574, 2574, 2574,
      2789, 2789, 2789, 2789, 3021, 3021, 3021, 3021, 3270, 3270, 3270, 3270,
      3537, 3537, 3537, 3537, 3822, 3822, 3822, 3822, 4125, 4125, 4125, 4125,
      4447, 4447, 4447, 4447, 4788, 4788, 4788, 4788, 5149, 5149, 5149, 5149,
      5529, 5529, 5529, 5529, 5930, 5930, 5930, 5930, 6351, 6351, 6351, 6351,
      6793, 6793, 6793, 6793, 7256, 7256, 7256, 7256, 7741, 7741, 7741, 7741,
      8247, 8247, 8247, 8247, 8776, 8776, 8776, 8776, 9327, 9327, 9327, 9327,
      9901, 9901, 9901, 9901, 10499, 10499, 10499, 10499, 11119, 11119, 11119,
      11119, 11764, 11764, 11764, 11764, 12432, 12432, 12432, 12432, 13125,
      13125, 13125, 13125, 13842, 13842, 13842, 13842, 14584, 14584, 14584,
      14584, 15351, 15351, 15351, 15351, 16144, 16144, 16144, 16144, 16963,
      16963, 16963, 16963, 17807, 17807, 17807, 17807, 18678, 18678, 18678,
      18678, 19575, 19575, 19575, 19575, 20499, 20499, 20499, 20499, 21450,
      21450, 21450, 21450, 22428, 22428, 22428, 22428, 23434, 23434, 23434,
      23434, 24468, 24468, 24468, 24468, 25529, 25529, 25529, 25529, 26619,
      26619, 26619, 26619, 27738, 27738, 27738, 27738, 28885, 28885, 28885,
      28885, 30062, 30062, 30062, 30062, 31268, 31268, 31268, 31268, 32503,
      32503, 32503, 32503, 33768, 33768, 33768, 33768, 35063, 35063, 35063,
      35063, 36388, 36388, 36388, 36388, 37744, 37744, 37744, 37744, 39130,
      39130, 39130, 39130, 40548, 40548, 40548, 40548, 41996, 41996, 41996,
      41996, 43476, 43476, 43476, 43476, 44988, 44988, 44988, 44988, 46531,
      46531, 46531, 46531, 48106, 48106, 48106, 48106, 49714, 49714, 49714,
      49714, 51354, 51354, 51354, 51354, 53027, 53027, 53027, 53027, 54732,
      54732, 54732, 54732, 56471, 56471, 56471, 56471, 58243, 58243, 58243,
      58243, 60049, 60049, 60049, 60049, 61888, 61888, 61888, 61888, 63762,
      63762, 63762, 63762, 65669, 65669, 65669, 65669, 67611, 67611, 67611,
      67611,
    ];

    await emissionsContract.setWeeklyDividers(weeklyDividers);
  });

  it("should not release funds to the pool voter contract", async function () {
    await expect(emissionsContract.execute()).to.be.revertedWithCustomError(
      emissionsContract,
      "ReleaseIntervalNotMet"
    );
  });

  it("should release funds to the pool voter contract", async function () {
    await time.increaseTo(now + 654800);
    // deployer should be able to mint a nft for another user
    await vest.mint(
      ant.address,
      e18 * 20n, // 20 ZERO linear vesting
      0, // 0 ZERO upfront
      1000, // linear duration - 1000 seconds
      0, // cliff duration - 0 seconds
      now + 654800 + 1000, // unlock date
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

    await poolVoter.connect(ant).vote([erc20.target], [1e8]);
    await emissionsContract.execute();
    expect(await zeroToken.balanceOf(poolVoter.target)).to.eq(77777777n);
  });
});
