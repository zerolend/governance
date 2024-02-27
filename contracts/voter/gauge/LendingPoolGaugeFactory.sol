// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IRewardDistributor} from "../../interfaces/IRewardDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 14 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract LendingPoolGaugeFactory is IRewardDistributor {
    using SafeERC20 for IERC20;
    IRewardDistributor public supplyGauge;
    IRewardDistributor public borrowGauge;

    constructor(address _supplyGauge, address _borrowGauge) {
        supplyGauge = IRewardDistributor(_supplyGauge);
        borrowGauge = IRewardDistributor(_borrowGauge);
    }

    function notifyRewardAmount(
        address token,
        uint256 amount
    ) external returns (bool) {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // send 1/4 to the supply side
        IERC20(token).approve(address(supplyGauge), amount);
        bool a = supplyGauge.notifyRewardAmount(token, amount / 4);

        // send 3/4th to the borrow side
        IERC20(token).approve(address(borrowGauge), amount);
        bool b = borrowGauge.notifyRewardAmount(token, (amount / 4) * 3);

        return a && b;
    }
}
