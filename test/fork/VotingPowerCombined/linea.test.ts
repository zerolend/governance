import { expect, should } from "chai";
import { e18, initMainnetUser } from "../../fixtures/utils";
import { VestedZeroNFT, VotingPowerCombined } from "../../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { setForkBlock } from "../utils";
import { getNetworkDetails } from "../constants";
import {
  Contract,
  ContractTransactionResponse,
  parseEther,
  parseUnits,
} from "ethers";
import { ethers } from "hardhat";
import { getGovernanceContracts } from "../helper";

const FORK = process.env.FORK === "true";
const FORKED_NETWORK = process.env.FORKED_NETWORK ?? "";
const BLOCK_NUMBER = 5969983;

const STAKING_ADDRESS = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
const REWARD_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const OWNER = "0x0F6e98A756A40dD050dC78959f45559F98d3289d";

if (FORK) {
  let votingPowerCombined: VotingPowerCombined;
  let deployerForked: SignerWithAddress;
  describe.only("VotingPowerCombined ForkTests", async () => {
    beforeEach(async () => {
      votingPowerCombined = await ethers.getContractAt(
        "VotingPowerCombined",
        "0x2666951A62d82860E8e1385581E2FB7669097647"
      );
      [deployerForked] = await ethers.getSigners();
      await setForkBlock(BLOCK_NUMBER);

      //

      const poolVoterFactory = await ethers.getContractFactory("PoolVoter");
      const poolVoter = await poolVoterFactory.deploy();
      await poolVoter.init(STAKING_ADDRESS, REWARD_ADDRESS, votingPowerCombined.target);
      
      const owner = await initMainnetUser(OWNER);
      await votingPowerCombined.connect(owner).setAddresses(STAKING_ADDRESS, REWARD_ADDRESS, poolVoter.target);
    });

    it("Should reset voting power", async () => {
      const resetterWallet = await initMainnetUser("0x7Ff4e6A2b7B43cEAB1fC07B0CBa00f834846ADEd", parseEther('100'));

      const resetTransaction = votingPowerCombined.connect(resetterWallet).reset(resetterWallet.address);
      await expect(resetTransaction).to.not.be.revertedWith('Invalid reset performed');
    });
  });
}
