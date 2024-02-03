// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// ███████╗███████╗██████╗  ██████╗
// ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
//   ███╔╝ █████╗  ██████╔╝██║   ██║
//  ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
// ███████╗███████╗██║  ██║╚██████╔╝
// ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝

// Website: https://zerolend.xyz
// Discord: https://discord.gg/zerolend
// Twitter: https://twitter.com/zerolendxyz

import {IBasicVesting} from "../interfaces/IBasicVesting.sol";
import {IBonusPool} from "../interfaces/IBonusPool.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Burnable} from "../interfaces/IERC20Burnable.sol";
import {IZeroLocker} from "../interfaces/IZeroLocker.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract LinearVesting is
    IBasicVesting,
    OwnableUpgradeable,
    PausableUpgradeable
{
    address public dead;
    IBonusPool public bonusPool;
    IERC20 public underlying;
    IERC20Burnable public vestedToken;
    IZeroLocker public locker;
    uint256 public duration;
    uint256 public lastId;

    mapping(uint256 => VestInfo) public vests;
    mapping(address => uint256) public userVestCounts;
    mapping(address => mapping(uint256 => uint256)) public userToIds;

    // constructor() {
    //     _disableInitializers();
    // }

    function initialize(
        IERC20 _underlying,
        IERC20Burnable _vestedToken,
        IZeroLocker _locker,
        IBonusPool _bonusPool
    ) external initializer {
        underlying = _underlying;
        vestedToken = _vestedToken;
        locker = _locker;
        bonusPool = _bonusPool;
        underlying.approve(address(_locker), type(uint256).max);

        dead = address(0xdead);
        duration = 3 * 30 days; // 3 months vesting

        __Ownable_init(msg.sender);
        __Pausable_init();

        _pause();
    }

    function start() external onlyOwner {
        _unpause();
        renounceOwnership();
    }

    function createVest(uint256 amount) external whenNotPaused {
        _createVest(msg.sender, msg.sender, amount);
    }

    function createVestFor(address to, uint256 amount) external whenNotPaused {
        _createVest(msg.sender, to, amount);
    }

    function _createVest(
        address from,
        address to,
        uint256 amount
    ) internal whenNotPaused {
        vestedToken.burnFrom(from, amount);
        lastId++;

        vests[lastId] = VestInfo({
            who: to,
            id: lastId,
            amount: amount,
            claimed: 0,
            startAt: block.timestamp
        });

        uint256 userVestCount = userVestCounts[to];
        userToIds[to][userVestCount] = lastId;
        userVestCounts[to] = userVestCount + 1;

        emit VestingCreated(to, lastId, amount, block.timestamp);
    }

    function stakeTo4Year(uint256 id, bool _stake) external whenNotPaused {
        VestInfo memory vest = vests[id];
        require(msg.sender == vest.who, "not owner");

        uint256 lockAmount = vest.amount - vest.claimed;

        // update the lock as fully claimed
        vest.claimed = vest.amount;
        vests[id] = vest;

        // check if we can give a 20% bonus for 4 year staking
        uint256 bonusAmount = bonusPool.calculateBonus(lockAmount);
        if (underlying.balanceOf(address(bonusPool)) >= bonusAmount) {
            underlying.transferFrom(
                address(bonusPool),
                address(this),
                bonusAmount
            );
            lockAmount += bonusAmount;
        }

        // create a 4 year lock for the user
        locker.createLockFor(lockAmount, 86400 * 365 * 4, msg.sender, _stake);
    }

    function claimVest(uint256 id) external whenNotPaused {
        VestInfo memory vest = vests[id];
        require(msg.sender == vest.who, "not owner");

        uint256 val = _claimable(vest);
        require(val > 0, "no claimable amount");

        // update
        vest.claimed += val;
        vests[id] = vest;

        // send reward
        underlying.transfer(msg.sender, val);
        emit TokensReleased(msg.sender, id, val);
    }

    function vestStatus(
        address who,
        uint256 index
    )
        external
        view
        returns (
            uint256 _id,
            uint256 _amount,
            uint256 _claimed,
            uint256 _claimableAmt,
            uint256 _penaltyAmt,
            uint256 _claimableWithPenalty
        )
    {
        _id = userToIds[who][index];

        VestInfo memory vest = vests[_id];
        _amount = vest.amount;
        _claimed = vest.claimed;

        _claimableAmt = _claimable(vest);
        _penaltyAmt = 0;

        uint256 pendingAmt = vest.amount - vest.claimed;
        _claimableWithPenalty =
            pendingAmt -
            ((pendingAmt * _penaltyAmt) / 1e18);
    }

    function claimable(uint256 id) external view returns (uint256) {
        VestInfo memory vest = vests[id];
        return _claimable(vest);
    }

    function _claimable(VestInfo memory vest) internal view returns (uint256) {
        if (vest.claimed >= vest.amount) return 0;
        return
            _claimable(vest.amount, vest.startAt, block.timestamp) -
            vest.claimed;
    }

    function _claimable(
        uint256 amount,
        uint256 startTime,
        uint256 nowTime
    ) internal view returns (uint256) {
        // if vesting is over, then claim the full amount
        if (nowTime > startTime + duration) return amount;

        // if vesting hasn't started then don't claim anything
        if (nowTime < startTime) return 0;

        // else return a percentage
        return (amount * (nowTime - startTime)) / duration;
    }

    function vestIds(address who) external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](userVestCounts[who]);

        for (uint i = 0; i < userVestCounts[who]; i++) {
            uint256 id = userToIds[who][i];
            ids[i] = id;
        }

        return ids;
    }
}
