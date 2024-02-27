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

import {IVestedZeroNFT} from "../interfaces/IVestedZeroNFT.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165, ERC721Upgradeable, ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

import "hardhat/console.sol";

/// @title VestedZeroNFT is a NFT based contract to hold all the user vests
/// @author Deadshot Ryker <ryker@zerolend.xyz>
/// @notice NFTs can be traded on secondary marketplaces like Opensea, can be split into smaller chunks to allow for smaller otc deals to happen in secondary markets
contract VestedZeroNFT is
    IVestedZeroNFT,
    AccessControlEnumerableUpgradeable,
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

    bytes32 public MINTER_ROLE;

    function init(address _zero, address _stakingBonus) external initializer {
        __ERC721_init("ZeroLend Vest", "ZEROv");
        __ERC721Enumerable_init();
        __AccessControlEnumerable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        zero = IERC20(_zero);
        royaltyFraction = 100;
        denominator = 10000;
        stakingBonus = _stakingBonus;
        royaltyReceiver = msg.sender;

        MINTER_ROLE = keccak256("MINTER_ROLE");

        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @inheritdoc IVestedZeroNFT
    function mint(
        address _who,
        uint256 _pending,
        uint256 _upfront,
        uint256 _linearDuration,
        uint256 _cliffDuration,
        uint256 _unlockDate,
        bool _hasPenalty,
        VestCategory _category
    ) external onlyRole(MINTER_ROLE) {
        _mint(_who, ++lastTokenId);
        require(_unlockDate >= block.timestamp, "invalid _unlockDate");

        if (_hasPenalty) {
            require(_upfront == 0, "no upfront when there is a penalty");
            require(_cliffDuration == 0, "no cliff when there is a penalty");
        }

        tokenIdToLockDetails[lastTokenId] = LockDetails({
            cliffDuration: _cliffDuration,
            unlockDate: _unlockDate,
            pendingClaimed: 0,
            upfrontClaimed: 0,
            pending: _pending,
            hasPenalty: _hasPenalty,
            upfront: _upfront,
            linearDuration: _linearDuration,
            createdAt: block.timestamp,
            category: _category
        });
    }

    /// @inheritdoc IVestedZeroNFT
    function togglePause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (paused()) _unpause();
        else _pause();
    }

    /// @inheritdoc IVestedZeroNFT
    function freeze(
        uint256 tokenId,
        bool what
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozen[tokenId] = what;
    }

    /// @inheritdoc IVestedZeroNFT
    function updateCliffDuration(
        uint256[] memory tokenIds,
        uint256[] memory linearDurations,
        uint256[] memory cliffDurations
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i = 0; i < tokenIds.length; i++) {
            LockDetails memory lock = tokenIdToLockDetails[tokenIds[i]];
            lock.cliffDuration = cliffDurations[i];
            lock.linearDuration = linearDurations[i];
            tokenIdToLockDetails[tokenIds[i]] = lock;
        }
    }

    /// How much ZERO tokens this vesting nft can claim
    /// @param _tokenId the id of the nft contract
    /// @return upfront how much tokens upfront this nft can claim
    /// @return pending how much tokens in the linear vesting (after the cliff) this nft can claim
    function claimable(
        uint256 _tokenId
    ) public view returns (uint256 upfront, uint256 pending) {
        LockDetails memory lock = tokenIdToLockDetails[_tokenId];
        if (block.timestamp < lock.unlockDate) return (0, 0);

        // if after the unlock date and before the cliff
        if (
            block.timestamp >= lock.unlockDate &&
            block.timestamp < lock.unlockDate + lock.cliffDuration
        ) return (lock.upfront, 0);

        if (
            block.timestamp >=
            lock.unlockDate + lock.cliffDuration + lock.linearDuration
        ) return (lock.upfront, lock.pending);

        uint256 pct = ((block.timestamp -
            (lock.unlockDate + lock.cliffDuration)) * denominator) /
            lock.linearDuration;

        return (lock.upfront, ((lock.pending * pct) / denominator));
    }

    /// @inheritdoc IVestedZeroNFT
    function claim(
        uint256 id
    ) public nonReentrant whenNotPaused returns (uint256 toClaim) {
        require(!frozen[id], "frozen");

        (uint256 _claimableUpfront, uint256 _claimablePending) = claimable(id);
        LockDetails memory lock = tokenIdToLockDetails[id];

        if (lock.hasPenalty) {
            // handle vesting with penalties enabled
        } else {
            // handle vesting without penalties
        }

        if (_claimableUpfront > 0 && lock.upfrontClaimed == 0) {
            toClaim += _claimableUpfront;
            lock.upfrontClaimed = _claimableUpfront;
        }

        if (_claimablePending > 0 && lock.pendingClaimed >= 0) {
            toClaim += _claimablePending - lock.pendingClaimed;
            lock.pendingClaimed = _claimablePending - lock.pendingClaimed;
        }

        tokenIdToLockDetails[id] = lock;

        if (toClaim > 0) zero.transfer(ownerOf(id), toClaim);
    }

    /// @inheritdoc IVestedZeroNFT
    function claimed(uint256 tokenId) public view returns (uint256) {
        LockDetails memory lock = tokenIdToLockDetails[tokenId];
        return lock.upfrontClaimed + lock.pendingClaimed;
    }

    /// @inheritdoc IVestedZeroNFT
    function unclaimed(uint256 tokenId) public view override returns (uint256) {
        LockDetails memory lock = tokenIdToLockDetails[tokenId];
        return
            lock.upfront +
            lock.pending -
            (lock.upfrontClaimed + lock.pendingClaimed);
    }

    function claimUnvested(uint256 tokenId) external {
        require(msg.sender == stakingBonus, "!stakingBonus");
        uint256 _pending = unclaimed(tokenId);
        zero.transfer(msg.sender, _pending);
    }

    /// @inheritdoc IVestedZeroNFT
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
            upfront: splitUpfrontAmount,
            hasPenalty: lock.hasPenalty,
            category: lock.category
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
            upfront: lock.upfront - splitUpfrontAmount,
            hasPenalty: lock.hasPenalty,
            category: lock.category
        });
    }

    /// @inheritdoc IVestedZeroNFT
    function royaltyInfo(
        uint256,
        uint256 salePrice
    ) public view virtual returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * royaltyFraction) / denominator;
        return (royaltyReceiver, royaltyAmount);
    }

    /// @inheritdoc IVestedZeroNFT
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, IVestedZeroNFT)
        returns (string memory)
    {
        string memory base = "";
        return string.concat(base, "tokenId");
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(
            AccessControlEnumerableUpgradeable,
            ERC721EnumerableUpgradeable,
            IERC165
        )
        returns (bool)
    {
        return
            AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) ||
            ERC721EnumerableUpgradeable.supportsInterface(interfaceId);
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
