// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ILocker} from "../interfaces/ILocker.sol";
import {IERC20, IWETH} from "../interfaces/IWETH.sol";

/**
 * @title Zap
 * @dev This contract allows users to perform a Zap operation by swapping ETH for Zero tokens, adding liquidity to Nile LP, and locking LP tokens.
 */
contract Zap is Initializable {
    address public odos;
    ILocker public locker;
    IERC20 public zero;
    IWETH public weth;
    IERC20 public lp;

    address private me;

    error OdosSwapFailed();
    error EthSendFailed();
    error ZeroTransferFailed();

    /**
     * @dev Initializes the contract with required parameters.
     * @param _odos The address of the Odos Router contract.
     * @param _locker The address of the LP Token Locker contract.
     * @param _zero The address of the Zero Token contract.
     * @param _weth The address of WETH.
     */
    function init(
        address payable _odos,
        address _locker,
        address _zero,
        address _weth
    ) external initializer {
        odos = _odos;
        locker = ILocker(_locker);
        zero = IERC20(_zero);
        weth = IWETH(_weth);
        lp = locker.underlying();

        // give approvals
        weth.approve(odos, type(uint256).max);
        zero.approve(odos, type(uint256).max);
        lp.approve(_locker, type(uint256).max);

        me = address(this);
    }

    /**
     * @dev Executes the Zap operation by swapping ETH for Zero tokens, adding liquidity to Nile LP, and locking LP tokens.
     * @param duration The duration for which the LP tokens will be locked.
     * @param odosSwapData The data required for the Odos swap.
     */
    function zapAndStake(
        uint256 duration,
        uint256 zeroAmount,
        uint256 wethAmount,
        bytes calldata odosSwapData
    ) external payable {
        // fetch tokens
        if (msg.value > 0) weth.deposit{value: msg.value}();
        if (zeroAmount > 0) zero.transferFrom(msg.sender, me, zeroAmount);
        if (wethAmount > 0) weth.transferFrom(msg.sender, me, wethAmount);

        // odos should be able to swap into LP tokens directly.
        (bool success, ) = odos.call{value: msg.value / 2}(odosSwapData);
        if (!success) revert OdosSwapFailed();

        // stake the LP tokens
        uint256 lpTokens = lp.balanceOf(address(this));
        locker.createLockFor(lpTokens, duration, msg.sender, true);

        // sweep any dust
        sweep();
    }

    function sweep() public {
        uint256 eth = address(this).balance;
        uint256 zeroBalance = zero.balanceOf(address(this));

        if (eth > 0) {
            (bool ethSendSuccess, ) = msg.sender.call{value: eth}("");
            if (!ethSendSuccess) revert EthSendFailed();
        }

        if (zeroBalance > 0) {
            if (!zero.transfer(msg.sender, zeroBalance))
                revert ZeroTransferFailed();
        }
    }
}
