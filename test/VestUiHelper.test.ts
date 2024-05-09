import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  OmnichainStaking,
  StakingBonus,
  VestedZeroNFT,
  VestedZeroUiHelper,
  ZeroLend,
} from "../typechain-types";
import { e18, initMainnetUser } from "./fixtures/utils";
import { ContractTransactionResponse, parseEther } from "ethers";
import { ethers } from "hardhat";

describe("UI Helper tests", () => {
  let ant: SignerWithAddress;
  let vest: VestedZeroNFT;
  let vestUiHelper: VestedZeroUiHelper & { deploymentTransaction(): ContractTransactionResponse; };
  let zero: ZeroLend;
  let stakingBonus: StakingBonus & { deploymentTransaction(): ContractTransactionResponse; };
  let omnichainStaking: OmnichainStaking & { deploymentTransaction(): ContractTransactionResponse; };

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    ant = deployment.ant;
    stakingBonus = deployment.stakingBonus;
    vest = deployment.vestedZeroNFT;
    omnichainStaking = deployment.omnichainStaking;

    let vestUiHelperFactory = await ethers.getContractFactory(
      "VestedZeroUiHelper"
    );
    vestUiHelper = await vestUiHelperFactory.deploy();
    await vestUiHelper.initialize(vest.target,omnichainStaking.target);
    zero = deployment.zero;

    await zero.whitelist(stakingBonus.target, true);
    await zero.whitelist(vest.target, true);
    await zero.whitelist(deployment.lockerToken.target, true);
    await zero.whitelist(omnichainStaking.target, true);

    await zero.transfer(omnichainStaking.target, parseEther("100"));
    await omnichainStaking.notifyRewardAmount(parseEther('1'));
  });
  
  it("Should return an array of all minted nfts for a user", async ()=> {
    for (let i = 0; i < 10; i++) {
      await vest.mint(
        ant.address,
        e18 * 15n, // 15 ZERO linear vesting
        e18 * 5n, // 5 ZERO upfront
        1000 * (i+1), // linear duration - 1000 seconds
        500, // cliff duration - 500 seconds
        0, // unlock date
        false, // penalty -> false
        0
      );
    }
    expect((await vestUiHelper.connect(ant).getVestedNFTData()).length).to.equal(10);
  });

  it("Should return the lock details with APR", async () => {
    for (let i = 0; i < 5; i++) {
      await vest.mint(
        ant.address,
        e18 * 15n, // 15 ZERO linear vesting
        e18 * 5n, // 5 ZERO upfront
        1000 * (i+1), // linear duration - 1000 seconds
        500, // cliff duration - 500 seconds
        0, // unlock date
        false, // penalty -> false
        0
      );

      await vest
      .connect(ant)
      ["safeTransferFrom(address,address,uint256)"](
        ant.address,
        stakingBonus.target,
        i+1
      );
    }
    
    const transactionData = await vestUiHelper.connect(ant).getLockDetails();
    expect(transactionData.length).to.eq(5);
  });
});
