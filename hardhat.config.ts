import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-dependency-compiler";
import "hardhat-abi-exporter";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import "solidity-coverage";
import "solidity-docgen";
import "hardhat-tracer";
import dotenv from "dotenv";
import { base } from "./types/@zerolendxyz/core-v3/contracts/flashloan";
dotenv.config();

const config: HardhatUserConfig = {
  abiExporter: {
    path: "./abi",
    runOnCompile: true,
    clear: true,
    spacing: 2,
    format: "minimal",
  },
  docgen: {
    pages: "files",
    exclude: ["interfaces", "tests"],
  },
  // @ts-ignore
  gasReporter: {
    reportFormat: "terminal",
    outputFile: "coverage/gasReport.txt",
    noColors: true,
    forceTerminalOutput: true,
    forceTerminalOutputFormat: "terminal",
  },
  dependencyCompiler: {
    paths: [
      "@zerolendxyz/core-v3/contracts/mocks/helpers/MockIncentivesController.sol",
      "@zerolendxyz/core-v3/contracts/mocks/helpers/MockReserveConfiguration.sol",
      "@zerolendxyz/core-v3/contracts/mocks/oracle/CLAggregators/MockAggregator.sol",
      "@zerolendxyz/core-v3/contracts/mocks/tokens/MintableERC20.sol",
      "@zerolendxyz/core-v3/contracts/mocks/flashloan/MockFlashLoanReceiver.sol",
      "@zerolendxyz/core-v3/contracts/mocks/tokens/WETH9Mocked.sol",
      "@zerolendxyz/core-v3/contracts/mocks/upgradeability/MockVariableDebtToken.sol",
      "@zerolendxyz/core-v3/contracts/mocks/upgradeability/MockAToken.sol",
      "@zerolendxyz/core-v3/contracts/mocks/upgradeability/MockStableDebtToken.sol",
      "@zerolendxyz/core-v3/contracts/mocks/upgradeability/MockInitializableImplementation.sol",
      "@zerolendxyz/core-v3/contracts/protocol/configuration/PoolAddressesProviderRegistry.sol",
      "@zerolendxyz/core-v3/contracts/protocol/configuration/PoolAddressesProvider.sol",
      "@zerolendxyz/core-v3/contracts/misc/AaveOracle.sol",
      "@zerolendxyz/core-v3/contracts/protocol/tokenization/AToken.sol",
      "@zerolendxyz/core-v3/contracts/protocol/tokenization/DelegationAwareAToken.sol",
      "@zerolendxyz/core-v3/contracts/protocol/tokenization/StableDebtToken.sol",
      "@zerolendxyz/core-v3/contracts/protocol/tokenization/VariableDebtToken.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/GenericLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/ValidationLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/ReserveLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/SupplyLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/EModeLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/BorrowLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/BridgeLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/FlashLoanLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/logic/CalldataLogic.sol",
      "@zerolendxyz/core-v3/contracts/protocol/pool/Pool.sol",
      "@zerolendxyz/core-v3/contracts/protocol/pool/L2Pool.sol",
      "@zerolendxyz/core-v3/contracts/protocol/pool/PoolConfigurator.sol",
      "@zerolendxyz/core-v3/contracts/protocol/pool/DefaultReserveInterestRateStrategy.sol",
      "@zerolendxyz/core-v3/contracts/protocol/libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol",
      "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/upgradeability/InitializableAdminUpgradeabilityProxy.sol",
      "@zerolendxyz/core-v3/contracts/deployments/ReservesSetupHelper.sol",
      "@zerolendxyz/core-v3/contracts/misc/AaveProtocolDataProvider.sol",
      "@zerolendxyz/core-v3/contracts/misc/L2Encoder.sol",
      "@zerolendxyz/core-v3/contracts/protocol/configuration/ACLManager.sol",
      "@zerolendxyz/core-v3/contracts/dependencies/weth/WETH9.sol",
      "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20Detailed.sol",
      "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol",
      "@zerolendxyz/core-v3/contracts/mocks/oracle/PriceOracle.sol",
      "@zerolendxyz/core-v3/contracts/mocks/tokens/MintableDelegationERC20.sol",
      "@zerolendxyz/periphery-v3/contracts/mocks/testnet-helpers/TestnetERC20.sol",
      "@zerolendxyz/periphery-v3/contracts/rewards/RewardsController.sol",
      "@zerolendxyz/periphery-v3/contracts/rewards/EmissionManager.sol",
      "@zerolendxyz/periphery-v3/contracts/rewards/transfer-strategies/TransferStrategyBase.sol",
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
    ],
  },
  typechain: {
    outDir: "types",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: { enabled: true, runs: 200_000 },
        },
      },
      {
        version: "0.8.12",
        settings: {
          optimizer: { enabled: true, runs: 200_000 },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200_000 },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // live: false,
      // loggingEnabled: true,
      allowBlocksWithSameTimestamp: true,
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161	`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
      saveDeployments: true,
    },
    blast: {
      url: `https://rpc.blast.io`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
    },
    blastSepolia: {
      url: `https://sepolia.blast.io`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
      saveDeployments: true,
    },
    lineaSepolia: {
      url: `https://rpc.sepolia.linea.build`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
      saveDeployments: true,
    },
    mainnet: {
      url: `https://rpc.ankr.com/eth`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
      saveDeployments: true,
    },
    linea: {
      url: `https://rpc.linea.build/`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
      saveDeployments: true,
    },
    era: {
      url: `https://mainnet.era.zksync.io`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
    },
    manta: {
      url: `https://pacific-rpc.manta.network/http`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
    },
    base: {
      url: `https://mainnet.base.org`,
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
    }
  },
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      blast: process.env.BLASTSCAN_KEY || "",
      linea: process.env.LINEASCAN_KEY || "",
      xLayer: process.env.XLAYER_KEY || "",
      mainnet: process.env.ETHERSCAN_KEY || "",
      blastSepolia: process.env.BLAST_SEPOLIA_KEY || "",
      manta: "",
      era: process.env.ZKSYNC_KEY || "",
      base: process.env.BASESCAN_KEY || "",
    },
    customChains: [
      {
        network: "manta",
        chainId: 169,
        urls: {
          apiURL: "https://pacific-explorer.manta.network/api",
          browserURL: "https://pacific-explorer.manta.network",
        },
      },
      {
        network: "linea",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build",
        },
      },
      {
        network: "blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io",
        },
      },
      {
        network: "xLayer",
        chainId: 196,
        urls: {
          apiURL:
            "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
          browserURL: "https://www.oklink.com/xlayer", //or https://www.oklink.com/xlayer for mainnet
        },
      },
      {
        network: "blastSepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api-sepolia.blastscan.io/api",
          browserURL: "https://sepolia.blastscan.io/",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        }
      }
    ],
  },
};

export default config;
