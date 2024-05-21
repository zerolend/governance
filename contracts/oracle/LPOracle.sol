// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "../interfaces/INileAMM.sol";

/// @title LPOracle
/// @notice This contract provides a price oracle for the liquidity pool tokens in a Nile AMM.
/// @dev This contract interacts with the INileAMM interface to fetch reserves and calculate prices.
contract LPOracle {
    INileAMM public immutable nileAMM;

    /// @notice Constructor sets the address of the Nile AMM contract.
    /// @param _nileAMM The address of the Nile AMM contract.
    constructor(address _nileAMM) {
        nileAMM = INileAMM(_nileAMM);
    }

    /// @notice Gets the price of the liquidity pool token.
    /// @dev This function fetches reserves from the Nile AMM and uses a pre-defined price for tokens to calculate the LP token price.
    /// @return price The price of the liquidity pool token.
    function getPrice() public view returns (uint256 price) {
        (uint256 reserve0, uint256 reserve1, ) = nileAMM.getReserves();

        // Would be using the below addresses to get the correct price of tokens
        // (address token0, address token1) = nileAMM.tokens();

        uint256 priceToken0 = 7535372323661165209109195;
        uint256 priceToken1 = 1;

        price = (2 * sqrt(reserve0 * reserve1) * sqrt(priceToken0 * priceToken1)) / nileAMM.totalSupply();
    }

    /// @notice Computes the square root of a given number using the Babylonian method.
    /// @dev This function uses an iterative method to compute the square root of a number.
    /// @param x The number to compute the square root of.
    /// @return y The square root of the given number.
    function sqrt(uint x) public pure returns (uint y) {
        if (x == 0) return 0;  // Handle the edge case for 0
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
