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

import {ILPVault} from "../../interfaces/ILPVault.sol";
import {IWETH} from "../../interfaces/IWETH.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC2612} from "@openzeppelin/contracts/interfaces/IERC2612.sol";

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

abstract contract BaseLPVault is ILPVault, ERC20Upgradeable {
    // LP ZERO/ETH into Uniswap V3 and collect trading fees
    IWETH public weth;
    IERC20 public zero;

    function init(address _weth, address _zero) external initializer {
        __ERC20_init("ZERO/ETH LP", "Z/ETH-LP");
        weth = IWETH(_weth);
        zero = IERC20(_zero);
    }

    function stakeEth() external payable {
        _takeETH();

        // swap approx 50% of eth to tokens
        _swap(0, 0, 0, 0);

        // add liquidity and mint shares to the user
        uint256 liq = _addLiquidityWETH(0, 0, 0, 0);
        _mint(msg.sender, liq);
        _flush();
    }

    function stakeEthAndTokens(
        uint256 amount,
        PermitData memory permit
    ) external payable {
        _takeTokens(amount, permit);
        _takeETH();

        // swap approx 50% of tokens to eth
        _swap(0, 0, 0, 0);

        // add liquidity and mint shares to the user
        uint256 liq = _addLiquidityWETH(0, 0, 0, 0);
        _mint(msg.sender, liq);
        _flush();
    }

    function stakeTokens(uint256 amount, PermitData memory permit) external {
        _takeTokens(amount, permit);
        _takeETH();

        // swap approx 50% of tokens to eth
        _swap(0, 0, 0, 0);

        // add liquidity and mint shares to the user
        uint256 liq = _addLiquidityWETH(0, 0, 0, 0);
        _mint(msg.sender, liq);
        _flush();
    }

    function _takeTokens(uint256 amount, PermitData memory permit) internal {
        if (permit.deadline > 0) {
            IERC2612(address(zero)).permit(
                msg.sender,
                address(this),
                permit.value,
                permit.deadline,
                permit.v,
                permit.r,
                permit.s
            );
        }

        zero.transferFrom(msg.sender, address(this), amount);
    }

    function _takeETH() internal {
        if (msg.value > 0) weth.deposit{value: msg.value}();
    }

    function _flush() internal {
        // todo
    }

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
