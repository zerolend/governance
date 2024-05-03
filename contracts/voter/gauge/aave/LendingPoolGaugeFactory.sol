// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import {Ownable} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/Ownable.sol";
import {IPoolDataProvider} from "@zerolendxyz/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {LendingPoolGaugeV2} from "./LendingPoolGaugeV2.sol";
import {TransferStrategyZERO} from "./TransferStrategyZERO.sol";
import {IRewardsController} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IRewardsController.sol";
import {EmissionManagerProxy} from "./EmissionManagerProxy.sol";

contract LendingPoolGaugeFactory is Ownable {
    uint32 public duration;

    address public immutable zero;
    address public immutable voter;
    address public immutable emissionManagerProxy;
    address public immutable dataProvider;
    address public strategy;

    mapping(address => LendingPoolGaugeV2) public gauges;

    event GaugeCreated(address reserve, address gauge);
    event DurationUpdated(uint32 oldDuration, uint32 newDuration);
    event Initialized(
        address emissionManagerProxy,
        address strategy,
        address _incentivesController,
        address _vestedZERO,
        address _voter,
        address _zero,
        address _dataProvider
    );

    constructor(
        address _incentivesController,
        address _vestedZERO,
        address _voter,
        address _zero,
        address _dataProvider,
        uint32 _duration
    ) {
        voter = _voter;
        zero = _zero;
        dataProvider = _dataProvider;
        duration = _duration;

        emissionManagerProxy = address(
            new EmissionManagerProxy(
                IRewardsController(_incentivesController).getEmissionManager()
            )
        );

        strategy = address(
            new TransferStrategyZERO(
                _incentivesController, // address _incentivesController,
                _vestedZERO, // address _vestedZERO,
                _zero // address _zero
            )
        );

        Ownable(strategy).transferOwnership(msg.sender);
        Ownable(emissionManagerProxy).transferOwnership(msg.sender);

        emit Initialized(
            emissionManagerProxy,
            strategy,
            _incentivesController,
            _vestedZERO,
            _voter,
            _zero,
            _dataProvider
        );
    }

    function setDuration(uint32 _duration) external onlyOwner {
        emit DurationUpdated(duration, _duration);
        duration = _duration;
    }

    function createGauge(address reserve, address oracle) external onlyOwner {
        LendingPoolGaugeV2 gauge = new LendingPoolGaugeV2(
            zero,
            reserve,
            oracle,
            voter,
            emissionManagerProxy,
            dataProvider,
            strategy,
            duration
        );

        gauges[reserve] = gauge;
        gauge.transferOwnership(msg.sender);
        emit GaugeCreated(reserve, address(gauge));
    }
}
