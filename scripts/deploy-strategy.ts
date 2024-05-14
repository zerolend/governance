import hre from "hardhat";

const main = async function () {
  const TransferStrategyZERO = await hre.ethers.getContractFactory(
    "TransferStrategyZERO"
  );

  const args = [
    "0x28F6899fF643261Ca9766ddc251b359A2d00b945", // address _incentivesController,
    "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12", // address _vestedZERO,
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
      constructorArguments: args,
    });
  }
};

main();
