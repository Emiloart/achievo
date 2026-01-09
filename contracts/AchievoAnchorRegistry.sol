// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AchievoAnchorRegistry
/// @notice General-purpose registry for anchoring bytes32 hashes on-chain.
contract AchievoAnchorRegistry {
    struct AnchorRecord {
        address submitter;
        uint64 timestamp;
        uint8 kind;
    }

    uint8 public constant KIND_PROOF = 1;
    uint8 public constant KIND_VALIDATION = 2;
    uint8 public constant KIND_EXPORT = 3;
    uint8 public constant KIND_SUBMISSION = 4;

    address public owner;
    address public operator;

    mapping(bytes32 => AnchorRecord) public records;

    event Anchored(bytes32 indexed hash, address indexed submitter, uint64 timestamp, uint8 kind);
    event OperatorChanged(address oldOperator, address newOperator);
    event OwnershipTransferred(address oldOwner, address newOwner);

    error NotOwner();
    error NotOperator();
    error InvalidHash();
    error InvalidKind();
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

    function anchor(bytes32 hash, uint8 kind) external onlyOperator {
        _anchor(hash, kind);
    }

    function anchorBatch(bytes32[] calldata hashes, uint8 kind) external onlyOperator {
        for (uint256 i = 0; i < hashes.length; i++) {
            _anchor(hashes[i], kind);
        }
    }

    function isAnchored(bytes32 hash) external view returns (bool) {
        return records[hash].timestamp != 0;
    }

    function _anchor(bytes32 hash, uint8 kind) internal {
        if (hash == bytes32(0)) revert InvalidHash();
        if (kind == 0) revert InvalidKind();
        AnchorRecord storage record = records[hash];
        if (record.timestamp != 0) revert AlreadyAnchored();
        uint64 ts = uint64(block.timestamp);
        record.submitter = msg.sender;
        record.timestamp = ts;
        record.kind = kind;
        emit Anchored(hash, msg.sender, ts, kind);
    }
}
