import { HardhatUserConfig } from "hardhat/config";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";

// Function to determine zkSync network configuration based on the environment
const getZkSyncNetworkConfig = (): {
  url: string;
  ethNetwork: string;
  zksync: boolean;
  verifyURL?: string;
} => {
  if (process.env.NODE_ENV === "test") {
    return {
      url: "http://localhost:3050",
      ethNetwork: "http://localhost:8545",
      zksync: true,
    };
  } else {
    return {
      url: "https://zksync2-testnet.zksync.dev",
      ethNetwork: "goerli",
      zksync: true,
      verifyURL: "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    };
  }
};

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest",
    settings: {},
  },
  defaultNetwork: "zkSyncEra",
  networks: {
    hardhat: {
      zksync: false,
    },
    zkSyncTestnet: getZkSyncNetworkConfig(),
    zkSyncEra: {
      url: "https://mainnet.era.zksync.io",
      ethNetwork: "mainnet",
      zksync: true,
      chainId: 324,
      verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
    },
  },
  solidity: {
    compilers: [
      { version: "0.4.15" },
      { version: "0.8.20" },
    ],
  },
};

export default config;
