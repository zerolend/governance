// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.12;

// ███████╗███████╗██████╗  ██████╗
// ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
//   ███╔╝ █████╗  ██████╔╝██║   ██║
//  ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
// ███████╗███████╗██║  ██║╚██████╔╝
// ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝

// Website: https://zerolend.xyz
// Discord: https://discord.gg/zerolend
// Twitter: https://twitter.com/zerolendxyz

import {Ownable} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/Ownable.sol";
import {ITransferStrategyBase} from "@zerolendxyz/periphery-v3/contracts/rewards/interfaces/ITransferStrategyBase.sol";
import {IVestedZeroNFT} from "../../../interfaces/IVestedZeroNFT.sol";
import {IERC20} from "@zerolendxyz/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

/// @title A transfer strategy that create a vested NFT for every ZERO claimed
/// @author Deadshot Ryker
contract TransferStrategyZERO is Ownable, ITransferStrategyBase {
    IERC20 public immutable zero;
    IVestedZeroNFT public immutable vestedZERO;
    uint256 duration;

    address internal immutable INCENTIVES_CONTROLLER;

    /**
     * @dev Modifier for incentives controller only functions
     */
    modifier onlyIncentivesController() {
        require(
            INCENTIVES_CONTROLLER == msg.sender,
            "CALLER_NOT_INCENTIVES_CONTROLLER"
        );
        _;
    }

    constructor(
        address _incentivesController,
        address _vestedZERO,
        address _zero
    ) {
        zero = IERC20(_zero);
        zero.approve(_vestedZERO, type(uint256).max);
        vestedZERO = IVestedZeroNFT(_vestedZERO);

        INCENTIVES_CONTROLLER = _incentivesController;

        duration = 86400 * 30 * 1; // 1 month linear
    }

    /// @inheritdoc ITransferStrategyBase
    function performTransfer(
        address to,
        address reward,
        uint256 amount
    )
        external
        override(ITransferStrategyBase)
        onlyIncentivesController
        returns (bool)
    {
        require(reward == address(zero), "invalid reward");
        vestedZERO.mint(
            to, // address _who,
            amount, // uint256 _pending,
            0, // uint256 _upfront,
            duration, // uint256 _linearDuration,
            0, // uint256 _cliffDuration,
            block.timestamp, // uint256 _unlockDate,
            true, // bool _hasPenalty,
            IVestedZeroNFT.VestCategory.NORMAL // VestCategory _category
        );
        return true;
    }

    /// @inheritdoc ITransferStrategyBase
    function getIncentivesController()
        external
        view
        override
        returns (address)
    {
        return INCENTIVES_CONTROLLER;
    }

    /// @inheritdoc ITransferStrategyBase
    function getRewardsAdmin() external view override returns (address) {
        return owner();
    }

    /// @inheritdoc ITransferStrategyBase
    function emergencyWithdrawal(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(to, amount);
        emit EmergencyWithdrawal(msg.sender, token, to, amount);
    }

    function setVestingDuration(uint256 _duration) external onlyOwner {
        duration = _duration;
    }
}
