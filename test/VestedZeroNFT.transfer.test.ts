import { expect } from "chai";
import { e18, deployFixture as fixture } from "./fixtures/nftCore";
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const to = "0x99E0329e25e9b86395F3aBE20D2b33f688489d5B";

describe("VestedZeroNFT", function () {
  it("Should deploy properly and Should mint and safe transfer nft", async function () {
    const { deployer, token, nft } = await loadFixture(fixture);

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

    await nft.safeTransferFrom(deployer.address, to, 1n);

    console.log(await nft.ownerOf(await nft.lastTokenId()));

    expect(await nft.ownerOf(await nft.lastTokenId())).to.equal(to);
  });
});
