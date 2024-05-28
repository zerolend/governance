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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IZeroLend} from "../../interfaces/IZeroLend.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title OmnichainStaking
 * @dev An omnichain staking contract that allows users to stake their veNFT
 * and get some voting power. Once staked, the voting power is available cross-chain.
 */
contract StakingRewards is
    ERC20VotesUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    IZeroLend public rewardsToken;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward);
    event Recovered(address token, uint256 amount);
    event RewardsDurationUpdated(uint256 newDuration);

    function __initStakingRewards(
        uint256 _rewardsDuration,
        address _zeroToken,
        address _owner,
        string memory _name,
        string memory _symbol
    ) internal {
        __ERC20Votes_init();
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __ERC20_init(_name, _symbol);

        rewardsDuration = _rewardsDuration;
        rewardsToken = IZeroLend(_zeroToken);
    }

    function _mintPower(address who, uint256 amt) internal {
        updateRewardFor(who);
        _mint(who, amt);
    }

    function _burnPower(address who, uint256 amt) internal {
        updateRewardFor(who);
        _burn(who, amt);
    }

    /**
     * @dev Calculates the last time rewards were applicable.
     * @return The last time rewards were applicable.
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        uint256 time = block.timestamp < periodFinish
            ? block.timestamp
            : periodFinish;
        return time;
    }

    /**
     * @dev Calculates the reward per token.
     * @return The reward per token.
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) return rewardPerTokenStored;

        uint256 timeElapsed = lastTimeRewardApplicable() - lastUpdateTime;
        uint256 rewardPerTokenChange = (timeElapsed * rewardRate * 1e18) /
            totalSupply();

        return rewardPerTokenStored + rewardPerTokenChange;
    }

    function notifyRewardAmount(uint256 reward) external {
        updateRewardFor(address(0));
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance / rewardsDuration, "reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    function recoverERC20(address token, uint256 amt) external onlyOwner {
        IERC20(token).transfer(owner(), amt);
        emit Recovered(token, amt);
    }

    /**
     * @dev Transfers rewards to the caller.
     */
    function getReward() public nonReentrant {
        updateRewardFor(msg.sender);
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @dev Updates the reward for a given account.
     * @param account The address of the account.
     */
    function updateRewardFor(address account) public {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    /**
     * @dev Calculates the amount of rewards earned by an account.
     * @param account The address of the account.
     * @return The amount of rewards earned.
     */
    function earned(address account) public view returns (uint256) {
        return
            (balanceOf(account) *
                (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18 +
            rewards[account];
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period not finished"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }
}
