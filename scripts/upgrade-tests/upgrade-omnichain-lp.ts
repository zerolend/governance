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

  await impersonateAccount(safe);
  await setBalance(safe, "0x314DC6448D9338C15B0A00000000");
  const safeSigner = await hre.ethers.getSigner(safe);

  // const factory = await hre.ethers.getContractFactory("OmnichainStakingLP");
  // const impl = await factory.deploy();
  const impl = await hre.ethers.getContractAt(
    "OmnichainStakingLP",
    "0x4cA072BaA0D1BC61ce591aDdB3E1B6702AcC9251"
  );

  // proxies
  const proxy = await hre.ethers.getContractAt(
    "TransparentUpgradeableProxy",
    "0x0374ae8e866723adae4a62dce376129f292369b4"
  );

  const implP = await hre.ethers.getContractAt(
    "OmnichainStakingLP",
    "0x0374ae8e866723adae4a62dce376129f292369b4"
  );

  const admin = await hre.ethers.getContractAt(
    "ProxyAdmin",
    "0xb21da3000ffcc2156da080940da8506311da037e"
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

  console.log("rewardRate", await implP.rewardRate());
  console.log("balanceOf", await implP.balanceOf(d));
  console.log("userRewardPerTokenPaid", await implP.userRewardPerTokenPaid(d));
  console.log("earned", await implP.earned(d));
  console.log("owner", await implP.owner());
  // console.log("lockedByToken", await implP.lockedByToken(1));
  // console.log("lockedTokenIdNfts", await implP.lockedTokenIdNfts(d, 0));

  const call = await impl.init.populateTransaction(
    "0x8bB8B092f3f872a887F377f73719c665Dd20Ab06", // address _locker,
    "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", // address _zeroToken,
    "0x2666951A62d82860E8e1385581E2FB7669097647", // address _poolVoter,
    86400 * 7, // uint256 _rewardsDuration
    "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647", // address _lpOracle,
    "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054", // address _zeroPythAggregator
    safe,
    d
  );

  const tx = await admin
    .connect(safeSigner)
    .upgradeAndCall(proxy.target, impl.target, call.data);
  console.log(tx.data);

  console.log("rewardRate", await implP.rewardRate());
  console.log("balanceOf", await implP.balanceOf(d));
  console.log("userRewardPerTokenPaid", await implP.userRewardPerTokenPaid(d));
  console.log("earned", await implP.earned(d));
  console.log("lockedByToken", await implP.lockedByToken(1));
  console.log("lockedTokenIdNfts", await implP.lockedTokenIdNfts(d, 0));
  console.log("owner", await implP.owner());

  // this must fail
  await implP.init(
    "0x8bB8B092f3f872a887F377f73719c665Dd20Ab06", // address _locker,
    "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", // address _zeroToken,
    "0x2666951A62d82860E8e1385581E2FB7669097647", // address _poolVoter,
    86400 * 7, // uint256 _rewardsDuration
    "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647", // address _lpOracle,
    "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054", // address _zeroPythAggregator
    safe,
    d
  );
};

main();
