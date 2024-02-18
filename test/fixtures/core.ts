const { ethers } = require("hardhat");
import hre from "hardhat";

export const e18 = BigInt(10) ** 18n;

const supply = (100000000000n * e18) / 100n;

export async function deployFixture() {
  console.log("Start");
  // Contracts are deployed using the first signer/account by default
  const [deployer] = await hre.ethers.getSigners();

  const ZeroToken = await hre.ethers.getContractFactory("EarlyZERO");
  const token = await ZeroToken.connect(deployer).deploy();

  const ZeroBurnable = await hre.ethers.getContractFactory("VestedZERO");
  const burnableToken = await ZeroBurnable.deploy();

  const LinearVesting = await hre.ethers.getContractFactory("LinearVesting");
  const linearVest = await LinearVesting.deploy();

  await linearVest.init(
    token.target,
    burnableToken.target,
    "0x0000000000000000000000000000000000000000",
    Math.floor(Date.now() / 1000)
  );

  // send 20% vested tokens to bonding curve
  await token.transfer(linearVest.target, 20n * supply);

  // send 10% vested tokens to the staking contract
  await token.transfer(linearVest.target, 10n * supply);

  // send 47% for emissions
  await token.transfer(linearVest.target, 47n * supply);

  await burnableToken.transfer(deployer.address, 10n * supply);

  return {
    ethers,
    deployer,
    token,
    burnableToken,
    linearVest,
  };
}
