// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

// ███████╗███████╗██████╗  ██████╗
// ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
//   ███╔╝ █████╗  ██████╔╝██║   ██║
//  ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
// ███████╗███████╗██║  ██║╚██████╔╝
// ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝

// Website: https://zerolend.xyz
// Discord: https://discord.gg/zerolend
// Twitter: https://twitter.com/zerolendxyz

import {OApp} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {Votes} from "@openzeppelin/contracts/governance/utils/Votes.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

abstract contract OmnichainStaking is IOmnichainStaking, ERC20VotesUpgradeable {
    // An omni-chain staking contract that allows users to stake their veNFT
    // and get some voting power. Once staked the voting power is available cross-chain.

    // /**
    //  * @dev Constructor to initialize the OAppCore with the provided endpoint and owner.
    //  * @param _endpoint The address of the LOCAL Layer Zero endpoint.
    //  */
    // constructor(address _endpoint) OApp(_endpoint, msg.sender) {
    //     // todo
    // }

    function init(address _endpoint) external initializer {
        __ERC20Votes_init();
        __ERC20_init("ZERO Voting Power", "ZEROvp");
    }

    function stakeLPFor(address who, uint256 tokenId) external {
        // todo receive and calculate voting power
        uint256 votingPower = 1e18;
        _mint(who, votingPower);
    }

    function stakeTokenFor(address who, uint256 tokenId) external {
        // todo receive and calculate voting power
        uint256 votingPower = 1e18;
        _mint(who, votingPower);
    }

    function updatePowerOnChain(uint256 chainId, uint256 nftId) external {
        // ensure that the user has no votes anywhere and no delegation then send voting
        // power to another chain.
        //
        // using layerzero, sends the updated voting power across the different chains
    }

    function deletePowerOnChain(uint256 chainId, uint256 nftId) external {
        // using layerzero, deletes the updated voting power across the different chains
    }

    function updateSupplyToMainnetViaLZ() external {
        // send the veStaked supply to the mainnet
    }

    function updateSupplyFromLZ() external {
        // receive the veStaked supply on the mainnet
    }

    function _transfer(address, address, uint256) internal override {
        require(false, "transfer disabled");
    }
}
