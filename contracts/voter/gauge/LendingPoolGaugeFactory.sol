// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPoolDataProvider} from "@zerolendxyz/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {LendingPoolGauge} from "./LendingPoolGauge.sol";

interface IAtokenIncentivized {
    function setIncentivesController(address controller) external;
}

interface IGuageIncentiveController {
    function init(
        address _aToken,
        address _reward,
        address _eligibility,
        address _oracle
    ) external;
}

contract LendingPoolGaugeFactory is Ownable {
    address public gaugeImplementation;
    address public zero;
    address public eligibility;
    address public oracle;
    IPoolDataProvider public dataProvider;

    struct GaugeInfo {
        address splitterGauge;
        address aTokenGauge;
        address varTokenGauge;
    }

    mapping(address => GaugeInfo) public gauges;
    event GaugeCreated(
        address reserve,
        address implementation,
        address aTokenGaugeProxy,
        address varTokenGaugeProxy,
        address splitter
    );

    constructor() Ownable(msg.sender) {}

    function setAddresses(
        address _gaugeImplementation,
        address _zero,
        address _eligibility,
        address _oracle,
        IPoolDataProvider _dataProvider
    ) external onlyOwner {
        gaugeImplementation = _gaugeImplementation;
        zero = _zero;
        eligibility = _eligibility;
        oracle = _oracle;
        dataProvider = _dataProvider;
    }

    function createGauge(address reserve) external onlyOwner {
        // fn needs to have pooladmin role to set Atoken's incentive controller
        (address atokenAddr, , address varTokenAddr) = dataProvider
            .getReserveTokensAddresses(reserve);

        IAtokenIncentivized aToken = IAtokenIncentivized(atokenAddr);
        IAtokenIncentivized varToken = IAtokenIncentivized(varTokenAddr);

        IGuageIncentiveController aTokenIncentiveProxy = IGuageIncentiveController(
                address(
                    new TransparentUpgradeableProxy(
                        gaugeImplementation,
                        owner(),
                        ""
                    )
                )
            );

        IGuageIncentiveController varTokenIncentiveProxy = IGuageIncentiveController(
                address(
                    new TransparentUpgradeableProxy(
                        gaugeImplementation,
                        owner(),
                        ""
                    )
                )
            );

        // init the proxies
        aTokenIncentiveProxy.init(atokenAddr, zero, eligibility, oracle);
        varTokenIncentiveProxy.init(varTokenAddr, zero, eligibility, oracle);

        // set the incentive controllers in the atokens
        aToken.setIncentivesController(address(aTokenIncentiveProxy));
        varToken.setIncentivesController(address(varTokenIncentiveProxy));

        // create the splitter
        LendingPoolGauge splitter = new LendingPoolGauge(
            address(aTokenIncentiveProxy),
            address(varTokenIncentiveProxy)
        );

        gauges[reserve] = GaugeInfo({
            splitterGauge: address(splitter),
            aTokenGauge: address(aTokenIncentiveProxy),
            varTokenGauge: address(varTokenIncentiveProxy)
        });

        emit GaugeCreated(
            reserve,
            gaugeImplementation,
            address(aTokenIncentiveProxy),
            address(varTokenIncentiveProxy),
            address(splitter)
        );
    }
}
