// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IVestedZeroNFT is IERC721 {
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
    }

    function mint(
        address who,
        uint256 pending,
        uint256 upfront,
        uint256 linearDuration,
        uint256 cliffDuration,
        uint256 unlockDate,
        bool hasPenalty
    ) external;

    function togglePause() external;

    function freeze(uint256 tokenId, bool what) external;

    /// Used by an admin to bulk update the cliff duration and linear distribution for a vest
    /// @param tokenIds the nfts to update
    /// @param linearDurations the linear duration to update with
    /// @param cliffDurations the cliff duration to update with
    function updateCliffDuration(
        uint256[] memory tokenIds,
        uint256[] memory linearDurations,
        uint256[] memory cliffDurations
    ) external;

    /// How much ZERO tokens this vesting nft can claim
    /// @param tokenId the id of the nft contract
    /// @return upfront how much tokens upfront this nft can claim
    /// @return pending how much tokens in the linear vesting (after the cliff) this nft can claim
    function claimable(
        uint256 tokenId
    ) external view returns (uint256 upfront, uint256 pending);

    /// Executes a claim of tokens for a given nft
    /// @param id the nft id to claim tokens for
    function claim(uint256 id) external returns (uint256 toClaim);

    /// How much tokens have been claiemd so far
    /// @param tokenId the nft id
    function claimed(uint256 tokenId) external view returns (uint256);

    /// How much tokens have been claiemd so far
    /// @param tokenId the nft id
    function pending(uint256 tokenId) external view returns (uint256);

    /// Splits a vesting NFT into smaller vests so that it can be easily traded
    /// @param tokenId The nft to split for
    /// @param fraction By how much bps the split should happen (10000 bps = 100%)
    function split(uint256 tokenId, uint256 fraction) external;

    /// In case the a nft gets sold in the OTC market, would be great if the team could
    /// claim fees against the vested tokens
    /// @param salePrice The price the asset is going to be sold for
    /// @return royaltyReceiver The address that will receive the royalties
    /// @return royaltyAmount The royalty amount
    function royaltyInfo(
        uint256,
        uint256 salePrice
    ) external view returns (address, uint256);

    /// Claim unvested tokens by the bonus staking contract
    /// @param tokenId The nft id
    function claimUnvested(uint256 tokenId) external;

    /// Metadata helper for nft platforms like openzea
    /// @param tokenId The nft id
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
