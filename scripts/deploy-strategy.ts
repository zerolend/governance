import hre from "hardhat";

const main = async function () {
  const TransferStrategyZERO = await hre.ethers.getContractFactory(
    "TransferStrategyZERO"
  );

  const args = [
    "0xaBA2AC76747571B8449F8a935D2cE90e2F2A32E3", // address _incentivesController,
    "0xBDd0F194C29e337411f98589548E03F7b38D044b", // address _vestedZERO,
    "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7", // address _zero
  ];

  // implementations
  const transferStrategyZERO = await TransferStrategyZERO.deploy(
    args[0],
    args[1],
    args[2]
  );

  console.log("transferStrategyZERO", transferStrategyZERO.target);

  await transferStrategyZERO.waitForDeployment();

  if (hre.network.name != "hardhat") {
    await hre.run("verify:verify", {
      address: transferStrategyZERO.target,
      constructorArgs: args,
    });
  }
};

main();
