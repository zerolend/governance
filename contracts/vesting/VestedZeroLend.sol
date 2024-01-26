// SPDX-License-Identifier: UNLICENSED
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

import {ERC20Burnable, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VestedZeroLend is ERC20, ERC20Burnable, Ownable {
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blacklist;
    bool public enableWhitelist;
    bool public enableBlacklist;

    constructor() ERC20("Vested ZeroLend", "vZERO") Ownable(msg.sender) {
        whitelist[msg.sender] = true;
        whitelist[address(this)] = true;
        whitelist[address(0)] = true;

        enableWhitelist = true;
        enableBlacklist = false;

        _mint(msg.sender, 100_000_000_000 ether);
    }

    function addblacklist(address who, bool what) external onlyOwner {
        blacklist[who] = what;
    }

    function addwhitelist(address who, bool what) external onlyOwner {
        whitelist[who] = what;
    }

    function toggleWhitelist(bool from, bool to) external onlyOwner {
        enableWhitelist = from;
        enableBlacklist = to;
    }

    function _update(
        address from,
        address to,
        uint256
    ) internal virtual override {
        if (enableWhitelist) {
            require(whitelist[from] || whitelist[to], "!whitelist");
        }

        if (enableBlacklist) {
            require(!blacklist[to] && !blacklist[from], "blacklist");
        }
    }
}
