import { expect } from "chai";
import { deployLendingPool as fixture } from "./fixtures/lending";
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Deploy Lending", function () {
  it("Should deploy properly", async function () {
    const {
      owner,
      configurator,
      erc20,
      pool,
      addressesProvider,
      aclManager,
      protocolDataProvider,
    } = await loadFixture(fixture);

    console.log(
      owner,
      configurator,
      erc20,
      pool,
      addressesProvider,
      aclManager,
      protocolDataProvider
    );
  });
});
