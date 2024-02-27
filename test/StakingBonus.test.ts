import { expect } from "chai";
import { e18, deployCore } from "./fixtures/governance";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  LockerToken,
  OmnichainStaking,
  StakingBonus,
  VestedZeroNFT,
  ZeroLend,
} from "../typechain-types";

describe.only("StakingBonus", () => {
  let ant: SignerWithAddress;
  let vest: VestedZeroNFT;
  let now: number;
  let stakingBonus: StakingBonus;
  let zero: ZeroLend;
  let locker: LockerToken;
  let omniStaking: OmnichainStaking;

  beforeEach(async () => {
    const deployment = await loadFixture(deployCore);
    ant = deployment.ant;
    zero = deployment.zero;
    vest = deployment.vestedZeroNFT;
    stakingBonus = deployment.stakingBonus;
    locker = deployment.lockerToken;
    omniStaking = deployment.omnichainStaking;
    now = Math.floor(Date.now() / 1000);
  });

  describe("onERC721Received() - stake nft", () => {
    beforeEach(async () => {
      expect(await vest.lastTokenId()).to.equal(0);

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

      expect(await vest.lastTokenId()).to.equal(1);
    });

    it("should mint one vested nft properly for a user", async function () {
      expect(await vest.balanceOf(ant)).to.equal(1);
      expect(await vest.ownerOf(1)).to.equal(ant.address);
      expect(await vest.tokenOfOwnerByIndex(ant.address, 0)).to.equal(1);
    });

    it("should stake a nft properly for the user", async function () {
      // stake nft on behalf of the ant
      expect(
        await vest
          .connect(ant)
          ["safeTransferFrom(address,address,uint256)"](
            ant.address,
            stakingBonus.target,
            1
          )
      );

      expect(await omniStaking.balanceOf(ant.address)).greaterThan(
        (e18 * 199n) / 10n
      );
      expect(await omniStaking.tokenPower(1)).greaterThan((e18 * 199n) / 10n);
    });
  });
});

// describe.only("VestedZeroNFT", function () {
//   it("Should deploy properly and Should mint and safe transfer nft", async function () {
//     const { deployer, token, nft } = await loadFixture(fixture);

//     expect(await nft.zero()).to.equal(token.target);
//     expect(await nft.royaltyReceiver()).to.equal(deployer.address);

//     await token.approve(nft.target, e18 * 10n);

//     await nft.mint(
//       deployer.address,
//       e18 * 5n,
//       e18 * 5n,
//       Math.floor(Date.now() / 1000 + 1000),
//       Math.floor(Date.now() / 1000 + 500),
//       Math.floor(Date.now() / 1000 + 100),
//       false
//     );

//     expect(await nft.lastTokenId()).to.equal(1n);

//     await nft.safeTransferFrom(deployer.address, to, 1n);

//     console.log(await nft.ownerOf(await nft.lastTokenId()));

//     expect(await nft.ownerOf(await nft.lastTokenId())).to.equal(to);
//   });
// });
