// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IGauge} from "../interfaces/IGauge.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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

    /**
     * @notice Initializes the PoolVoter contract with the specified staking and reward tokens.
     * @dev This function is called only once during deployment.
     * @param _staking The address of the staking token (VE token).
     * @param _reward The address of the reward token.
     */
    function init(address _staking, address _reward) external initializer {
        staking = IERC20(_staking);
        reward = IERC20(_reward);
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
    }

    /**
     * @notice Resets the user's voting state, clearing their previous votes and weights.
     * @dev Only callable by the owner of the contract.
     */
    function reset() external {
        _reset(msg.sender);
    }

    /**
     * @notice Allows a user to vote for multiple pools with corresponding weights.
     * @param _poolVote An array of pool addresses the user is voting for.
     * @param _weights An array of weights corresponding to each pool vote.
     * @dev The number of elements in _poolVote and _weights arrays must be the same.
     */
    function vote(
        address[] calldata _poolVote,
        uint256[] calldata _weights
    ) external {
        require(_poolVote.length == _weights.length, "Invalid number of votes");
        _vote(msg.sender, _poolVote, _weights);
    }

    /**
     * @notice Registers a new gauge for a pool, linking the pool to its gauge contract.
     * @param _asset The address of the pool asset.
     * @param _gauge The address of the gauge contract for the specified pool.
     * @return The address of the registered gauge contract.
     * @dev Only callable by the owner of the contract.
     */
    function registerGauge(
        address _asset,
        address _gauge
    ) external onlyOwner returns (address) {
        if (!isPool[_asset]) {
            _pools.push(_asset);
            isPool[_asset] = true;
        }

        bribes[_gauge] = address(0);
        gauges[_asset] = _gauge;
        poolForGauge[_gauge] = _asset;
        _updateFor(_gauge);

        return _gauge;
    }

    /**
     * @notice Updates the distribution state for a specific gauge, accruing rewards based on supplied tokens.
     * @param _gauge The address of the gauge contract to update.
     * @dev This function is internal and automatically called during certain operations.
     */
    function updateFor(address _gauge) external {
        _updateFor(_gauge);
    }

    /**
     * @notice Distributes rewards to all registered gauge contracts.
     * @dev This function distributes rewards to gauge contracts for all pools from index 0 to the total number of pools.
     */
    function distribute() external {
        distribute(0, _pools.length);
    }

    /**
     * @notice Distributes rewards to specified gauge contracts.
     * @param _gauges An array of gauge contract addresses to distribute rewards to.
     * @dev This function iterates through the provided array of gauge contracts and distributes rewards to each one.
     */
    function distribute(address[] memory _gauges) external {
        for (uint256 x = 0; x < _gauges.length; x++) {
            distribute(_gauges[x]);
        }
    }

    /**
     * @notice Distributes rewards in a specified token to all registered pools.
     * @param token The address of the token for which rewards are being distributed.
     * @dev This function distributes rewards in the specified token to all pools from index 0 to the total number of pools.
     */
    function distributeEx(address token) external {
        distributeEx(token, 0, _pools.length);
    }

    /**
     * @notice Gets the array of all pool addresses registered in the contract.
     * @return An array containing all registered pool addresses.
     */
    function pools() external view returns (address[] memory) {
        return _pools;
    }

    /**
     * @notice Gets the total number of registered pools in the contract.
     * @return The total count of registered pools.
     */
    function length() external view returns (uint256) {
        return _pools.length;
    }

    /**
     * @notice Updates a user's voting state based on their current staking balance and previous votes.
     * @param who The address of the user whose voting state is being updated.
     * @dev This function is public and can be called by anyone.
     */
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

    /**
     * @notice Distributes rewards to a gauge contract, allowing users to claim their earned rewards.
     * @param _gauge The address of the gauge contract to distribute rewards to.
     * @dev This function is reentrant and can be called multiple times.
     */
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

    /**
     * @notice Notifies the contract of a reward amount, allowing it to distribute rewards to users.
     * @param amount The amount of rewards being notified to the contract.
     * @dev This function is reentrant and can be called multiple times.
     */
    function notifyRewardAmount(uint256 amount) public nonReentrant {
        reward.safeTransferFrom(msg.sender, address(this), amount); // transfer the distro in
        uint256 _ratio = (amount * 1e18) / totalWeight; // 1e18 adjustment is removed during claim
        if (_ratio > 0) index += _ratio;
    }

    /**
     * @notice Distributes rewards to gauge contracts for a specified range of pools.
     * @param start The starting index of the pools to distribute rewards to.
     * @param finish The ending index of the pools to distribute rewards to (exclusive).
     * @dev This function iterates through the pools from the starting index (inclusive) to the ending index (exclusive),
     *      distributing rewards to the corresponding gauge contracts.
     */
    function distribute(uint256 start, uint256 finish) public {
        for (uint256 x = start; x < finish; x++) {
            distribute(gauges[_pools[x]]);
        }
    }

    /**
     * @notice Distributes rewards to multiple gauge contracts for a specific token.
     * @param token The address of the token for which rewards are being distributed.
     * @param start The starting index of the pools to distribute rewards to.
     * @param finish The ending index of the pools to distribute rewards to.
     * @dev This function is reentrant and can be called multiple times.
     */
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

    /**
     * @notice Internal function to reset a user's voting state, clearing their votes and weights.
     * @param _who The address of the user whose state is being reset.
     * @dev This function is used internally and not meant to be directly called outside the contract.
     */
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

    /**
     * @notice Internal function for processing a user's vote for multiple pools with weights.
     * @param _who The address of the user who is voting.
     * @param _poolVote An array of pool addresses the user is voting for.
     * @param _weights An array of weights corresponding to each pool vote.
     * @dev This function is used internally and not meant to be directly called outside the contract.
     */
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

    /**
     * @notice Internal function to update the distribution state for a gauge contract.
     * @param _gauge The address of the gauge contract to update.
     * @dev This function is used internally and not meant to be directly called outside the contract.
     */
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

    /**
     * @notice Gets the revision number of the contract implementation.
     * @return The revision number of the contract.
     * @dev This function is internal and is used for contract versioning.
     */
    function getRevision() internal pure virtual returns (uint256) {
        return 0;
    }
}
