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

import {ILPOracle} from "../../interfaces/ILPOracle.sol";
import {IPythAggregatorV3} from "../../interfaces/IPythAggregatorV3.sol";
import {OmnichainStakingBase} from "./OmnichainStakingBase.sol";

contract OmnichainStakingToken is OmnichainStakingBase {
    function init(
        address _locker,
        address _zeroToken,
        address _votingPowerCombined,
        uint256 _rewardsDuration,
        address _owner,
        address _distributor
    ) external reinitializer(6) {
        super.__OmnichainStakingBase_init(
            "ZERO Voting Power",
            "ZEROvp",
            _locker,
            _zeroToken,
            _votingPowerCombined,
            _rewardsDuration,
            _distributor
        );

        _transferOwnership(_owner);
    }

    function _getTokenPower(
        uint256 amount
    ) internal pure override returns (uint256 power) {
        power = amount;
    }
}
