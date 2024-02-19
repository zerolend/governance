import hre from "hardhat";

export const e18 = BigInt(10) ** 18n;

const supply = (100000000000n * e18) / 100n;

export async function deployFixture() {
  console.log("Start");
  // Contracts are deployed using the first signer/account by default
  const [deployer] = await hre.ethers.getSigners();

  const ZeroToken = await hre.ethers.getContractFactory("EarlyZERO");
  const token = await ZeroToken.connect(deployer).deploy();
  console.log(token.target);

  const ZeroNFT = await hre.ethers.getContractFactory("VestedZeroNFT");
  const nft = await ZeroNFT.deploy();
  console.log(nft.target);

  await nft.init(token.target, "0x0000000000000000000000000000000000000000");

  await token.transfer(nft.target, 20n * supply);

  return {
    deployer,
    token,
    nft,
  };
}
