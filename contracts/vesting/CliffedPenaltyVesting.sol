// SPDX-License-Identifier: UNLICENSED
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

import {IStakingBonus} from "../interfaces/IStakingBonus.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Burnable} from "../interfaces/IERC20Burnable.sol";
import {BaseVesting} from "./BaseVesting.sol";

/// @title A vesting contract with a 3 month cliff with penalties for early withdrawal
/// @author
/// @notice
contract CliffedPenaltyVesting is BaseVesting {
    address public penaltyDestination;
    uint256 public duration;

    function init(
        IERC20 _underlying,
        IERC20Burnable _vestedToken,
        IStakingBonus _bonusPool,
        address _penaltyDestination,
        uint256 _claimStartDate
    ) external initializer {
        __BaseVesting_init(
            _underlying,
            _vestedToken,
            _bonusPool,
            _claimStartDate
        );
        penaltyDestination = _penaltyDestination;
        duration = 3 * 30 days; // 3 months vesting
    }

    function claimVest(uint256 id) external override {
        VestInfo memory vest = vests[id];
        require(msg.sender == vest.who, "not owner");

        require(vest.amount > 0, "no pending amount");
        require(vest.claimedAmount == 0, "vest claimed");

        // send reward with penalties
        uint256 penaltyPct = penalty(vest);
        uint256 penaltyAmt = ((vest.amount * penaltyPct) / 1e18);

        vest.claimedAmount = vest.amount - penaltyAmt;
        underlying.transfer(msg.sender, vest.claimedAmount);
        underlying.transfer(penaltyDestination, penaltyAmt);

        emit TokensReleased(msg.sender, id, vest.claimedAmount);
        emit PenaltyCharged(msg.sender, id, penaltyAmt, penaltyPct);
    }

    function penalty(
        uint256 startTime,
        uint256 nowTime
    ) public view override returns (uint256) {
        // After vesting is over, then penalty is 0%
        if (nowTime > startTime + duration) return 0;

        // Before vesting the penalty is 95%
        if (nowTime < startTime) return 95e18 / 100;

        uint256 percentage = ((nowTime - startTime) * 1e18) / duration;

        uint256 penaltyE20 = 95e18 - (75e18 * percentage) / 1e18;
        return penaltyE20 / 100;
    }

    function _claimable(
        uint256 amount,
        uint256 startTime,
        uint256 nowTime
    ) internal view override returns (uint256) {
        // if vesting is over, then claim the full amount
        if (nowTime > startTime + duration) return amount;

        // if vesting hasn't started then don't claim anything
        if (nowTime < startTime) return 0;

        // else return a percentage
        return (amount * (nowTime - startTime)) / duration;
    }
}
