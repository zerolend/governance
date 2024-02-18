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

interface IOmnichainStaking is IVotes {
    struct StakeInformation {
        address owner;
        uint256 tokenStake;
        uint256 lpStake;
        uint256 localVe;
    }

    // An omni-chain staking contract that allows users to stake their veNFT
    // and get some voting power. Once staked the voting power is available cross-chain.

    function unstakeLP(uint256 tokenId) external;

    function unstakeToken(uint256 tokenId) external;

    /// @dev using layerzero, sends the updated voting power across the different chains
    function updatePowerOnChain(uint256 chainId, uint256 nftId) external;

    /// @dev using layerzero, deletes the updated voting power across the different chains
    function deletePowerOnChain(uint256 chainId, uint256 nftId) external;

    /// @dev send the veStaked supply to the mainnet
    function updateSupplyToMainnetViaLZ() external;

    /// @dev receive the veStaked supply on the mainnet
    function updateSupplyFromLZ() external;
}
