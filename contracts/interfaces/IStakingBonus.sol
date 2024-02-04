// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStakingBonus {
    struct PermitData {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function setBonusBps(uint256 amount) external;

    function calculateBonus(uint256 amount) external returns (uint256);

    function bonusBps() external returns (uint256);

    function convertEarlyZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external;

    function convertVestedZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external;

    function convertPreSaleZERO4Year(
        uint256 amount,
        address who,
        bool stake,
        PermitData memory permit
    ) external;

    event SetBonusBPS(uint256 oldValue, uint256 newValue);
}
