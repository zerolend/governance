// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IVestedZeroNFT } from "contracts/interfaces/IVestedZeroNFT.sol";

interface IVestedZeroNFTWithLock is IVestedZeroNFT {
    function tokenIdToLockDetails(uint256) external view returns (LockDetails memory);
}

contract UnclaimedVest {
    IVestedZeroNFTWithLock public vest;
    address public gnosisSafe;

    event NFTRecalled(uint256 indexed tokenId, address indexed to);
    constructor(address _vest, address _gnosisSafe) {
        vest = IVestedZeroNFTWithLock(_vest);
        gnosisSafe = _gnosisSafe;
    }

    function recallNFTs(uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            IVestedZeroNFT.LockDetails memory lock = vest.tokenIdToLockDetails(tokenId);
            require(lock.category == IVestedZeroNFT.VestCategory.AIRDROP, "Token is not an airdrop NFT");
            vest.recallNFT(tokenId, gnosisSafe);
            emit NFTRecalled(tokenId, gnosisSafe);
        }
    }

}