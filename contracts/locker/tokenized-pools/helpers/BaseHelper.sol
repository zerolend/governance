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

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC2612} from "@openzeppelin/contracts/interfaces/IERC2612.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

abstract contract BaseHelper is ERC20Upgradeable {
    // function _takeTokens(uint256 amount, PermitData memory permit) internal {
    //     if (permit.deadline > 0) {
    //         IERC2612(address(zero)).permit(
    //             msg.sender,
    //             address(this),
    //             permit.value,
    //             permit.deadline,
    //             permit.v,
    //             permit.r,
    //             permit.s
    //         );
    //     }

    //     zero.transferFrom(msg.sender, address(this), amount);
    // }

    // function _takeETH() internal {
    //     if (msg.value > 0) weth.deposit{value: msg.value}();
    // }

    function _addLiquidityWETH(
        uint256 tokenIn,
        uint256 ethIn,
        uint256 tokenInMin,
        uint256 ethInMin
    ) internal virtual returns (uint256 liquidity);

    function _createPosition(
        uint256 tokenIn,
        uint256 ethIn,
        uint256 tokenInMin,
        uint256 ethInMin
    ) internal virtual returns (uint256 liquidity);

    function _swap(
        uint256 tokenIn,
        uint256 tokenOut,
        uint256 tokenInMin,
        uint256 tokenOutMin
    ) internal virtual returns (uint256 liquidity);
}
