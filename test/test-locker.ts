import { expect } from "chai";
import { e18, deployFixture as fixture } from "./fixtures/LockerCore";
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Locker Token", function () {
  it("Should deploy properly and create lock ", async function () {
    const { deployer, token, locker } = await loadFixture(fixture);

    console.log(await token.balanceOf(deployer.address));
    const res = 4 * 365 * 24 * 60 * 60;
    console.log(res);

    await token.approve(locker.target, e18 * 100n);

    await locker.createLock(e18 * 10n, res, false);

    console.log(await token.balanceOf(deployer.address));
  });
});
