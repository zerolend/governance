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

    mapping(address => bytes32) private merkleRoots;
    mapping(address => mapping(address => uint256)) private totalRewardsClaimed;

    error InvalidAddress();
    error InvalidMerkleProof(bytes32[]);

    event MerkleRootSetForToken(bytes32 _merkleRoot, address _rewardToken);
    event SafeAddressSet(address _safeAddress);
    event RewardsClaimed(
        address _user,
        address _rewardsToken,
        uint256 _rewardsAmount
    );
    event RewardTerminated(address _rewardAddress);

    function initialize(address _safeAddress) external initializer {
        __Ownable_init(msg.sender);
        safeAddress = _safeAddress;
        emit SafeAddressSet(_safeAddress);
    }

    function setMerkleRoot(
        bytes32 _merkleRoot,
        address _rewardToken
    ) external onlyOwner {
        merkleRoots[_rewardToken] = _merkleRoot;
        emit MerkleRootSetForToken(_merkleRoot, _rewardToken);
    }

    function claim(
        address _user,
        address rewardToken,
        uint256 _totalClaimableAmount,
        bytes32[] calldata _merkleProofs
    ) external {
        uint256 totalClaimableAmount = _totalClaimableAmount;
        address rewardAddress = rewardToken;
        if (rewardAddress == address(0)) revert InvalidAddress();

        bytes32 node = keccak256(abi.encodePacked(_user, totalClaimableAmount));
        if (
            !MerkleProof.verify(_merkleProofs, merkleRoots[rewardAddress], node)
        ) revert InvalidMerkleProof(_merkleProofs);
        uint256 claimableAmount = totalClaimableAmount -
            totalRewardsClaimed[_user][rewardAddress];

        if (claimableAmount > 0) {
            totalRewardsClaimed[_user][rewardAddress] = totalClaimableAmount;
            ERC20Upgradeable(rewardAddress).safeTransfer(
                _user,
                claimableAmount
            );
        }
        emit RewardsClaimed(_user, rewardToken, _totalClaimableAmount);
    }

    function setSafeAddress(address _safeAddress) external onlyOwner {
        safeAddress = _safeAddress;
        emit SafeAddressSet(_safeAddress);
    }

    function terminateReward(address _rewardAddress) public onlyOwner {
        if (_rewardAddress == address(0)) revert InvalidAddress();

        ERC20Upgradeable(_rewardAddress).safeTransfer(
            safeAddress,
            ERC20Upgradeable(_rewardAddress).balanceOf(address(this))
        );
        emit RewardTerminated(_rewardAddress);
    }

    function getAmountsClaimedForUser(
        address _user,
        address[] calldata _rewardToken
    ) external view returns (uint256[] memory) {
        uint256 length = _rewardToken.length;
        uint256[] memory amountsClaimed = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            amountsClaimed[i] = totalRewardsClaimed[_user][_rewardToken[i]];
        }
        return amountsClaimed;
    }
}
