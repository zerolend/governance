// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseLocker} from "./BaseLocker.sol";

contract LockerToken is BaseLocker {
    function init(
        address _token,
        address _staking,
        address _stakingBonus
    ) external initializer {
        __BaseLocker_init(
            "Locked ZERO Tokens",
            "T-ZERO",
            _token,
            _staking,
            _stakingBonus,
            4 * 365 * 86400
        );
    }
}
