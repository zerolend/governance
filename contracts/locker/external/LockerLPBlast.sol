// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseLocker} from "../BaseLocker.sol";
import {IBlastPoints} from "../../interfaces/IBlastPoints.sol";
import {IHyperLockERC20} from "../../interfaces/IHyperLockERC20.sol";

contract LockerLPBlast is BaseLocker {
    IHyperLockERC20 hyperlock;

    function init(address _token, address _staking, address _hyperlock, address _pointsOperator) external initializer {
        __BaseLocker_init("Locked ZERO/ETH LP", "LP-ZERO", _token, _staking, 365 * 86400);

        hyperlock = IHyperLockERC20(_hyperlock);
        underlying.approve(_hyperlock, type(uint256).max);

        IBlastPoints(0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800).configurePointsOperator(_pointsOperator);
    }

    function _depositFor(
        uint256 _tokenId,
        uint256 _value,
        uint256 _unlockTime,
        LockedBalance memory _lock,
        DepositType _type
    ) internal override {
        super._depositFor(_tokenId, _value, _unlockTime, _lock, _type);
        uint256 bal = underlying.balanceOf(address(this));
        if (bal > 0) hyperlock.stake(address(underlying), bal, 0);
    }

    function withdraw(uint256 _tokenId) public override {
        LockedBalance memory _locked = locked[_tokenId];
        uint256 value = uint256(int256(_locked.amount));
        hyperlock.unstake(address(underlying), value);
        super.withdraw(_tokenId);
    }
}
