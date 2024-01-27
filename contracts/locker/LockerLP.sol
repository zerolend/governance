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

contract LockerNFT is Initializable, AccessControlEnumerableUpgradeable {
    // A locker which is a soul bound token (SBT) that represents voting power

    /// @dev The staking contract where veZERO nfts are saved
    address public lockerStaking;

    address public weth;

    function lockFor(
        address who,
        address zeroLP,
        address zero,
        bool stake
    ) external payable {
        // todo
    }

    function claimFees(
        address who,
        address zeroLP,
        address zero,
        bool stake
    ) external payable {
        // todo
    }
}
