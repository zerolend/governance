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

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

import {ILocker} from "../interfaces/ILocker.sol";
import {IPoolHelper} from "../interfaces/IPoolHelper.sol";
import {IERC20, IWETH} from "../interfaces/IWETH.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";
import {IERC165, ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

contract LockerLP is
    ILocker,
    ERC721EnumerableUpgradeable,
    AccessControlEnumerableUpgradeable
{
    /// @dev The staking contract where veZERO nfts are saved
    IOmnichainStaking public staking;
    IWETH public weth;
    IERC20 public zero;
    IPoolHelper public poolHelper;

    function init(
        IPoolHelper _poolHelper,
        IOmnichainStaking _staking,
        IWETH _weth,
        IERC20 _zero
    ) external initializer {
        __ERC721_init("Locked ZERO LP", "lpZERO");

        poolHelper = _poolHelper;
        staking = _staking;
        weth = _weth;
        zero = _zero;
    }

    /// @dev Interface identification is specified in ERC-165.
    /// @param _id Id of the interface
    function supportsInterface(
        bytes4 _id
    )
        public
        view
        override(
            AccessControlEnumerableUpgradeable,
            ERC721EnumerableUpgradeable,
            IERC165
        )
        returns (bool)
    {
        return
            AccessControlEnumerableUpgradeable.supportsInterface(_id) ||
            ERC721EnumerableUpgradeable.supportsInterface(_id);
    }

    function lockFor(
        address _who,
        address _zeroLP,
        address _zero,
        bool _stake
    ) external payable {
        // todo
    }

    function claimFees(
        address _who,
        address _zeroLP,
        address _zero,
        bool _stake
    ) external payable {
        // todo
    }

    function balanceOfNFT(
        uint256 _tokenId
    ) external pure override returns (uint256) {
        return 0;
    }

    function balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) external pure override returns (uint256) {
        return 0;
    }
}
