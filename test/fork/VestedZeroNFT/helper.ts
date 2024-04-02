import { ethers } from "hardhat";
import { IContractAddresses } from "./constants";

export async function getLendingPoolContracts(
  networkAddresses: IContractAddresses
) {
  const {
    PoolConfigurator,
    ERC20,
    Pool,
    AaveOracle,
    PoolAddressesProvider,
    ACLManager,
    AaveProtocolDataProvider,
  } = networkAddresses;

  const configurator = await ethers.getContractAt(
    PoolConfigurator.name,
    PoolConfigurator.address
  );
  const erc20 = await ethers.getContractAt(ERC20.name, ERC20.address);
  const pool = await ethers.getContractAt(Pool.name, Pool.address);
  const oracle = await ethers.getContractAt(
    AaveOracle.name,
    AaveOracle.address
  );
  const addressesProvider = await ethers.getContractAt(
    PoolAddressesProvider.name,
    PoolAddressesProvider.address
  );
  const aclManager = await ethers.getContractAt(
    ACLManager.name,
    ACLManager.address
  );
  const protocolDataProvider = await ethers.getContractAt(
    AaveProtocolDataProvider.name,
    AaveProtocolDataProvider.address
  );

  return {
    configurator,
    erc20,
    pool,
    oracle,
    addressesProvider,
    aclManager,
    protocolDataProvider,
  };
}
