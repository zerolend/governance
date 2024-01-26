// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGauge} from "../interfaces/IGauge.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract PoolVoter {
    IVotes public staking; // the ve token that governs these contracts
    IERC20 public base;

    uint public totalWeight; // total voting weight

    // simple re-entrancy check
    uint _unlocked = 1;
    modifier lock() {
        require(_unlocked == 1);
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    address[] internal _pools; // all pools viable for incentives
    mapping(address => address) public gauges; // pool => gauge
    mapping(address => address) public poolForGauge; // pool => gauge
    mapping(address => address) public bribes; // gauge => bribe
    mapping(address => uint) public weights; // pool => weight
    mapping(address => mapping(address => uint)) public votes; // nft => votes
    mapping(address => address[]) public poolVote; // nft => pools
    mapping(address => uint) public usedWeights; // nft => total voting weight of user

    uint public index;
    mapping(address => uint) public supplyIndex;
    mapping(address => uint) public claimable;

    function pools() external view returns (address[] memory) {
        return _pools;
    }

    constructor(address __ve, address _factory) {
        // _ve = __ve;
        // factory = _factory;
        // base = ve(__ve).token();
    }

    function reset(address _tokenId) external {
        _reset(_tokenId);
    }

    function _reset(address _tokenId) internal {
        address[] storage _poolVote = poolVote[_tokenId];
        uint _poolVoteCnt = _poolVote.length;

        for (uint i = 0; i < _poolVoteCnt; i++) {
            address _pool = _poolVote[i];
            uint _votes = votes[_tokenId][_pool];

            // if (_votes > 0) {
            //     _updateFor(gauges[_pool]);
            //     totalWeight -= _votes;
            //     weights[_pool] -= _votes;
            //     votes[_tokenId][_pool] = 0;
            //     Bribe(bribes[gauges[_pool]])._withdraw(_votes, _tokenId);
            // }
        }

        delete poolVote[_tokenId];
    }

    function poke(address who) public {
        address[] memory _poolVote = poolVote[who];
        uint _poolCnt = _poolVote.length;
        uint[] memory _weights = new uint[](_poolCnt);

        uint _prevUsedWeight = usedWeights[who];
        uint _weight = staking.getVotes(who);

        for (uint i = 0; i < _poolCnt; i++) {
            uint _prevWeight = votes[who][_poolVote[i]];
            _weights[i] = (_prevWeight * _weight) / _prevUsedWeight;
        }

        _vote(who, _poolVote, _weights);
    }

    function _vote(
        address _tokenId,
        address[] memory _poolVote,
        uint[] memory _weights
    ) internal {
        // require(ve(_ve).isApprovedOrOwner(msg.sender, _tokenId));
        _reset(_tokenId);
        uint _poolCnt = _poolVote.length;
        uint _weight = staking.getVotes(_tokenId);
        uint _totalVoteWeight = 0;
        uint _usedWeight = 0;

        for (uint i = 0; i < _poolCnt; i++) {
            _totalVoteWeight += _weights[i];
        }

        for (uint i = 0; i < _poolCnt; i++) {
            address _pool = _poolVote[i];
            address _gauge = gauges[_pool];
            uint _poolWeight = (_weights[i] * _weight) / _totalVoteWeight;

            // if (_gauge != address(0x0)) {
            //     _updateFor(_gauge);
            //     _usedWeight += _poolWeight;
            //     totalWeight += _poolWeight;
            //     weights[_pool] += _poolWeight;
            //     poolVote[_tokenId].push(_pool);
            //     votes[_tokenId][_pool] = _poolWeight;
            //     Bribe(bribes[_gauge])._deposit(_poolWeight, _tokenId);
            // }
        }

        usedWeights[_tokenId] = _usedWeight;
    }

    function vote(
        address tokenId,
        address[] calldata _poolVote,
        uint[] calldata _weights
    ) external {
        require(_poolVote.length == _weights.length);
        _vote(tokenId, _poolVote, _weights);
    }

    // function createGauge(address _pool) external returns (address) {
    //     require(gauges[_pool] == address(0x0), "exists");
    //     require(IBaseV1Factory(factory).isPair(_pool), "!_pool");
    //     address _gauge = address(new Gauge(_pool));
    //     address _bribe = address(new Bribe());
    //     bribes[_gauge] = _bribe;
    //     gauges[_pool] = _gauge;
    //     poolForGauge[_gauge] = _pool;
    //     _updateFor(_gauge);
    //     _pools.push(_pool);
    //     return _gauge;
    // }

    function length() external view returns (uint) {
        return _pools.length;
    }

    // Accrue fees on token0
    function notifyRewardAmount(uint amount) public lock {
        _safeTransferFrom(address(base), msg.sender, address(this), amount); // transfer the distro in
        uint256 _ratio = (amount * 1e18) / totalWeight; // 1e18 adjustment is removed during claim
        if (_ratio > 0) {
            index += _ratio;
        }
    }

    function updateFor(address _gauge) external {
        _updateFor(_gauge);
    }

    function _updateFor(address _gauge) internal {
        address _pool = poolForGauge[_gauge];
        uint _supplied = weights[_pool];
        if (_supplied > 0) {
            uint _supplyIndex = supplyIndex[_gauge];
            uint _index = index; // get global index0 for accumulated distro
            supplyIndex[_gauge] = _index; // update _gauge current position to global position
            uint _delta = _index - _supplyIndex; // see if there is any difference that need to be accrued
            if (_delta > 0) {
                uint _share = (_supplied * _delta) / 1e18; // add accrued difference for each supplied token
                claimable[_gauge] += _share;
            }
        } else {
            supplyIndex[_gauge] = index; // new users are set to the default global state
        }
    }

    function distribute(address _gauge) public lock {
        uint _claimable = claimable[_gauge];
        claimable[_gauge] = 0;
        IERC20(base).approve(_gauge, 0); // first set to 0, this helps reset some non-standard tokens
        IERC20(base).approve(_gauge, _claimable);
        if (!IGauge(_gauge).notifyRewardAmount(address(base), _claimable)) {
            // can return false, will simply not distribute tokens
            claimable[_gauge] = _claimable;
        }
    }

    function distro() external {
        distribute(0, _pools.length);
    }

    function distribute() external {
        distribute(0, _pools.length);
    }

    function distribute(uint start, uint finish) public {
        for (uint x = start; x < finish; x++) {
            distribute(gauges[_pools[x]]);
        }
    }

    function distribute(address[] memory _gauges) external {
        for (uint x = 0; x < _gauges.length; x++) {
            distribute(_gauges[x]);
        }
    }

    function distributeEx(address token) external {
        distributeEx(token, 0, _pools.length);
    }

    // setup distro > then distribute

    function distributeEx(address token, uint start, uint finish) public lock {
        uint _balance = IERC20(token).balanceOf(address(this));
        if (_balance > 0 && totalWeight > 0) {
            uint _totalWeight = totalWeight;
            for (uint x = start; x < finish; x++) {
                uint _reward = (_balance * weights[_pools[x]]) / _totalWeight;
                if (_reward > 0) {
                    address _gauge = gauges[_pools[x]];

                    IERC20(token).approve(_gauge, 0); // first set to 0, this helps reset some non-standard tokens
                    IERC20(token).approve(_gauge, _reward);
                    IGauge(_gauge).notifyRewardAmount(token, _reward); // can return false, will simply not distribute tokens
                }
            }
        }
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                value
            )
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))));
    }
}
