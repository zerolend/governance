// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IATokenWithRecall {
    function recall(address from, address to, uint256 amount) external;
}
