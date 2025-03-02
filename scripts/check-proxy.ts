import hre from "hardhat";

const getSlot = async (proxy: any, key: string) => {
  const data = await hre.ethers.provider.getStorage(proxy.target, key);
  return data;
};

const main = async function () {
  // proxies
  const proxy = await hre.ethers.getContractAt(
    "TransparentUpgradeableProxy",
    "0x96347e1d3f74b4f84467e5d71bf5b9fe7cb3533e"
  );

  console.log(
    "impl",
    await getSlot(
      proxy,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    )
  );

  console.log(
    "admin",
    await getSlot(
      proxy,
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
    )
  );
};

main();
