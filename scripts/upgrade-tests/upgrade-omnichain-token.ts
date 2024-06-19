import hre from "hardhat";
import {
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import { TransparentUpgradeableProxy } from "../../typechain-types";

const getSlot = async (proxy: TransparentUpgradeableProxy, key: string) => {
  const data = await hre.ethers.provider.getStorage(proxy.target, key);
  return data;
};

const main = async function () {
  const [deployer] = await hre.ethers.getSigners();

  const safe = "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A";
  const d = "0x0F6e98A756A40dD050dC78959f45559F98d3289d";

  await impersonateAccount(safe);
  await setBalance(safe, "0x314DC6448D9338C15B0A00000000");
  const safeSigner = await hre.ethers.getSigner(safe);

  const impl = await hre.ethers.getContractAt(
    "OmnichainStakingToken",
    "0x369c3003610c69C6Cf8c6743B9033b5fcB079c2F"
  );

  // proxies
  const proxy = await hre.ethers.getContractAt(
    "TransparentUpgradeableProxy",
    "0xf374229a18ff691406f99ccbd93e8a3f16b68888"
  );

  const implP = await hre.ethers.getContractAt(
    "OmnichainStakingToken",
    "0xf374229a18ff691406f99ccbd93e8a3f16b68888"
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
    "0x08D5FEA625B1dBf9Bae0b97437303a0374ee02F8", // address _locker,
    "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7", // address _zeroToken,
    "0x2666951a62d82860e8e1385581e2fb7669097647", // address _poolVoter,
    86400 * 30 // uint256 _rewardsDuration
  );
  const tx = await admin
    .connect(safeSigner)
    .upgradeAndCall(
      proxy.target,
      "0x369c3003610c69C6Cf8c6743B9033b5fcB079c2F",
      call.data
    );
  console.log(tx.data);

  console.log("rewardRate", await implP.rewardRate());
  console.log("balanceOf", await implP.balanceOf(d));
  console.log("userRewardPerTokenPaid", await implP.userRewardPerTokenPaid(d));
  console.log("earned", await implP.earned(d));
  console.log("lockedByToken", await implP.lockedByToken(1));
  console.log("lockedTokenIdNfts", await implP.lockedTokenIdNfts(d, 0));
  console.log("owner", await implP.owner());
};

main();
