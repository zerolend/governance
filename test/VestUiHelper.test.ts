import { expect } from "chai";
import { deployGovernance } from "./fixtures/governance";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  OmnichainStakingLP,
  OmnichainStakingToken,
  StakingBonus,
  VestedZeroNFT,
  VestedZeroUiHelper,
  ZeroLend,
} from "../typechain-types";
import { e18 } from "./fixtures/utils";
import { ContractTransactionResponse, parseEther, parseUnits } from "ethers";
import { ethers } from "hardhat";
import { getNetworkDetails } from "./fork/constants";
import { setForkBlock } from "./fork/utils";

describe("UI Helper tests", () => {
  let ant: SignerWithAddress;
  let deployer: SignerWithAddress;
  let vest: VestedZeroNFT;
  let vestUiHelper: VestedZeroUiHelper & {
    deploymentTransaction(): ContractTransactionResponse;
  };
  let zero: ZeroLend;
  let stakingBonus: StakingBonus;
  let omnichainStakingToken: OmnichainStakingToken;
  let omnichainStakingLP: OmnichainStakingLP;

  beforeEach(async () => {
    const deployment = await loadFixture(deployGovernance);
    ant = deployment.ant;
    deployer = deployment.deployer;
    stakingBonus = deployment.stakingBonus;
    vest = deployment.vestedZeroNFT;
    omnichainStakingToken = deployment.omnichainStaking;

    let vestUiHelperFactory = await ethers.getContractFactory(
      "VestedZeroUiHelper"
    );
    vestUiHelper = await vestUiHelperFactory.deploy();
    await vestUiHelper.initialize(
      vest.target,
      omnichainStakingToken.target,
      omnichainStakingLP.target
    );
    zero = deployment.zero;

    await zero.whitelist(stakingBonus.target, true);
    await zero.whitelist(vest.target, true);
    await zero.whitelist(deployment.lockerToken.target, true);
    await zero.whitelist(omnichainStakingToken.target, true);
    await zero.whitelist(omnichainStakingLP.target, true);

    await zero.transfer(omnichainStakingToken.target, parseEther("100"));
    await omnichainStakingToken.notifyRewardAmount(parseEther("1"));
  });

  it("Should return an array of all minted nfts for a user", async () => {
    for (let i = 0; i < 10; i++) {
      await vest.mint(
        ant.address,
        e18 * 15n, // 15 ZERO linear vesting
        e18 * 5n, // 5 ZERO upfront
        1000 * (i + 1), // linear duration - 1000 seconds
        500, // cliff duration - 500 seconds
        0, // unlock date
        false, // penalty -> false
        0
      );
    }
    expect((await vestUiHelper.getVestedNFTData(ant.address)).length).to.equal(
      10
    );
  });

  it("Should return the lock details with APR for 1 year", async () => {
    await zero
      .connect(deployer)
      .approve(stakingBonus.target, parseEther("100"));
    await stakingBonus
      .connect(deployer)
      .createLock(parseEther("100"), 365n * 86400n, true);
    const transactionData = await vestUiHelper.getLockDetails(deployer.address);
    expect(transactionData[0].apr).to.closeTo(
      19864130517503805n,
      parseUnits("1", 12)
    );
  });
});

const FORK = process.env.FORK === "true";
const FORKED_NETWORK = process.env.FORKED_NETWORK ?? "";

if (FORK) {
  let vestUiHelper: VestedZeroUiHelper & {
    deploymentTransaction(): ContractTransactionResponse;
  };

  describe("Ui Helper Fork Tests", () => {
    before(async () => {
      const networkDetails = getNetworkDetails(FORKED_NETWORK);
      await setForkBlock(networkDetails.BLOCK_NUMBER);

      const { VestedZeroNFT, OmnichainStakingLP, OmnichainStaking } =
        networkDetails;

      const vestUiHelperFactory = await ethers.getContractFactory(
        "VestedZeroUiHelper"
      );

      vestUiHelper = await vestUiHelperFactory.deploy();
      vestUiHelper.initialize(
        VestedZeroNFT.address,
        OmnichainStaking.address,
        OmnichainStakingLP.address
      );
    });

    it("Should return the lpLock details", async () => {
      const lockLpDetails = await vestUiHelper.getLPLockDetails(
        "0x7ff4e6a2b7b43ceab1fc07b0cba00f834846aded"
      );
      expect(lockLpDetails.length).to.be.greaterThan(0);      
    });

    it("Should return the tokenLock details", async () => {
      const lockDetails = await vestUiHelper.getLockDetails(
        "0x7ff4e6a2b7b43ceab1fc07b0cba00f834846aded"
      );
      expect(lockDetails.length).to.be.greaterThan(0);      
    });
    
    it("Should return the vest details", async () => {
      const lockDetails = await vestUiHelper.getVestedNFTData(
        "0x32334A163Ab14712Ead2da81dB9b89A063858Df0"
      );
      expect(lockDetails.length).to.be.greaterThan(0);      
    });
  });
}
