// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {RewardBase} from "./RewardBase.sol";
import {IIncentivesController} from "../../interfaces/IIncentivesController.sol";
import {IEligibilityCriteria} from "../../interfaces/IEligibilityCriteria.sol";
import {IAaveOracle} from "@zerolendxyz/core-v3/contracts/interfaces/IAaveOracle.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 14 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract GaugeIncentiveController is RewardBase, IIncentivesController {
    IERC20 public aToken;
    IERC20 public reward;
    IEligibilityCriteria public eligibility;
    IAaveOracle public oracle;
    address public oracleAsset;

    uint256 public derivedSupply;
    mapping(address => uint256) public derivedBalances;

    function init(
        IERC20 _aToken,
        address _reward,
        address _eligibility,
        address _oracle
    ) external {
        __RewardBase_init();
        aToken = _aToken;

        eligibility = IEligibilityCriteria(_eligibility);
        reward = IERC20(_reward);
        oracle = IAaveOracle(_oracle);

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
        uint256 _balance = (balanceOf[account] *
            oracle.getAssetPrice(oracleAsset)) / 1e8;

        uint256 multiplierE18 = eligibility.checkEligibility(account, _balance);
        return (_balance * multiplierE18) / 1e18;
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
    /// @param userBalance the user balance of the aToken
    function handleAction(address user, uint256, uint256 userBalance) external {
        require(msg.sender == address(aToken), "only aToken");
        _handleAction(user, userBalance);
    }

    /// @notice Manually update a user's balance in the ppol
    /// @param who the user to update for
    function updateUser(address who) external {
        _handleAction(who, aToken.balanceOf(who));
    }

    modifier updateReward(IERC20 token, address account) override {
        _updateReward(token, account);
        _;
        if (account != address(0)) reset(account);
    }

    function _handleAction(address user, uint256 userBalance) internal {
        _updateReward(reward, user);
        balanceOf[user] = userBalance;
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
