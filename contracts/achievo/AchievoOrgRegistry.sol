// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AchievoOrgRegistry
/// @notice On-chain registry for organization creation with fee gating.
/// @dev Admin role is expected to be a timelock; handle uniqueness is enforced by handle hash.
contract AchievoOrgRegistry is AccessControl, Pausable, ReentrancyGuard {
    uint256 public createOrgFee;
    address public treasury;

    mapping(bytes32 => address) public orgCreatorByHandleHash;
    mapping(bytes32 => uint64) public orgCreatedAtByHandleHash;

    event OrgCreated(bytes32 indexed handleHash, string handle, address indexed creator, uint64 createdAt, uint256 feePaid);
    event CreateOrgFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error InvalidHandle();
    error HandleTaken();
    error InsufficientFee(uint256 requiredFee, uint256 providedFee);
    error TreasuryZero();
    error AdminZero();
    error FeeTransferFailed();
    error RefundFailed();

    /// @notice Initializes fee, treasury, and admin role.
    /// @param initialFee Fee required for createOrg.
    /// @param initialTreasury Treasury address receiving fees.
    /// @param admin Admin role address (expected timelock).
    constructor(uint256 initialFee, address initialTreasury, address admin) {
        if (admin == address(0)) revert AdminZero();
        if (initialTreasury == address(0)) revert TreasuryZero();
        createOrgFee = initialFee;
        treasury = initialTreasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Creates an organization handle and records the creator.
    /// @dev Refunds any excess payment and forwards fees to the treasury.
    /// @param handle Canonical org handle (lowercase a-z0-9- with length bounds).
    function createOrg(string calldata handle) external payable nonReentrant whenNotPaused {
        bytes32 handleHash = _validateHandle(handle);
        if (orgCreatorByHandleHash[handleHash] != address(0)) revert HandleTaken();

        uint256 fee = createOrgFee;
        if (msg.value < fee) revert InsufficientFee(fee, msg.value);

        orgCreatorByHandleHash[handleHash] = msg.sender;
        orgCreatedAtByHandleHash[handleHash] = uint64(block.timestamp);

        address treasuryAddr = treasury;
        (bool sent, ) = treasuryAddr.call{ value: fee }("");
        if (!sent) revert FeeTransferFailed();

        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool refunded, ) = msg.sender.call{ value: refund }("");
            if (!refunded) revert RefundFailed();
        }

        emit OrgCreated(handleHash, handle, msg.sender, uint64(block.timestamp), fee);
    }

    /// @notice Updates the org creation fee.
    /// @dev Restricted to the admin role.
    function setCreateOrgFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = createOrgFee;
        createOrgFee = newFee;
        emit CreateOrgFeeUpdated(oldFee, newFee);
    }

    /// @notice Updates the treasury address.
    /// @dev Restricted to the admin role.
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert TreasuryZero();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Pauses org creation.
    /// @dev Restricted to the admin role.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses org creation.
    /// @dev Restricted to the admin role.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _validateHandle(string calldata handle) internal pure returns (bytes32) {
        bytes memory raw = bytes(handle);
        uint256 length = raw.length;
        if (length < 3 || length > 32) revert InvalidHandle();

        bytes1 prev;
        for (uint256 i = 0; i < length; i++) {
            bytes1 c = raw[i];
            bool isLower = c >= 0x61 && c <= 0x7A;
            bool isDigit = c >= 0x30 && c <= 0x39;
            bool isDash = c == 0x2D;
            if (!(isLower || isDigit || isDash)) revert InvalidHandle();
            if (i == 0 || i == length - 1) {
                if (isDash) revert InvalidHandle();
            }
            if (isDash && prev == 0x2D) revert InvalidHandle();
            prev = c;
        }
        return keccak256(raw);
    }
}
