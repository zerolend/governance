// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IVestedZeroNFT} from "../interfaces/IVestedZeroNFT.sol";

contract AirdropRewarder is Initializable, OwnableUpgradeable {
    using SafeERC20 for ERC20Upgradeable;

    bytes32 private merkleRoot;

    mapping(address => bool) public rewardsClaimed;

    ERC20Upgradeable public rewardToken;
    IVestedZeroNFT public vestedZeroNft;

    error InvalidAddress();
    error RewardsAlreadyClaimed();
    error InvalidMerkleProof(bytes32[]);

    event MerkleRootSet(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);
    event RewardTokenSet(address oldRewardToken, address newRewardToken);
    event VestedZeroNftSet(address oldRewardToken, address newRewardToken);
    event RewardsClaimed(address _user, uint256 _rewardsAmount);
    event RewardTerminated();

    function initialize(
        bytes32 _merkleRoot,
        address _rewardToken,
        address _vestedZeroNft
    ) external initializer {
        __Ownable_init(msg.sender);
        merkleRoot = _merkleRoot;
        vestedZeroNft = IVestedZeroNFT(_vestedZeroNft);
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
    
    function setVestedZeroNft(address _vestedZeroNft) external onlyOwner {
        if (_vestedZeroNft== address(0)) revert InvalidAddress();
        emit VestedZeroNftSet(address(vestedZeroNft), _vestedZeroNft);
        vestedZeroNft = IVestedZeroNFT(_vestedZeroNft);
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
        rewardToken.safeTransfer(_user, _claimAmount/2);
        vestedZeroNft.mint(
            _user,
            0,
            _claimAmount/2,
            91 days,
            182 days,
            90 days,
            false,
            IVestedZeroNFT.VestCategory.AIRDROP
        );
        
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
