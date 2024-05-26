import {
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import { NumberLike } from "@nomicfoundation/hardhat-network-helpers/dist/src/types";
import hre, { ethers } from "hardhat";

export const e18 = BigInt(10) ** 18n;
export const supply = (100000000000n * e18) / 100n;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const initMainnetUser = async (user: string, balance?: NumberLike) => {
  await impersonateAccount(user);
  if (balance !== undefined) {
    await setBalance(user, balance);
  }
  return ethers.getSigner(user);
};

export const initProxy = async <T>(contract: string): Promise<T> => {
  const instanceF = await hre.ethers.getContractFactory(contract);
  const instance = await instanceF.deploy();

  const [deployer] = await hre.ethers.getSigners();

  const TransparentUpgradeableProxy = await hre.ethers.getContractFactory(
    "TransparentUpgradeableProxy"
  );

  const proxy = await TransparentUpgradeableProxy.deploy(
    instance,
    deployer.address,
    "0x"
  );

  return (await hre.ethers.getContractAt(contract, proxy.target)) as T;
};
