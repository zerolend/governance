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
    IERC20Burnable public earlyZERO;
    IVestedZeroNFT public vestedZERO;
    IZeroLocker public locker;
    uint256 public bonusBps;

    constructor() {
        _disableInitializers();
    }

    function init(
        address _zero,
        address _earlyZERO,
        address _locker,
        uint256 _bonusBps
    ) external initializer {
        __Ownable_init(msg.sender);
        zero = IERC20(_zero);
        earlyZERO = IERC20Burnable(_earlyZERO);
        locker = IZeroLocker(_locker);
        bonusBps = _bonusBps;
    }

    function convertVestedTokens4Year(
        IERC20Burnable token,
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external {
        require(token == earlyZERO, "invalid token");
        if (permit.deadline > 0) {
            IERC2612(address(token)).permit(
                who,
                address(this),
                permit.value,
                permit.deadline,
                permit.v,
                permit.r,
                permit.s
            );
        }

        // burn the unvested token or early zero or presale tokens
        token.burnFrom(msg.sender, amount);

        // calculate the bonus
        uint256 bonus = calculateBonus(amount);

        // stake for 4 years for the user
        locker.createLockFor(
            amount + bonus, // uint256 _value,
            86400 * 365 * 4, // uint256 _lockDuration,
            who, // address _to,
            stake // bool _stakeNFT
        );
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(msg.sender == operator, "!operator");
        require(operator == address(vestedZERO), "!vestedZERO");

        // check how much unvested tokens the nft has
        uint256 pending = vestedZERO.pending(tokenId);

        // decode data; by default stake the NFT
        bool stake = true;
        if (data.length > 1) stake = abi.decode(data, (bool));

        // get the unvested tokens into this contract
        vestedZERO.claimUnvested(tokenId);

        // calculate the bonus
        uint256 bonus = calculateBonus(pending);

        // stake for 4 years for the user
        locker.createLockFor(
            pending + bonus, // uint256 _value,
            86400 * 365 * 4, // uint256 _lockDuration,
            from, // address _to,
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
        return (amount * bonusBps) / 100;
    }
}
