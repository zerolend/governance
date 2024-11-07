import { expect } from "chai";
import { ethers } from "hardhat";
import { VestUiHelper, VestUiHelper__factory } from "../../../types";
import { ZeroAddress } from "ethers";

const FORK = process.env.FORK === "true";
if (FORK) {
    let VestUiHelper: VestUiHelper;
    let VestUiHElperOld: VestUiHelper;
    let vestUiHelperFactory: VestUiHelper__factory

    const USER = "0x7Ff4e6A2b7B43cEAB1fC07B0CBa00f834846ADEd";
    const VESTED_NFT = "0x9FA72ea96591e486FF065E7C8A89282dEDfA6C12";
    const OMNI_TOKEN = "0xf374229a18ff691406f99CCBD93e8a3f16B68888";
    const OMNI_LP = "0x0374ae8e866723ADAE4A62DcE376129F292369b4";
    const ZERO_ORACLE = "0x130cc6e0301B58ab46504fb6F83BEE97Eb733054";
    const LP_ORACLE = "0x303598dddebB8A48CE0132b3Ba6c2fDC14986647";

    describe("VestUI Helper", async function () {
        beforeEach(async () => {
            vestUiHelperFactory = await ethers.getContractFactory("VestUiHelper");
            VestUiHelper = await vestUiHelperFactory.deploy(VESTED_NFT, OMNI_TOKEN, OMNI_LP, LP_ORACLE, ZERO_ORACLE);
            await VestUiHelper.waitForDeployment();
            VestUiHElperOld = await ethers.getContractAt("VestUiHelper", "0xcad503920F7Ad483c1b6CE41a2B7505cdc693F92");
        });

        it("should return values", async function () {
            const result = await VestUiHElperOld.getLPLockDetails(USER);
            const result2 = await VestUiHelper.getLPLockDetails(USER);
            expect(result.at(0)).to.not.be.equal(result2.at(0));
            console.log(result.at(0), result2.at(0));

            const zeroLPPower = await ethers.getContractAt("OmnichainStakingLP", OMNI_LP);
        });
    });
}