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

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice A custom rewards controller that gives out emissions with a ratio of 1:4 for various assets in the lending pool
contract RewardsController is
    Initializable,
    AccessControlEnumerableUpgradeable
{
    function setLendingBorrowingRewardsRatio(uint8 ratio) external {
        // a ratio of 4 means borrowing gets 4x more rewards than lending
    }

    function notifyRewards(uint8 pid, uint256 amount) external {
        // notify the lending pools of the various rewards
    }

    function regsiterPool() external {}

    function handleAction() external {}
}
