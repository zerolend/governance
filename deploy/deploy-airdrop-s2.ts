import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
import { ethers } from "hardhat";
dotenv.config();

// load wallet private key from env file
const TOKEN_ADDRESS = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";
const VESTED_NFT_ADDRESS = "0x9fa72ea96591e486ff065e7c8a89282dedfa6c12";
const UNLOCK_DATE = Math.floor(Date.now() / 1000) + 60 * 1; // 1 min
const END_DATE = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
const vestAirdropsForUsers = [
  "0x924cafec4f967be5df085ad94d8d50574f9a2bb0",
  "0xb213531aa8113f455c626a305feaef82da605e08",
  "0x242064773f8e5c7ae04aaac14149c52b13f7a95d",
  "0xf61e266bf546f313483dc6629bdb90fc52cbd6ca",
  "0xa38d6e3aa9f3e4f81d4cef9b8bcdc58ab37d066a",
  "0x399c4e524cff47d9e670f9d1ca0381bbe746e97a",
  "0xbddeb8b18ef1f4017951cbe9d8682af40b8cdcb0",
  "0x5efb1c0ba60ee295056c6ee112491584c31d2a33",
  "0xd820c44198e0f285c5183fb48481f719993bef95",
  "0x26c541f5e1c8eab0f6f0943bb1c8843ab18c4b0d",
  "0x96af5d9e4d01fb892fd2d76bfc0e3c07aecf8b6b",
  "0xab9e01aea5ac65b0812f1e0d2ee89d7a6e7d25c9",
  "0x3a0ee670ee34d889b52963bd20728dece4d9f8fe",
  "0x219de81f5d9b30f4759459c81c3cf47abaa0ded1",
  "0x58c0a5f11469ea49ad1bf0ad0d25a5cae582dd0a",
  "0xae7f281a92834dbfa1e94f1fd23c5b0b3735615d",
  "0x726fb76e65ca79cbf5e1932b277fb3c9ae28c0a9",
  "0x813db5fb933d4900256afd5d97b6668b3693bbf2",
  "0x1b648ade1ef219c87987cd60eba069a7faf1621f",
  "0xc96791b6455b31e8a19bd636d9ae000acdd4c9f3",
  "0x84411e36f57516f3b359d9afbcada418f07bbccc",
  "0x8174b025f8ab32708a85d036ce9e74a5b21727f7",
  "0xa9ed0db00e5c29e7e18a55db159ea33fb5fea60a",
];

const deployAirdropRewarder = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (
    TOKEN_ADDRESS.length &&
    VESTED_NFT_ADDRESS.length &&
    UNLOCK_DATE &&
    END_DATE &&
    vestAirdropsForUsers.length !== 0
  ) {
    const airdropDeployment = await deploy("AirdropRewarderS2", {
      from: deployer,
      contract: "AirdropRewarderS2",
      proxy: {
        owner: "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A",
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [
            TOKEN_ADDRESS,
            VESTED_NFT_ADDRESS,
            UNLOCK_DATE,
            END_DATE,
            deployer,
            vestAirdropsForUsers,
          ],
        },
      },
      autoMine: true,
      log: true,
    });

    await hre.run("verify:verify", { address: airdropDeployment.address });

    const airdropContract = await ethers.getContractAt(
      "AirdropRewarderS2",
      airdropDeployment.address
    );

    const merkleRoot =
      "0xf676a37ab0203168f093a3ae57cad087ca8f61ca1947680185f42a9e442c325d";
    await airdropContract.setMerkleRoot(merkleRoot);
    console.log("\nMerkle Root Set:", merkleRoot);
  } else {
    throw new Error("Invalid address for locker/token/vest");
  }
};

deployAirdropRewarder.tags = ["AirdropRewarderS2"];
export default deployAirdropRewarder;
