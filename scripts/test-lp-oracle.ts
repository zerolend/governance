import { parseEther } from "ethers";
import { ethers } from "hardhat";

const NILE_LP = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const ZERO_PRICE_FEED = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";
const ETH_PRICE_FEED = "0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA";

const main = async function () {
  const factory = await ethers.getContractFactory("LPOracle");

  const contract = await factory.deploy(
    NILE_LP,
    ZERO_PRICE_FEED,
    ETH_PRICE_FEED
  );

  const e18 = 10n ** 18n;

  const price = (await contract.getPrice()) / e18;
  console.log("price in usd terms for 1 LP token in 1e8", price);
};

main();
