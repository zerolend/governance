export interface IContractDetails {
  name: string
  address: string
}
export interface IContractAddresses {
  Pool: IContractDetails;
  ReserveTreasury: IContractDetails;
  AToken: IContractDetails;
  StableDebtToken: IContractDetails;
  VariableDebtToken: IContractDetails;
  SupplyLogic: IContractDetails;
  BorrowLogic: IContractDetails;
  EModeLogic: IContractDetails;
  BridgeLogic: IContractDetails;
  ConfiguratorLogic: IContractDetails;
  ERC20: IContractDetails;
  PoolLogic: IContractDetails;
  PoolConfigurator: IContractDetails;
  DefaultReserveInterestRateStrategy: IContractDetails;
  AaveProtocolDataProvider: IContractDetails;
  LiquidationLogic: IContractDetails;
  ACLManager: IContractDetails;
  AaveOracle: IContractDetails;
  PoolAddressesProvider: IContractDetails
  EarlyZERO: IContractDetails;
  EarlyZEROVesting: IContractDetails;
  ZeroLend: IContractDetails;
  VestedZeroNFT: IContractDetails;
  StakingBonus: IContractDetails;
  OmnichainStaking: IContractDetails;
  LockerToken: IContractDetails;
  LockerLP: IContractDetails;
  
  BLOCK_NUMBER: number;
}

export function getContractAddresses(networkName: string) {
  return contractAddresses[networkName];
}

export const contractAddresses: { [key: string]: IContractAddresses } = {
  blastSepolia: {
    Pool: {
      name: "Pool",
      address: "0x2B6106B5e7b01042f9039f75CEeEAEca69Fc0ab7",
    },
    ReserveTreasury: {
      name: "",
      address: "0x9d6273C3Cd657593aB168C2C68FCE25bBA5ec009",
    },
    AToken: {
      name: "AToken",
      address: "0x77ac630a415b1dDF7f99B5A78487A43DdE1Ed7F9",
    },
    StableDebtToken: {
      name: "StableDebtToken",
      address: "0x4200000000000000000000000000000000000023",
    },
    VariableDebtToken: {
      name: "VariableDebtToken",
      address: "0x2757EfffF0AaAcd2b100E1e7E14F4CEEd699DE1f",
    },
    ERC20: {
      name: "ERC20",
      address: "0x4200000000000000000000000000000000000023",
    },
    SupplyLogic: { name: "SupplyLogic", address: "0x23Dc14c412Be98e14a423a84c5B4a3490DfCE2cF" },
    BorrowLogic: { name: "BorrowLogic", address: "0x4107a2c7728500aEA7846dcb9Be00b8A82CEC3c6" },
    EModeLogic: { name: "EModeLogic", address: "0xF46C11dC451303170ac52D6039a18E1a9610B177" },
    BridgeLogic: { name: "BridgeLogic", address: "0x2f4af3dE270C13002f2E400A2B4Ad416D6c839c5" },
    ConfiguratorLogic: { name: "ConfiguratorLogic", address: "0x899ca8b7c8762F8e185eCE73c03480cC77Ad1b53" },
    PoolLogic: { name: "PoolLogic", address: "0xF6E8725d297Fb229386505De978335BFDD0417dB" },
    PoolConfigurator: {
      name: "PoolConfigurator",
      address: "0xA97161159b059D1d0Ee59D44594682252ff443b2",
    },
    DefaultReserveInterestRateStrategy: {
      name: "DefaultReserveInterestRateStrategy",
      address: "",
    },
    AaveProtocolDataProvider: {
      name: "AaveProtocolDataProvider",
      address: "",
    },
    LiquidationLogic: { name: "LiquidationLogic", address: "0x89E309d075bb479C3dd3B9CA5d6a89B7a249Be4d" },
    ACLManager: { name: "ACLManager", address: "0x88eCE01a028CfED3E3cbbb899D64600Df663e2d3" },
    AaveOracle: { name: "AaveOracle", address: "0xd676D38b4A40082d21f2396Af6f8F218305BD9ce" },
    PoolAddressesProvider: {
      name: "PoolAddressesProvider",
      address: "0xa9eE3E04F102c6ba1A6468d641094A0BB83d6D2c",
    },
    StakingBonus: {
      name: "StakingBonus",
      address: "0x8b11E251186A301b09B14850D4f9f498F63a72F3"
    },
    EarlyZERO: {
      name: "EarlyZERO",
      address: "0xeE3D5E55E191705AAB2ac67a956c31C18A96B1Ae"
    },
    EarlyZEROVesting: {
      name: "EarlyZEROVesting",
      address: "0x58b70014D1ae44d1d6b988D2E0084e900aE74d58"
    },
    ZeroLend: {
      name: "ZeroLend",
      address: "0xf140Fd0cca2360533b259c4E34f22a1F6c947EFE"
    },
    VestedZeroNFT: {
      name: "VestedZeroNFT",
      address: ""
    },
    OmnichainStaking: {
      name: "OmnichainStaking",
      address: "0xfaa5890471fC237D7f97BF83618d11d374A864Ad"
    },
    LockerToken: {
      name: "LockerToken",
      address: "0x57645eCea0FA1FAB346cCBA1663e94300af05C9f"
    },
    LockerLP: {
      name: "LockerToken",
      address: "0x4dA355784C5240F81D013623f1050c2D7857c6C6"
    },
    BLOCK_NUMBER: 0,
  },
};
