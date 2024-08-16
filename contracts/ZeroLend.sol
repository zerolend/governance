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
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    mapping(address => bool) public blacklisted;
    mapping(address => bool) public whitelisted;

    uint256 public deployedAt;
    bool public paused;
    bool public bootstrap;

    event Blacklisted(address indexed who, address indexed whom, bool indexed what);
    event Whitelisted(address indexed who, address indexed whom, bool indexed what);
    event Paused(address indexed who, bool indexed what);
    event BootstrapMode(address indexed who, bool indexed what);

    constructor() ERC20("ZeroLend", "ZERO") ERC20Permit("ZeroLend") {
        _mint(msg.sender, 100_000_000_000 * 10 ** decimals());

        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);

        _setRoleAdmin(RISK_MANAGER_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(MINTER_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);

        bootstrap = true;
        deployedAt = block.timestamp;
    }

    function blacklist(address who, bool what) public onlyRole(RISK_MANAGER_ROLE) {
        blacklisted[who] = what;
        emit Blacklisted(msg.sender, who, what);
    }

    function whitelist(address who, bool what) public onlyRole(RISK_MANAGER_ROLE) {
        whitelisted[who] = what;
        emit Whitelisted(msg.sender, who, what);
    }

    function togglePause(bool what) public onlyRole(RISK_MANAGER_ROLE) {
        paused = what;
        emit Paused(msg.sender, what);
    }

    function mint(uint256 amt, address who) public onlyRole(MINTER_ROLE) {
        // only allow minting 3 years after the deployment date
        require(block.timestamp > deployedAt + 86400 * 365 * 3, "you kid");
        _mint(who, amt);
    }

    function toggleBoostrapMode(bool what) public onlyRole(RISK_MANAGER_ROLE) {
        bootstrap = what;
        emit BootstrapMode(msg.sender, what);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        require(!paused, "you paused");

        // ensure that sending back and forth to contracts is disabled during bootstrap
        // important so that plebs can't add LP before the TGE
        if (bootstrap) {
            if (_isContract(from)) require(whitelisted[from], "you pleb");
            if (_isContract(to)) require(whitelisted[to], "you pleb");
        }

        // reject all blacklisted addresses
        require(!blacklisted[from] && !blacklisted[to], "you blacklisted");

        super._update(from, to, value);
    }

    function _isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
