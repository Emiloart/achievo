// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AchievoBadgeV12
/// @notice Non-transferable badge token with owner enumeration for Achievo v1.2.
/// @dev Transfers are restricted to mint/burn semantics enforced by the contract.
contract AchievoBadgeV12 is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public name;
    string public symbol;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /// @notice Initializes the badge token and grants admin/minter roles.
    /// @param admin Admin role address (expected timelock).
    /// @param initialMinter Initial minter role address.
    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    constructor(address admin, address initialMinter, string memory name_, string memory symbol_) {
        require(admin != address(0), "admin=0");
        name = name_;
        symbol = symbol_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (initialMinter != address(0)) {
            _grantRole(MINTER_ROLE, initialMinter);
        }
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "nonexistent token");
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "nonexistent token");
        return _tokenURIs[tokenId];
    }

    /// @notice Non-transferable: disable transfers except mint (from=0) and burn (to=0).
    function _beforeTokenTransfer(address from, address to) internal pure {
        if (from != address(0) && to != address(0)) {
            revert("Transfers disabled");
        }
    }

    /// @notice Mints a badge to the specified owner with metadata URI.
    /// @dev Restricted to MINTER_ROLE; token IDs must be unique.
    function mint(address to, uint256 tokenId, string calldata uri) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "to=0");
        require(_owners[tokenId] == address(0), "exists");
        _beforeTokenTransfer(address(0), to);

        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenURIs[tokenId] = uri;
        _addTokenToOwnerEnumeration(to, tokenId);

        emit Transfer(address(0), to, tokenId);
    }

    /// @notice Burns a badge and clears ownership and metadata.
    /// @dev Restricted to MINTER_ROLE.
    function burn(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        address tokenOwner = ownerOf(tokenId);
        _beforeTokenTransfer(tokenOwner, address(0));

        _balances[tokenOwner] -= 1;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        _removeTokenFromOwnerEnumeration(tokenOwner, tokenId);

        emit Transfer(tokenOwner, address(0), tokenId);
    }

    function tokensOfOwner(address account) external view returns (uint256[] memory) {
        return _ownedTokens[account];
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f || // ERC721Metadata
            super.supportsInterface(interfaceId);
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) internal {
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) internal {
        uint256 lastTokenIndex = _ownedTokens[from].length - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        _ownedTokens[from].pop();
        delete _ownedTokensIndex[tokenId];
    }
}
