// SPDX-License-Identifier: UNLICENSED
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

import {VestedZeroNFT} from "../vesting/VestedZeroNFT.sol";
import {OmnichainStakingToken} from "../locker/staking/OmnichainStakingToken.sol";
import {OmnichainStakingLP} from "../locker/staking/OmnichainStakingLP.sol";
import {ILocker} from "../interfaces/ILocker.sol";

/// @title VestedZeroNFT is a NFT based contract to hold all the user vests
contract VestedZeroUiHelper {
    VestedZeroNFT vestedZero;
    OmnichainStakingToken omnichainStakingToken;
    OmnichainStakingLP omnichainStakingLP;

    struct VestDetails {
        uint256 id;
        uint256 cliffDuration;
        uint256 unlockDate;
        uint256 pendingClaimed;
        uint256 pending;
        uint256 upfrontClaimed;
        uint256 upfront;
        uint256 linearDuration;
        uint256 createdAt;
        bool hasPenalty;
        VestedZeroNFT.VestCategory category;
        uint256 claimable;
        uint256 unClaimed;
        uint256 penalty;
        bool isFrozen;
    }

    struct LockedBalanceWithApr {
        uint256 id;
        uint256 amount;
        uint256 end;
        uint256 start;
        uint256 power;
        uint256 apr;
    }

    function initialize(
        address _vestedZeroNFT,
        address _omnichainStakingToken,
        address _omnichainStakingLP
    ) external {
        vestedZero = VestedZeroNFT(_vestedZeroNFT);
        omnichainStakingToken = OmnichainStakingToken(_omnichainStakingToken);
        omnichainStakingLP = OmnichainStakingLP(_omnichainStakingLP);
    }

    function getVestedNFTData(
        address _userAddress
    ) external view returns (VestDetails[] memory) {
        uint256 nftsOwned = vestedZero.balanceOf(_userAddress);
        VestDetails[] memory lockDetails = new VestDetails[](nftsOwned);
        for (uint i; i < nftsOwned; ) {
            VestDetails memory lock;
            uint256 tokenId = vestedZero.tokenOfOwnerByIndex(_userAddress, i);
            (
                lock.cliffDuration,
                lock.unlockDate,
                lock.pendingClaimed,
                lock.pending,
                lock.upfrontClaimed,
                ,
                ,
                ,
                ,

            ) = vestedZero.tokenIdToLockDetails(tokenId);
            (
                ,
                ,
                ,
                ,
                ,
                lock.upfront,
                lock.linearDuration,
                lock.createdAt,
                lock.hasPenalty,
                lock.category
            ) = vestedZero.tokenIdToLockDetails(tokenId);

            (uint256 upfrontClaimable, uint256 pendingClaimable) = vestedZero
                .claimable(tokenId);

            lock.id = tokenId;
            lock.penalty = vestedZero.penalty(tokenId);
            lock.claimable =
                upfrontClaimable +
                pendingClaimable -
                (lock.upfrontClaimed + lock.pendingClaimed);
            lock.unClaimed = vestedZero.unclaimed(tokenId);
            lock.isFrozen = vestedZero.frozen(tokenId);

            lockDetails[i] = lock;

            unchecked {
                ++i;
            }
        }

        return lockDetails;
    }

    function getLockDetails(
        address _userAddress
    ) external view returns (LockedBalanceWithApr[] memory) {
        (
            uint256[] memory tokenIds,
            ILocker.LockedBalance[] memory lockedBalances
        ) = omnichainStakingToken.getLockedNftDetails(_userAddress);

        uint256 rewardRate = omnichainStakingToken.rewardRate();
        uint256 totalSupply = omnichainStakingToken.totalSupply();

        uint256 totalTokenIds = tokenIds.length;
        LockedBalanceWithApr[] memory lockDetails = new LockedBalanceWithApr[](
            totalTokenIds
        );

        for (uint i; i < totalTokenIds; ) {
            LockedBalanceWithApr memory lock;
            ILocker.LockedBalance memory lockedBalance = lockedBalances[i];

            uint256 vePower = omnichainStakingToken.getTokenPower(lockedBalance.amount);
            uint256 scale = (vePower != 0 && lockedBalance.amount != 0)
                ? (vePower * 1e18) / lockedBalance.amount
                : 1e18;
            uint256 poolRewardAnnual = rewardRate * 31536000;
            uint256 apr = (poolRewardAnnual * 1000) / totalSupply;
            uint256 aprScaled = (apr * scale) / 1000;

            lock.id = tokenIds[i];
            lock.amount = lockedBalance.amount;
            lock.start = lockedBalance.start;
            lock.end = lockedBalance.end;
            lock.power = lockedBalance.power;
            lock.apr = aprScaled;

            lockDetails[i] = lock;

            unchecked {
                ++i;
            }
        }

        return lockDetails;
    }

    function getLPLockDetails(
        address _userAddress
    ) external view returns (LockedBalanceWithApr[] memory) {
        (
            uint256[] memory tokenIds,
            ILocker.LockedBalance[] memory lockedBalances
        ) = omnichainStakingLP.getLockedNftDetails(_userAddress);

        uint256 rewardRate = omnichainStakingLP.rewardRate();
        uint256 totalSupply = omnichainStakingLP.totalSupply();

        uint256 totalTokenIds = tokenIds.length;
        LockedBalanceWithApr[] memory lockDetails = new LockedBalanceWithApr[](
            totalTokenIds
        );

        for (uint i; i < totalTokenIds; ) {
            LockedBalanceWithApr memory lock;
            ILocker.LockedBalance memory lockedBalance = lockedBalances[i];

            uint256 vePower = omnichainStakingLP.getTokenPower(lockedBalance.amount);
            uint256 scale = (vePower != 0 && lockedBalance.amount != 0)
                ? (vePower * 1e18) / lockedBalance.amount
                : 1e18;
            uint256 poolRewardAnnual = rewardRate * 31536000;
            uint256 apr = (poolRewardAnnual * 1000) / totalSupply;
            uint256 aprScaled = (apr * scale) / 1000;

            lock.id = tokenIds[i];
            lock.amount = lockedBalance.amount;
            lock.start = lockedBalance.start;
            lock.end = lockedBalance.end;
            lock.power = lockedBalance.power;
            lock.apr = aprScaled;

            lockDetails[i] = lock;

            unchecked {
                ++i;
            }
        }

        return lockDetails;
    }
}
