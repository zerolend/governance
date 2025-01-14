// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseLocker} from "./BaseLocker.sol";

contract LockerToken is BaseLocker {
    function init(address _token, address _staking, address _owner) external initializer {
        __BaseLocker_init("Locked ZERO Tokens", "T-ZERO", _token, _staking, 4 * 365 * 86400, _owner);
    }
}
