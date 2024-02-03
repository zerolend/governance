// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC165, ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {IZeroLocker} from "../interfaces/IZeroLocker.sol";
import {IOmnichainStaking} from "../interfaces/IOmnichainStaking.sol";

/**
  @title Voting Escrow
  @author Curve Finance
  @notice Votes have a weight depending on time, so that users are
  committed to the future of (whatever they are voting for)
  @dev Vote weight decays linearly over time. Lock time cannot be
  more than `MAXTIME` (4 years).

  # Voting escrow to have time-weighted votes
  # Votes have a weight depending on time, so that users are committed
  # to the future of (whatever they are voting for).
  # The weight in this implementation is linear, and lock cannot be more than maxtime:
  # w ^
  # 1 +        /
  #   |      /
  #   |    /
  #   |  /
  #   |/
  # 0 +--------+------> time
  # maxtime (4 years?)
*/

contract LockerToken is
    ReentrancyGuardUpgradeable,
    ERC721EnumerableUpgradeable,
    IZeroLocker
{
    uint256 internal WEEK;
    uint256 internal MAXTIME;
    int128 internal iMAXTIME;
    uint256 internal MULTIPLIER;

    uint256 public supply;
    mapping(uint256 => LockedBalance) public locked;

    uint256 public override epoch;
    mapping(uint256 => Point) internal _pointHistory; // epoch -> unsigned point
    mapping(uint256 => Point[1000000000]) internal _userPointHistory; // user -> Point[userEpoch]
    mapping(uint256 => uint256) public override userPointEpoch;
    mapping(uint256 => int128) public slopeChanges; // time -> signed slope change

    string public version;
    uint8 public decimals;

    /// @dev Current count of token
    uint256 internal tokenId;

    IERC20 public token;
    IOmnichainStaking public staking;

    function init(address _token, address _staking) external initializer {
        __ERC721_init("Locked ZERO", "weZERO");
        version = "1.0.0";
        decimals = 18;

        WEEK = 1 weeks;
        MAXTIME = 4 * 365 * 86400;
        iMAXTIME = 4 * 365 * 86400;
        MULTIPLIER = 1 ether;

        staking = IOmnichainStaking(_staking);
        token = IERC20(_token);
        _pointHistory[0].blk = block.number;
        _pointHistory[0].ts = block.timestamp;
    }

    /// @dev Interface identification is specified in ERC-165.
    /// @param _interfaceID Id of the interface
    function supportsInterface(
        bytes4 _interfaceID
    )
        public
        pure
        override(ERC721EnumerableUpgradeable, IERC165)
        returns (bool)
    {
        return
            bytes4(0x01ffc9a7) == _interfaceID || // ERC165
            bytes4(0x80ac58cd) == _interfaceID || // ERC721
            bytes4(0x5b5e139f) == _interfaceID;
    }

    function totalSupplyWithoutDecay()
        external
        view
        override
        returns (uint256)
    {
        return supply;
    }

    function pointHistory(
        uint256 val
    ) external view override returns (Point memory) {
        return _pointHistory[val];
    }

    function userPointHistory(
        uint256 val,
        uint256 loc
    ) external view override returns (Point memory) {
        return _userPointHistory[val][loc];
    }

    /// @notice Get the most recently recorded rate of voting power decrease for `_tokenId`
    /// @param _tokenId token of the NFT
    /// @return Value of the slope
    function getLastUserSlope(uint256 _tokenId) external view returns (int128) {
        uint256 uepoch = userPointEpoch[_tokenId];
        return _userPointHistory[_tokenId][uepoch].slope;
    }

    /// @notice Get the timestamp for checkpoint `_idx` for `_tokenId`
    /// @param _tokenId token of the NFT
    /// @param _idx User epoch number
    /// @return Epoch time of the checkpoint
    function userPointHistoryTs(
        uint256 _tokenId,
        uint256 _idx
    ) external view returns (uint256) {
        return _userPointHistory[_tokenId][_idx].ts;
    }

    /// @notice Get timestamp when `_tokenId`'s lock finishes
    /// @param _tokenId User NFT
    /// @return Epoch time of the lock end
    function lockedEnd(uint256 _tokenId) external view returns (uint256) {
        return locked[_tokenId].end;
    }

    /// @dev Returns the voting power of the `_owner`.
    ///      Throws if `_owner` is the zero address. NFTs assigned to the zero address are considered invalid.
    /// @param _owner Address for whom to query the voting power of.
    function votingPowerOf(
        address _owner
    ) external view returns (uint256 _power) {
        for (uint256 index = 0; index < balanceOf(_owner); index++) {
            uint256 _tokenId = tokenOfOwnerByIndex(_owner, index);
            _power += _balanceOfNFT(_tokenId, block.timestamp);
        }
    }

    /// @notice Record global and per-user data to checkpoint
    /// @param _tokenId NFT token ID. No user checkpoint if 0
    /// @param oldLocked Pevious locked amount / end lock time for the user
    /// @param newLocked New locked amount / end lock time for the user
    function _checkpoint(
        uint256 _tokenId,
        LockedBalance memory oldLocked,
        LockedBalance memory newLocked
    ) internal {
        Point memory uOld;
        Point memory uNew;
        int128 oldDslope = 0;
        int128 newDslope = 0;
        uint256 _epoch = epoch;

        if (_tokenId != 0) {
            // Calculate slopes and biases
            // Kept at zero when they have to
            if (oldLocked.end > block.timestamp && oldLocked.amount > 0) {
                uOld.slope = oldLocked.amount / iMAXTIME;
                uOld.bias =
                    uOld.slope *
                    int128(int256(oldLocked.end - block.timestamp));
            }
            if (newLocked.end > block.timestamp && newLocked.amount > 0) {
                uNew.slope = newLocked.amount / iMAXTIME;
                uNew.bias =
                    uNew.slope *
                    int128(int256(newLocked.end - block.timestamp));
            }

            // Read values of scheduled changes in the slope
            // oldLocked.end can be in the past and in the future
            // newLocked.end can ONLY by in the FUTURE unless everything expired: than zeros
            oldDslope = slopeChanges[oldLocked.end];
            if (newLocked.end != 0) {
                if (newLocked.end == oldLocked.end) {
                    newDslope = oldDslope;
                } else {
                    newDslope = slopeChanges[newLocked.end];
                }
            }
        }

        Point memory lastPoint = Point({
            bias: 0,
            slope: 0,
            ts: block.timestamp,
            blk: block.number
        });
        if (_epoch > 0) {
            lastPoint = _pointHistory[_epoch];
        }
        uint256 lastCheckpoint = lastPoint.ts;
        // initialLastPoint is used for extrapolation to calculate block number
        // (approximately, for *At methods) and save them
        // as we cannot figure that out exactly from inside the contract
        Point memory initialLastPoint = lastPoint;
        uint256 blockSlope = 0; // dblock/dt
        if (block.timestamp > lastPoint.ts) {
            blockSlope =
                (MULTIPLIER * (block.number - lastPoint.blk)) /
                (block.timestamp - lastPoint.ts);
        }
        // If last point is already recorded in this block, slope=0
        // But that's ok b/c we know the block in such case

        // Go over weeks to fill history and calculate what the current point is
        {
            uint256 tI = (lastCheckpoint / WEEK) * WEEK;
            for (uint256 i = 0; i < 255; ++i) {
                // Hopefully it won't happen that this won't get used in 5 years!
                // If it does, users will be able to withdraw but vote weight will be broken
                tI += WEEK;
                int128 dSlope = 0;
                if (tI > block.timestamp) {
                    tI = block.timestamp;
                } else {
                    dSlope = slopeChanges[tI];
                }
                lastPoint.bias -=
                    lastPoint.slope *
                    int128(int256(tI - lastCheckpoint));
                lastPoint.slope += dSlope;
                if (lastPoint.bias < 0) {
                    // This can happen
                    lastPoint.bias = 0;
                }
                if (lastPoint.slope < 0) {
                    // This cannot happen - just in case
                    lastPoint.slope = 0;
                }
                lastCheckpoint = tI;
                lastPoint.ts = tI;
                lastPoint.blk =
                    initialLastPoint.blk +
                    (blockSlope * (tI - initialLastPoint.ts)) /
                    MULTIPLIER;
                _epoch += 1;
                if (tI == block.timestamp) {
                    lastPoint.blk = block.number;
                    break;
                } else {
                    _pointHistory[_epoch] = lastPoint;
                }
            }
        }

        epoch = _epoch;
        // Now _pointHistory is filled until t=now

        if (_tokenId != 0) {
            // If last point was in this block, the slope change has been applied already
            // But in such case we have 0 slope(s)
            lastPoint.slope += (uNew.slope - uOld.slope);
            lastPoint.bias += (uNew.bias - uOld.bias);
            if (lastPoint.slope < 0) {
                lastPoint.slope = 0;
            }
            if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
            }
        }

        // Record the changed point into history
        _pointHistory[_epoch] = lastPoint;

        if (_tokenId != 0) {
            // Schedule the slope changes (slope is going down)
            // We subtract new_user_slope from [newLocked.end]
            // and add old_user_slope to [oldLocked.end]
            if (oldLocked.end > block.timestamp) {
                // oldDslope was <something> - uOld.slope, so we cancel that
                oldDslope += uOld.slope;
                if (newLocked.end == oldLocked.end) {
                    oldDslope -= uNew.slope; // It was a new deposit, not extension
                }
                slopeChanges[oldLocked.end] = oldDslope;
            }

            if (newLocked.end > block.timestamp) {
                if (newLocked.end > oldLocked.end) {
                    newDslope -= uNew.slope; // old slope disappeared at this point
                    slopeChanges[newLocked.end] = newDslope;
                }
                // else: we recorded it already in oldDslope
            }
            // Now handle user history
            uint256 userEpoch = userPointEpoch[_tokenId] + 1;

            userPointEpoch[_tokenId] = userEpoch;
            uNew.ts = block.timestamp;
            uNew.blk = block.number;
            _userPointHistory[_tokenId][userEpoch] = uNew;
        }
    }

    /// @notice Deposit and lock tokens for a user
    /// @param _tokenId NFT that holds lock
    /// @param _value Amount to deposit
    /// @param unlockTime New time when to unlock the tokens, or 0 if unchanged
    /// @param lockedBalance Previous locked amount / timestamp
    /// @param depositType The type of deposit
    function _depositFor(
        uint256 _tokenId,
        uint256 _value,
        uint256 unlockTime,
        LockedBalance memory lockedBalance,
        DepositType depositType
    ) internal {
        LockedBalance memory _locked = lockedBalance;
        uint256 supplyBefore = supply;

        supply = supplyBefore + _value;
        LockedBalance memory oldLocked;
        (oldLocked.amount, oldLocked.end) = (_locked.amount, _locked.end);

        // Adding to existing lock, or if a lock is expired - creating a new one
        _locked.amount += int128(int256(_value));
        if (unlockTime != 0) {
            _locked.end = unlockTime;
        }
        if (depositType == DepositType.CREATE_LOCK_TYPE) {
            _locked.start = block.timestamp;
        }

        locked[_tokenId] = _locked;

        // Possibilities:
        // Both oldLocked.end could be current or expired (>/< block.timestamp)
        // value == 0 (extend lock) or value > 0 (add to lock or extend lock)
        // _locked.end > block.timestamp (always)
        _checkpoint(_tokenId, oldLocked, _locked);

        address from = msg.sender;
        if (_value != 0 && depositType != DepositType.MERGE_TYPE) {
            assert(token.transferFrom(from, address(this), _value));
        }

        emit Deposit(
            from,
            _tokenId,
            _value,
            _locked.end,
            depositType,
            block.timestamp
        );
        emit Supply(supplyBefore, supplyBefore + _value);
    }

    function merge(uint256 _from, uint256 _to) external override {
        require(_from != _to, "same nft");
        require(
            _isAuthorized(ownerOf(_from), msg.sender, _from),
            "from not approved"
        );
        require(
            _isAuthorized(ownerOf(_to), msg.sender, _to),
            "to not approved"
        );

        LockedBalance memory _locked0 = locked[_from];
        LockedBalance memory _locked1 = locked[_to];
        uint256 value0 = uint256(int256(_locked0.amount));
        uint256 end = _locked0.end >= _locked1.end
            ? _locked0.end
            : _locked1.end;

        locked[_from] = LockedBalance(0, 0, 0);
        _checkpoint(_from, _locked0, LockedBalance(0, 0, 0));
        _burn(_from);
        _depositFor(_to, value0, end, _locked1, DepositType.MERGE_TYPE);
    }

    function blockNumber() external view override returns (uint256) {
        return block.number;
    }

    /// @notice Record global data to checkpoint
    function checkpoint() external override {
        _checkpoint(0, LockedBalance(0, 0, 0), LockedBalance(0, 0, 0));
    }

    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
    /// @dev Anyone (even a smart contract) can deposit for someone else, but
    ///      cannot extend their locktime and deposit for a brand new user
    /// @param _tokenId lock NFT
    /// @param _value Amount to add to user's lock
    function depositFor(
        uint256 _tokenId,
        uint256 _value
    ) external override nonReentrant {
        LockedBalance memory _locked = locked[_tokenId];

        require(_value > 0, "value = 0"); // dev: need non-zero value
        require(_locked.amount > 0, "No existing lock found");
        require(_locked.end > block.timestamp, "Cannot add to expired lock.");
        _depositFor(_tokenId, _value, 0, _locked, DepositType.DEPOSIT_FOR_TYPE);
    }

    /// @notice Deposit `_value` tokens for `_to` and lock for `_lockDuration`
    /// @param _value Amount to deposit
    /// @param _lockDuration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _to Address to deposit
    function createLockFor(
        uint256 _value,
        uint256 _lockDuration,
        address _to,
        bool _stakeNFT
    ) external override nonReentrant returns (uint256) {
        return _createLock(_value, _lockDuration, _to, _stakeNFT);
    }

    /// @notice Deposit `_value` tokens for `msg.sender` and lock for `_lockDuration`
    /// @param _value Amount to deposit
    /// @param _lockDuration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _stakeNFT Should we also stake the NFT as well?
    function createLock(
        uint256 _value,
        uint256 _lockDuration,
        bool _stakeNFT
    ) external override nonReentrant returns (uint256) {
        return _createLock(_value, _lockDuration, msg.sender, _stakeNFT);
    }

    /// @notice Deposit `_value` additional tokens for `_tokenId` without modifying the unlock time
    /// @param _value Amount of tokens to deposit and add to the lock
    function increaseAmount(
        uint256 _tokenId,
        uint256 _value
    ) external nonReentrant {
        require(
            _isAuthorized(_ownerOf(_tokenId), msg.sender, _tokenId),
            "caller is not owner nor approved"
        );
        LockedBalance memory _locked = locked[_tokenId];

        assert(_value > 0); // dev: need non-zero value
        require(_locked.amount > 0, "No existing lock found");
        require(_locked.end > block.timestamp, "Cannot add to expired lock.");

        _depositFor(
            _tokenId,
            _value,
            0,
            _locked,
            DepositType.INCREASE_LOCK_AMOUNT
        );
    }

    /// @notice Extend the unlock time for `_tokenId`
    /// @param _lockDuration New number of seconds until tokens unlock
    function increaseUnlockTime(
        uint256 _tokenId,
        uint256 _lockDuration
    ) external nonReentrant {
        require(
            _isAuthorized(ownerOf(_tokenId), msg.sender, _tokenId),
            "caller is not owner nor approved"
        );

        LockedBalance memory _locked = locked[_tokenId];
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK; // Locktime is rounded down to weeks

        require(_locked.end > block.timestamp, "Lock expired");
        require(_locked.amount > 0, "Nothing is locked");
        require(unlockTime > _locked.end, "Can only increase lock duration");
        require(
            unlockTime <= block.timestamp + MAXTIME,
            "Voting lock can be 4 years max"
        );
        require(
            unlockTime <= _locked.start + MAXTIME,
            "Voting lock can be 4 years max"
        );

        _depositFor(
            _tokenId,
            0,
            unlockTime,
            _locked,
            DepositType.INCREASE_UNLOCK_TIME
        );
    }

    /// @notice Withdraw all tokens for `_tokenId`
    /// @dev Only possible if the lock has expired
    function withdraw(uint256 _tokenId) external nonReentrant {
        require(
            _isAuthorized(ownerOf(_tokenId), msg.sender, _tokenId),
            "caller is not owner nor approved"
        );

        LockedBalance memory _locked = locked[_tokenId];
        require(block.timestamp >= _locked.end, "The lock didn't expire");
        uint256 value = uint256(int256(_locked.amount));

        locked[_tokenId] = LockedBalance(0, 0, 0);
        uint256 supplyBefore = supply;
        supply = supplyBefore - value;

        // oldLocked can have either expired <= timestamp or zero end
        // _locked has only 0 end
        // Both can have >= 0 amount
        _checkpoint(_tokenId, _locked, LockedBalance(0, 0, 0));

        assert(token.transfer(msg.sender, value));

        // Burn the NFT
        _burn(_tokenId);

        emit Withdraw(msg.sender, _tokenId, value, block.timestamp);
        emit Supply(supplyBefore, supplyBefore - value);
    }

    /// @notice Deposit `_value` tokens for `_to` and lock for `_lockDuration`
    /// @param _value Amount to deposit
    /// @param _lockDuration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _to Address to deposit
    /// @param _stakeNFT should we stake into the staking contract
    function _createLock(
        uint256 _value,
        uint256 _lockDuration,
        address _to,
        bool _stakeNFT
    ) internal returns (uint256) {
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK; // Locktime is rounded down to weeks

        require(_value > 0, "value = 0"); // dev: need non-zero value
        require(unlockTime > block.timestamp, "Can only lock in the future");
        require(
            unlockTime <= block.timestamp + MAXTIME,
            "Voting lock can be 4 years max"
        );

        ++tokenId;
        uint256 _tokenId = tokenId;
        _mint(_to, _tokenId);

        _depositFor(
            _tokenId,
            _value,
            unlockTime,
            locked[_tokenId],
            DepositType.CREATE_LOCK_TYPE
        );

        if (_stakeNFT) staking.stakeTokenFor(_to, _tokenId);

        return _tokenId;
    }

    // The following ERC20/minime-compatible methods are not real balanceOf and supply!
    // They measure the weights for the purpose of voting, so they don't represent
    // real coins.

    /// @notice Binary search to estimate timestamp for block number
    /// @param _block Block to find
    /// @param maxEpoch Don't go beyond this epoch
    /// @return Approximate timestamp for block
    function _findBlockEpoch(
        uint256 _block,
        uint256 maxEpoch
    ) internal view returns (uint256) {
        // Binary search
        uint256 _min = 0;
        uint256 _max = maxEpoch;
        for (uint256 i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint256 _mid = (_min + _max + 1) / 2;
            if (_pointHistory[_mid].blk <= _block) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    /// @notice Get the current voting power for `_tokenId`
    /// @dev Adheres to the ERC20 `balanceOf` interface for Aragon compatibility
    /// @param _tokenId NFT for lock
    /// @param _t Epoch time to return voting power at
    /// @return User voting power
    function _balanceOfNFT(
        uint256 _tokenId,
        uint256 _t
    ) internal view returns (uint256) {
        uint256 _epoch = userPointEpoch[_tokenId];
        if (_epoch == 0) {
            return 0;
        } else {
            Point memory lastPoint = _userPointHistory[_tokenId][_epoch];
            lastPoint.bias -=
                lastPoint.slope *
                int128(int256(_t) - int256(lastPoint.ts));
            if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
            }
            return uint256(int256(lastPoint.bias));
        }
    }

    function balanceOfNFT(
        uint256 _tokenId
    ) external view override returns (uint256) {
        return _balanceOfNFT(_tokenId, block.timestamp);
    }

    function balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) external view returns (uint256) {
        return _balanceOfNFT(_tokenId, _t);
    }

    /// @notice Measure voting power of `_tokenId` at block height `_block`
    /// @dev Adheres to MiniMe `balanceOfAt` interface: https://github.com/Giveth/minime
    /// @param _tokenId User's wallet NFT
    /// @param _block Block to calculate the voting power at
    /// @return Voting power
    function _balanceOfAtNFT(
        uint256 _tokenId,
        uint256 _block
    ) internal view returns (uint256) {
        // Copying and pasting totalSupply code because Vyper cannot pass by
        // reference yet
        assert(_block <= block.number);

        // Binary search
        uint256 _min = 0;
        uint256 _max = userPointEpoch[_tokenId];
        for (uint256 i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint256 _mid = (_min + _max + 1) / 2;
            if (_userPointHistory[_tokenId][_mid].blk <= _block) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }

        Point memory upoint = _userPointHistory[_tokenId][_min];

        uint256 maxEpoch = epoch;
        uint256 _epoch = _findBlockEpoch(_block, maxEpoch);
        Point memory point0 = _pointHistory[_epoch];
        uint256 dBlock = 0;
        uint256 dT = 0;
        if (_epoch < maxEpoch) {
            Point memory point1 = _pointHistory[_epoch + 1];
            dBlock = point1.blk - point0.blk;
            dT = point1.ts - point0.ts;
        } else {
            dBlock = block.number - point0.blk;
            dT = block.timestamp - point0.ts;
        }
        uint256 blockTime = point0.ts;
        if (dBlock != 0) {
            blockTime += (dT * (_block - point0.blk)) / dBlock;
        }

        upoint.bias -= upoint.slope * int128(int256(blockTime - upoint.ts));
        if (upoint.bias >= 0) {
            return uint256(uint128(upoint.bias));
        } else {
            return 0;
        }
    }

    function balanceOfAtNFT(
        uint256 _tokenId,
        uint256 _block
    ) external view returns (uint256) {
        return _balanceOfAtNFT(_tokenId, _block);
    }

    /// @notice Calculate total voting power at some point in the past
    /// @param point The point (bias/slope) to start search from
    /// @param t Time to calculate the total voting power at
    /// @return Total voting power at that time
    function _supplyAt(
        Point memory point,
        uint256 t
    ) internal view returns (uint256) {
        Point memory lastPoint = point;
        uint256 tI = (lastPoint.ts / WEEK) * WEEK;
        for (uint256 i = 0; i < 255; ++i) {
            tI += WEEK;
            int128 dSlope = 0;
            if (tI > t) {
                tI = t;
            } else {
                dSlope = slopeChanges[tI];
            }
            lastPoint.bias -=
                lastPoint.slope *
                int128(int256(tI - lastPoint.ts));
            if (tI == t) {
                break;
            }
            lastPoint.slope += dSlope;
            lastPoint.ts = tI;
        }

        if (lastPoint.bias < 0) {
            lastPoint.bias = 0;
        }
        return uint256(uint128(lastPoint.bias));
    }

    /// @notice Calculate total voting power
    /// @dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
    /// @return Total voting power
    function totalSupplyAtT(uint256 t) public view returns (uint256) {
        uint256 _epoch = epoch;
        Point memory lastPoint = _pointHistory[_epoch];
        return _supplyAt(lastPoint, t);
    }

    /// @notice Calculate total voting power at some point in the past
    /// @param _block Block to calculate the total voting power at
    /// @return Total voting power at `_block`
    function totalSupplyAt(
        uint256 _block
    ) external view override returns (uint256) {
        assert(_block <= block.number);
        uint256 _epoch = epoch;
        uint256 targetEpoch = _findBlockEpoch(_block, _epoch);

        Point memory point = _pointHistory[targetEpoch];
        uint256 dt = 0;
        if (targetEpoch < _epoch) {
            Point memory pointNext = _pointHistory[targetEpoch + 1];
            if (point.blk != pointNext.blk) {
                dt =
                    ((_block - point.blk) * (pointNext.ts - point.ts)) /
                    (pointNext.blk - point.blk);
            }
        } else {
            if (point.blk != block.number) {
                dt =
                    ((_block - point.blk) * (block.timestamp - point.ts)) /
                    (block.number - point.blk);
            }
        }
        // Now dt contains info on how far are we beyond point
        return _supplyAt(point, point.ts + dt);
    }
}
