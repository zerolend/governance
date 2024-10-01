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

import {IVestedZeroNFT} from "../interfaces/IVestedZeroNFT.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

interface IVestedZeroNFTWithLock is IVestedZeroNFT {
    function tokenIdToLockDetails(uint256) external view returns (LockDetails memory);
}

contract UpdateZeroNFTScript is AccessControlEnumerable {
    IVestedZeroNFTWithLock public vest;

    constructor(address _vest) {
        vest = IVestedZeroNFTWithLock(_vest);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function update(uint256[] memory ids) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256[] memory linearDurations = new uint256[](ids.length);
        uint256[] memory cliffDurations = new uint256[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            IVestedZeroNFT.LockDetails memory lock = vest.tokenIdToLockDetails(ids[i]);
            require(lock.category == IVestedZeroNFT.VestCategory.AIRDROP, "!category");
            linearDurations[i] = 86400 * 30 * 3; // 3 mo linear
            cliffDurations[i] = 86400 * 30 * 3; // 3 mo cliff
        }

        vest.updateCliffDuration(ids, linearDurations, cliffDurations);
    }
}
