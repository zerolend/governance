// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.12;

import {Ownable} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/Ownable.sol";
import {IEACAggregatorProxy} from "@zerolendxyz/periphery-v3/contracts/misc/interfaces/IEACAggregatorProxy.sol";
import {IEmissionManager} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IEmissionManager.sol";
import {ITransferStrategyBase} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/ITransferStrategyBase.sol";
import {IRewardsController} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/IRewardsController.sol";
import {EmissionManager} from "@zerolendxyz/periphery-v3/contracts/rewards/EmissionManager.sol";
import {RewardsDataTypes} from "@zerolendxyz/periphery-v3/contracts/rewards/libraries/RewardsDataTypes.sol";

contract EmissionManagerProxy is Ownable {
    IEmissionManager public manager;

    mapping(address => bool) public whitelisted;

    constructor(address _manager) {
        manager = IEmissionManager(_manager);
    }

    function configureAssets(RewardsDataTypes.RewardsConfigInput[] memory config) external {
        require(whitelisted[msg.sender], "!whitelisted");
        manager.configureAssets(config);
    }

    function setWhitelist(address what, bool val) external onlyOwner {
        whitelisted[what] = val;
    }
}
