// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AchievoIdentity
 * @notice Registers wallet-based user IDs (ACHUSR-XXXX) and manages recovery/sub-wallet bindings.
 */
contract AchievoIdentity {
    enum WalletRole { None, Primary, Recovery, Sub }

    struct IdentityData {
        address primaryWallet;
        address recoveryWallet;
        address[] subWallets;
    }

    struct WalletInfo {
        uint96 userId;
        WalletRole role;
    }

    struct Profile {
        string username;
        string bio;
        string about;
        string avatar;
    }

    uint96 private _nextUserId = 1;

    mapping(uint96 => IdentityData) private _identities;
    mapping(address => WalletInfo) private _wallets;
    mapping(uint96 => mapping(address => bool)) private _isSubWallet;
    mapping(uint96 => Profile) private _profiles;
    mapping(bytes32 => uint96) private _usernameToUserId;

    event IdentityRegistered(uint96 indexed userId, address indexed primaryWallet);
    event RecoveryUpdated(uint96 indexed userId, address indexed recoveryWallet);
    event PrimaryWalletUpdated(uint96 indexed userId, address indexed previousWallet, address indexed newWallet);
    event SubWalletAdded(uint96 indexed userId, address indexed wallet);
    event SubWalletRemoved(uint96 indexed userId, address indexed wallet);
    event ProfileUpdated(uint96 indexed userId, string username, string avatar);

    error AlreadyLinked();
    error NotRegistered();
    error NotAuthorized();
    error InvalidWallet();

    modifier onlyRegistered(address wallet) {
        if (_wallets[wallet].userId == 0) revert NotRegistered();
        _;
    }

    modifier onlyManager(uint96 userId) {
        IdentityData storage data = _identities[userId];
        if (msg.sender != data.primaryWallet && msg.sender != data.recoveryWallet) {
            revert NotAuthorized();
        }
        _;
    }

    function register() external returns (uint96 userId) {
        if (_wallets[msg.sender].userId != 0) revert AlreadyLinked();
        userId = _nextUserId++;
        _wallets[msg.sender] = WalletInfo({ userId: userId, role: WalletRole.Primary });
        IdentityData storage data = _identities[userId];
        data.primaryWallet = msg.sender;
        emit IdentityRegistered(userId, msg.sender);
    }

    function setRecoveryKey(address newRecovery) external onlyRegistered(msg.sender) {
        WalletInfo memory info = _wallets[msg.sender];
        uint96 userId = info.userId;
        IdentityData storage data = _identities[userId];
        if (msg.sender != data.primaryWallet) revert NotAuthorized();
        address current = data.recoveryWallet;
        if (current == newRecovery) return;
        if (current != address(0)) {
            delete _wallets[current];
        }
        if (newRecovery != address(0)) {
            if (_wallets[newRecovery].userId != 0) revert AlreadyLinked();
            _wallets[newRecovery] = WalletInfo({ userId: userId, role: WalletRole.Recovery });
        }
        data.recoveryWallet = newRecovery;
        emit RecoveryUpdated(userId, newRecovery);
    }

    function updatePrimaryWallet(address newPrimary) external onlyRegistered(msg.sender) {
        WalletInfo memory caller = _wallets[msg.sender];
        if (caller.role != WalletRole.Recovery) revert NotAuthorized();
        if (newPrimary == address(0)) revert InvalidWallet();
        if (_wallets[newPrimary].userId != 0) revert AlreadyLinked();
        uint96 userId = caller.userId;
        IdentityData storage data = _identities[userId];
        address previous = data.primaryWallet;
        delete _wallets[previous];
        data.primaryWallet = newPrimary;
        _wallets[newPrimary] = WalletInfo({ userId: userId, role: WalletRole.Primary });
        emit PrimaryWalletUpdated(userId, previous, newPrimary);
    }

    function addSubWallet(address wallet) external onlyRegistered(msg.sender) {
        if (wallet == address(0)) revert InvalidWallet();
        WalletInfo memory caller = _wallets[msg.sender];
        uint96 userId = _ensureManager(caller, msg.sender);
        if (_wallets[wallet].userId != 0) revert AlreadyLinked();
        _wallets[wallet] = WalletInfo({ userId: userId, role: WalletRole.Sub });
        _identities[userId].subWallets.push(wallet);
        _isSubWallet[userId][wallet] = true;
        emit SubWalletAdded(userId, wallet);
    }

    function removeSubWallet(address wallet) external onlyRegistered(msg.sender) {
        WalletInfo memory caller = _wallets[msg.sender];
        uint96 userId = _ensureManager(caller, msg.sender);
        if (!_isSubWallet[userId][wallet]) revert NotRegistered();
        _removeSubWallet(userId, wallet);
        delete _wallets[wallet];
        emit SubWalletRemoved(userId, wallet);
    }

    function leaveIdentity() external onlyRegistered(msg.sender) {
        WalletInfo memory info = _wallets[msg.sender];
        if (info.role != WalletRole.Sub) revert NotAuthorized();
        _removeSubWallet(info.userId, msg.sender);
        delete _wallets[msg.sender];
        emit SubWalletRemoved(info.userId, msg.sender);
    }

    function setProfile(string calldata username, string calldata bio, string calldata about, string calldata avatar) external onlyRegistered(msg.sender) {
        WalletInfo memory info = _wallets[msg.sender];
        uint96 userId = info.userId;
        IdentityData storage data = _identities[userId];
        if (msg.sender != data.primaryWallet && msg.sender != data.recoveryWallet) {
            revert NotAuthorized();
        }
        Profile storage current = _profiles[userId];
        // clear old username mapping if it existed
        bytes memory oldName = bytes(current.username);
        if (oldName.length > 0) {
            bytes32 oldKey = keccak256(oldName);
            if (_usernameToUserId[oldKey] == userId) {
                delete _usernameToUserId[oldKey];
            }
        }

        string memory normalized = _normalizeUsername(username);
        bytes memory newName = bytes(normalized);
        if (newName.length > 0) {
            bytes32 key = keccak256(newName);
            uint96 owner = _usernameToUserId[key];
            require(owner == 0 || owner == userId, "username taken");
            _usernameToUserId[key] = userId;
        }

        current.username = normalized;
        current.bio = bio;
        current.about = about;
        current.avatar = avatar;
        emit ProfileUpdated(userId, normalized, avatar);
    }

    /// @notice Release the current username back to the pool.
    function releaseUsername() external onlyRegistered(msg.sender) {
        WalletInfo memory info = _wallets[msg.sender];
        uint96 userId = _ensureManager(info, msg.sender);
        Profile storage current = _profiles[userId];
        bytes memory uname = bytes(current.username);
        require(uname.length > 0, "username empty");
        bytes32 key = keccak256(uname);
        if (_usernameToUserId[key] == userId) {
            delete _usernameToUserId[key];
        }
        current.username = "";
        emit ProfileUpdated(userId, "", current.avatar);
    }

    /// @notice Transfer the username from the caller-managed identity to another identity. Achievements remain with their original IDs.
    function transferUsername(uint96 toUserId) external onlyRegistered(msg.sender) {
        WalletInfo memory info = _wallets[msg.sender];
        uint96 fromUserId = _ensureManager(info, msg.sender);
        require(toUserId != 0, "invalid target");
        IdentityData storage target = _identities[toUserId];
        require(target.primaryWallet != address(0), "target !exist");

        Profile storage fromProfile = _profiles[fromUserId];
        bytes memory uname = bytes(fromProfile.username);
        require(uname.length > 0, "username empty");

        Profile storage toProfile = _profiles[toUserId];
        require(bytes(toProfile.username).length == 0, "target has username");

        bytes32 key = keccak256(uname);
        require(_usernameToUserId[key] == fromUserId, "username owner mismatch");

        // Move mapping and labels; achievements stay bound to user IDs.
        _usernameToUserId[key] = toUserId;
        fromProfile.username = "";
        toProfile.username = string(uname);

        emit ProfileUpdated(fromUserId, "", fromProfile.avatar);
        emit ProfileUpdated(toUserId, toProfile.username, toProfile.avatar);
    }

    function getUserId(address wallet) external view returns (uint96) {
        return _wallets[wallet].userId;
    }

    function walletInfo(address wallet) external view returns (uint96 userId, WalletRole role) {
        WalletInfo memory info = _wallets[wallet];
        return (info.userId, info.role);
    }

    function getIdentity(uint96 userId) external view returns (address primary, address recovery, address[] memory subWalletList) {
        IdentityData storage data = _identities[userId];
        return (data.primaryWallet, data.recoveryWallet, data.subWallets);
    }

    function getProfile(uint96 userId) external view returns (Profile memory) {
        return _profiles[userId];
    }

    function userIdByUsername(string calldata username) external view returns (uint96) {
        bytes memory lowered = bytes(_normalizeUsername(username));
        if (lowered.length == 0) {
            return 0;
        }
        return _usernameToUserId[keccak256(lowered)];
    }

    function formatUserId(uint96 userId) external pure returns (string memory) {
        require(userId != 0, "zero" );
        bytes memory digits;
        uint96 temp = userId;
        while (temp != 0) {
            digits = abi.encodePacked(bytes1(uint8(48 + temp % 10)), digits);
            temp /= 10;
        }
        if (digits.length == 0) {
            digits = "0";
        }
        return string(abi.encodePacked("ACHUSR-", digits));
    }

    function primaryWallet(uint96 userId) external view returns (address) {
        return _identities[userId].primaryWallet;
    }

    function recoveryWallet(uint96 userId) external view returns (address) {
        return _identities[userId].recoveryWallet;
    }

    function subWallets(uint96 userId) external view returns (address[] memory) {
        return _identities[userId].subWallets;
    }

    function _ensureManager(WalletInfo memory info, address caller) private view returns (uint96) {
        if (info.userId == 0) revert NotRegistered();
        IdentityData storage data = _identities[info.userId];
        if (caller != data.primaryWallet && caller != data.recoveryWallet) revert NotAuthorized();
        return info.userId;
    }

    function _removeSubWallet(uint96 userId, address wallet) private {
        address[] storage arr = _identities[userId].subWallets;
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            if (arr[i] == wallet) {
                arr[i] = arr[length - 1];
                arr.pop();
                break;
            }
        }
        delete _isSubWallet[userId][wallet];
    }

    function _normalizeUsername(string memory username) private pure returns (string memory) {
        bytes memory input = bytes(username);
        if (input.length == 0) {
            return "";
        }
        bytes memory output = new bytes(input.length);
        for (uint256 i = 0; i < input.length; i++) {
            bytes1 char = input[i];
            if (char >= 0x41 && char <= 0x5A) {
                output[i] = bytes1(uint8(char) + 32); // convert to lowercase
            } else {
                output[i] = char;
            }
        }
        return string(output);
    }
}
