import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";

import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      forking: {
        url: process.env.URL || "",
      },
      accounts: [
        {
          balance: "100000000000000000000",
          privateKey: process.env.WALLET_PRIVATE_KEY || "",
        },
      ],
    },
  },
};

export default config;
