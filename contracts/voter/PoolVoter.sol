// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IGauge} from "../interfaces/IGauge.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract PoolVoter is ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    IERC20 public staking; // the ve token that governs these contracts
    IERC20 public reward;
    uint256 public totalWeight; // total voting weight
    address public lzEndpoint;
    address public mainnetEmissions;

    address[] internal _pools; // all pools viable for incentives
    mapping(address => address) public gauges; // pool => gauge
    mapping(address => bool) public isPool; // pool => bool
    mapping(address => address) public poolForGauge; // pool => gauge
    mapping(address => address) public bribes; // gauge => bribe
    mapping(address => uint256) public weights; // pool => weight
    mapping(address => mapping(address => uint256)) public votes; // nft => votes
    mapping(address => address[]) public poolVote; // nft => pools
    mapping(address => uint256) public usedWeights; // nft => total voting weight of user

    uint256 public index;
    mapping(address => uint256) public supplyIndex;
    mapping(address => uint256) public claimable;

    function getRevision() internal pure virtual returns (uint256) {
        return 0;
    }

    function pools() external view returns (address[] memory) {
        return _pools;
    }

    function init(address _staking, address _reward) external initializer {
        staking = IERC20(_staking);
        reward = IERC20(_reward);
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
    }

    function reset() external {
        _reset(msg.sender);
    }

    function _reset(address _who) internal {
        address[] storage _poolVote = poolVote[_who];
        uint256 _poolVoteCnt = _poolVote.length;

        for (uint256 i = 0; i < _poolVoteCnt; i++) {
            address _pool = _poolVote[i];
            uint256 _votes = votes[_who][_pool];

            if (_votes > 0) {
                _updateFor(gauges[_pool]);
                totalWeight -= _votes;
                weights[_pool] -= _votes;
                votes[_who][_pool] = 0;
            }
        }

        delete poolVote[_who];
    }

    function poke(address who) public {
        address[] memory _poolVote = poolVote[who];
        uint256 _poolCnt = _poolVote.length;
        uint256[] memory _weights = new uint256[](_poolCnt);

        uint256 _prevUsedWeight = usedWeights[who];
        uint256 _weight = staking.balanceOf(who);

        for (uint256 i = 0; i < _poolCnt; i++) {
            uint256 _prevWeight = votes[who][_poolVote[i]];
            _weights[i] = (_prevWeight * _weight) / _prevUsedWeight;
        }

        _vote(who, _poolVote, _weights);
    }

    function _vote(
        address _who,
        address[] memory _poolVote,
        uint256[] memory _weights
    ) internal {
        // require(ve(_ve).isApprovedOrOwner(msg.sender, _tokenId));
        _reset(_who);
        uint256 _poolCnt = _poolVote.length;
        uint256 _weight = staking.balanceOf(_who);
        uint256 _totalVoteWeight = 0;
        uint256 _usedWeight = 0;

        for (uint256 i = 0; i < _poolCnt; i++) {
            _totalVoteWeight += _weights[i];
        }

        for (uint256 i = 0; i < _poolCnt; i++) {
            address _pool = _poolVote[i];
            address _gauge = gauges[_pool];
            uint256 _poolWeight = (_weights[i] * _weight) / _totalVoteWeight;

            if (_gauge != address(0x0)) {
                _updateFor(_gauge);
                _usedWeight += _poolWeight;
                totalWeight += _poolWeight;
                weights[_pool] += _poolWeight;
                poolVote[_who].push(_pool);
                votes[_who][_pool] = _poolWeight;
            }
        }

        usedWeights[_who] = _usedWeight;
    }

    function vote(
        address[] calldata _poolVote,
        uint256[] calldata _weights
    ) external {
        require(_poolVote.length == _weights.length);
        _vote(msg.sender, _poolVote, _weights);
    }

    function registerGauge(
        address _asset,
        address _gauge
    ) external onlyOwner returns (address) {
        if (isPool[_asset]) {
            _pools.push(_asset);
            isPool[_asset] = true;
        }

        bribes[_gauge] = address(0);
        gauges[_asset] = _gauge;
        poolForGauge[_gauge] = _asset;
        _updateFor(_gauge);

        return _gauge;
    }

    function length() external view returns (uint256) {
        return _pools.length;
    }

    // Accrue fees on token0
    function notifyRewardAmount(uint256 amount) public nonReentrant {
        reward.safeTransferFrom(msg.sender, address(this), amount); // transfer the distro in
        uint256 _ratio = (amount * 1e18) / totalWeight; // 1e18 adjustment is removed during claim
        if (_ratio > 0) index += _ratio;
    }

    function updateFor(address _gauge) external {
        _updateFor(_gauge);
    }

    function _updateFor(address _gauge) internal {
        address _pool = poolForGauge[_gauge];
        uint256 _supplied = weights[_pool];
        if (_supplied > 0) {
            uint256 _supplyIndex = supplyIndex[_gauge];
            uint256 _index = index; // get global index0 for accumulated distro
            supplyIndex[_gauge] = _index; // update _gauge current position to global position
            uint256 _delta = _index - _supplyIndex; // see if there is any difference that need to be accrued
            if (_delta > 0) {
                uint256 _share = (_supplied * _delta) / 1e18; // add accrued difference for each supplied token
                claimable[_gauge] += _share;
            }
        } else {
            supplyIndex[_gauge] = index; // new users are set to the default global state
        }
    }

    function distribute(address _gauge) public nonReentrant {
        uint256 _claimable = claimable[_gauge];
        claimable[_gauge] = 0;
        IERC20(reward).approve(_gauge, 0); // first set to 0, this helps reset some non-standard tokens
        IERC20(reward).approve(_gauge, _claimable);
        if (!IGauge(_gauge).notifyRewardAmount(address(reward), _claimable)) {
            // can return false, will simply not distribute tokens
            claimable[_gauge] = _claimable;
        }
    }

    function distribute() external {
        distribute(0, _pools.length);
    }

    function distribute(uint256 start, uint256 finish) public {
        for (uint256 x = start; x < finish; x++) {
            distribute(gauges[_pools[x]]);
        }
    }

    function distribute(address[] memory _gauges) external {
        for (uint256 x = 0; x < _gauges.length; x++) {
            distribute(_gauges[x]);
        }
    }

    function distributeEx(address token) external {
        distributeEx(token, 0, _pools.length);
    }

    // setup distro > then distribute

    function distributeEx(
        address token,
        uint256 start,
        uint256 finish
    ) public nonReentrant {
        uint256 _balance = IERC20(token).balanceOf(address(this));
        if (_balance > 0 && totalWeight > 0) {
            uint256 _totalWeight = totalWeight;
            for (uint256 x = start; x < finish; x++) {
                uint256 _reward = (_balance * weights[_pools[x]]) /
                    _totalWeight;
                if (_reward > 0) {
                    address _gauge = gauges[_pools[x]];

                    IERC20(token).approve(_gauge, 0); // first set to 0, this helps reset some non-standard tokens
                    IERC20(token).approve(_gauge, _reward);
                    IGauge(_gauge).notifyRewardAmount(token, _reward); // can return false, will simply not distribute tokens
                }
            }
        }
    }
}
