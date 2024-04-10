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

contract ZeroLend is AccessControlEnumerable, ERC20Burnable, ERC20Permit {
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    mapping(address => bool) public blacklisted;

    constructor() ERC20("ZeroLend", "ZERO") ERC20Permit("ZeroLend") {
        _mint(msg.sender, 100_000_000_000 * 10 ** decimals());

        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function toggleBlacklist(
        address who,
        bool what
    ) public onlyRole(RISK_MANAGER_ROLE) {
        blacklisted[who] = what;
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // reject all blacklisted addresses
        require(!blacklisted[from] && !blacklisted[to], "blacklisted");
        super._update(from, to, value);
    }
}
