import { HardhatRuntimeEnvironment } from "hardhat/types";

const LP_TOKEN_ADDRESS = "0x0040F36784dDA0821E74BA67f86E084D70d67a3A";
const OMNICHAIN_STAKING_ADDRESS = "0xf36F8089D7dDc4522a1c10C8dA41555aCDcCCb4D";

const ZERO_TOKEN_ADDRESS = "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7";
const POOL_VOTER_ADDRESS = "0x5346e9ab27D7874Db95993667D1Cb8338913f0aF";
const SECONDS_IN_THREE_DAYS = 86400 * 3;
const LP_ORACLE = "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647";
const ZERO_PYTH_AGGREGATOR = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (LP_TOKEN_ADDRESS.length && OMNICHAIN_STAKING_ADDRESS.length) {
    const deploymentLocker = await deploy("LockerLP", {
      from: deployer,
      contract: "LockerLP",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
      },
      autoMine: true,
      log: true,
    });

    const deploymentStaking = await deploy("OmnichainStakingLP", {
      from: deployer,
      contract: "OmnichainStakingLP",
      proxy: {
        owner: deployer,
        proxyContract: "OpenZeppelinTransparentProxy",
      },
      autoMine: true,
      log: true,
    });

    // init the proxies
    const locker = await hre.ethers.getContractAt(
      "LockerLP",
      deploymentLocker.address
    );

    const staking = await hre.ethers.getContractAt(
      "OmnichainStakingLP",
      deploymentStaking.address
    );

    // console.log("init locker");
    // (await locker.init(LP_TOKEN_ADDRESS, staking.target)).wait(1);

    console.log("init staking");
    (
      await staking.init(
        locker.target,
        ZERO_TOKEN_ADDRESS,
        POOL_VOTER_ADDRESS,
        SECONDS_IN_THREE_DAYS,
        LP_ORACLE,
        ZERO_PYTH_AGGREGATOR
      )
    ).wait(1);

    await hre.run("verify:verify", { address: deploymentLocker.address });
    await hre.run("verify:verify", { address: deploymentStaking.address });
  } else {
    throw new Error("Invalid init arguments");
  }
}

main.tags = ["LockerLP"];
export default main;
