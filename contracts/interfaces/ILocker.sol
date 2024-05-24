// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import {IERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

interface ILocker is IERC721Enumerable {
    struct LockedBalance {
        uint256 amount;
        uint256 end;
        uint256 start;
        uint256 power;
    }

    function balanceOfNFT(uint256 _tokenId) external view returns (uint256);

    function underlying() external view returns (IERC20);

    function balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) external view returns (uint256);

    function locked(
        uint256 _tokenId
    ) external view returns (LockedBalance memory);

    function increaseAmount(uint256 _tokenId, uint256 _value) external;

    /// @notice Extend the unlock time for `_tokenId`
    /// @param _lockDuration New number of seconds until tokens unlock
    function increaseUnlockTime(
        uint256 _tokenId,
        uint256 _lockDuration
    ) external;
}
