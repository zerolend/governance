// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {RewardBase} from "./RewardBase.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 7 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract Gauge is RewardBase {
    IERC20 public stake; // the LP token that needs to be staked for rewards
    IVotes public staking; // the ve token used for gauges
    IERC20 public reward;

    uint256 public derivedSupply;
    mapping(address => uint256) public derivedBalances;

    function init(address _stake, address _staking, address _reward) external {
        __RewardBase_init();
        stake = IERC20(_stake);
        staking = IVotes(_staking);
        reward = IERC20(_reward);
    }

    function rewardPerToken(
        address token
    ) public view override returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored[token];

        // derivedSupply is used instead of totalSupply to modify for ve-BOOST
        return
            rewardPerTokenStored[token] +
            (((lastTimeRewardApplicable(token) - lastUpdateTime[token]) *
                rewardRate[token] *
                PRECISION) / derivedSupply);
    }

    // used to update an account internally and externally, since ve decays over times, an address could have 0 balance but still register here
    function kick(address account) public {
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
        address token,
        address account
    ) public view override returns (uint256) {
        return
            ((derivedBalances[account] *
                (rewardPerToken(token) -
                    userRewardPerTokenPaid[token][account])) / PRECISION) +
            rewards[token][account];
    }

    /*function deposit() external {
        _deposit(erc20(stake).balanceOf(msg.sender), msg.sender);
    }

    function deposit(uint256 amount) external {
        _deposit(amount, msg.sender);
    }*/

    function deposit(uint256 amount, address account) external {
        _deposit(amount, account);
    }

    function _deposit(
        uint256 amount,
        address account
    ) internal nonReentrant updateReward(incentives[0], account) {
        // _safeTransferFrom(stake, account, address(this), amount);
        totalSupply += amount;
        balanceOf[account] += amount;
    }

    function withdraw() external {
        _withdraw(balanceOf[msg.sender]);
    }

    function withdraw(uint256 amount) external {
        _withdraw(amount);
    }

    function _withdraw(
        uint256 amount
    ) internal nonReentrant updateReward(incentives[0], msg.sender) {
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        // _safeTransfer(stake, msg.sender, amount);
    }

    function exit() external {
        if (balanceOf[msg.sender] > 0) _withdraw(balanceOf[msg.sender]); // include balance 0 check for tokens that might revert on 0 balance (assuming withdraw > exit)
        getReward(incentives[0]);
    }

    modifier updateReward(address token, address account) override {
        rewardPerTokenStored[token] = rewardPerToken(token);
        lastUpdateTime[token] = lastTimeRewardApplicable(token);
        if (account != address(0)) {
            rewards[token][account] = earned(token, account);
            userRewardPerTokenPaid[token][account] = rewardPerTokenStored[
                token
            ];
        }
        _;
        if (account != address(0)) {
            kick(account);
        }
    }
}
