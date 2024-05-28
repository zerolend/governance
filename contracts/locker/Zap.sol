// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {INileRouter} from "../interfaces/INileRouter.sol";
import {ILocker} from "../interfaces/ILocker.sol";
import {IZeroLend} from "../interfaces/IZeroLend.sol";

/**
 * @title Zap
 * @dev This contract allows users to perform a Zap operation by swapping ETH for Zero tokens, adding liquidity to Nile LP, and locking LP tokens.
 */
contract Zap is Initializable, OwnableUpgradeable {
    address payable public odosRouter;
    INileRouter public nileRouter;
    ILocker public lpTokenLocker;
    IZeroLend public zeroToken;

    uint256 public slippage;

    error EthNotSent();
    error OdosSwapFailed();
    error EthSendFailed();
    error ZeroTransferFailed();

    /**
     * @dev Initializes the contract with required parameters.
     * @param _owner The address that will initially own the contract.
     * @param _odosRouter The address of the Odos Router contract.
     * @param _nileLP The address of the Nile LP contract.
     * @param _lpTokenLocker The address of the LP Token Locker contract.
     * @param _zeroToken The address of the Zero Token contract.
     * @param _slippage The slippage value used in token swaps.
     */
    function init(
        address _owner,
        address payable _odosRouter,
        address _nileLP,
        address _lpTokenLocker,
        address _zeroToken,
        uint256 _slippage
    ) external initializer {
        __Ownable_init(_owner);
        odosRouter = _odosRouter;
        nileRouter = INileRouter(_nileLP);
        lpTokenLocker = ILocker(_lpTokenLocker);
        zeroToken = IZeroLend(_zeroToken);
        slippage = _slippage;
    }

    /**
     * @dev Sets the slippage value used in token swaps. Only callable by the owner of the contract.
     * @param _slippage The new slippage value.
     */
    function setSlippage(uint256 _slippage) external onlyOwner {
        slippage = _slippage;
    }

    /**
     * @dev Executes the Zap operation by swapping ETH for Zero tokens, adding liquidity to Nile LP, and locking LP tokens.
     * @param duration The duration for which the LP tokens will be locked.
     * @param odosSwapData The data required for the Odos swap.
     */
    function zapAndStake(
        uint256 duration,
        bytes calldata odosSwapData
    ) external payable {
        if (msg.value == 0) revert EthNotSent();

        uint256 ethBalanceBefore = address(this).balance;
        uint256 zeroBalanceBefore = zeroToken.balanceOf(address(this));

        (bool success, bytes memory outputSwapData) = odosRouter.call{
            value: msg.value / 2
        }(odosSwapData);
        if (!success) revert OdosSwapFailed();

        uint256 zeroAmount = abi.decode(outputSwapData, (uint256));
        uint256 zeroAmountMin = zeroAmount - (zeroAmount * slippage) / 10000;

        (, , uint256 lpTokens) = nileRouter.addLiquidityETH{
            value: msg.value / 2
        }(
            address(zeroToken),
            false,
            zeroAmount,
            zeroAmountMin,
            msg.value / 2,
            address(this),
            block.timestamp + 60
        );

        lpTokenLocker.createLockFor(lpTokens, duration, msg.sender, true);

        uint256 ethBalanceAfter = address(this).balance;
        uint256 zeroBalanceAfter = zeroToken.balanceOf(address(this));

        uint256 remainingETHBalance = ethBalanceAfter - ethBalanceBefore;
        if (remainingETHBalance > 0) {
            (bool ethSendSuccess, ) = msg.sender.call{
                value: remainingETHBalance
            }("");
            if (!ethSendSuccess) revert EthSendFailed();
        }

        uint256 remainingZeroBalance = zeroBalanceAfter - zeroBalanceBefore;
        if (remainingZeroBalance > 0) {
            if (!zeroToken.transfer(msg.sender, remainingZeroBalance))
                revert ZeroTransferFailed();
        }
    }
}
