// SPDX-License-Identifier: AGPL-3.0-or-later
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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";
import {ILocker} from "../interfaces/ILocker.sol";
import {IPoolVoter} from "../interfaces/IPoolVoter.sol";
import {IZeroLend} from "../interfaces/IZeroLend.sol";
import {StakingRewards} from "./StakingRewards.sol";

/**
 * @title OmnichainStaking
 * @dev An omnichain staking contract that allows users to stake their veNFT
 * and get some voting power. Once staked, the voting power is available cross-chain.
 */
contract OmnichainStaking is IOmnichainStaking, StakingRewards {
    ILocker public lpLocker;
    ILocker public tokenLocker;
    IPoolVoter public poolVoter;

    mapping(uint256 => uint256) public lpPower;
    mapping(uint256 => uint256) public tokenPower;
    mapping(uint256 => address) public lockedBy;
    mapping(address => uint256[]) public lockedNfts;

    error InvalidUnstaker(address, address);

    /**
     * @dev Initializes the contract with the provided token lockers.
     * @param _tokenLocker The address of the token locker contract.
     * @param _lpLocker The address of the LP locker contract.
     */
    function init(
        address _tokenLocker,
        address _lpLocker,
        address _zeroToken,
        address _poolVoter,
        uint256 _rewardsDuration
    ) external initializer {
        // TODO add LZ

        __initStakingRewards(
            _rewardsDuration, // uint256 _rewardsDuration
            _zeroToken, // address _zeroToken,
            msg.sender, // address _owner,
            "ZERO Voting Power", // string memory _name,
            "ZEROvp" // string memory _symbol
        );

        tokenLocker = ILocker(_tokenLocker);
        lpLocker = ILocker(_lpLocker);
        poolVoter = IPoolVoter(_poolVoter);
    }

    /**
     * @dev Receives an ERC721 token from the lockers and grants voting power accordingly.
     * @param from The address sending the ERC721 token.
     * @param tokenId The ID of the ERC721 token.
     * @param data Additional data.
     * @return ERC721 onERC721Received selector.
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(
            msg.sender == address(lpLocker) ||
                msg.sender == address(tokenLocker),
            "only lockers"
        );

        if (data.length > 0) from = abi.decode(data, (address));
        lockedBy[tokenId] = from;
        lockedNfts[from].push(tokenId);

        // if the stake is from the LP locker, then give 4 times the voting power
        if (msg.sender == address(lpLocker)) {
            lpPower[tokenId] = lpLocker.balanceOfNFT(tokenId);
            _mintPower(from, lpPower[tokenId] * 4);
        }
        // if the stake is from a regular token locker, then give 1 times the voting power
        else if (msg.sender == address(tokenLocker)) {
            tokenPower[tokenId] = tokenLocker.balanceOfNFT(tokenId);
            _mintPower(from, tokenPower[tokenId]);
        } else require(false, "invalid operator");

        return this.onERC721Received.selector;
    }

    /**
     * @dev Gets the details of locked NFTs for a given user.
     * @param _user The address of the user.
     * @return lockedTokenIds The array of locked NFT IDs.
     * @return tokenDetails The array of locked NFT details.
     */
    function getLockedNftDetails(
        address _user
    ) external view returns (uint256[] memory, ILocker.LockedBalance[] memory) {
        uint256 tokenIdsLength = lockedNfts[_user].length;
        uint256[] memory lockedTokenIds = lockedNfts[_user];

        uint256[] memory tokenIds = new uint256[](tokenIdsLength);
        ILocker.LockedBalance[]
            memory tokenDetails = new ILocker.LockedBalance[](tokenIdsLength);

        for (uint256 i; i < tokenIdsLength; ) {
            tokenDetails[i] = tokenLocker.locked(lockedTokenIds[i]);
            tokenIds[i] = lockedTokenIds[i];

            unchecked {
                ++i;
            }
        }

        return (tokenIds, tokenDetails);
    }

    /**
     * @dev Unstakes an LP NFT and transfers it back to the user.
     * @param tokenId The ID of the LP NFT to unstake.
     */
    function unstakeLP(uint256 tokenId) external {
        address lockedBy_ = lockedBy[tokenId];
        if (_msgSender() != lockedBy_)
            revert InvalidUnstaker(_msgSender(), lockedBy_);

        delete lockedBy[tokenId];
        lockedNfts[_msgSender()] = deleteAnElement(
            lockedNfts[_msgSender()],
            tokenId
        );

        _burnPower(msg.sender, lpPower[tokenId] * 4);
        lpPower[tokenId] = 0;

        poolVoter.reset(msg.sender);
        lpLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /**
     * @dev Unstakes a regular token NFT and transfers it back to the user.
     * @param tokenId The ID of the regular token NFT to unstake.
     */
    function unstakeToken(uint256 tokenId) external {
        address lockedBy_ = lockedBy[tokenId];
        if (_msgSender() != lockedBy_)
            revert InvalidUnstaker(_msgSender(), lockedBy_);

        delete lockedBy[tokenId];
        lockedNfts[_msgSender()] = deleteAnElement(
            lockedNfts[_msgSender()],
            tokenId
        );

        _burnPower(msg.sender, tokenPower[tokenId]);
        tokenPower[tokenId] = 0;

        // TODO reset the user's votes in PoolVoter

        tokenLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /**
     * @dev Updates the voting power on a different chain.
     * @param chainId The ID of the chain to update the voting power on.
     * @param nftId The ID of the NFT for which voting power is being updated.
     */
    function updatePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // ensure that the user has no votes anywhere and no delegation then send voting
        // power to another chain.
        // using layerzero, sends the updated voting power across the different chains
    }

    /**
     * @dev Deletes the voting power on a different chain.
     * @param chainId The ID of the chain to delete the voting power on.
     * @param nftId The ID of the NFT for which voting power is being deleted.
     */
    function deletePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // using layerzero, deletes the updated voting power across the different chains
    }

    /**
     * @dev Updates the veStaked supply to the mainnet via LayerZero.
     */
    function updateSupplyToMainnetViaLZ() external {
        // TODO
        // send the veStaked supply to the mainnet
    }

    /**
     * @dev Updates the veStaked supply from the mainnet via LayerZero.
     */
    function updateSupplyFromLZ() external {
        // TODO
        // receive the veStaked supply on the mainnet
    }

    /**
     * @dev Prevents transfers of voting power.
     */
    function transfer(address, uint256) public pure override returns (bool) {
        revert("transfer disabled");
    }

    /**
     * @dev Prevents transfers of voting power.
     */
    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        revert("transferFrom disabled");
    }

    /**
     * @dev Deletes an element from an array.
     * @param elements The array to delete from.
     * @param element The element to delete.
     * @return The updated array.
     */
    function deleteAnElement(
        uint256[] memory elements,
        uint256 element
    ) internal pure returns (uint256[] memory) {
        uint256 length = elements.length;
        uint256 count;

        for (uint256 i = 0; i < length; i++) {
            if (elements[i] != element) {
                count++;
            }
        }

        uint256[] memory updatedArray = new uint256[](count);
        uint256 index;

        for (uint256 i = 0; i < length; i++) {
            if (elements[i] != element) {
                updatedArray[index] = elements[i];
                index++;
            }
        }

        return updatedArray;
    }
}
