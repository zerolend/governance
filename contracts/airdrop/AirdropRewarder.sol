// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IZeroLocker} from "../interfaces/IZeroLocker.sol";
import {IVestedZeroNFT} from "../interfaces/IVestedZeroNFT.sol";

contract AirdropRewarder is Initializable, OwnableUpgradeable {
    using SafeERC20 for ERC20Upgradeable;

    bytes32 private merkleRoot;

    mapping(address => bool) public rewardsClaimed;

    ERC20Upgradeable public rewardToken;
    IZeroLocker public locker;
    IVestedZeroNFT public vestedZeroNFT;

    error InvalidAddress();
    error InvalidLockDuration();
    error RewardsAlreadyClaimed();
    error InvalidMerkleProof(bytes32[]);

    event MerkleRootSet(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);
    event RewardTokenSet(address oldRewardToken, address newRewardToken);
    event LockerSet(address oldLocker, address newLocker);
    event RewardsClaimed(address _user, uint256 _rewardsAmount);
    event RewardsLocked(address _user, uint256 _lockAmount);
    event RewardsVested(address _user, uint256 _lockAmount);
    event RewardsTransferred(address _user, uint256 _transferAmount);
    event RewardTerminated();

    function initialize(
        address _rewardToken,
        address _locker,
        address _vestedZeroNFT
    ) external initializer {
        __Ownable_init(msg.sender);
        locker = IZeroLocker(_locker);
        vestedZeroNFT = IVestedZeroNFT(_vestedZeroNFT);
        rewardToken = ERC20Upgradeable(_rewardToken);
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        emit MerkleRootSet(_merkleRoot, merkleRoot);
        merkleRoot = _merkleRoot;
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        if (_rewardToken == address(0)) revert InvalidAddress();
        emit RewardTokenSet(address(rewardToken), _rewardToken);
        rewardToken = ERC20Upgradeable(_rewardToken);
    }

    function setLocker(address _locker) external onlyOwner {
        if (_locker == address(0)) revert InvalidAddress();
        emit LockerSet(address(locker), _locker);

        locker = IZeroLocker(_locker);
    }

    function setVestedZeroNFT(address _locker) external onlyOwner {
        if (_locker == address(0)) revert InvalidAddress();
        emit LockerSet(address(locker), _locker);

        locker = IZeroLocker(_locker);
    }

    function claim(
        address _user,
        uint256 _claimAmount,
        bytes32[] calldata _merkleProofs,
        bool _lockAndStake,
        uint256 lockUntil
    ) external {
        if (_user == address(0)) revert InvalidAddress();

        bytes32 node = keccak256(abi.encodePacked(_user, _claimAmount));

        if (!MerkleProof.verify(_merkleProofs, merkleRoot, node))
            revert InvalidMerkleProof(_merkleProofs);

        if (rewardsClaimed[_user]) revert RewardsAlreadyClaimed();

        rewardsClaimed[_user] = true;
        uint256 transferAmount = (_claimAmount * 40) / 100;
        rewardToken.safeTransfer(_user, transferAmount);
        emit RewardsTransferred(_user, transferAmount);

        uint256 remainingAmount = _claimAmount - transferAmount;
        if (_lockAndStake) {
            if (lockUntil < 365 days)
            revert InvalidLockDuration();
            rewardToken.approve(address(locker), remainingAmount);
            locker.createLockFor(
                remainingAmount,
                lockUntil,
                _user,
                _lockAndStake
            );
            emit RewardsLocked(_user, remainingAmount);
        } else {
            rewardToken.approve(address(vestedZeroNFT), remainingAmount);
            vestedZeroNFT.mint(
                _user,
                remainingAmount,
                0,
                91 days,
                182 days,
                block.timestamp + 90 days,
                false,
                IVestedZeroNFT.VestCategory.AIRDROP
            );
            emit RewardsVested(_user, remainingAmount);
        }
        emit RewardsClaimed(_user, _claimAmount);
    }

    function adminWithdrawal() public onlyOwner {
        rewardToken.safeTransfer(
            _msgSender(),
            rewardToken.balanceOf(address(this))
        );
        emit RewardTerminated();
    }
}
