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
import {IERC20} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IPoolVoter} from "../interfaces/IPoolVoter.sol";
import {IZeroLend} from "../interfaces/IZeroLend.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract EmissionsMainnet is
    Initializable,
    OwnableUpgradeable,
    AccessControlEnumerableUpgradeable
{
    using SafeERC20 for IZeroLend;

    IZeroLend zeroToken;
    IPoolVoter poolVoter;

    uint256 totalSupply;
    uint256 lastReleased;
    uint256 emissionDuration = 1 weeks;

    uint256[] weeklyDividers;

    event TotalSupplySet(uint256 oldTokenSupply, uint256 newTokenSupply);
    event WeeklyDividersSet(uint256[] releasePercentagesPerWeek);
    error ReleaseIntervalNotMet(uint256 timePassed);

    function initialize(
        address _zeroToken,
        address _poolVoter
    ) external initializer {
        lastReleased = block.timestamp;
        __Ownable_init(msg.sender);
        zeroToken = IZeroLend(_zeroToken);
        poolVoter = IPoolVoter(_poolVoter);
    }

    function setWeeklyDividers(
        uint256[] calldata _dividers
    ) external onlyOwner {
        weeklyDividers = _dividers;
        emit WeeklyDividersSet(_dividers);
    }

    function setTotalSupply(uint256 _totalSupply) external onlyOwner {
        zeroToken.transferFrom(msg.sender, address(this), _totalSupply);
        emit TotalSupplySet(totalSupply, _totalSupply);
        totalSupply = _totalSupply;
    }

    function execute() external onlyOwner {
        uint256 weeksPassed = (block.timestamp - lastReleased) / 1 weeks;
        if (weeksPassed == 0) revert ReleaseIntervalNotMet(weeksPassed);
        lastReleased = block.timestamp;
        uint256 releaseAmount = _getReleaseAmount(weeksPassed - 1);
        zeroToken.approve(address(poolVoter), releaseAmount);
        poolVoter.notifyRewardAmount(releaseAmount);
    }

    function getReleaseAmount(
        uint256 _weekNumber
    ) external view returns (uint256 amount) {
        return _getReleaseAmount(_weekNumber);
    }

    function _getReleaseAmount(
        uint256 weekNumber
    ) internal view returns (uint256 amount) {
        amount =
            ((((totalSupply * 1000 * 28) / 100) / 12) /
                weeklyDividers[weekNumber]) /
            4;
    }

    function emergencyWithdrawal(address token) external onlyOwner {
        IERC20(token).transfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }
}
