import { ethers, upgrades } from "hardhat";
import { AirdropRewarderS2, AirdropRewarderS2__factory } from "../../types";
import { VestedZeroNFT, ZeroLend } from "../../typechain-types";
import { deployProxy } from "../airdrop-utils/deploy";
import { initProxy } from "../fixtures/utils";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const FORK = process.env.FORK === "true";
if (FORK) {
    let airdrop: AirdropRewarderS2;
    let airdropFaulty: AirdropRewarderS2;
    let airdropFactory: AirdropRewarderS2__factory;
    let vestedNFT: VestedZeroNFT;
    let zero: ZeroLend;
    let deployer: SignerWithAddress;


    let USER = "0x219de81f5d9b30f4759459c81c3cf47abaa0ded1";
    const VESTED_NFT = "0x1a73b0ca6592fe4d484d7b138e5fdcff93cd7ca8";

    const UNLOCK_DATE = Math.floor(Date.now() / 1000) + 60 * 30; // 30 mins
    const END_DATE = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
    const ZERO = "0x78354f8dccb269a615a7e0a24f9b0718fdc3c7a7";
    const DEPLOYER = "0x0F6e98A756A40dD050dC78959f45559F98d3289d";
    const AIRDROP = "0x841E9E4b8A2136380204103CaE4Dd02cb9d71650";


    describe("VestUI Helper", async function () {
        beforeEach(async () => {
            const [deployer] = await ethers.getSigners();
            airdropFactory = await ethers.getContractFactory("AirdropRewarderS2", deployer);
            airdrop = await initProxy<AirdropRewarderS2>("AirdropRewarderS2");
            vestedNFT = await ethers.getContractAt("VestedZeroNFT", VESTED_NFT);
            airdropFaulty = await ethers.getContractAt("AirdropRewarderS2", AIRDROP);

            // initialize
            await airdrop.initialize(
              ZERO,
              VESTED_NFT,
              UNLOCK_DATE,
              END_DATE,
              [USER]
            )
            zero = await ethers.getContractAt("ZeroLend", ZERO);
            const multisigSigner = await ethers.getImpersonatedSigner("0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A");
            // Transfer some ETH from deployer to multisig
            await deployer.sendTransaction({ to: "0x14aAD4668de2115e30A5FeeE42CFa436899CCD8A", value: ethers.parseEther("0.2") });
            await zero.connect(multisigSigner).transfer(airdrop.target, ethers.parseEther("100000000"));
            await zero.connect(multisigSigner).transfer(AIRDROP, ethers.parseEther("100000000"));
            await airdrop.setMerkleRoot("0xf4315ef985567785e1208205030935f71b2bb9d17f6d4a689b9e0722ad37a543");
            console.log(await airdrop.paused());
        });

        it("should return values", async function () {
            let proofs = ["0x4a736c822b8a644f1aa64091a84b368d23f22cb8959450c6ab03e50f9b7c0840","0x9aff5fcee7550e6ed79fa37858acb880b9c13973c18bf0b7c7094106efaec7ca","0xd9fd2d4aadb28e25be0b11ed8f2210a1639c6f91658dbb36ad01fbfa285c09cc","0x769c027433dbbaea2152bf174b480f2ae80120da8c7af2fb03260bb270d0e809","0x5a465a2ee5a950fb3d7dca3540c3b962945201717907157115ec39b38b73a3a7","0xba81633dee1d112747e2b7d527d4ac6dae9f01d95c211596ab52b4610de01e94","0xb14f098d0d8367e8a516af6ce9c3ae8a677feef26a5b9119a9502043d385013f","0x930545b138bdae304d6be3df823db0e944494171937d7b265c33c82d57fe3e5f","0xeb151d9321ecdaf69fce994adadeb907838e3d9a1a93ebeb3f7a9f62b6a17a31","0x151e1265cc83442d2e9674481c9ec3aec3e7a63d242e01e91b7433ee72a982f1","0xb7fb87b1d84fe8a236732eb9788c87bce230bb98cd1b141618995eac07cf7427","0x7bb34c028a3aa5edfe5849602121c7b3f6820f673a3e563c4e59ae04be43d476","0x0f34b847ce3d03e11959dbccb019be218fa98891dba0bb065c981c74c157ad64","0xb37ee61bc5cd5e2ae79075f7c87afcffa7ece9ca59aecf7602640ffbca9f307d","0x80cdab1f14ce543fe98c576a1c2984a11e81b6d0c12ca95b4fbf938b2b0bae24","0x88ce627929aed4fc142b850443e3e0c9410a2b1c169f22d8e520571ba2a6a822","0x577e22f460a4cec90a0d88d3abc6deca20f73711412129098820cf399dd78b7f","0x78fabd3f0ae57ff315fd9562b7898e4c8aae20e28ee02504ab3613af96852650","0x42ed52a3420c6b9db31bf879cbb46f964887b88c3814f37ab015b4201947fd69"];
            let userBalanceVestsBf = await vestedNFT.balanceOf(USER);
            console.log("🚀 ~ userBalanceVestsBf:", userBalanceVestsBf)

            let userBalanceZeroBf = await zero.balanceOf(USER);
            console.log("🚀 ~ userBalanceZeroBf:", userBalanceZeroBf)
            // increase time by 1 hour
            await ethers.provider.send("evm_increaseTime", [60 * 60]);
            await airdropFaulty.claim(USER, 15818574000000000000000000n, proofs);
            let userBalanceVestsAf = await vestedNFT.balanceOf(USER);
            console.log("🚀 ~ userBalanceVestsAf:", userBalanceVestsAf)

            let userBalanceZeroAf = await zero.balanceOf(USER);
            console.log("🚀 ~ userBalanceZeroAf:", userBalanceZeroAf);

            expect(userBalanceVestsAf).to.be.gt(userBalanceVestsBf);
            expect(userBalanceZeroAf).to.be.gt(userBalanceZeroBf);

            /// update the contract
            USER = "0x84a6a7c0674a3aa03e09c026600cb46181821f07";
            await airdrop.setVestForUser(USER, true);
            console.log("🚀 ~ userBalanceVestsBf:", userBalanceVestsBf);

            userBalanceZeroBf = await zero.balanceOf(USER);
            console.log("🚀 ~ userBalanceZeroBf:", userBalanceZeroBf);

            proofs = ["0x7527bf2726c86bc9b74993e6820fabfa31254883ea4e57a1c2e717a71b194abf","0x50759450d79e3156ef4c0267253a7633a0cb9333d093960e551d5542257801f4","0x7e24d68d54ceeb1fa0be718ef394aa4dc46d356613602005defa67a543db09af","0x3de88296e564cfb6343775d36fcf8b6af6ed739505d20a20b9ae43661bcddb07","0x94e0f7121d18353ce5f9b33d9be998b8f90a3c4f81b539655ce3c3ea90710b8e","0xff5666bcaaca45b1bdb1dd87ba67bfafdd579e0b5d312877d2c90bfee885b13a","0x7933c7937f02a2b54b683bbf5b33ce78be032857ecdd0378234f89bf852d9a82","0x7ad19d228a6ea9997be48ffd3187b496496346098d7a83c02672729a4e4261d5","0xd876266ba00acda2c724191822f619d2d21945b04f56f73805f607fee1c1f8c8","0x656c23c255ca9845c7a2e404b972b16fbd81e775a5702cbd7df47ef3b35b0bdb","0xb027acc4aacfc5da9f770a1917e20064d2d24c32263e984c858883eb5ff13c78","0xc898eb9e0fe9d9a0d85e1d94a635a45fc4f9172b5d845c69b1198c17bc2380d6","0xea8923fb9ffc3404bdd1f981e093062e8974599b427b4c04aa9603309e32f6c6","0xd8b340d31f90cf4e2cb9916a66113a8add7a33ba09a5298ba6150a58999de9dd","0x94034f93c5a4d99a43a298155801e593553233839a0107deadaf41c8e171035f","0xa8dff3e1bd46a1432f4c0cfe9ceee6d0cc274d8e458bf7fb287df65c27c51705","0xf318833f58aa33d4576e2295392b2d7f8e8324efd0841fec9f192bbf1b2afa3b","0x78fabd3f0ae57ff315fd9562b7898e4c8aae20e28ee02504ab3613af96852650","0x42ed52a3420c6b9db31bf879cbb46f964887b88c3814f37ab015b4201947fd69"];
            await airdrop.claim(USER, 9878366000000000000000000n,  proofs)

            userBalanceVestsAf = await vestedNFT.balanceOf(USER);
            console.log("🚀 ~ userBalanceVestsAf:", userBalanceVestsAf);

            userBalanceZeroAf = await zero.balanceOf(USER);
            console.log("🚀 ~ userBalanceZeroAf:", userBalanceZeroAf);

            expect(userBalanceVestsAf).to.be.gt(userBalanceVestsBf);
            expect(userBalanceZeroAf).to.be.eq(userBalanceZeroBf);
        });
    });
}