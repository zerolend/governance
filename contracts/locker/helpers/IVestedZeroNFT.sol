// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

interface IVestedZeroNFT {

    enum VestCategory {
        PRIVATE_SALE,
        EARLY_ZERO,
        NORMAL,
        AIRDROP
    }

    struct LockDetails {
        uint256 cliffDuration;
        uint256 unlockDate;
        uint256 pendingClaimed;
        uint256 pending;
        uint256 upfrontClaimed;
        uint256 upfront;
        uint256 linearDuration;
        uint256 createdAt;
        bool hasPenalty;
        VestCategory category;
    }

    /// Helper to retrieve lockDetails corresponding to a tokenId
    /// @param tokenId The nft id
    function tokenIdToLockDetails(uint256 tokenId) external view returns (LockDetails memory);
}
