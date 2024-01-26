// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IStreamedVesting {
    struct VestInfo {
        address who;
        uint256 id;
        uint256 amount;
        uint256 claimed;
        uint256 startAt;
    }

    event PenaltyCharged(
        address indexed who,
        uint256 vestId,
        uint256 amt,
        uint256 ptc
    );
    event TokensReleased(address indexed who, uint256 vestId, uint256 amount);
    event VestingCreated(
        address indexed who,
        uint256 vestId,
        uint256 amount,
        uint256 timestamp
    );

    function createVest(uint256 amount) external;

    function createVestFor(address who, uint256 amount) external;

    function stakeTo4Year(uint256 id) external;

    function claimVest(uint256 id) external;

    function claimVestEarlyWithPenalty(uint256 id) external;

    function vestStatus(
        address who,
        uint256 index
    )
        external
        view
        returns (
            uint256 id,
            uint256 amount,
            uint256 claimed,
            uint256 claimable,
            uint256 penalty,
            uint256 claimableWithPenalty
        );

    function vestIds(address who) external view returns (uint256[] memory ids);
}
