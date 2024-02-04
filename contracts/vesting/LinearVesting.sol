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
import {IStakingBonus} from "../interfaces/IStakingBonus.sol";
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
    IStakingBonus public bonusPool;
    IERC20 public underlying;
    IERC20Burnable public vestedToken;

    uint256 public duration;
    uint256 public lastId;

    mapping(uint256 => VestInfo) public vests;
    mapping(address => uint256) public userVestCounts;
    mapping(address => mapping(uint256 => uint256)) public userToIds;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        IERC20 _underlying,
        IERC20Burnable _vestedToken,
        IZeroLocker _locker,
        IStakingBonus _bonusPool
    ) external initializer {
        underlying = _underlying;
        vestedToken = _vestedToken;
        bonusPool = _bonusPool;
        underlying.approve(address(_locker), type(uint256).max);
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
        vestedToken.transferFrom(from, address(this), amount);
        lastId++;

        vests[lastId] = VestInfo({
            who: to,
            id: lastId,
            amount: amount,
            claimedAmount: 0,
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
        require(vest.claimedAmount == 0, "already claimed");
        require(vest.amount > 0, "no vest");

        uint256 lockAmount = vest.amount - vest.claimedAmount;

        // update the lock as fully claimed
        vest.claimedAmount = vest.amount;
        vests[id] = vest;

        underlying.transfer(address(bonusPool), lockAmount);
        bonusPool.convertVestedZERO4Year(
            lockAmount,
            msg.sender,
            _stake,
            IStakingBonus.PermitData({value: 0, deadline: 0, v: 0, r: 0, s: 0})
        );
    }

    function claimVest(uint256 id) external whenNotPaused {
        VestInfo memory vest = vests[id];
        require(msg.sender == vest.who, "not owner");

        uint256 val = _claimable(vest);
        require(val > 0, "no claimable amount");

        // update
        vest.claimedAmount = val;
        vests[id] = vest;

        // send reward
        underlying.transfer(msg.sender, val);
        emit TokensReleased(msg.sender, id, val);

        // burn vested tokens
        vestedToken.burn(vest.amount);
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
            bool _claimed,
            uint256 _claimableAmt,
            uint256 _penaltyAmt,
            uint256 _claimableWithPenalty
        )
    {
        _id = userToIds[who][index];

        VestInfo memory vest = vests[_id];
        _amount = vest.amount;
        _claimed = vest.claimedAmount > 0;

        _claimableAmt = _claimable(vest);
        _penaltyAmt = 0;

        _claimableWithPenalty =
            vest.amount -
            ((vest.amount * _penaltyAmt) / 1e18);
    }

    function claimable(uint256 id) external view returns (uint256) {
        VestInfo memory vest = vests[id];
        return _claimable(vest);
    }

    function _claimable(VestInfo memory vest) internal view returns (uint256) {
        if (vest.claimedAmount > 0) return 0;
        return _claimable(vest.amount, vest.startAt, block.timestamp);
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
        // todo add penalty here
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
