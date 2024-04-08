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

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20Burnable} from "../../interfaces/IERC20Burnable.sol";
import {IVestedZeroNFT} from "../../interfaces/IVestedZeroNFT.sol";
import {IZeroLocker} from "../../interfaces/IZeroLocker.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract EarlyZEROVesting is OwnableUpgradeable {
    IERC20Burnable public earlyZERO;
    IVestedZeroNFT public vesting;
    address public stakingBonus;
    uint256 public spent;
    bool public enableVesting;

    function init(
        address _earlyZERO,
        address _vesting,
        address _stakingBonus
    ) external initializer {
        __Ownable_init(msg.sender);

        earlyZERO = IERC20Burnable(_earlyZERO);
        vesting = IVestedZeroNFT(_vesting);
        stakingBonus = _stakingBonus;
        enableVesting = false;
    }

    function startVesting(uint256 amount, bool stake) external {
        require(enableVesting || stake, "vesting not enabled; staking only");
        earlyZERO.burnFrom(msg.sender, amount);

        // vesting for earlyZERO is 25% upfront, 1 month cliff and
        // the rest (75%) across 3 months

        uint256 id = vesting.mint(
            stake ? address(this) : msg.sender, // address _who,
            (amount * 75) / 100, // uint256 _pending,
            (amount * 25) / 100, // uint256 _upfront,
            86400 * 30 * 3, // uint256 _linearDuration,
            86400 * 30, // uint256 _cliffDuration,
            block.timestamp, // uint256 _unlockDate,
            false, // bool _hasPenalty
            IVestedZeroNFT.VestCategory.EARLY_ZERO
        );

        // if the user chooses to stake then make sure to give the staking bonus
        if (stake) {
            IERC721(address(vesting)).safeTransferFrom(
                address(this),
                stakingBonus,
                id,
                abi.encode(true, msg.sender)
            );
        }

        spent += amount;
    }

    function toggleVesting() external onlyOwner {
        enableVesting = !enableVesting;
    }
}
