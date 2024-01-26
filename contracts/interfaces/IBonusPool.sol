// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBonusPool {
    function setBonusBps(uint256 amount) external;

    function calculateBonus(uint256 amount) external returns (uint256);

    function bonusBps() external returns (uint256);

    event SetBonusBPS(uint256 oldValue, uint256 newValue);
}
