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
import {ILocker} from "../interfaces/ILocker.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

// An omni-chain staking contract that allows users to stake their veNFT
// and get some voting power. Once staked the voting power is available cross-chain.
abstract contract OmnichainStaking is IOmnichainStaking, ERC20VotesUpgradeable {
    constructor() {
        _disableInitializers();
    }

    ILocker public lpLocker;
    ILocker public tokenLocker;

    mapping(uint256 => uint256) public lpPower;
    mapping(uint256 => uint256) public tokenPower;

    function init(address _endpoint) external initializer {
        __ERC20Votes_init();
        __ERC20_init("ZERO Voting Power", "ZEROvp");
    }

    function stakeLPFor(address who, uint256 tokenId) external {
        lpLocker.transferFrom(msg.sender, address(this), tokenId);
        lpPower[tokenId] = lpLocker.balanceOfNFT(tokenId);
        _mint(who, lpPower[tokenId]);
    }

    function stakeTokenFor(address who, uint256 tokenId) external {
        tokenLocker.transferFrom(msg.sender, address(this), tokenId);
        tokenPower[tokenId] = tokenLocker.balanceOfNFT(tokenId);
        _mint(who, tokenPower[tokenId]);
    }

    function withdrawLP(uint256 tokenId) external {
        _burn(msg.sender, lpPower[tokenId]);
        lpLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function withdrawToken(uint256 tokenId) external {
        _burn(msg.sender, tokenPower[tokenId]);
        tokenLocker.safeTransferFrom(address(this), msg.sender, tokenId);
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
        // don't allow users to transfer voting power. voting power can only
        // be minted or burnt and act like SBTs
        require(false, "transfer disabled");
    }
}
