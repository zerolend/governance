// // SPDX-License-Identifier: AGPL-3.0
// pragma solidity ^0.8.0;

// import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
// import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
// import {BaseImmutableAdminUpgradeabilityProxy} from "./BaseImmutableAdminUpgradeabilityProxy.sol";

// /**
//  * @title InitializableAdminUpgradeabilityProxy
//  * @author Aave
//  * @dev Extends BaseAdminUpgradeabilityProxy with an initializer function
//  */
// contract InitializableImmutableAdminUpgradeabilityProxy is
//     BaseImmutableAdminUpgradeabilityProxy,
//     TransparentUpgradeableProxy
// {
//     /**
//      * @dev Constructor.
//      * @param admin The address of the admin
//      */
//     constructor(address admin) BaseImmutableAdminUpgradeabilityProxy(admin) {
//         // Intentionally left blank
//     }

//     /// @inheritdoc BaseImmutableAdminUpgradeabilityProxy
//     function _willFallback()
//         internal
//         override(BaseImmutableAdminUpgradeabilityProxy, Proxy)
//     {
//         BaseImmutableAdminUpgradeabilityProxy._willFallback();
//     }
// }
