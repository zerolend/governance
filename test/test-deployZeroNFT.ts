import { expect } from "chai";
import { e18, deployFixture as fixture } from "./fixtures/nftCore";
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VestedZeroNFT", function () {
  it("Should deploy properly and Should mint and Claim", async function () {
    const { deployer, token, nft } = await loadFixture(fixture);

    console.log(
      "Before Mint NFT Contract balance",
      await token.balanceOf(nft.target)
    );
    console.log(
      "Before Mint deployer balance",
      await token.balanceOf(deployer.address)
    );

    expect(await nft.zero()).to.equal(token.target);
    expect(await nft.royaltyReceiver()).to.equal(deployer.address);

    await token.approve(nft.target, e18 * 10n);

    await nft.mint(
      deployer.address,
      e18 * 5n,
      e18 * 5n,
      Math.floor(Date.now() / 1000 + 1000),
      Math.floor(Date.now() / 1000 + 500),
      Math.floor(Date.now() / 1000 + 100),
      false
    );

    expect(await nft.lastTokenId()).to.equal(1n);

    console.log(
      "After Mint NFT Contract balance",
      await token.balanceOf(nft.target)
    );
    console.log(
      "After Mint deployer balance",
      await token.balanceOf(deployer.address)
    );

    await time.increase(Math.floor(Date.now() / 1000 + 1000));

    await nft.claim(await nft.lastTokenId());

    console.log(
      "After Claim NFT Contract balance",
      await token.balanceOf(nft.target)
    );
    console.log(
      "After Claim deployer balance",
      await token.balanceOf(deployer.address)
    );
  });
});
