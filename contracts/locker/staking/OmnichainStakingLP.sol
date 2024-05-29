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

contract OmnichainStakingLP is OmnichainStakingBase {
    ILPOracle public lpOracle;
    IPythAggregatorV3 public zeroAggregator;

    function init(
        address _locker,
        address _zeroToken,
        address _poolVoter,
        uint256 _rewardsDuration,
        address _lpOracle,
        address _zeroPythAggregator
    ) external initializer {
        super.__OmnichainStakingBase_init(
            "ZERO LP Voting Power",
            "ZEROvp-LP",
            _locker,
            _zeroToken,
            _poolVoter,
            _rewardsDuration
        );

        lpOracle = ILPOracle(_lpOracle);
        zeroAggregator = IPythAggregatorV3(_zeroPythAggregator);
    }

    function getTokenPower(uint256 amount) public view returns (uint256 power) {
        // calculate voting power based on how much the LP token is worth in ZERO terms
        uint256 lpPrice = lpOracle.getPrice();
        int256 zeroPrice = zeroAggregator.latestAnswer();
        require(zeroPrice > 0 && lpPrice > 0, "!price");

        power = ((lpPrice * amount) / uint256(zeroPrice));
    }
}
