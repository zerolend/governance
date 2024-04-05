import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  GaugeIncentiveController,
  LendingPoolGaugeFactory,
  PoolVoter,
  VestedZeroNFT,
} from "../../../typechain-types";
import { e18, initMainnetUser } from "../../fixtures/utils";
import { ethers } from "hardhat";
import {
  Contract,
  ContractTransactionResponse,
  parseEther,
  parseUnits,
} from "ethers";
import {
  getPoolVoterContracts,
} from "../helper";
import { getNetworkDetails } from "../constants";
import { setForkBlock } from "../utils";

const FORK = process.env.FORK === "true";
const FORKED_NETWORK = process.env.FORKED_NETWORK ?? "";

if (FORK) {
  describe.only("PoolVoter Fork Test", () => {
    let ant: SignerWithAddress;
    let now: number;
    let omniStaking: Contract;
    let poolVoter: PoolVoter;
    let reserve: Contract;
    let stakingBonus: Contract;
    let vest:
      | Contract
      | (VestedZeroNFT & {
          deploymentTransaction(): ContractTransactionResponse;
        });
    let pool: Contract;
    let aTokenGauge: GaugeIncentiveController;
    let zero: Contract;
    let lendingPoolGaugeFactory: LendingPoolGaugeFactory & {
      deploymentTransaction(): ContractTransactionResponse;
    };
    let deployer: SignerWithAddress;
    let deployerForked: SignerWithAddress;

    beforeEach(async () => {
      [deployerForked] = await ethers.getSigners();
      const networkDetails = getNetworkDetails(FORKED_NETWORK);
      await setForkBlock(networkDetails.BLOCK_NUMBER);

      const deployment = await getPoolVoterContracts(networkDetails);

      ant = await initMainnetUser(networkDetails.ant, parseEther("1"));
      now = Math.floor(Date.now() / 1000);

      omniStaking = deployment.governance.omnichainStaking;
      poolVoter = deployment.poolVoter;
      reserve = deployment.lending.erc20;
      stakingBonus = deployment.governance.stakingBonus;
      vest = deployment.governance.vestedZeroNFT;
      zero = deployment.governance.zero;
      pool = deployment.lending.pool;
      aTokenGauge = deployment.aTokenGauge;
      lendingPoolGaugeFactory = deployment.factory;

      deployer = await initMainnetUser(
        networkDetails.deployer,
        parseEther("1")
      );

      await zero.connect(deployer).transfer(deployerForked.address, e18 * 20n);
      await zero.connect(deployerForked).approve(vest.target, e18 * 20n);

      // deployer should be able to mint a nft for another user
      await vest.mint(
        deployerForked.address,
        e18 * 20n, // 20 ZERO linear vesting
        0, // 0 ZERO upfront
        1000, // linear duration - 1000 seconds
        0, // cliff duration - 0 seconds
        now + 1000, // unlock date
        true, // penalty -> false
        0
      );

      // stake nft on behalf of the ant
      const vestedZeroNFTSigner = await initMainnetUser(
        await vest.getAddress(),
        parseUnits("1")
      );
      await vest
        .connect(deployerForked)
        .approve(vestedZeroNFTSigner.address, 3);

      await vest
        .connect(vestedZeroNFTSigner)
        ["safeTransferFrom(address,address,uint256)"](
          deployerForked.address,
          stakingBonus.target,
          3
        );

      // there should now be some voting power for the user to play with
      expect(await omniStaking.balanceOf(deployerForked.address)).greaterThan(
        e18 * 19n
      );
    });

    it("should allow users to vote properly", async function () {
      expect(await poolVoter.totalWeight()).eq(0);
      await poolVoter.connect(deployerForked).vote([reserve.target], [1e8]);
      expect(await poolVoter.totalWeight()).greaterThan(e18 * 19n);
    });

    it("supplying an asset with ZERO staked should give staking rewards", async function () {
      expect(await aTokenGauge.balanceOf(ant.address)).eq(0n);
      expect(await aTokenGauge.totalSupply()).eq(0);

      const tokenHolder = await initMainnetUser(
        "0x1C5b69580Fe8ddd86952fa76A89c92bAAF262737",
        parseEther("1")
      );

      await reserve.connect(tokenHolder).transfer(ant.address, e18 * 1000n);
      await reserve.connect(ant).approve(pool.target, e18 * 100n);
      await pool
        .connect(ant)
        .supply(reserve.target, e18 * 100n, ant.address, 0);

      expect(await aTokenGauge.balanceOf(ant.address)).eq(e18 * 100n);
      expect(await aTokenGauge.totalSupply()).eq(e18 * 100n);
    });

    describe("distribute tests", () => {
      let gauges: [string, string, string] & {
        splitterGauge: string;
        aTokenGauge: string;
        varTokenGauge: string;
      };
      beforeEach(async () => {

      const tokenHolder = await initMainnetUser(
        "0x1C5b69580Fe8ddd86952fa76A89c92bAAF262737",
        parseEther("1")
      );

      await reserve.connect(tokenHolder).transfer(deployerForked.address, e18 * 1000n);
      await reserve.connect(deployerForked).approve(pool.target, e18 * 100n);

        await pool
          .connect(deployerForked)
          .supply(reserve.target, e18 * 100n, deployerForked.address, 0);

        await poolVoter.connect(deployerForked).vote([reserve.target], [parseEther("1")]);
        await zero.connect(deployer).transfer(deployerForked.address, parseEther("1"));
        await zero.approve(poolVoter.target, parseEther("1"));

        await poolVoter.notifyRewardAmount(parseEther("1"));

        gauges = await lendingPoolGaugeFactory.gauges(reserve.target);

        await poolVoter.updateFor(gauges.splitterGauge);
      });

      it("should distribute rewards to gauges", async function () {
        await poolVoter["distribute()"]();
        expect(await zero.balanceOf(gauges.aTokenGauge)).to.closeTo(
          parseEther("0.25"),
          100
        );
        expect(await zero.balanceOf(gauges.varTokenGauge)).to.closeTo(
          parseEther("0.75"),
          100
        );
      });

      it("should distribute rewards to a specified gauge", async function () {
        await poolVoter["distribute(address)"](gauges.splitterGauge);
        expect(await zero.balanceOf(gauges.aTokenGauge)).to.closeTo(
          parseEther("0.25"),
          100
        );
        expect(await zero.balanceOf(gauges.varTokenGauge)).to.closeTo(
          parseEther("0.75"),
          100
        );
      });

      it("should distribute rewards to specified gauges", async function () {
        await poolVoter["distribute(address[])"]([gauges.splitterGauge]);
        expect(await zero.balanceOf(gauges.aTokenGauge)).to.closeTo(
          parseEther("0.25"),
          100
        );
        expect(await zero.balanceOf(gauges.varTokenGauge)).to.closeTo(
          parseEther("0.75"),
          100
        );
      });
    });

    describe("distributeEx tests", () => {
      let gauges: [string, string, string] & {
        splitterGauge: string;
        aTokenGauge: string;
        varTokenGauge: string;
      };
      beforeEach(async () => {
        await poolVoter.connect(deployerForked).vote([reserve.target], [parseEther("1")]);
        await zero.connect(deployer).transfer(deployerForked.address, parseEther("1"));
        await zero.approve(poolVoter.target, parseEther("1"));
        await poolVoter.notifyRewardAmount(parseEther("1"));

        gauges = await lendingPoolGaugeFactory.gauges(reserve.target);
      });
      it("should distribute rewards to gauges for a specified token", async function () {
        await poolVoter["distributeEx(address)"](zero.target);
        expect(await zero.balanceOf(gauges.aTokenGauge)).to.eq(
          parseEther("0.25")
        );
        expect(await zero.balanceOf(gauges.varTokenGauge)).to.eq(
          parseEther("0.75")
        );
      });

      it("should distribute rewards to gauges for a specified token", async function () {
        await poolVoter["distributeEx(address,uint256,uint256)"](
          zero.target,
          0,
          1
        );
        expect(await zero.balanceOf(gauges.aTokenGauge)).to.eq(
          parseEther("0.25")
        );
        expect(await zero.balanceOf(gauges.varTokenGauge)).to.eq(
          parseEther("0.75")
        );
      });
    });

    it("should allow owner to reset contract", async function () {
      await poolVoter.connect(ant).vote([reserve.target], [1e8]);
      await poolVoter.connect(ant).reset();
      expect(await poolVoter.totalWeight()).to.eq(0);
    });

    // it("should allow owner to register gauge", async function () {
    //   //Using this random address for a guage
    //   const someRandomAddress = "0x388C818CA8B9251b393131C08a736A67ccB19297";

    //   await poolVoter.registerGauge(
    //     lending.erc20.target,
    //     someRandomAddress
    //   );

    //   const pools = await poolVoter.pools();
    //   expect(await poolVoter.gauges(pools[1])).to.equal(someRandomAddress);
    // });

    it("should update for a gauge", async function () {
      const pools = await poolVoter.pools();
      await poolVoter.updateFor(await poolVoter.gauges(pools[0]));

      const gauges = await lendingPoolGaugeFactory.gauges(reserve.target);
      expect(await poolVoter.supplyIndex(gauges.splitterGauge)).to.equal(
        await poolVoter.index()
      );
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
      await poolVoter.connect(ant).vote([reserve.target], [1e8]);

      const poolWeightBeforeStaking = await poolVoter.totalWeight();

      await zero.connect(deployer).transfer(ant.address, e18 * 20n);
      await zero.connect(ant).approve(vest.target, e18 * 20n);

      await zero.connect(deployer).transfer(deployerForked.address, e18 * 20n);
      await zero.connect(deployerForked).approve(vest.target, e18 * 20n);

      // deployer should be able to mint a nft for another user
      await vest.mint(
        deployerForked.address,
        e18 * 20n, // 20 ZERO linear vesting
        0, // 0 ZERO upfront
        1000, // linear duration - 1000 seconds
        0, // cliff duration - 0 seconds
        now + 1000, // unlock date
        true, // penalty -> false
        0
      );

      const vestedZeroNFTSigner = await initMainnetUser(
        await vest.getAddress(),
        parseUnits("1")
      );

      await vest
        .connect(deployerForked)
        .approve(vestedZeroNFTSigner.address, 4);

      await vest
        .connect(vestedZeroNFTSigner)
        ["safeTransferFrom(address,address,uint256)"](
          deployerForked.address,
          stakingBonus.target,
          4
        );

      await poolVoter.poke(deployerForked.address);

      const poolWeightAfterStaking = await poolVoter.totalWeight();
      expect(poolWeightAfterStaking).to.be.closeTo(
        2n * poolWeightBeforeStaking,
        parseUnits("1", 12)
      );
    });
  });
}
