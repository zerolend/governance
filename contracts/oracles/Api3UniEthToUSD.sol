// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@api3/contracts/api3-server-v1/proxies/interfaces/IProxy.sol";

interface AggregatorInterface {
    function decimals() external view returns (uint8);

    function latestAnswer() external view returns (int256);
}

contract Api3Oracle {
    AggregatorInterface immutable ETH_TO_USD_FEED;

    address marketApiProxy;

    error InvalidOraclePrice();
    error ZeroAddressNotAllowed();

    constructor(address _ethToUsdFeed, address _marketApiProxy) {
        if (address(_marketApiProxy) == address(0) || address(_ethToUsdFeed) == address(0))
            revert ZeroAddressNotAllowed();
        ETH_TO_USD_FEED = AggregatorInterface(_ethToUsdFeed);
        marketApiProxy = _marketApiProxy;
    }

    function latestAnswer() external view returns (int256 uniEthToUsdPrice) {
        int256 ethToUsd = ETH_TO_USD_FEED.latestAnswer();
        if (ethToUsd < 0) revert InvalidOraclePrice();
        (int224 value, ) = IProxy(marketApiProxy).read();
        uniEthToUsdPrice = (ethToUsd * int256(value))/1e18;
    }
}
