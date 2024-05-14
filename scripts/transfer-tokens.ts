import hre, { ethers } from "hardhat";

const OmnichainStakingAddress = "0x1705A36637678d2A972318E73E4f60658147BED9";
const ZERO_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const staking = await hre.ethers.getContractAt(
    "OmnichainStaking",
    OmnichainStakingAddress
  );

  const zero = await hre.ethers.getContractAt("ZeroLend", ZERO_ADDRESS);

  const e18 = 10n ** 18n;

  const wallets = [
    "0x961E45e3666029709C3ac50A26319029cde4e067",
    "0x98a7Fa97B90f1eC0E54cAB708247936a5fa33492",
    "0x98a7Fa97B90f1eC0E54cAB708247936a5fa33492",
    "0xB09f5F982277a84c58C21529B9cCF19D82934C38",
    "0x92C88D4938D860de4Ad76cF12aCad2ec070c5Be3",
    "0xF152dA370FA509f08685Fa37a09BA997E41Fb65b",
    "0x4724682104FdcBE5F8CDec1dA2b9aa8a023c935B",
    "0x4b5814e7F104aC968C41CEAd00ef0182571F66B3",
    "0xE37f5219E726CD788708DE42d8E27135b06fB700",
    "0x7Ff4e6A2b7B43cEAB1fC07B0CBa00f834846ADEd",
    "0x073502E1d77e98bc4f6c526182bb637B46bf53DF",
    "0xB8221D5fb33C317CfBD912b8cE4Bd7C7740fAF88",
    "0xd9686D5F6fFa97cf41049eC974003B6806a56b2D",
    "0xf42921A4a1D8B90Ee3A23BaA8A31D755CA8DBE8D",
    "0x5F479fCD2087c5c4139E59187f49E9956bA9Ef6f",
  ];

  for (let index = 0; index < wallets.length; index++) {
    const element = wallets[index];
    console.log((await zero.transfer(element, e18 * 100n)).hash);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
