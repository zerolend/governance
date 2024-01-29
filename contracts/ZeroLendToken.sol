// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

// ███████╗███████╗██████╗  ██████╗
// ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
//   ███╔╝ █████╗  ██████╔╝██║   ██║
//  ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
// ███████╗███████╗██║  ██║╚██████╔╝
// ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝

// Website: https://zerolend.xyz
// Discord: https://discord.gg/zerolend
// Twitter: https://twitter.com/zerolendxyz
// Telegram: https://t.me/zerolendxyz

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

abstract contract ZeroLend is AccessControlEnumerable, ERC20Permit {
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    mapping(address => bool) public blacklisted;
    mapping(address => bool) public whitelisted;
    bool public paused;

    constructor() ERC20Permit("ZeroLend") {
        _mint(msg.sender, 100_000_000_000 * 10 ** decimals());

        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _setRoleAdmin(RISK_MANAGER_ROLE, GOVERNANCE_ROLE);

        paused = true;
    }

    function mint(address to, uint256 amt) public onlyRole(GOVERNANCE_ROLE) {
        _mint(to, amt);
    }

    function toggleBlacklist(
        address who,
        bool what
    ) public onlyRole(RISK_MANAGER_ROLE) {
        blacklisted[who] = what;
    }

    function toggleWhitelist(
        address who,
        bool what
    ) public onlyRole(RISK_MANAGER_ROLE) {
        whitelisted[who] = what;
    }

    function togglePause(bool what) public onlyRole(RISK_MANAGER_ROLE) {
        paused = what;
    }

    function _update(
        address from,
        address to,
        uint256
    ) internal virtual override {
        require(!blacklisted[from] && !blacklisted[to], "blacklisted");
        require(!paused && !whitelisted[from], "paused");
    }

    function startTrading() external onlyRole(RISK_MANAGER_ROLE) {
        // todo; enable trading on uniswap v3
        paused = false;
    }
}
