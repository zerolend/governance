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

import {IPrivateZERO} from "../../interfaces/IPrivateZERO.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165, ERC721Upgradeable, ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PrivateZERO is
    IPrivateZERO,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    ERC721EnumerableUpgradeable
{
    IERC20 public zero;
    uint256 public lastTokenId;
    uint256 public denominator;
    address public royaltyReceiver;
    uint256 public royaltyFraction;
    address public stakingBonus;

    mapping(uint256 => LockDetails) public tokenIdToLockDetails;
    mapping(uint256 => bool) public frozen;

    function init(address _zero, address _stakingBonus) external initializer {
        __ERC721_init("Private Sale ZeroLend Vest", "pZERO");
        __ERC721Enumerable_init();
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        zero = IERC20(_zero);
        royaltyFraction = 100;
        denominator = 10000;
        stakingBonus = _stakingBonus;
        royaltyReceiver = msg.sender;
    }

    function mint(
        address who,
        uint256 pending,
        uint256 upfront,
        uint256 linearDuration,
        uint256 cliffDuration,
        uint256 unlockDate
    ) external onlyOwner {
        _mint(who, ++lastTokenId);
        tokenIdToLockDetails[lastTokenId] = LockDetails({
            cliffDuration: cliffDuration,
            unlockDate: unlockDate,
            pendingClaimed: 0,
            upfrontClaimed: 0,
            pending: pending,
            upfront: upfront,
            linearDuration: linearDuration,
            createdAt: block.timestamp
        });
    }

    /// @inheritdoc IPrivateZERO
    function togglePause() external onlyOwner {
        if (paused()) _unpause();
        else _pause();
    }

    /// @inheritdoc IPrivateZERO
    function freeze(uint256 tokenId, bool what) external onlyOwner {
        frozen[tokenId] = what;
    }

    /// @inheritdoc IPrivateZERO
    function updateCliffDuration(
        uint256[] memory tokenIds,
        uint256[] memory linearDurations,
        uint256[] memory cliffDurations
    ) external onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            LockDetails memory lock = tokenIdToLockDetails[tokenIds[i]];
            lock.cliffDuration = cliffDurations[i];
            lock.linearDuration = linearDurations[i];
            tokenIdToLockDetails[tokenIds[i]] = lock;
        }
    }

    /// How much ZERO tokens this vesting nft can claim
    /// @param tokenId the id of the nft contract
    /// @return upfront how much tokens upfront this nft can claim
    /// @return pending how much tokens in the linear vesting (after the cliff) this nft can claim
    function claimable(
        uint256 tokenId
    ) public view returns (uint256 upfront, uint256 pending) {
        LockDetails memory lock = tokenIdToLockDetails[tokenId];
        if (block.timestamp < lock.unlockDate) return (0, 0);

        // if after the unlock date and before the cliff
        if (
            block.timestamp > lock.unlockDate &&
            block.timestamp < lock.unlockDate + lock.cliffDuration
        ) return (lock.upfront, 0);

        if (
            block.timestamp >
            lock.unlockDate + lock.cliffDuration + lock.linearDuration
        ) return (lock.upfront, lock.pending);

        uint256 pct = ((block.timestamp -
            (lock.unlockDate + lock.cliffDuration)) * denominator) /
            lock.linearDuration;

        return (lock.upfront, ((lock.pending * pct) / denominator));
    }

    /// @inheritdoc IPrivateZERO
    function claim(
        uint256 id
    ) public nonReentrant whenNotPaused returns (uint256 toClaim) {
        _requireOwned(id);
        require(!frozen[id], "frozen");

        (uint256 _claimableUpfront, uint256 _claimablePending) = claimable(id);
        LockDetails memory lock = tokenIdToLockDetails[id];

        if (_claimableUpfront > 0 && lock.upfrontClaimed == 0) {
            toClaim += _claimableUpfront;
            lock.upfrontClaimed = _claimableUpfront;
        }

        if (_claimablePending > 0 && lock.pendingClaimed >= 0) {
            toClaim += _claimablePending - lock.pendingClaimed;
            lock.pendingClaimed = _claimablePending - lock.pendingClaimed;
        }

        tokenIdToLockDetails[id] = lock;

        if (toClaim > 0) zero.transfer(msg.sender, toClaim);
    }

    /// @inheritdoc IPrivateZERO
    function claimed(uint256 tokenId) public view returns (uint256) {
        LockDetails memory lock = tokenIdToLockDetails[tokenId];
        return lock.upfrontClaimed + lock.pendingClaimed;
    }

    /// @inheritdoc IPrivateZERO
    function pending(uint256 tokenId) public view override returns (uint256) {
        LockDetails memory lock = tokenIdToLockDetails[tokenId];
        return
            lock.upfront +
            lock.pending -
            (lock.upfrontClaimed + lock.pendingClaimed);
    }

    function claimUnvested(uint256 tokenId) external {
        require(msg.sender == stakingBonus, "!stakingBonus");
        uint256 _pending = pending(tokenId);
        zero.transfer(msg.sender, _pending);
    }

    /// @inheritdoc IPrivateZERO
    function split(
        uint256 tokenId,
        uint256 fraction
    ) external whenNotPaused nonReentrant {
        _requireOwned(tokenId);
        require(fraction > 0 && fraction < denominator, "!fraction");
        require(!frozen[tokenId], "frozen");

        LockDetails memory lock = tokenIdToLockDetails[tokenId];

        uint256 splitPendingAmount = (lock.pending * fraction) / denominator;
        uint256 splitUpfrontAmount = (lock.upfront * fraction) / denominator;
        uint256 splitUnlockedPendingAmount = (lock.pendingClaimed * fraction) /
            denominator;
        uint256 splitUnlockedUpfrontAmount = (lock.upfrontClaimed * fraction) /
            denominator;

        tokenIdToLockDetails[tokenId] = LockDetails({
            cliffDuration: lock.cliffDuration,
            unlockDate: lock.unlockDate,
            createdAt: lock.createdAt,
            linearDuration: lock.linearDuration,
            pending: splitPendingAmount,
            pendingClaimed: splitUnlockedPendingAmount,
            upfrontClaimed: splitUnlockedUpfrontAmount,
            upfront: splitUpfrontAmount
        });

        _mint(msg.sender, ++lastTokenId);
        tokenIdToLockDetails[lastTokenId] = LockDetails({
            cliffDuration: lock.cliffDuration,
            unlockDate: lock.unlockDate,
            createdAt: block.timestamp,
            linearDuration: lock.linearDuration,
            pending: lock.pending - splitPendingAmount,
            pendingClaimed: lock.pendingClaimed - splitUnlockedPendingAmount,
            upfrontClaimed: lock.upfrontClaimed - splitUnlockedUpfrontAmount,
            upfront: lock.upfront - splitUpfrontAmount
        });
    }

    /// @inheritdoc IPrivateZERO
    function royaltyInfo(
        uint256,
        uint256 salePrice
    ) public view virtual returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * royaltyFraction) / denominator;
        return (royaltyReceiver, royaltyAmount);
    }

    /// @inheritdoc IPrivateZERO
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, IPrivateZERO)
        returns (string memory)
    {
        string memory base = "";
        return string.concat(base, "tokenId");
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        require(!frozen[tokenId], "frozen");
        _requireNotPaused();
        return super._update(to, tokenId, auth);
    }
}
