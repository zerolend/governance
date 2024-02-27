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

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IAaveOracle} from "@zerolendxyz/core-v3/contracts/interfaces/IAaveOracle.sol";

import {IEligibilityCriteria} from "../../interfaces/IEligibilityCriteria.sol";

contract MockEligibilityCriteria is IEligibilityCriteria {
    IVotes public staking;
    IAaveOracle public oracle;
    address public zero;

    function checkEligibility(
        address,
        uint256
    ) external pure returns (uint256 multiplierE18) {
        return 1e18;
    }
}
