// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AchievoUsernameRegistryV1
/// @notice Canonical registry for username ownership and transfer.
contract AchievoUsernameRegistryV1 {
    address public owner;
    address public operator;

    mapping(bytes32 => address) public usernameOwner;
    mapping(address => string) public primaryUsername;

    event UsernameClaimed(string username, address owner);
    event UsernameReleased(string username, address owner);
    event UsernameTransferred(string username, address from, address to);
    event OperatorChanged(address oldOperator, address newOperator);
    event OwnershipTransferred(address oldOwner, address newOwner);

    error NotOwner();
    error NotOperator();
    error InvalidUsername();
    error UsernameTaken();
    error NotUsernameOwner();
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
        emit OperatorChanged(address(0), _operator);
    }

    function setOperator(address newOperator) external onlyOwner {
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function claimUsername(string calldata username) external {
        string memory normalized = _normalizeUsername(username);
        bytes32 key = keccak256(bytes(normalized));
        if (usernameOwner[key] != address(0)) revert UsernameTaken();
        usernameOwner[key] = msg.sender;
        primaryUsername[msg.sender] = username;
        emit UsernameClaimed(username, msg.sender);
    }

    function releaseUsername(string calldata username) external {
        string memory normalized = _normalizeUsername(username);
        bytes32 key = keccak256(bytes(normalized));
        if (usernameOwner[key] != msg.sender) revert NotUsernameOwner();
        delete usernameOwner[key];
        if (_stringsEqual(primaryUsername[msg.sender], username)) {
            delete primaryUsername[msg.sender];
        }
        emit UsernameReleased(username, msg.sender);
    }

    function transferUsername(address from, address to, string calldata username) external {
        if (msg.sender != operator) revert NotOperator();
        if (to == address(0)) revert InvalidAddress();
        string memory normalized = _normalizeUsername(username);
        bytes32 key = keccak256(bytes(normalized));
        if (usernameOwner[key] != from) revert NotUsernameOwner();
        usernameOwner[key] = to;
        if (_stringsEqual(primaryUsername[from], username)) {
            delete primaryUsername[from];
        }
        primaryUsername[to] = username;
        emit UsernameTransferred(username, from, to);
    }

    function ownerOfUsername(string calldata username) external view returns (address) {
        string memory normalized = _normalizeUsername(username);
        return usernameOwner[keccak256(bytes(normalized))];
    }

    function getPrimaryUsername(address wallet) external view returns (string memory) {
        return primaryUsername[wallet];
    }

    function _normalizeUsername(string memory username) internal pure returns (string memory) {
        bytes memory input = bytes(username);
        if (input.length < 3 || input.length > 32) revert InvalidUsername();
        bytes memory output = new bytes(input.length);
        bytes1 prev;
        for (uint256 i = 0; i < input.length; i++) {
            bytes1 char = input[i];
            if (char >= 0x41 && char <= 0x5A) {
                char = bytes1(uint8(char) + 32); // to lowercase
            }
            bool isLower = (char >= 0x61 && char <= 0x7A);
            bool isDigit = (char >= 0x30 && char <= 0x39);
            bool isDot = (char == 0x2E);
            bool isUnderscore = (char == 0x5F);
            bool isDash = (char == 0x2D);
            if (!(isLower || isDigit || isDot || isUnderscore || isDash)) revert InvalidUsername();
            if (i == 0 || i == input.length - 1) {
                if (isDot || isUnderscore || isDash) revert InvalidUsername();
            }
            if (i > 0 && prev == char && (isDot || isUnderscore || isDash)) revert InvalidUsername();
            output[i] = char;
            prev = char;
        }
        return string(output);
    }

    function _stringsEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
