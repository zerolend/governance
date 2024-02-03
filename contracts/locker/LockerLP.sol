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
import {IPoolHelper} from "../interfaces/IPoolHelper.sol";
import {IERC20, IWETH} from "../interfaces/IWETH.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";

contract LockerNFT is Initializable, AccessControlEnumerableUpgradeable {
    // A locker which is a soul bound token (SBT) that represents voting power

    /// @dev The staking contract where veZERO nfts are saved
    IOmnichainStaking public staking;

    IWETH public weth;
    IERC20 public zero;

    string public name;
    string public symbol;
    string public version;
    uint8 public decimals;

    IPoolHelper public poolHelper;

    function init(
        IPoolHelper _poolHelper,
        IOmnichainStaking _staking,
        IWETH _weth,
        IERC20 _zero
    ) external initializer {
        name = "Locked ZERO LP";
        symbol = "ZERO-dlp";
        version = "1.0.0";
        decimals = 18;

        poolHelper = _poolHelper;
        staking = _staking;
        weth = _weth;
        zero = _zero;
    }

    function lockFor(
        address _who,
        address _zeroLP,
        address _zero,
        bool _stake
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
