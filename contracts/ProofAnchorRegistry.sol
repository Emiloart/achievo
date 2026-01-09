// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProofAnchorRegistry
/// @notice Minimal registry for anchoring proof hashes on-chain.
contract ProofAnchorRegistry {
    struct AnchorInfo {
        address submitter;
        uint64 timestamp;
    }

    address public owner;
    address public operator;

    mapping(bytes32 => AnchorInfo) public anchors;

    event ProofAnchored(bytes32 indexed hash, address indexed submitter, uint64 timestamp);
    event OperatorChanged(address oldOperator, address newOperator);
    event OwnershipTransferred(address oldOwner, address newOwner);

    error NotOwner();
    error NotOperator();
    error InvalidHash();
    error AlreadyAnchored();
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner) revert NotOperator();
        _;
    }

    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
        emit OperatorChanged(address(0), _operator);
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidAddress();
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function anchor(bytes32 hash) external onlyOperator {
        _anchor(hash);
    }

    function anchorBatch(bytes32[] calldata hashes) external onlyOperator {
        for (uint256 i = 0; i < hashes.length; i++) {
            _anchor(hashes[i]);
        }
    }

    function getAnchor(bytes32 hash) external view returns (address submitter, uint64 timestamp) {
        AnchorInfo memory info = anchors[hash];
        return (info.submitter, info.timestamp);
    }

    function _anchor(bytes32 hash) internal {
        if (hash == bytes32(0)) revert InvalidHash();
        AnchorInfo storage info = anchors[hash];
        if (info.timestamp != 0) revert AlreadyAnchored();
        uint64 ts = uint64(block.timestamp);
        info.submitter = msg.sender;
        info.timestamp = ts;
        emit ProofAnchored(hash, msg.sender, ts);
    }
}
