// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface ILocker is IERC721Enumerable {
    function balanceOfNFT(uint256 _tokenId) external view returns (uint256);

    function balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) external view returns (uint256);
}
