import hre from "hardhat";

const ZERO_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";
const OLD_ADDRESS = "0xf05849a1140bf8cdcd929c8709da463b630ae56a"; // aniketh old address
const NEW_ADDRESS = "0xFc2A07c3c71B993a623BD33a9fCd6f5f8C3ba3da"; // aniketh new address

async function main() {
  if (!ZERO_ADDRESS.length) {
    throw new Error("Invalid Vest Address");
  }
  const [deployer] = await hre.ethers.getSigners();
  console.log("I am", deployer.address);

  const zero = await hre.ethers.getContractAt("ZeroLend", ZERO_ADDRESS);
  
  //balance of old address
  const balance = await zero.balanceOf(OLD_ADDRESS);
  console.log("Balance: ", balance.toString());

  // msg.sender should be an approved spender
  const txBurn = await zero.burnFrom(OLD_ADDRESS, balance);
  console.log("zero token minted for: ", txBurn.hash);
  await txBurn.wait();
  
  // mint to new address with same balance
  const tx = await zero.mint(
    balance,
    NEW_ADDRESS,
  );

  console.log("zero token minted for: ", tx.hash);
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
