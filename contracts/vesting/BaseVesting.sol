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
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract BaseVesting is IBasicVesting, Initializable {
    IStakingBonus public bonusPool;
    IERC20 public underlying;
    IERC20Burnable public vestedToken;
    uint256 public lastId;

    mapping(uint256 => VestInfo) public vests;
    mapping(address => uint256) public userVestCounts;
    mapping(address => mapping(uint256 => uint256)) public userToIds;

    constructor() {
        _disableInitializers();
    }

    function __BaseVesting_init(
        IERC20 _underlying,
        IERC20Burnable _vestedToken,
        IStakingBonus _bonusPool
    ) internal {
        underlying = _underlying;
        vestedToken = _vestedToken;
        bonusPool = _bonusPool;
        // underlying.approve(address(_locker), type(uint256).max);
    }

    function createVest(uint256 amount) external {
        _createVest(msg.sender, msg.sender, amount);
    }

    function createVestFor(address to, uint256 amount) external {
        _createVest(msg.sender, to, amount);
    }

    function _createVest(address from, address to, uint256 amount) internal {
        vestedToken.burnFrom(from, amount);
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

    function stakeTo4Year(uint256 id, bool _stake) external {
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

    function claimVest(uint256 id) external virtual;

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
        _penaltyAmt = penalty(vest);

        uint256 pendingAmt = vest.amount - vest.claimedAmount;
        _claimableWithPenalty =
            pendingAmt -
            ((pendingAmt * _penaltyAmt) / 1e18);
    }

    function claimable(uint256 id) external view virtual returns (uint256) {
        VestInfo memory vest = vests[id];
        uint256 _penalty = penalty(vest);
        return vest.amount - ((vest.amount * _penalty) / 1e18);
    }

    function _claimable(VestInfo memory vest) internal view returns (uint256) {
        if (vest.claimedAmount >= vest.amount) return 0;
        return
            _claimable(vest.amount, vest.startAt, block.timestamp) -
            vest.claimedAmount;
    }

    function penalty(VestInfo memory vest) public view returns (uint256) {
        return penalty(vest.startAt, block.timestamp);
    }

    function penalty(
        uint256 startTime,
        uint256 nowTime
    ) public view virtual returns (uint256);

    function _claimable(
        uint256 amount,
        uint256 startTime,
        uint256 nowTime
    ) internal view virtual returns (uint256);

    function vestIds(address who) external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](userVestCounts[who]);

        for (uint i = 0; i < userVestCounts[who]; i++) {
            uint256 id = userToIds[who][i];
            ids[i] = id;
        }

        return ids;
    }
}
