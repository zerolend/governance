import { ZeroAddress } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("OmnichainStakingToken-Impl", {
    from: deployer,
    contract: "OmnichainStakingToken",
    autoMine: true,
    skipIfAlreadyDeployed: true,
    log: true,
  });

  const c = await hre.ethers.getContractAt(
    "OmnichainStakingToken",
    (
      await deployments.get("OmnichainStakingToken-Impl")
    ).address
  );

  const d = await c.init.populateTransaction(
    "0x08D5FEA625B1dBf9Bae0b97437303a0374ee02F8", // address _locker,
    "0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7", // address _zeroToken,
    "0x0000000000000000000000000000000000000000", // address _poolVoter,
    2592000, // uint256 _rewardsDuration,
    "0x14aad4668de2115e30a5feee42cfa436899ccd8a", // address _owner,
    "0x0f6e98a756a40dd050dc78959f45559f98d3289d" // address _distributor
  );

  console.log(d);
}

main.tags = ["OmnichainStakingToken-Impl"];
export default main;
