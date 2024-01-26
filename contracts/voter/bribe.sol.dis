// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

library Math {
    function max(uint a, uint b) internal pure returns (uint) {
        return a >= b ? a : b;
    }

    function min(uint a, uint b) internal pure returns (uint) {
        return a < b ? a : b;
    }
}

interface erc20 {
    function totalSupply() external view returns (uint256);

    function transfer(address recipient, uint amount) external returns (bool);

    function decimals() external view returns (uint8);

    function balanceOf(address) external view returns (uint);

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool);

    function approve(address spender, uint value) external returns (bool);
}

interface ve {
    function token() external view returns (address);

    function balanceOfNFT(uint, uint) external view returns (uint);

    function balance(address) external view returns (uint);

    function isApprovedOrOwner(address, uint) external view returns (bool);
}

interface IBaseV1Factory {
    function isPair(address) external view returns (bool);
}

// Bribes pay out rewards for a given pool based on the votes that were received from the user (goes hand in hand with BaseV1Gauges.vote())
// Nuance: users must call updateReward after they voted for a given bribe
contract Bribe {
    address immutable factory; // only factory can modify balances (since it only happens on vote())
    address immutable _ve;

    uint constant DURATION = 7 days; // rewards are released over 7 days
    uint constant PRECISION = 10 ** 18;

    address[] public incentives; // array of incentives for a given gauge/bribe
    mapping(address => bool) public isIncentive; // confirms if the incentive is currently valid for the gauge/bribe

    // default snx staking contract implementation
    mapping(address => uint) public rewardRate;
    mapping(address => uint) public periodFinish;
    mapping(address => uint) public lastUpdateTime;
    mapping(address => uint) public rewardPerTokenStored;

    mapping(address => mapping(uint => uint)) public userRewardPerTokenPaid;
    mapping(address => mapping(uint => uint)) public rewards;

    uint public totalSupply;
    mapping(uint => uint) public balanceOf;

    // simple re-entrancy check
    uint _unlocked = 1;
    modifier lock() {
        require(_unlocked == 1);
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    function incentivesLength() external view returns (uint) {
        return incentives.length;
    }

    // returns the last time the reward was modified or periodFinish if the reward has ended
    function lastTimeRewardApplicable(
        address token
    ) public view returns (uint) {
        return Math.min(block.timestamp, periodFinish[token]);
    }

    // total amount of rewards returned for the 7 day duration
    function getRewardForDuration(address token) external view returns (uint) {
        return rewardRate[token] * DURATION;
    }

    // allows a user to claim rewards for a given token
    function getReward(
        uint tokenId,
        address token
    ) public lock updateReward(token, tokenId) {
        require(ve(_ve).isApprovedOrOwner(msg.sender, tokenId));
        uint _reward = rewards[token][tokenId];
        rewards[token][tokenId] = 0;
        _safeTransfer(token, msg.sender, _reward);
    }

    constructor() {
        factory = msg.sender;
        _ve = BaseV1Gauges(msg.sender)._ve();
    }

    function rewardPerToken(address token) public view returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored[token];
        }
        return
            rewardPerTokenStored[token] +
            (((lastTimeRewardApplicable(token) - lastUpdateTime[token]) *
                rewardRate[token] *
                PRECISION) / totalSupply);
    }

    function earned(address token, uint tokenId) public view returns (uint) {
        return
            ((balanceOf[tokenId] *
                (rewardPerToken(token) -
                    userRewardPerTokenPaid[token][tokenId])) / PRECISION) +
            rewards[token][tokenId];
    }

    // This is an external function, but internal notation is used since it can only be called "internally" from BaseV1Gauges
    function _deposit(uint amount, uint tokenId) external {
        require(msg.sender == factory);
        totalSupply += amount;
        balanceOf[tokenId] += amount;
    }

    function _withdraw(uint amount, uint tokenId) external {
        require(msg.sender == factory);
        totalSupply -= amount;
        balanceOf[tokenId] -= amount;
    }

    modifier updateReward(address token, uint tokenId) {
        rewardPerTokenStored[token] = rewardPerToken(token);
        lastUpdateTime[token] = lastTimeRewardApplicable(token);
        if (tokenId != type(uint).max) {
            rewards[token][tokenId] = earned(token, tokenId);
            userRewardPerTokenPaid[token][tokenId] = rewardPerTokenStored[
                token
            ];
        }
        _;
    }

    // used to notify a gauge/bribe of a given reward, this can create griefing attacks by extending rewards
    // TODO: rework to weekly resets, _updatePeriod as per v1 bribes
    function notifyRewardAmount(
        address token,
        uint amount
    ) external lock updateReward(token, type(uint).max) returns (bool) {
        if (block.timestamp >= periodFinish[token]) {
            _safeTransferFrom(token, msg.sender, address(this), amount);
            rewardRate[token] = amount / DURATION;
        } else {
            uint _remaining = periodFinish[token] - block.timestamp;
            uint _left = _remaining * rewardRate[token];
            if (amount < _left) {
                return false; // don't revert to help distribute run through its tokens
            }
            _safeTransferFrom(token, msg.sender, address(this), amount);
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

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(erc20.transfer.selector, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))));
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(erc20.transferFrom.selector, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))));
    }
}
