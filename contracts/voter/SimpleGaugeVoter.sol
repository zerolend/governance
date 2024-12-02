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

import {IDAO} from "@aragon/osx/core/dao/IDAO.sol";
import {IClockUser,IClock} from "../interfaces/IClock.sol";
import {ISimpleGaugeVoter} from "./../interfaces/ISimpleGaugeVoter.sol";
import {OmnichainStakingBase} from "../locker/staking/OmnichainStakingBase.sol";

import {ReentrancyGuardUpgradeable as ReentrancyGuard} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable as Pausable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {PluginUUPSUpgradeable} from "./../proxy/PluginUUPSUpgradeable.sol";

contract SimpleGaugeVoter is
    ISimpleGaugeVoter,
    IClockUser,
    ReentrancyGuard,
    Pausable,
    PluginUUPSUpgradeable
{
    /// @notice The Gauge admin can can create and manage voting gauges for token holders
    bytes32 public constant GAUGE_ADMIN_ROLE = keccak256("GAUGE_ADMIN");

 /// @notice OmnichainStaking contract for voting power
    address public staking;

    /// @notice Clock contract for epoch duration
    address public clock;

    /// @notice The total votes that have accumulated in this contract
    uint256 public totalVotingPowerCast;

    /// @notice enumerable list of all gauges that can be voted on
    address[] public gaugeList;

    /// @notice address => gauge data
    mapping(address => Gauge) public gauges;

    /// @notice gauge => total votes (global)
    mapping(address => uint256) public gaugeVotes;

    /// @dev tokenId => tokenVoteData
    mapping(uint256 => TokenVoteData) internal tokenVoteData;

    /*///////////////////////////////////////////////////////////////
                            Initialization
    //////////////////////////////////////////////////////////////*/

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _dao,
        address _staking,
        bool _startPaused,
        address _clock
    ) external initializer {
        __PluginUUPSUpgradeable_init(IDAO(_dao));
        __ReentrancyGuard_init();
        __Pausable_init();
        staking = _staking;
        clock = _clock;
        if (_startPaused) _pause();
    }

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    function pause() external auth (GAUGE_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external auth(GAUGE_ADMIN_ROLE) {
        _unpause();
    }

    modifier whenVotingActive() {
        if (!votingActive()) revert VotingInactive();
        _;
    }

    /*///////////////////////////////////////////////////////////////
                               Voting 
    //////////////////////////////////////////////////////////////*/

    /// @notice extrememly simple for loop. We don't need reentrancy checks in this implementation
    /// because the plugin doesn't do anything other than signal.
    function voteMultiple(
        uint256[] calldata _tokenIds,
        GaugeVote[] calldata _votes
    ) external nonReentrant whenNotPaused whenVotingActive {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _vote(_tokenIds[i], _votes);
        }
    }

    function vote(
        uint256 _tokenId,
        GaugeVote[] calldata _votes
    ) public nonReentrant whenNotPaused whenVotingActive {
        _vote(_tokenId, _votes);
    }

    function _vote(uint256 _tokenId, GaugeVote[] calldata _votes) internal {
        // ensure the user is the owner of the tokenId from staking 
        if(OmnichainStakingBase(staking).lockedByToken(_tokenId)!= _msgSender()){
            revert NotApprovedOrOwner();
        }

        uint256 votingPower = OmnichainStakingBase(staking).getVotes(msg.sender);
        if (votingPower == 0) revert NoVotingPower();

        uint256 numVotes = _votes.length;
        if (numVotes == 0) revert NoVotes();

        // clear any existing votes
        if (isVoting(_tokenId)) _reset(_tokenId);

        // voting power continues to increase over the voting epoch.
        // this means you can revote later in the epoch to increase votes.
        // while not a huge problem, it's worth noting that when rewards are fully
        // on chain, this could be a vector for gaming.
        TokenVoteData storage voteData = tokenVoteData[_tokenId];
        uint256 votingPowerUsed = 0;
        uint256 sumOfWeights = 0;

        for (uint256 i = 0; i < numVotes; i++) {
            sumOfWeights += _votes[i].weight;
        }

        // this is technically redundant as checks below will revert div by zero
        // but it's clearer to the caller if we revert here
        if (sumOfWeights == 0) revert NoVotes();

        // iterate over votes and distribute weight
        for (uint256 i = 0; i < numVotes; i++) {
            // the gauge must exist and be active,
            // it also can't have any votes or we haven't reset properly
            address gauge = _votes[i].gauge;

            if (!gaugeExists(gauge)) revert GaugeDoesNotExist(gauge);
            if (!isActive(gauge)) revert GaugeInactive(gauge);

            // prevent double voting
            if (voteData.votes[gauge] != 0) revert DoubleVote();

            // calculate the weight for this gauge
            uint256 votesForGauge = (_votes[i].weight * votingPower) / sumOfWeights;
            if (votesForGauge == 0) revert NoVotes();

            // record the vote for the token
            voteData.gaugesVotedFor.push(gauge);
            voteData.votes[gauge] += votesForGauge;

            // update the total weights accruing to this gauge
            gaugeVotes[gauge] += votesForGauge;

            // track the running changes to the total
            // this might differ from the total voting power
            // due to rounding, so aggregating like this ensures consistency
            votingPowerUsed += votesForGauge;

            emit Voted({
                voter: _msgSender(),
                gauge: gauge,
                epoch: epochId(),
                tokenId: _tokenId,
                votingPowerCastForGauge: votesForGauge,
                totalVotingPowerInGauge: gaugeVotes[gauge],
                totalVotingPowerInContract: totalVotingPowerCast + votingPowerUsed,
                timestamp: block.timestamp
            });
        }

        // record the total weight used for this vote
        totalVotingPowerCast += votingPowerUsed;
        voteData.usedVotingPower = votingPowerUsed;

        // setting the last voted also has the second-order effect of indicating the user has voted
        voteData.lastVoted = block.timestamp;
    }

    function reset(uint256 _tokenId) external nonReentrant whenNotPaused whenVotingActive {
        if(OmnichainStakingBase(staking).lockedByToken(_tokenId)!= _msgSender()){
            revert NotApprovedOrOwner();
        }
        if (!isVoting(_tokenId)) revert NotCurrentlyVoting();
        _reset(_tokenId);
    }

    function _reset(uint256 _tokenId) internal {
        // get what we need
        TokenVoteData storage voteData = tokenVoteData[_tokenId];
        address[] storage pastVotes = voteData.gaugesVotedFor;

        // reset the global state variables we don't need
        voteData.usedVotingPower = 0;
        voteData.lastVoted = 0;

        // iterate over all the gauges voted for and reset the votes
        uint256 votingPowerToRemove = 0;
        for (uint256 i = 0; i < pastVotes.length; i++) {
            address gauge = pastVotes[i];
            uint256 _votes = voteData.votes[gauge];

            // remove from the total weight and globals
            gaugeVotes[gauge] -= _votes;
            votingPowerToRemove += _votes;

            delete voteData.votes[gauge];

            emit Reset({
                voter: _msgSender(),
                gauge: gauge,
                epoch: epochId(),
                tokenId: _tokenId,
                votingPowerRemovedFromGauge: _votes,
                totalVotingPowerInGauge: gaugeVotes[gauge],
                totalVotingPowerInContract: totalVotingPowerCast - votingPowerToRemove,
                timestamp: block.timestamp
            });
        }

        // clear the remaining state
        voteData.gaugesVotedFor = new address[](0);
        totalVotingPowerCast -= votingPowerToRemove;
    }

    /*///////////////////////////////////////////////////////////////
                            Gauge Management
    //////////////////////////////////////////////////////////////*/

    function gaugeExists(address _gauge) public view returns (bool) {
        // this doesn't revert if you create multiple gauges at genesis
        // but that's not a practical concern
        return gauges[_gauge].created > 0;
    }

    function isActive(address _gauge) public view returns (bool) {
        return gauges[_gauge].active;
    }

    function createGauge(
        address _gauge,
        string calldata _metadataURI
    ) external auth(GAUGE_ADMIN_ROLE) nonReentrant returns (address gauge) {
        if (_gauge == address(0)) revert ZeroGauge();
        if (gaugeExists(_gauge)) revert GaugeExists();

        gauges[_gauge] = Gauge(true, block.timestamp, _metadataURI);
        gaugeList.push(_gauge);

        emit GaugeCreated(_gauge, _msgSender(), _metadataURI);
        return _gauge;
    }

    function deactivateGauge(address _gauge) external auth(GAUGE_ADMIN_ROLE) {
        if (!gaugeExists(_gauge)) revert GaugeDoesNotExist(_gauge);
        if (!isActive(_gauge)) revert GaugeActivationUnchanged();
        gauges[_gauge].active = false;
        emit GaugeDeactivated(_gauge);
    }

    function activateGauge(address _gauge) external auth(GAUGE_ADMIN_ROLE) {
        if (!gaugeExists(_gauge)) revert GaugeDoesNotExist(_gauge);
        if (isActive(_gauge)) revert GaugeActivationUnchanged();
        gauges[_gauge].active = true;
        emit GaugeActivated(_gauge);
    }

    function updateGaugeMetadata(
        address _gauge,
        string calldata _metadataURI
    ) external auth(GAUGE_ADMIN_ROLE) {
        if (!gaugeExists(_gauge)) revert GaugeDoesNotExist(_gauge);
        gauges[_gauge].metadataURI = _metadataURI;
        emit GaugeMetadataUpdated(_gauge, _metadataURI);
    }

    /*///////////////////////////////////////////////////////////////
                          Getters: Epochs & Time
    //////////////////////////////////////////////////////////////*/

    /// @notice autogenerated epoch id based on elapsed time
    function epochId() public view returns (uint256) {
        return IClock(clock).currentEpoch();
    }

    /// @notice whether voting is active in the current epoch
    function votingActive() public view returns (bool) {
        return IClock(clock).votingActive();
    }

    /// @notice timestamp of the start of the next epoch
    function epochStart() external view returns (uint256) {
        return IClock(clock).epochStartTs();
    }

    /// @notice timestamp of the start of the next voting period
    function epochVoteStart() external view returns (uint256) {
        return IClock(clock).epochVoteStartTs();
    }

    /// @notice timestamp of the end of the current voting period
    function epochVoteEnd() external view returns (uint256) {
        return IClock(clock).epochVoteEndTs();
    }

    /*///////////////////////////////////////////////////////////////
                            Getters: Mappings
    //////////////////////////////////////////////////////////////*/

    function getGauge(address _gauge) external view returns (Gauge memory) {
        return gauges[_gauge];
    }

    function getAllGauges() external view returns (address[] memory) {
        return gaugeList;
    }

    function isVoting(uint256 _tokenId) public view returns (bool) {
        return tokenVoteData[_tokenId].lastVoted > 0;
    }

    function votes(uint256 _tokenId, address _gauge) external view returns (uint256) {
        return tokenVoteData[_tokenId].votes[_gauge];
    }

    function gaugesVotedFor(uint256 _tokenId) external view returns (address[] memory) {
        return tokenVoteData[_tokenId].gaugesVotedFor;
    }

    function usedVotingPower(uint256 _tokenId) external view returns (uint256) {
        return tokenVoteData[_tokenId].usedVotingPower;
    }

    /// Rest of UUPS logic is handled by OSx plugin
    uint256[43] private __gap;
}
