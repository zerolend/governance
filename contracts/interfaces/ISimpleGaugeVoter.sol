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

interface IGauge {
    /// @param metadataURI URI for the metadata of the gauge
    struct Gauge {
        bool active;
        uint256 created; // timestamp or epoch
        string metadataURI;
        // more space for data as this is a struct in a mapping
    }
}

interface IGaugeVote {
    /// @param votes gauge => votes cast at that time
    /// @param gaugesVotedFor array of gauges we have active votes for
    /// @param usedVotingPower total voting power used at the time of the vote
    /// @dev this changes so we need an historic snapshot
    /// @param lastVoted is the last time the user voted
    struct TokenVoteData {
        mapping(address => uint256) votes; // gauge -> votes
        address[] gaugesVotedFor; // Gauges you voted for 
        uint256 usedVotingPower; // How much voting power you have used
        uint256 lastVoted; // last time you voted on gauge
    }

    /// @param weight proportion of voting power the token will allocate to the gauge. Will be normalised.
    /// @param gauge address of the gauge to vote for
    struct GaugeVote {
        uint256 weight;
        address gauge;
    }
}

/*///////////////////////////////////////////////////////////////
                            Gauge Manager
//////////////////////////////////////////////////////////////*/

interface IGaugeManagerEvents {
    event GaugeCreated(address indexed gauge, address indexed creator, string metadataURI);
    event GaugeDeactivated(address indexed gauge);
    event GaugeActivated(address indexed gauge);
    event GaugeMetadataUpdated(address indexed gauge, string metadataURI);
}

interface IGaugeManagerErrors {
    error ZeroGauge();
    error GaugeActivationUnchanged();
    error GaugeExists();
}

interface IGaugeManager is IGaugeManagerEvents, IGaugeManagerErrors {
    function isActive(address gauge) external view returns (bool);

    function createGauge(address _gauge, string calldata _metadata) external returns (address);

    function deactivateGauge(address _gauge) external;

    function activateGauge(address _gauge) external;

    function updateGaugeMetadata(address _gauge, string calldata _metadata) external;
}

/*///////////////////////////////////////////////////////////////
                            Gauge Voter
//////////////////////////////////////////////////////////////*/

interface IGaugeVoterEvents {
    /// @param votingPowerCastForGauge votes cast by this token for this gauge in this vote
    /// @param totalVotingPowerInGauge total voting power in the gauge at the time of the vote, after applying the vote
    /// @param totalVotingPowerInContract total voting power in the contract at the time of the vote, after applying the vote
    event Voted(
        address indexed voter,
        address indexed gauge,
        uint256 indexed epoch,
        uint256 tokenId,
        uint256 votingPowerCastForGauge,
        uint256 totalVotingPowerInGauge,
        uint256 totalVotingPowerInContract,
        uint256 timestamp
    );

    /// @param votingPowerRemovedFromGauge votes removed by this token for this gauge, at the time of this rest
    /// @param totalVotingPowerInGauge total voting power in the gauge at the time of the reset, after applying the reset
    /// @param totalVotingPowerInContract total voting power in the contract at the time of the reset, after applying the reset
    event Reset(
        address indexed voter,
        address indexed gauge,
        uint256 indexed epoch,
        uint256 tokenId,
        uint256 votingPowerRemovedFromGauge,
        uint256 totalVotingPowerInGauge,
        uint256 totalVotingPowerInContract,
        uint256 timestamp
    );
}

interface IGaugeVoterErrors {
    error AlreadyVoted(uint256 tokenId);
    error VotingInactive();
    error NotApprovedOrOwner();
    error GaugeDoesNotExist(address _pool);
    error GaugeInactive(address _gauge);
    error DoubleVote();
    error NoVotes();
    error NoVotingPower();
    error NotCurrentlyVoting();
}

interface IGaugeVoter is IGaugeVoterEvents, IGaugeVoterErrors, IGaugeVote {
    /// @notice Called by users to vote for pools. Votes distributed proportionally based on weights.
    /// @param _tokenId     Id of veNFT you are voting with.
    /// @param _votes       Array of votes to be cast, contains gauge address and weight.
    function vote(uint256 _tokenId, GaugeVote[] memory _votes) external;

    /// @notice Called by users to reset voting state. Required when withdrawing or transferring veNFT.
    /// @param _tokenId Id of veNFT you are reseting.
    function reset(uint256 _tokenId) external;

    /// @notice Can be called to check if a token is currently voting
    function isVoting(uint256 _tokenId) external view returns (bool);
}

/*///////////////////////////////////////////////////////////////
                        Simple Gauge Voter
//////////////////////////////////////////////////////////////*/

interface ISimpleGaugeVoter is IGaugeVoter, IGaugeManager, IGauge {

}

interface ISimpleGaugeVoterStorageEventsErrors is
    IGaugeManagerEvents,
    IGaugeManagerErrors,
    IGaugeVoterEvents,
    IGaugeVoterErrors
{}
