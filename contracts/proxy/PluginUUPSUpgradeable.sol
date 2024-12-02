// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import  {IERC1822Proxiable} from "@openzeppelin/contracts/interfaces/draft-IERC1822.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IDAO} from "@aragon/osx/core/dao/IDAO.sol";
import  {DaoAuthorizableUpgradeable} from "@aragon/osx/core/plugin/dao-authorizable/DaoAuthorizableUpgradeable.sol";
import {IPlugin} from "@aragon/osx/core/plugin/IPlugin.sol";

/// @title PluginUUPSUpgradeable
/// @author Aragon Association - 2022-2023
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
abstract contract PluginUUPSUpgradeable is
    IPlugin,
    ERC165Upgradeable,
    UUPSUpgradeable,
    DaoAuthorizableUpgradeable
{
    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @notice Disables the initializers on the implementation contract to prevent it from being left uninitialized.
    constructor() {
        _disableInitializers();
    }

    /// @inheritdoc IPlugin
    function pluginType() public pure override returns (PluginType) {
        return PluginType.UUPS;
    }

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PLUGIN_PERMISSION_ID = keccak256("UPGRADE_PLUGIN_PERMISSION");

    /// @notice Initializes the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    function __PluginUUPSUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPlugin).interfaceId ||
            _interfaceId == type(IERC1822Proxiable).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PLUGIN_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_PLUGIN_PERMISSION_ID) {}

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[50] private __gap;
}
