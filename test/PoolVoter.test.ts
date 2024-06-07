import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  ACLManager,
  AaveOracle,
  AaveProtocolDataProvider,
  LendingPoolGaugeFactory,
  OmnichainStaking,
  Pool,
  PoolAddressesProvider,
  PoolConfigurator,
  PoolVoter,
  StakingBonus,
  TestnetERC20,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";
import { e18 } from "./fixtures/utils";
import { deployVoters } from "./fixtures/voters";
import { ethers } from "hardhat";
import { deployLendingPool } from "./fixtures/lending";
import {
  BaseContract,
  ContractTransactionResponse,
  parseEther,
  parseUnits,
} from "ethers";

describe("PoolVoter", () => {
  let ant: SignerWithAddress;
  let now: number;
  let omniStaking: OmnichainStaking;
  let poolVoter: PoolVoter;
  let reserve: TestnetERC20;
  let stakingBonus: StakingBonus;
  let vest: VestedZeroNFT;
  let pool: Pool;
  let zero: ZeroLend;
  let lending: {
    erc20: any;
    owner?: SignerWithAddress;
    configurator?: PoolConfigurator;
    pool?: Pool;
    oracle?: AaveOracle & {
      deploymentTransaction(): ContractTransactionResponse;
    };
    addressesProvider?: PoolAddressesProvider & {
      deploymentTransaction(): ContractTransactionResponse;
    };
    aclManager?: ACLManager & {
      deploymentTransaction(): ContractTransactionResponse;
    };
    protocolDataProvider?: AaveProtocolDataProvider & {
      deploymentTransaction(): ContractTransactionResponse;
    };
    mockAggregator?: BaseContract & {
      deploymentTransaction(): ContractTransactionResponse;
    } & Omit<BaseContract, keyof BaseContract>;
  };
  let lendingPoolGaugeFactory: LendingPoolGaugeFactory & {
    deploymentTransaction(): ContractTransactionResponse;
  };

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
    lending = deployment.lending;
    lendingPoolGaugeFactory = deployment.factory;

    await zero.whitelist(vest.target, true);
    await zero.whitelist(stakingBonus.target, true);
    await zero.whitelist(poolVoter.target, true);
    await zero.whitelist(deployment.governance.lockerToken.target, true);
  });

  it("should allow users to vote properly", async function () {
    await mintAndStakeNft(ant);
    expect(await poolVoter.totalWeight()).eq(0);
    await poolVoter.connect(ant).vote([reserve.target], [1e8]);
    expect(await poolVoter.totalWeight()).greaterThan(e18 * 19n);
  });

  describe("distribute tests", () => {
    let gauge: string;
    beforeEach(async () => {
      await reserve["mint(address,uint256)"](ant.address, e18 * 1000n);
      await reserve.connect(ant).approve(pool.target, e18 * 100n);
      await pool
        .connect(ant)
        .supply(reserve.target, e18 * 100n, ant.address, 0);

      await mintAndStakeNft(ant);

      await poolVoter.connect(ant).vote([reserve.target], [parseEther("1")]);
      await zero.approve(poolVoter.target, parseEther("1"));
      await poolVoter.notifyRewardAmount(parseEther("1"));

      gauge = await lendingPoolGaugeFactory.gauges(reserve.target);
      const gaugeContract = await ethers.getContractAt(
        "LendingPoolGaugeV2",
        gauge
      );
      await zero.whitelist(await gaugeContract.strategy(), true);
      await poolVoter.updateFor(gauge);
    });

    it("should distribute rewards to gauges", async function () {
      const zeroBalanceBefore = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceBefore).to.closeTo(parseEther("1"), 100);
      await poolVoter["distribute()"]();
      const zeroBalanceAfter = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceAfter).to.closeTo(0, 100);
    });

    it("should distribute rewards to a specified gauge", async function () {
      const zeroBalanceBefore = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceBefore).to.closeTo(parseEther("1"), 100);
      await poolVoter["distribute(address)"](gauge);
      const zeroBalanceAfter = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceAfter).to.closeTo(0, 100);
    });

    it("should distribute rewards to specified gauges", async function () {
      const zeroBalanceBefore = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceBefore).to.closeTo(parseEther("1"), 100);
      await poolVoter["distribute(address[])"]([gauge]);
      const zeroBalanceAfter = await zero.balanceOf(poolVoter.target);
      expect(zeroBalanceAfter).to.closeTo(0, 100);
    });
  });

  it("should allow owner to reset contract", async function () {
    await poolVoter.connect(ant).vote([reserve.target], [1e8]);
    await poolVoter.connect(ant).reset(ant.address);
    expect(await poolVoter.totalWeight()).to.eq(0);
  });

  it("should allow owner to register gauge", async function () {
    const newLendingPool = await deployLendingPool();

    //Using this random address for a guage
    const someRandomAddress = "0x388C818CA8B9251b393131C08a736A67ccB19297";

    await poolVoter.registerGauge(
      newLendingPool.erc20.target,
      someRandomAddress
    );

    const pools = await poolVoter.pools();
    expect(await poolVoter.gauges(pools[1])).to.equal(someRandomAddress);
  });

  it("should return the correct length after registering pools", async function () {
    expect(await poolVoter.length()).to.equal(1);
    const pool2 = ethers.getAddress(
      "0x0000000000000000000000000000000000000002"
    );
    const pool3 = ethers.getAddress(
      "0x0000000000000000000000000000000000000003"
    );

    await poolVoter.registerGauge(pool2, ethers.ZeroAddress);
    await poolVoter.registerGauge(pool3, ethers.ZeroAddress);

    const expectedLength = 3;
    const actualLength = await poolVoter.length();

    expect(actualLength).to.equal(expectedLength);
  });

  it("should update the voting state correctly after a user pokes", async function () {
    await mintAndStakeNft(ant);
    await poolVoter.connect(ant).vote([reserve.target], [1e8]);

    const poolWeightBeforeStaking = await poolVoter.totalWeight();
    await vest.mint(ant.address, e18 * 20n, 0, 1000, 0, now + 1000, true, 0);

    await vest
      .connect(ant)
      ["safeTransferFrom(address,address,uint256)"](
        ant.address,
        stakingBonus.target,
        2
      );

    await poolVoter.poke(ant.address);

    const poolWeightAfterStaking = await poolVoter.totalWeight();
    expect(poolWeightAfterStaking).to.be.closeTo(
      2n * poolWeightBeforeStaking,
      parseUnits("1", 14)
    );
  });

  async function mintAndStakeNft(user: SignerWithAddress) {
    // deployer should be able to mint a nft for another user
    await vest.mint(
      ant.address,
      e18 * 20n, // 20 ZERO linear vestingg
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
  }
});
