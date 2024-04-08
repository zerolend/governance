import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { NumberLike } from "@nomicfoundation/hardhat-network-helpers/dist/src/types";
import { ethers } from "hardhat";

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