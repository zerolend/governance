import hre, { ethers } from "hardhat";

const main = async function () {
    const airdropContractFC = await ethers.getContractFactory("AirdropRewarderS2");
    const airdropContract = await airdropContractFC.deploy();

    console.log("deployed to", airdropContract.target);

    await airdropContract.waitForDeployment();

    // Verify contract programmatically
    await hre.run("verify:verify", { address: airdropContract.target });

    const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
    const startDate = Math.floor(Date.now() / 1000) + 60 * 10; // 10 mins
    const vestAirdropsForUsers = [
        "0x924cafec4f967be5df085ad94d8d50574f9a2bb0",
        "0x242064773f8e5c7ae04aaac14149c52b13f7a95d",
        "0xf61e266bf546f313483dc6629bdb90fc52cbd6ca",
        "0xa38d6e3aa9f3e4f81d4cef9b8bcdc58ab37d066a",
        "0x399c4e524cff47d9e670f9d1ca0381bbe746e97a",
        "0xbddeb8b18ef1f4017951cbe9d8682af40b8cdcb0",
        "0x5efb1c0ba60ee295056c6ee112491584c31d2a33",
        "0xd820c44198e0f285c5183fb48481f719993bef95",
        "0x26c541f5e1c8eab0f6f0943bb1c8843ab18c4b0d",
        "0xb213531aa8113f455c626a305feaef82da605e08",
        "0xab9e01aea5ac65b0812f1e0d2ee89d7a6e7d25c9",
        "0x3a0ee670ee34d889b52963bd20728dece4d9f8fe",
        "0x219de81f5d9b30f4759459c81c3cf47abaa0ded1",
        "0x58c0a5f11469ea49ad1bf0ad0d25a5cae582dd0a",
        "0xae7f281a92834dbfa1e94f1fd23c5b0b3735615d",
        "0x726fb76e65ca79cbf5e1932b277fb3c9ae28c0a9",
        "0x813db5fb933d4900256afd5d97b6668b3693bbf2",
        "0xc96791b6455b31e8a19bd636d9ae000acdd4c9f3",
        "0x84411e36f57516f3b359d9afbcada418f07bbccc",
        "0x1b648ade1ef219c87987cd60eba069a7faf1621f",
        "0x8174b025f8ab32708a85d036ce9e74a5b21727f7",
        "0xed99c6929bba505a2f1a65b9ca156a068fab6427",
        "0x4bba932e9792a2b917d47830c93a9bc79320e4f7",
        "0xa9ed0db00e5c29e7e18a55db159ea33fb5fea60a",
        "0x84a6a7c0674a3aa03e09c026600cb46181821f07",
    ];


    const tx = await airdropContract.initialize(
        "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7", // address _rewardToken,
        "0x1a73b0cA6592FE4D484D7B138E5fdCFf93CD7cA8", // address _vestedZeroNFT,
        startDate, // uint256 _unlockDate,
        endDate, // uint256 _endDate
        vestAirdropsForUsers
    );

    console.log(tx.hash);
};

main();
