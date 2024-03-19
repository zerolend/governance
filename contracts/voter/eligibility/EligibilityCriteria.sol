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
import {VersionedInitializable} from "../../proxy/VersionedInitializable.sol";

contract EligibilityCriteria is VersionedInitializable, IEligibilityCriteria {
    IVotes public staking;
    IAaveOracle public oracle;
    address public zero;

    function init(
        address _staking,
        address _oracle,
        address _zero
    ) external initializer {
        staking = IVotes(_staking);
        oracle = IAaveOracle(_oracle);
        zero = _zero;
    }

    function checkEligibility(
        address who,
        uint256 depositedUSD
    ) external view returns (uint256 multiplierE18) {
        if (depositedUSD == 0) return 0;

        // if user hasn't staked anything, then not eligible
        uint256 votes = staking.getVotes(who);
        if (votes == 0) return 0;

        // calculate how % of the user's deposit has been staked
        uint256 stakedUSD = (votes * oracle.getAssetPrice(zero)) / 1e8;
        uint256 percentageStaked = (stakedUSD * 1e18) / depositedUSD;

        // if less than 5% is staked, then not elibible
        if (percentageStaked < 5e16) return 0;

        // TODO: this needs to be done to mirror the docs

        // else give 1x
        return 1e18;
    }

    function getRevision() internal pure virtual override returns (uint256) {
        return 0;
    }
}
