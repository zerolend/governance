import hre from "hardhat";

export const e18 = BigInt(10) ** 18n;

const supply = (100000000000n * e18) / 100n;

export async function deployFixture() {
  console.log("Start");
  // Contracts are deployed using the first signer/account by default
  const [deployer] = await hre.ethers.getSigners();

  const ZeroToken = await hre.ethers.getContractFactory("EarlyZERO");
  const token = await ZeroToken.connect(deployer).deploy();

  const LockerToken = await hre.ethers.getContractFactory("LockerToken");
  const locker = await LockerToken.deploy();

  await locker.init(token.target, "0x0000000000000000000000000000000000000000");

  await token.transfer(locker.target, 20n * supply);

  return {
    deployer,
    token,
    locker,
  };
}
