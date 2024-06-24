import hre from "hardhat";
import {
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";

const getSlot = async (proxy: any, key: string) => {
  const data = await hre.ethers.provider.getStorage(proxy.target, key);
  return data;
};

const main = async function () {
  const safe = "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A";
  const d = "0x0F6e98A756A40dD050dC78959f45559F98d3289d";

  // await impersonateAccount(safe);
  // await setBalance(safe, "0x314DC6448D9338C15B0A00000000");
  // const safeSigner = await hre.ethers.getSigner(safe);

  const factory = await hre.ethers.getContractFactory("RewardsController");
  const impl = await factory.deploy(
    "0x749dF84Fd6DE7c0A67db3827e5118259ed3aBBa5",
    "0x2666951a62d82860e8e1385581e2fb7669097647"
  );

  const provider = await hre.ethers.getContractAt(
    "PoolAddressesProvider",
    "0xC44827C51d00381ed4C52646aeAB45b455d200eB"
  );

  // address _emissionManager, address _staking
  // const impl = await hre.ethers.getContractAt(
  //   "OmnichainStakingLP",
  //   "0x4cA072BaA0D1BC61ce591aDdB3E1B6702AcC9251"
  // );

  // proxies
  const proxy = await hre.ethers.getContractAt(
    "TransparentUpgradeableProxy",
    "0x28F6899fF643261Ca9766ddc251b359A2d00b945"
  );

  const implP = await hre.ethers.getContractAt(
    "RewardsController",
    "0x28F6899fF643261Ca9766ddc251b359A2d00b945"
  );

  console.log(
    "impl",
    await getSlot(
      proxy,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    )
  );

  console.log(
    "getAllUserRewards",
    await implP.getAllUserRewards(
      ["0xB4FFEf15daf4C02787bC5332580b838cE39805f5"],
      d
    )
  );

  // await provider
  //   .connect(safeSigner)
  //   .setAddressAsProxy(
  //     "0x703c2c8634bed68d98c029c18f310e7f7ec0e5d6342c590190b3cb8b3ba54532",
  //     impl.target
  //   );

  // console.log("update done");

  // console.log(
  //   "getAllUserRewards",
  //   await implP.getAllUserRewards(
  //     ["0xB4FFEf15daf4C02787bC5332580b838cE39805f5"],
  //     d
  //   )
  // );

  // console.log("staking", await implP.staking());
  // console.log("maxBoostRequirement", await implP.maxBoostRequirement());
  // console.log("boostedBalance", await implP.boostedBalance(safe, "1000"));
  // console.log(
  //   "getRewardOracle",
  //   await implP.getRewardOracle("0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7")
  // );

  // console.log("rewardRate", await implP.rewardRate());
  // console.log("balanceOf", await implP.balanceOf(d));
  // console.log("userRewardPerTokenPaid", await implP.userRewardPerTokenPaid(d));
  // console.log("earned", await implP.earned(d));
  // console.log("owner", await implP.owner());
  // console.log("lockedByToken", await implP.lockedByToken(1));
  // console.log("lockedTokenIdNfts", await implP.lockedTokenIdNfts(d, 0));

  // const call = await impl.init.populateTransaction(
  //   "0x8bB8B092f3f872a887F377f73719c665Dd20Ab06", // address _locker,
  //   "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", // address _zeroToken,
  //   "0x2666951A62d82860E8e1385581E2FB7669097647", // address _poolVoter,
  //   86400 * 7, // uint256 _rewardsDuration
  //   "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647", // address _lpOracle,
  //   "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054", // address _zeroPythAggregator
  //   safe,
  //   "0xc0400264e71Fc9367719BE7bAdF228eac8fEdAB4"
  // );

  // const tx = await admin
  //   .connect(safeSigner)
  //   .upgradeAndCall(proxy.target, impl.target, call.data);
  // console.log(tx.data);

  // console.log("rewardRate", await implP.rewardRate());
  // console.log("balanceOf", await implP.balanceOf(d));
  // console.log("userRewardPerTokenPaid", await implP.userRewardPerTokenPaid(d));
  // console.log("earned", await implP.earned(d));
  // console.log("lockedByToken", await implP.lockedByToken(1));
  // console.log("lockedTokenIdNfts", await implP.lockedTokenIdNfts(d, 0));
  // console.log("owner", await implP.owner());
};

main();
