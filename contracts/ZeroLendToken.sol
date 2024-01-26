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

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

abstract contract ZeroLend is ERC20Permit {
    mapping(address => bool) public blacklisted;

    constructor() ERC20Permit("ZeroLend") {
        _mint(msg.sender, 100_000_000_000 * 10 ** decimals());
    }

    // function mint(uint256 amt) public onlyOwner {
    //     _mint(msg.sender, amt);
    // }

    // function toggleBlacklist(address who, bool what) public onlyOwner {
    //     blacklisted[who] = what;
    // }

    // function _update(
    //     address from,
    //     address to,
    //     uint256
    // ) internal virtual override {
    //     require(!blacklisted[from] && !blacklisted[to], "blacklisted");
    // }

    function startTrading() external {}
}
