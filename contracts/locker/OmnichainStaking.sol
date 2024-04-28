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

import {OApp} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {Votes} from "@openzeppelin/contracts/governance/utils/Votes.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";
import {ILocker} from "../interfaces/ILocker.sol";
import {IZeroLend} from "../interfaces/IZeroLend.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// An omni-chain staking contract that allows users to stake their veNFT
// and get some voting power. Once staked the voting power is available cross-chain.
contract OmnichainStaking is IOmnichainStaking, ERC20VotesUpgradeable, ReentrancyGuard {
    ILocker public lpLocker;
    ILocker public tokenLocker;
    IZeroLend public rewardsToken;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public rewardsDuration = 7 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(uint256 => uint256) public lpPower;
    mapping(uint256 => uint256) public tokenPower;
    mapping(uint256 => address) public lockedBy;
    mapping(address => uint256[]) public lockedNfts;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    error InvalidUnstaker(address, address);

    event RewardPaid(address indexed user, uint256 reward);

    // constructor() {
    //     _disableInitializers();
    // }

    function init(
        address, // LZ endpoint
        address _tokenLocker,
        address _lpLocker
    ) external initializer {
        // TODO add LZ
        __ERC20Votes_init();
        __ERC20_init("ZERO Voting Power", "ZEROvp");

        tokenLocker = ILocker(_tokenLocker);
        lpLocker = ILocker(_lpLocker);
    }

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
            _mint(from, lpPower[tokenId] * 4);
        }
        // if the stake is from a regular token locker, then give 1 times the voting power
        else if (msg.sender == address(tokenLocker)) {
            tokenPower[tokenId] = tokenLocker.balanceOfNFT(tokenId);
            _mint(from, tokenPower[tokenId]);
        } else require(false, "invalid operator");
        updateRewardFor(from);
        return this.onERC721Received.selector;
    }

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

    function unstakeLP(uint256 tokenId) updateReward(msg.sender) external {
        address lockedBy_ = lockedBy[tokenId];
        if (_msgSender() != lockedBy_)
            revert InvalidUnstaker(_msgSender(), lockedBy_);
        delete lockedBy[tokenId];
        lockedNfts[_msgSender()] = deleteAnElement(
            lockedNfts[_msgSender()],
            tokenId
        );
        _burn(msg.sender, lpPower[tokenId] * 4);
        lpLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function unstakeToken(uint256 tokenId) updateReward(msg.sender) external {
        address lockedBy_ = lockedBy[tokenId];
        if (_msgSender() != lockedBy_)
            revert InvalidUnstaker(_msgSender(), lockedBy_);
        delete lockedBy[tokenId];
        lockedNfts[_msgSender()] = deleteAnElement(
            lockedNfts[_msgSender()],
            tokenId
        );
        _burn(msg.sender, tokenPower[tokenId]);
        tokenLocker.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function updatePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // ensure that the user has no votes anywhere and no delegation then send voting
        // power to another chain.
        // using layerzero, sends the updated voting power across the different chains
    }

    function deletePowerOnChain(uint256 chainId, uint256 nftId) external {
        // TODO
        // using layerzero, deletes the updated voting power across the different chains
    }

    function updateSupplyToMainnetViaLZ() external {
        // TODO
        // send the veStaked supply to the mainnet
    }

    function updateSupplyFromLZ() external {
        // TODO
        // receive the veStaked supply on the mainnet
    }

    function earned(address account) public view returns (uint256) {
        return
            (balanceOf(account) *
                (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18 +
            rewards[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            ((lastTimeRewardApplicable() - lastUpdateTime) *
                rewardRate *
                1e18) /
            totalSupply();
    }

    function transfer(address, uint256) public pure override returns (bool) {
        // don't allow users to transfer voting power. voting power can only
        // be minted or burnt and act like SBTs
        require(false, "transfer disabled");
        return false;
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        // don't allow users to transfer voting power. voting power can only
        // be minted or burnt and act like SBTs
        require(false, "transferFrom disabled");
        return false;
    }

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

    function updateRewardFor(address account) public {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
}
