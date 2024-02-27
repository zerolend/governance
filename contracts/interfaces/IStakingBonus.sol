// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20Burnable} from "./IERC20Burnable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

interface IStakingBonus is IERC721Receiver {
    function setBonusBps(uint256 amount) external;

    function calculateBonus(uint256 amount) external returns (uint256);

    function bonusBps() external returns (uint256);

    event SetBonusBPS(uint256 oldValue, uint256 newValue);
}
