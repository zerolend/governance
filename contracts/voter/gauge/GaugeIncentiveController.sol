// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {RewardBase} from "./RewardBase.sol";
import {IIncentivesController} from "../../interfaces/IIncentivesController.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 14 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract GaugeIncentiveController is RewardBase, IIncentivesController {
    IERC20 public aToken;
    IVotes public staking;
    IERC20 public reward;
    uint256 public derivedSupply;
    mapping(address => uint256) public derivedBalances;

    function init(IERC20 _aToken, address _staking, address _reward) external {
        __RewardBase_init();
        aToken = _aToken;

        staking = IVotes(_staking);
        reward = IERC20(_reward);
        incentives.push(reward);
        isIncentive[reward] = true;
    }

    function rewardPerToken(
        IERC20 token
    ) public view override returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored[token];

        // derivedSupply is used instead of totalSupply to modify for ve-BOOST
        return
            rewardPerTokenStored[token] +
            (((lastTimeRewardApplicable(token) - lastUpdateTime[token]) *
                rewardRate[token] *
                PRECISION) / derivedSupply);
    }

    /// @notice Used to update an account internally and externally
    /// @dev Checks if the user meets the elibility criterias
    /// @param account THe user to reset for
    function reset(address account) public {
        uint256 _derivedBalance = derivedBalances[account];
        derivedSupply -= _derivedBalance;
        _derivedBalance = derivedBalance(account);
        derivedBalances[account] = _derivedBalance;
        derivedSupply += _derivedBalance;
    }

    function derivedBalance(address account) public view returns (uint256) {
        uint256 _balance = balanceOf[account];
        uint256 _derived = (_balance * 40) / 100;
        uint256 _adjusted = (((totalSupply * staking.getVotes(account)) /
            staking.getPastTotalSupply(block.timestamp)) * 60) / 100;
        return Math.min(_derived + _adjusted, _balance);
    }

    function earned(
        IERC20 token,
        address account
    ) public view override returns (uint256) {
        return
            ((derivedBalances[account] *
                (rewardPerToken(token) -
                    userRewardPerTokenPaid[token][account])) / PRECISION) +
            rewards[token][account];
    }

    /// @notice Called by an aToken to update the various incentives
    /// @dev If the user does not meet the eligibility critera, no incentives are given
    /// @param user the user with the new aToken balance
    /// @param totalSupply the total supply of the aToken (not used)
    /// @param userBalance the user balance of the aToken
    function handleAction(
        address user,
        uint256 totalSupply,
        uint256 userBalance
    ) external {
        require(msg.sender == address(aToken), "only aToken");
        _handleAction(user, totalSupply, userBalance);
    }

    /// @notice Manually update a user's balance in the ppol
    /// @param who the user to update for
    function updateUser(address who) external {
        _handleAction(who, aToken.totalSupply(), aToken.balanceOf(who));
    }

    modifier updateReward(IERC20 token, address account) override {
        _updateReward(token, account);
        _;
        if (account != address(0)) reset(account);
    }

    function _handleAction(
        address user,
        uint256 totalSupply,
        uint256 userBalance
    ) internal {
        _updateReward(reward, user);

        if (balanceOf[user] >= userBalance) {
            // balance decreased
            totalSupply -= balanceOf[user] - userBalance;
            balanceOf[user] -= userBalance;
        } else {
            // balance increased
            totalSupply += userBalance - balanceOf[user];
            balanceOf[user] += userBalance;
        }

        // todo: conduct update reward for other tokens also
        _updateReward(reward, user);

        // reset elibility
        reset(user);
    }

    function _updateReward(IERC20 token, address account) internal {
        rewardPerTokenStored[token] = rewardPerToken(token);
        lastUpdateTime[token] = lastTimeRewardApplicable(token);
        if (account != address(0)) {
            rewards[token][account] = earned(token, account);
            userRewardPerTokenPaid[token][account] = rewardPerTokenStored[
                token
            ];
        }
    }
}
