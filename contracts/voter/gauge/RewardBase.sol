// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

abstract contract RewardBase is ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public DURATION;
    uint256 public PRECISION;

    IERC20 public zero;
    IERC20[] public incentives; // array of incentives for a given gauge/bribe
    mapping(IERC20 => bool) public isIncentive; // confirms if the incentive is currently valid for the gauge/bribe

    // default snx staking contract implementation
    mapping(IERC20 => uint256) public rewardRate;
    mapping(IERC20 => uint256) public periodFinish;
    mapping(IERC20 => uint256) public lastUpdateTime;
    mapping(IERC20 => uint256) public rewardPerTokenStored;

    mapping(IERC20 => mapping(address => uint256))
        public userRewardPerTokenPaid;
    mapping(IERC20 => mapping(address => uint256)) public rewards;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    function __RewardBase_init(address _zero) internal initializer {
        DURATION = 14 days; // rewards are released over 14 days
        PRECISION = 10 ** 18;
        zero = IERC20(_zero);
        __ReentrancyGuard_init();
    }

    function incentivesLength() external view returns (uint256) {
        return incentives.length;
    }

    // returns the last time the reward was modified or periodFinish if the reward has ended
    function lastTimeRewardApplicable(
        IERC20 token
    ) public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish[token]);
    }

    // how to calculate the reward given per token "staked" (or voted for bribes)
    function rewardPerToken(IERC20 token) public view virtual returns (uint256);

    // how to calculate the total earnings of an address for a given token
    function earned(
        IERC20 token,
        address account
    ) public view virtual returns (uint256);

    // total amount of rewards returned for the 7 day duration
    function getRewardForDuration(
        IERC20 token
    ) external view returns (uint256) {
        return rewardRate[token] * DURATION;
    }

    // allows a user to claim rewards for a given token
    function getReward(
        address account,
        IERC20 token
    ) public nonReentrant updateReward(token, account) {
        uint256 _reward = rewards[token][account];
        rewards[token][account] = 0;
        token.safeTransfer(account, _reward);
    }

    // used to notify a gauge/bribe of a given reward, this can create griefing attacks by extending rewards
    // TODO: rework to weekly resets, _updatePeriod as per v1 bribes
    function notifyRewardAmount(
        IERC20 token,
        uint256 amount
    ) external nonReentrant updateReward(token, address(0)) returns (bool) {
        if (block.timestamp >= periodFinish[token]) {
            token.safeTransferFrom(msg.sender, address(this), amount);
            rewardRate[token] = amount / DURATION;
        } else {
            uint256 _remaining = periodFinish[token] - block.timestamp;
            uint256 _left = _remaining * rewardRate[token];
            if (amount < _left) {
                return false; // don't revert to help distribute run through its tokens
            }
            token.safeTransferFrom(msg.sender, address(this), amount);
            rewardRate[token] = (amount + _left) / DURATION;
        }

        lastUpdateTime[token] = block.timestamp;
        periodFinish[token] = block.timestamp + DURATION;

        // if it is a new incentive, add it to the stack
        if (isIncentive[token] == false) {
            isIncentive[token] = true;
            incentives.push(token);
        }

        return true;
    }

    modifier updateReward(IERC20 token, address account) virtual;
}
