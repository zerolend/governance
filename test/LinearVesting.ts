import { expect } from "chai";
import { e18, deployFixture as fixture } from "./fixtures/core";
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("LinearVesting", function () {
  it("Should deploy properly", async function () {
    const {
      linearVest: linearVest,
      token,
      burnableToken,
      deployer,
    } = await loadFixture(fixture);

    expect(await linearVest.underlying()).to.equal(token.target);
    expect(await linearVest.vestedToken()).to.equal(burnableToken.target);
    expect(Number(await token.balanceOf(linearVest.target))).greaterThan(0);
    expect(await linearVest.lastId()).to.equal(0);
    expect(await linearVest.userToIds(deployer.address, 0)).to.equal(0);
  });
});

describe("For a user who has some vested tokens", function () {
  it("Should create a new vest properly", async function () {
    const {
      linearVest: linearVest,
      burnableToken,
      deployer,
    } = await loadFixture(fixture);

    expect(await burnableToken.balanceOf(deployer.address)).greaterThan(0);
    await burnableToken.approve(linearVest.target, e18 * 100n);

    await linearVest.createVest(e18 * 100n); // start vesting 100 tokens.

    expect(await linearVest.lastId()).to.equal(1n);
    expect(await linearVest.userToIds(deployer.address, 0)).to.equal(1n);
    expect(await burnableToken.balanceOf(linearVest.target)).eq(0);
  });

  it("Should claim vest if vesting has not started", async function () {
    const { linearVest, burnableToken, deployer } = await loadFixture(fixture);
    expect(await burnableToken.balanceOf(deployer.address)).greaterThan(0);
    await burnableToken.approve(linearVest.target, e18 * 100n);

    await linearVest.createVest(e18 * 100n); // start linearVest 100 tokens.

    expect(await linearVest.claimVest(1)).to.equal(0);
  });

  // it("Should claim vest if vesting has started", async function () {
  //   const { linearVest, burnableToken, deployer } = await loadFixture(fixture);
  //   expect(await burnableToken.balanceOf(deployer.address)).greaterThan(0);
  //   await burnableToken.approve(linearVest.target, e18 * 100n);

  //   await linearVest.createVest(e18 * 100n); // start linearVest 100 tokens.
  //   console.log(await linearVest.userToIds(deployer.address, 0));
  //   console.log(await burnableToken.balanceOf(deployer.address));
  //   expect(await linearVest.claimVest(1)).to.equal(0);
  // });
});
