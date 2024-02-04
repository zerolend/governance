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

import {IBasicVesting} from "../interfaces/IBasicVesting.sol";
import {IStakingBonus} from "../interfaces/IStakingBonus.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Burnable} from "../interfaces/IERC20Burnable.sol";
import {IERC2612} from "@openzeppelin/contracts/interfaces/IERC2612.sol";
import {IZeroLocker} from "../interfaces/IZeroLocker.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract StakingBonus is OwnableUpgradeable, IStakingBonus {
    IERC20 public zero;
    IERC20Burnable public earlyZERO;
    IERC20Burnable public vestedZERO;
    IZeroLocker public locker;
    uint256 public bonusBps;

    function init(
        address _zero,
        address _earlyZERO,
        address _vestedZERO,
        address _locker,
        uint256 _bonusBps
    ) external initializer {
        __Ownable_init(msg.sender);
        zero = IERC20(_zero);
        earlyZERO = IERC20Burnable(_earlyZERO);
        vestedZERO = IERC20Burnable(_vestedZERO);
        locker = IZeroLocker(_locker);
        bonusBps = _bonusBps;
    }

    function convertEarlyZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external {
        _convertTo4Year(earlyZERO, amount, who, stake, permit);
    }

    function convertVestedZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external {
        _convertTo4Year(vestedZERO, amount, who, stake, permit);
    }

    function convertPreSaleZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external {
        // TODO: allow unvested pre-sale tokens (investor, or adivisory) to be converted to a 4 year stake
    }

    function _convertTo4Year(
        IERC20Burnable token,
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) internal {
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
