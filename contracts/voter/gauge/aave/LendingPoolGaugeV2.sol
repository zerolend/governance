// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import {Ownable} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/Ownable.sol";
import {IEmissionManager, ITransferStrategyBase, IEACAggregatorProxy} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IEmissionManager.sol";
import {IERC20} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {IPoolDataProvider} from "@zerolendxyz/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {IRewardDistributor} from "../../../interfaces/IRewardDistributor.sol";
import {RewardsDataTypes} from "@zerolendxyz/periphery-v3/contracts/rewards/libraries/RewardsDataTypes.sol";

/// @title Aave compatible lending pool gauge
/// @author Deadshot Ryker <ryker@zerolend.xyz>
/// @notice For a given asset, the gauge notifies the Aave incentive controller with the correct parameters.
contract LendingPoolGaugeV2 is Ownable, IRewardDistributor {
    address immutable asset;
    IPoolDataProvider immutable dataProvider;
    IEmissionManager public immutable emissionManagerProxy;

    address public zero;
    address public oracle;
    address public voter;
    address public z0Token;
    address public z0TokenDebt;
    ITransferStrategyBase public strategy;
    uint32 public duration;
    uint32 public nextEpoch;

    event AmountNotified(address _asset, uint256 _amount);

    constructor(
        address _zero,
        address _asset,
        address _oracle,
        address _voter,
        address _emissionManagerProxy,
        address _data,
        address _strategy,
        uint32 _duration
    ) {
        emissionManagerProxy = IEmissionManager(_emissionManagerProxy);
        zero = _zero;
        voter = _voter;
        asset = _asset;
        dataProvider = IPoolDataProvider(_data);
        nextEpoch = uint32(block.timestamp);
        updateData(_oracle, _strategy, _duration);
    }

    function updateData(
        address _oracle,
        address _strategy,
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
        strategy = ITransferStrategyBase(_strategy);
    }

    function notifyRewardAmount(
        address token,
        uint256 amount
    ) external returns (bool) {
        require(msg.sender == voter, "!voter");
        require(block.timestamp >= nextEpoch, "!epoch");
        require(token == zero, "!token");
        if (amount == 0) return true;

        // send tokens to the transfer strategy
        IERC20(token).transferFrom(msg.sender, address(strategy), amount);

        // update epoch
        nextEpoch = uint32(block.timestamp) + duration;

        // calculate how much emissions per second we are giving out. Since we are looking
        // receiving the rewards per second, then this should ideally amount / duration
        // to get the per second rate.
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
                emissionPerSecondDebt > 0 ? 2 : 1
            );

        data[0] = RewardsDataTypes.RewardsConfigInput({
            emissionPerSecond: emissionPerSecondSupply,
            totalSupply: 0,
            distributionEnd: nextEpoch,
            asset: z0Token,
            reward: token,
            transferStrategy: strategy,
            rewardOracle: IEACAggregatorProxy(oracle)
        });

        if (emissionPerSecondDebt > 0) {
            data[1] = RewardsDataTypes.RewardsConfigInput({
                emissionPerSecond: emissionPerSecondDebt,
                totalSupply: 0,
                distributionEnd: nextEpoch,
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
