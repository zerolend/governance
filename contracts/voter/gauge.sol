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

abstract contract RewardBase {
    uint constant DURATION = 7 days; // rewards are released over 7 days
    uint constant PRECISION = 10 ** 18;

    address[] public incentives; // array of incentives for a given gauge/bribe
    mapping(address => bool) public isIncentive; // confirms if the incentive is currently valid for the gauge/bribe

    // default snx staking contract implementation
    mapping(address => uint) public rewardRate;
    mapping(address => uint) public periodFinish;
    mapping(address => uint) public lastUpdateTime;
    mapping(address => uint) public rewardPerTokenStored;

    mapping(address => mapping(address => uint)) public userRewardPerTokenPaid;
    mapping(address => mapping(address => uint)) public rewards;

    uint public totalSupply;
    mapping(address => uint) public balanceOf;

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

    // how to calculate the reward given per token "staked" (or voted for bribes)
    function rewardPerToken(address token) public view virtual returns (uint);

    // how to calculate the total earnings of an address for a given token
    function earned(
        address token,
        address account
    ) public view virtual returns (uint);

    // total amount of rewards returned for the 7 day duration
    function getRewardForDuration(address token) external view returns (uint) {
        return rewardRate[token] * DURATION;
    }

    // allows a user to claim rewards for a given token
    function getReward(
        address token
    ) public lock updateReward(token, msg.sender) {
        uint _reward = rewards[token][msg.sender];
        rewards[token][msg.sender] = 0;
        _safeTransfer(token, msg.sender, _reward);
    }

    // used to notify a gauge/bribe of a given reward, this can create griefing attacks by extending rewards
    // TODO: rework to weekly resets, _updatePeriod as per v1 bribes
    function notifyRewardAmount(
        address token,
        uint amount
    ) external lock updateReward(token, address(0)) returns (bool) {
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

    modifier updateReward(address token, address account) virtual;

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

// Gauges are used to incentivize pools, they emit reward tokens over 7 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract Gauge is RewardBase {
    address public immutable stake; // the LP token that needs to be staked for rewards
    address immutable _ve; // the ve token used for gauges

    uint public derivedSupply;
    mapping(address => uint) public derivedBalances;

    constructor(address _stake) {
        stake = _stake;
        // address __ve = BaseV1Gauges(msg.sender)._ve();
        _ve = address(0);
        incentives.push(ve(address(0)).token()); // assume the first incentive is the same token that creates ve
    }

    function rewardPerToken(address token) public view override returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored[token];
        } // derivedSupply is used instead of totalSupply to modify for ve-BOOST
        return
            rewardPerTokenStored[token] +
            (((lastTimeRewardApplicable(token) - lastUpdateTime[token]) *
                rewardRate[token] *
                PRECISION) / derivedSupply);
    }

    // used to update an account internally and externally, since ve decays over times, an address could have 0 balance but still register here
    function kick(address account) public {
        uint _derivedBalance = derivedBalances[account];
        derivedSupply -= _derivedBalance;
        _derivedBalance = derivedBalance(account);
        derivedBalances[account] = _derivedBalance;
        derivedSupply += _derivedBalance;
    }

    function derivedBalance(address account) public view returns (uint) {
        uint _balance = balanceOf[account];
        uint _derived = (_balance * 40) / 100;
        uint _adjusted = (((totalSupply * ve(_ve).balance(account)) /
            erc20(_ve).totalSupply()) * 60) / 100;
        return Math.min(_derived + _adjusted, _balance);
    }

    function earned(
        address token,
        address account
    ) public view override returns (uint) {
        return
            ((derivedBalances[account] *
                (rewardPerToken(token) -
                    userRewardPerTokenPaid[token][account])) / PRECISION) +
            rewards[token][account];
    }

    /*function deposit() external {
        _deposit(erc20(stake).balanceOf(msg.sender), msg.sender);
    }

    function deposit(uint amount) external {
        _deposit(amount, msg.sender);
    }*/

    function deposit(uint amount, address account) external {
        _deposit(amount, account);
    }

    function _deposit(
        uint amount,
        address account
    ) internal lock updateReward(incentives[0], account) {
        _safeTransferFrom(stake, account, address(this), amount);
        totalSupply += amount;
        balanceOf[account] += amount;
    }

    function withdraw() external {
        _withdraw(balanceOf[msg.sender]);
    }

    function withdraw(uint amount) external {
        _withdraw(amount);
    }

    function _withdraw(
        uint amount
    ) internal lock updateReward(incentives[0], msg.sender) {
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        _safeTransfer(stake, msg.sender, amount);
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
