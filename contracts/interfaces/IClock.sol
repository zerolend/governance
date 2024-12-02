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

interface IClockUser {
    function clock() external view returns (address);
}

interface IClock {
    function epochDuration() external pure returns (uint256);

    function checkpointInterval() external pure returns (uint256);

    function voteDuration() external pure returns (uint256);

    function voteWindowBuffer() external pure returns (uint256);

    function currentEpoch() external view returns (uint256);

    function resolveEpoch(uint256 timestamp) external pure returns (uint256);

    function elapsedInEpoch() external view returns (uint256);

    function resolveElapsedInEpoch(uint256 timestamp) external pure returns (uint256);

    function epochStartsIn() external view returns (uint256);

    function resolveEpochStartsIn(uint256 timestamp) external pure returns (uint256);

    function epochStartTs() external view returns (uint256);

    function resolveEpochStartTs(uint256 timestamp) external pure returns (uint256);

    function votingActive() external view returns (bool);

    function resolveVotingActive(uint256 timestamp) external pure returns (bool);

    function epochVoteStartsIn() external view returns (uint256);

    function resolveEpochVoteStartsIn(uint256 timestamp) external pure returns (uint256);

    function epochVoteStartTs() external view returns (uint256);

    function resolveEpochVoteStartTs(uint256 timestamp) external pure returns (uint256);

    function epochVoteEndsIn() external view returns (uint256);

    function resolveEpochVoteEndsIn(uint256 timestamp) external pure returns (uint256);

    function epochVoteEndTs() external view returns (uint256);

    function resolveEpochVoteEndTs(uint256 timestamp) external pure returns (uint256);

    function epochNextCheckpointIn() external view returns (uint256);

    function resolveEpochNextCheckpointIn(uint256 timestamp) external pure returns (uint256);

    function epochNextCheckpointTs() external view returns (uint256);

    function resolveEpochNextCheckpointTs(uint256 timestamp) external pure returns (uint256);
}
