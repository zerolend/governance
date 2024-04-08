// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IEmissionManager} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IEmissionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolDataProvider} from "@zerolendxyz/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {IRewardDistributor} from "../../../interfaces/IRewardDistributor.sol";
import {RewardsDataTypes} from "@zerolendxyz/periphery-v3/contracts/rewards/libraries/RewardsDataTypes.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 14 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract LendingPoolGaugeV2 is IRewardDistributor {
    using SafeERC20 for IERC20;

    address public immutable z0Token;
    address public immutable z0TokenDebt;
    IEmissionManager public immutable emissionManagerProxy;
    uint256 public duration;
    address public oracle;
    address public strategy;

    constructor(
        address _asset,
        address _oracle,
        address _strategy,
        uint256 _duration,
        IEmissionManager _emissionManagerProxy,
        IPoolDataProvider _provider
    ) {
        emissionManagerProxy = _emissionManagerProxy;
        (z0Token, z0TokenDebt, ) = _provider.getReserveTokensAddresses(_asset);
        setConfig(_duration, _oracle, _strategy);
    }

    function setConfig(
        uint256 _duration,
        address _oracle,
        address _strategy
    ) public onlyOwner {
        duration = _duration;
        oracle = _oracle;
        strategy = _strategy;
    }

    function notifyRewardAmount(
        address token,
        uint256 amount
    ) external returns (bool) {
        // send tokens to the transfer strategy
        IERC20(token).safeTransferFrom(msg.sender, address(strategy), amount);

        uint256 distributionEnd = block.timestamp + duration;
        uint256 emissionPerSecond = amount / _duration;

        // send 1/4 to the supply side
        uint256 emissionPerSecondSupply = emissionPerSecond / 4;

        // send 3/4th to the borrow side
        uint256 emissionPerSecondDebt = emissionPerSecond * 3 / 4

        // config the params now
        emissionManagerProxy.configureAssets(
            [
                RewardsDataTypes.RewardsConfigInput({
                    emissionPerSecond: emissionPerSecondSupply,
                    totalSupply: 0,
                    distributionEnd: distributionEnd,
                    asset: z0Token,
                    reward: token,
                    transferStrategy: strategy,
                    rewardOracle: oracle
                }),
                RewardsDataTypes.RewardsConfigInput({
                    emissionPerSecond: emissionPerSecondDebt,
                    totalSupply: 0,
                    distributionEnd: distributionEnd,
                    asset: z0TokenDebt,
                    reward: token,
                    transferStrategy: strategy,
                    rewardOracle: oracle
                })
            ]
        );

        return true;
    }
}
