// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEmissionManager, ITransferStrategyBase, IEACAggregatorProxy} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IEmissionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolDataProvider} from "@zerolendxyz/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {IRewardDistributor} from "../../../interfaces/IRewardDistributor.sol";
import {RewardsDataTypes} from "@zerolendxyz/periphery-v3/contracts/rewards/libraries/RewardsDataTypes.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Gauges are used to incentivize pools, they emit reward tokens over 14 days for staked LP tokens
// Nuance: getReward must be called at least once for tokens other than incentive[0] to start accrueing rewards
contract LendingPoolGaugeV2 is Ownable, IRewardDistributor {
    using SafeERC20 for IERC20;

    address immutable asset;
    IPoolDataProvider immutable dataProvider;
    IEmissionManager public immutable emissionManagerProxy;

    address public oracle;
    address public voter;
    address public z0Token;
    address public z0TokenDebt;
    ITransferStrategyBase public strategy;
    uint32 public duration;

    event AmountNotified(address _asset, uint256 _amount);

    constructor(
        address _asset,
        address _oracle,
        address _voter,
        IEmissionManager _emissionManagerProxy,
        IPoolDataProvider _data,
        ITransferStrategyBase _strategy,
        uint32 _duration
    ) Ownable(msg.sender) {
        emissionManagerProxy = _emissionManagerProxy;
        voter = _voter;
        asset = _asset;
        dataProvider = _data;
        updateData(_oracle, _strategy, _duration);
    }

    function updateData(
        address _oracle,
        ITransferStrategyBase _strategy,
        uint32 _duration
    ) public onlyOwner {
        // get data from pool provider
        (z0Token, z0TokenDebt, ) = dataProvider.getReserveTokensAddresses(
            asset
        );
        (, , , , , , bool borrowingEnabled, , , ) = dataProvider
            .getReserveConfigurationData(asset);

        // if there is no borrowing enabled then reduce to 0
        if (!borrowingEnabled) z0TokenDebt = address(0);

        duration = _duration;
        oracle = _oracle;
        strategy = _strategy;
    }

    function notifyRewardAmount(
        address token,
        uint256 amount
    ) external returns (bool) {
        require(msg.sender == voter, "!voter");

        // send tokens to the transfer strategy
        IERC20(token).safeTransferFrom(msg.sender, address(strategy), amount);

        uint32 distributionEnd = uint32(block.timestamp) + duration;
        uint88 emissionPerSecond = uint88(amount / duration);

        // send 1/4 to the supply side if there is no debt. else send all the rewards to the supply side
        uint88 emissionPerSecondSupply = z0TokenDebt != address(0)
            ? emissionPerSecond / 4
            : emissionPerSecond;

        // send 3/4th to the borrow side if there is a debt token. else send 0
        uint88 emissionPerSecondDebt = z0TokenDebt != address(0)
            ? (emissionPerSecond * 3) / 4
            : 0;

        // config the params for the emission manager
        RewardsDataTypes.RewardsConfigInput[]
            memory data = new RewardsDataTypes.RewardsConfigInput[](
                z0TokenDebt != address(0) ? 2 : 1
            );

        data[0] = RewardsDataTypes.RewardsConfigInput({
            emissionPerSecond: emissionPerSecondSupply,
            totalSupply: 0,
            distributionEnd: distributionEnd,
            asset: z0Token,
            reward: token,
            transferStrategy: strategy,
            rewardOracle: IEACAggregatorProxy(oracle)
        });

        if (emissionPerSecondDebt > 0) {
            data[1] = RewardsDataTypes.RewardsConfigInput({
                emissionPerSecond: emissionPerSecondDebt,
                totalSupply: 0,
                distributionEnd: distributionEnd,
                asset: z0TokenDebt,
                reward: token,
                transferStrategy: strategy,
                rewardOracle: IEACAggregatorProxy(oracle)
            });
        }

        // send it!
        emissionManagerProxy.configureAssets(data);

        emit AmountNotified(token, amount);
        return true;
    }
}
