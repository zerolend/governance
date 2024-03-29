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
    address public treasury;

    function init(
        address _weth,
        address _zero,
        address _treasury
    ) external initializer {
        __ERC20_init("ZERO/ETH LP", "Z/ETH-LP");
        weth = IWETH(_weth);
        zero = IERC20(_zero);
        treasury = _treasury;
    }

    function deposit(
        DepositParams calldata params
    )
        external
        payable
        virtual
        override
        returns (
            uint256 shares,
            uint128 addedLiquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(block.timestamp <= params.deadline, "!deadline");
        return _deposit(params);
    }

    function withdraw(
        WithdrawParams calldata params
    )
        external
        virtual
        override
        returns (uint128 removedLiquidity, uint256 amount0, uint256 amount1)
    {
        require(block.timestamp <= params.deadline, "!deadline");
        return _withdraw(params);
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

    function _deposit(
        DepositParams calldata params
    )
        internal
        virtual
        returns (
            uint256 shares,
            uint128 addedLiquidity,
            uint256 amount0,
            uint256 amount1
        );

    function _withdraw(
        WithdrawParams calldata params
    )
        internal
        virtual
        returns (uint128 removedLiquidity, uint256 amount0, uint256 amount1);

    function _flush() internal {
        // todo
    }
}
