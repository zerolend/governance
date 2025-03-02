// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IVestedZeroNFT} from "contracts/interfaces/IVestedZeroNFT.sol";

contract AirdropRewarderS2 is Initializable, OwnableUpgradeable {
    using SafeERC20 for ERC20Upgradeable;

    bytes32 private merkleRoot;

    mapping(address => bool) public rewardsClaimed;
    mapping(address => bool) public vestRewards;

    ERC20Upgradeable public rewardToken;

    IVestedZeroNFT public vestedZeroNFT;
    uint256 public unlockDate;
    uint256 public endDate;
    bool public paused;

    error InvalidAddress();
    error InvalidLockDuration();
    error RewardsAlreadyClaimed();
    error ClaimNotReady();
    error ClaimDurationOver();
    error InvalidMerkleProof(bytes32[]);

    event MerkleRootSet(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);
    event RewardTokenSet(address oldRewardToken, address newRewardToken);
    event LockerSet(address oldLocker, address newLocker);
    event RewardsClaimed(address _user, uint256 _rewardsAmount);

    event RewardsVested(address _user, uint256 _lockAmount);
    event RewardsTransferred(address _user, uint256 _transferAmount);
    event RewardTerminated();

    modifier whenNotPaused() {
        require(!paused, "AirdropRewarder: Claims are paused");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _rewardToken,
        address _vestedZeroNFT,
        uint256 _unlockDate,
        uint256 _endDate,
        address _owner,
        address[] memory vestRewardsForUsers
    ) external initializer {
        __Ownable_init(_owner);
        unlockDate = _unlockDate;
        endDate = _endDate;
        vestedZeroNFT = IVestedZeroNFT(_vestedZeroNFT);
        rewardToken = ERC20Upgradeable(_rewardToken);

        for (uint256 i = 0; i < vestRewardsForUsers.length; i++) {
            vestRewards[vestRewardsForUsers[i]] = true;
        }
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        emit MerkleRootSet(_merkleRoot, merkleRoot);
        merkleRoot = _merkleRoot;
    }

    function setVestForUsers(address[] memory _user, bool _vest) external onlyOwner {
        for (uint256 i = 0; i < _user.length; i++) {
            vestRewards[_user[i]] = _vest;
        }
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        if (_rewardToken == address(0)) revert InvalidAddress();
        emit RewardTokenSet(address(rewardToken), _rewardToken);
        rewardToken = ERC20Upgradeable(_rewardToken);
    }

    function setVestedZeroNFT(address _vestedZeroNFT) external onlyOwner {
        if (_vestedZeroNFT == address(0)) revert InvalidAddress();
        vestedZeroNFT = IVestedZeroNFT(_vestedZeroNFT);
    }

    function pauseClaims() external onlyOwner {
        paused = true;
    }

    function unpauseClaims() external onlyOwner {
        paused = false;
    }

    function claim(address _user, uint256 _claimAmount, bytes32[] calldata _merkleProofs) external whenNotPaused {
        if (_user == address(0)) revert InvalidAddress();
        if (block.timestamp < unlockDate) revert ClaimNotReady();
        if (block.timestamp > endDate) revert ClaimDurationOver();

        bytes32 node = keccak256(abi.encodePacked(_user, _claimAmount));

        if (!MerkleProof.verify(_merkleProofs, merkleRoot, node)) {
            revert InvalidMerkleProof(_merkleProofs);
        }

        if (rewardsClaimed[_user]) revert RewardsAlreadyClaimed();

        rewardsClaimed[_user] = true;

        if (vestRewards[_user]) {
            rewardToken.approve(address(vestedZeroNFT), _claimAmount);
            vestedZeroNFT.mint(_user, _claimAmount, 0, 31 days, 0, 0, false, IVestedZeroNFT.VestCategory.AIRDROP);
            emit RewardsVested(_user, _claimAmount);
        } else {
            rewardToken.safeTransfer(_user, _claimAmount);
            emit RewardsTransferred(_user, _claimAmount);
        }

        emit RewardsClaimed(_user, _claimAmount);
    }

    function adminWithdrawal() public onlyOwner {
        rewardToken.safeTransfer(_msgSender(), rewardToken.balanceOf(address(this)));
        emit RewardTerminated();
    }
}
