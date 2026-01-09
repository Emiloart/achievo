// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal non-transferable ERC721 with owner enumeration for Achievo v1.1 badges.
contract AchievoBadgeV11 {
    string public name = "Achievo Badge V1.1";
    string public symbol = "ACHB";
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner) {
        require(_owner != address(0), "owner=0");
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "newOwner=0");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
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
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal view {
        if (from != address(0) && to != address(0)) {
            revert("Transfers disabled");
        }
    }

    function mint(address to, uint256 tokenId, string calldata uri) external onlyOwner {
        require(to != address(0), "to=0");
        require(_owners[tokenId] == address(0), "exists");
        _beforeTokenTransfer(address(0), to, tokenId);

        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenURIs[tokenId] = uri;
        _addTokenToOwnerEnumeration(to, tokenId);

        emit Transfer(address(0), to, tokenId);
    }

    function burn(uint256 tokenId) external onlyOwner {
        address tokenOwner = ownerOf(tokenId);
        _beforeTokenTransfer(tokenOwner, address(0), tokenId);

        _balances[tokenOwner] -= 1;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        _removeTokenFromOwnerEnumeration(tokenOwner, tokenId);

        emit Transfer(tokenOwner, address(0), tokenId);
    }

    function tokensOfOwner(address account) external view returns (uint256[] memory) {
        return _ownedTokens[account];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // ERC165 + ERC721 + ERC721Metadata
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f;   // ERC721Metadata
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
