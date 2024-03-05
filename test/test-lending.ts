import { expect } from "chai";
import { ethers } from "hardhat";
import { ZERO_ADDRESS, deployLendingPool as fixture } from "./fixtures/lending";
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Deploy Lending and gauges", function () {
  it("Should deploy Gauges properly", async function () {
    const { erc20, protocolDataProvider, mockAggregator } = await loadFixture(
      fixture
    );

    const TokenList = await protocolDataProvider.getReserveTokensAddresses(
      erc20.target
    );

    const aToken = TokenList[0];

    const bToken = TokenList[2];

    const AToken = await ethers.getContractAt("AToken", aToken);

    const BToken = await ethers.getContractAt("AToken", bToken);

    const IncentivesController = await ethers.getContractFactory(
      "GaugeIncentiveController"
    );

    const EligibilityCriteria = await ethers.getContractFactory(
      "EligibilityCriteria"
    );

    const LendingPoolGauge = await ethers.getContractFactory(
      "LendingPoolGauge"
    );

    const supplyToken = await IncentivesController.deploy();
    const borrowToken = await IncentivesController.deploy();
    const eligibilityCriteria = await EligibilityCriteria.deploy();

    console.log(48);
    await eligibilityCriteria.init(
      ZERO_ADDRESS,
      mockAggregator.target,
      erc20.target
    );
    console.log(54);

    await supplyToken.init(
      AToken,
      erc20.target,
      eligibilityCriteria.target,
      mockAggregator.target
    );

    await borrowToken.init(
      BToken,
      erc20.target,
      eligibilityCriteria.target,
      mockAggregator.target
    );

    const lendingPoolGauge = await LendingPoolGauge.deploy(
      supplyToken.target,
      borrowToken.target
    );

    await AToken.setIncentivesController(supplyToken);

    await BToken.setIncentivesController(borrowToken);
  });
});
