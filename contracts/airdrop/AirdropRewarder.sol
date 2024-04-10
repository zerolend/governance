// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AirdropRewarder is Initializable, OwnableUpgradeable {
    using SafeERC20 for ERC20Upgradeable;

    address public safeAddress;
    bytes32 private merkleRoot;

    ERC20Upgradeable public rewardToken;

    mapping(address => bool) public rewardsClaimed;

    error InvalidAddress();
    error RewardsAlreadyClaimed();
    error InvalidMerkleProof(bytes32[]);

    event MerkleRootSet(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);
    event RewardTokenSet(address oldRewardToken, address newRewardToken);
    event SafeAddressSet(address _safeAddress);
    event RewardsClaimed(address _user, uint256 _rewardsAmount);
    event RewardTerminated(address _rewardAddress);

    function initialize(
        address _safeAddress,
        bytes32 _merkleRoot,
        address _rewardToken
    ) external initializer {
        __Ownable_init(msg.sender);
        safeAddress = _safeAddress;
        merkleRoot = _merkleRoot;
        rewardToken = ERC20Upgradeable(_rewardToken);
        emit SafeAddressSet(_safeAddress);
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        emit MerkleRootSet(_merkleRoot, merkleRoot);
        merkleRoot = _merkleRoot;
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        if (_rewardToken == address(0)) revert InvalidAddress();
        emit RewardTokenSet(_rewardToken, address(rewardToken));
        rewardToken = ERC20Upgradeable(_rewardToken);
    }

    function claim(
        address _user,
        uint256 _claimAmount,
        bytes32[] calldata _merkleProofs
    ) external {
        if (_user == address(0)) revert InvalidAddress();

        bytes32 node = keccak256(abi.encodePacked(_user, _claimAmount));

        if (!MerkleProof.verify(_merkleProofs, merkleRoot, node))
            revert InvalidMerkleProof(_merkleProofs);

        if (rewardsClaimed[_user]) revert RewardsAlreadyClaimed();
        
        rewardsClaimed[_user] = true;
        rewardToken.safeTransfer(_user, _claimAmount);
        
        emit RewardsClaimed(_user, _claimAmount);
    }

    function setSafeAddress(address _safeAddress) external onlyOwner {
        safeAddress = _safeAddress;
        emit SafeAddressSet(_safeAddress);
    }

    function terminateReward(address _rewardAddress) public onlyOwner {
        if (_rewardAddress == address(0)) revert InvalidAddress();

        rewardToken.safeTransfer(
            safeAddress,
            ERC20Upgradeable(_rewardAddress).balanceOf(address(this))
        );
        emit RewardTerminated(_rewardAddress);
    }
}
