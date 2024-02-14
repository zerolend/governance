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

contract LinearVesting is BaseVesting {
    uint256 public duration;

    function init(
        IERC20 _underlying,
        IERC20Burnable _vestedToken,
        IStakingBonus _bonusPool,
        uint256 _claimStartDate
    ) external initializer {
        __BaseVesting_init(
            _underlying,
            _vestedToken,
            _bonusPool,
            _claimStartDate
        );
        duration = 3 * 30 days; // 3 months vesting
    }

    function claimVest(uint256 id) external override {
        VestInfo memory vest = vests[id];
        require(msg.sender == vest.who, "not owner");

        uint256 val = _claimable(vest);
        require(val > 0, "no claimable amount");

        // update
        vest.claimedAmount = val;
        vests[id] = vest;

        // send reward
        underlying.transfer(msg.sender, val);
        emit TokensReleased(msg.sender, id, val);

        // burn vested tokens
        vestedToken.burn(vest.amount);
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

    function penalty(
        uint256,
        uint256
    ) public view virtual override returns (uint256) {
        return 0;
    }
}
