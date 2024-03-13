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
contract OmnichainStaking is IOmnichainStaking, ERC20VotesUpgradeable {
    ILocker public lpLocker;
    ILocker public tokenLocker;

    mapping(uint256 => uint256) public lpPower;
    mapping(uint256 => uint256) public tokenPower;

    // constructor() {
    //     _disableInitializers();
    // }

    function init(
        address, // LZ endpoint
        address _tokenLocker,
        address _lpLocker
    ) external initializer {
        // TODO add LZ
        __ERC20Votes_init();
        __ERC20_init("ZERO Voting Power", "ZEROvp");

        tokenLocker = ILocker(_tokenLocker);
        lpLocker = ILocker(_lpLocker);
    }

    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(
            msg.sender == address(lpLocker) ||
                msg.sender == address(tokenLocker),
            "only lockers"
        );

        if (data.length > 0) from = abi.decode(data, (address));

        // if the stake is from the LP locker, then give 4 times the voting power
        if (msg.sender == address(lpLocker)) {
            lpPower[tokenId] = lpLocker.balanceOfNFT(tokenId);
            _mint(from, lpPower[tokenId] * 4);
        }
        // if the stake is from a regular token locker, then give 1 times the voting power
        else if (msg.sender == address(tokenLocker)) {
            tokenPower[tokenId] = tokenLocker.balanceOfNFT(tokenId);
            _mint(from, tokenPower[tokenId]);
        } else require(false, "invalid operator");

        return this.onERC721Received.selector;
    }

    function unstakeLP(uint256 tokenId) external {
        _burn(msg.sender, lpPower[tokenId] * 4);
        lpLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function unstakeToken(uint256 tokenId) external {
        _burn(msg.sender, tokenPower[tokenId]);
        tokenLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function updatePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // ensure that the user has no votes anywhere and no delegation then send voting
        // power to another chain.
        // using layerzero, sends the updated voting power across the different chains
    }

    function deletePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // using layerzero, deletes the updated voting power across the different chains
    }

    function updateSupplyToMainnetViaLZ() external {
        // TODO
        // send the veStaked supply to the mainnet
    }

    function updateSupplyFromLZ() external {
        // TODO
        // receive the veStaked supply on the mainnet
    }

    function transfer(address, uint256) public pure override returns (bool) {
        // don't allow users to transfer voting power. voting power can only
        // be minted or burnt and act like SBTs
        require(false, "transfer disabled");
        return false;
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        // don't allow users to transfer voting power. voting power can only
        // be minted or burnt and act like SBTs
        require(false, "transferFrom disabled");
        return false;
    }
}
