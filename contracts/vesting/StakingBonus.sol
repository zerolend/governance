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

import {IStakingBonus} from "../interfaces/IStakingBonus.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IVestedZeroNFT} from "../interfaces/IVestedZeroNFT.sol";
import {IERC20Burnable} from "../interfaces/IERC20Burnable.sol";
import {IERC2612} from "@openzeppelin/contracts/interfaces/IERC2612.sol";
import {IZeroLocker} from "../interfaces/IZeroLocker.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Staking bonus contract
/// @author Deadshot Ryker <ryker@zerolend.xyz>
/// @notice A contract that rewards users with tokens for converting their unvested/unclaimed tokens into a 4 year stake
contract StakingBonus is OwnableUpgradeable, IStakingBonus {
    IERC20 public zero;
    IVestedZeroNFT public vestedZERO;
    IZeroLocker public locker;
    uint256 public bonusBps;

    // constructor() {
    //     _disableInitializers();
    // }

    function init(
        address _zero,
        address _locker,
        address _vestedZERO,
        uint256 _bonusBps
    ) external initializer {
        __Ownable_init(msg.sender);
        zero = IERC20(_zero);
        locker = IZeroLocker(_locker);
        vestedZERO = IVestedZeroNFT(_vestedZERO);
        bonusBps = _bonusBps;

        zero.approve(_locker, type(uint256).max);
    }

    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(msg.sender == address(vestedZERO), "!vestedZERO");

        // check how much unvested tokens the nft has
        uint256 pending = vestedZERO.unclaimed(tokenId);

        // decode data; by default stake the NFT
        bool stake = true;
        address to = from;
        if (data.length > 1) (stake, to) = abi.decode(data, (bool, address));

        // calculate the bonus
        uint256 bonus = calculateBonus(pending);

        // get the unvested tokens into this contract
        vestedZERO.claimUnvested(tokenId);

        // stake for 4 years for the user
        locker.createLockFor(
            pending + bonus, // uint256 _value,
            86400 * 365 * 4, // uint256 _lockDuration,
            to, // address _to,
            stake // bool _stakeNFT
        );

        return this.onERC721Received.selector;
    }

    function setBonusBps(uint256 _bps) external override onlyOwner {
        emit SetBonusBPS(bonusBps, _bps);
        bonusBps = _bps;
    }

    function calculateBonus(
        uint256 amount
    ) public view override returns (uint256) {
        uint256 bonus = (amount * bonusBps) / 100;
        // if we don't have enough funds to pay out bonuses, then return 0
        if (zero.balanceOf(address(this)) < bonus) return 0;
        return (amount * bonusBps) / 100;
    }
}
