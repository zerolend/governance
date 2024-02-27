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

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20Burnable} from "../../interfaces/IERC20Burnable.sol";
import {IVestedZeroNFT} from "../../interfaces/IVestedZeroNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract EarlyZEROVesting {
    IERC20Burnable public earlyZERO;
    IVestedZeroNFT public vesting;

    constructor(address _earlyZERO, address _vesting) {
        earlyZERO = IERC20Burnable(_earlyZERO);
        vesting = IVestedZeroNFT(_vesting);
    }

    function startVesting(uint256 amount) external {
        earlyZERO.burnFrom(msg.sender, amount);

        // vesting for earlyZERO is 25% upfront, 1 month cliff and
        // the rest (75%) across 6 months

        vesting.mint(
            msg.sender, // address _who,
            (amount * 75) / 100, // uint256 _pending,
            (amount * 25) / 100, // uint256 _upfront,
            86400 * 30 * 6, // uint256 _linearDuration,
            86400 * 30, // uint256 _cliffDuration,
            block.timestamp, // uint256 _unlockDate,
            false, // bool _hasPenalty
            IVestedZeroNFT.VestCategory.EARLY_ZERO
        );
    }

    function stake4year(uint256 amount) external {
        earlyZERO.burnFrom(msg.sender, amount);

        // vesting for earlyZERO is 25% upfront, 1 month cliff and
        // the rest (75%) across 6 months

        vesting.mint(
            msg.sender, // address _who,
            (amount * 75) / 100, // uint256 _pending,
            (amount * 25) / 100, // uint256 _upfront,
            86400 * 30 * 6, // uint256 _linearDuration,
            86400 * 30, // uint256 _cliffDuration,
            block.timestamp, // uint256 _unlockDate,
            false, // bool _hasPenalty
            IVestedZeroNFT.VestCategory.EARLY_ZERO
        );
    }
}
