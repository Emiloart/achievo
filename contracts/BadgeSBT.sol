// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Ownable (duplicated locally to avoid external deps/imports)
abstract contract Ownable {
    address public owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _owner) {
        require(_owner != address(0), "owner=0");
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "newOwner=0");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/**
 * @title BadgeSBT
 * @notice A minimal non-transferable "SBT-like" ERC721-style badge.
 *         - tokenId is arbitrary (we will use goalId for simplicity)
 *         - transfers/approvals are disabled
 *         - `core` (AchievoCore) is the only minter/burner
 */
contract BadgeSBT is Ownable {
    string public name;
    string public symbol;

    address public core; // AchievoCore authorized minter/burner

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => string) private _tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event CoreUpdated(address indexed previousCore, address indexed newCore);

    modifier onlyCore() {
        require(msg.sender == core, "Not core");
        _;
    }

    constructor(string memory _name, string memory _symbol, address _owner) Ownable(_owner) {
        name = _name;
        symbol = _symbol;
    }

    function setCore(address newCore) external onlyOwner {
        emit CoreUpdated(core, newCore);
        core = newCore;
    }

    // --- Mint/Burn ---

    function mint(address to, uint256 tokenId, string calldata uri) external onlyCore {
        require(to != address(0), "mint to 0");
        require(_ownerOf[tokenId] == address(0), "exists");

        _ownerOf[tokenId] = to;
        _balanceOf[to] += 1;
        _tokenURI[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
    }

    function burn(uint256 tokenId) external onlyCore {
        address owner_ = _ownerOf[tokenId];
        require(owner_ != address(0), "no token");

        _balanceOf[owner_] -= 1;
        delete _ownerOf[tokenId];
        delete _tokenURI[tokenId];

        emit Transfer(owner_, address(0), tokenId);
    }

    // --- Views ---

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _ownerOf[tokenId];
        require(o != address(0), "no token");
        return o;
    }

    function balanceOf(address who) external view returns (uint256) {
        require(who != address(0), "0 addr");
        return _balanceOf[who];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "no token");
        return _tokenURI[tokenId];
    }

    // --- Disabled ERC721 ops (SBT) ---

    function approve(address, uint256) external pure { revert("SBT: non-transferable"); }
    function setApprovalForAll(address, bool) external pure { revert("SBT: non-transferable"); }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure { revert("SBT: non-transferable"); }
    function safeTransferFrom(address, address, uint256) external pure { revert("SBT: non-transferable"); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert("SBT: non-transferable"); }
}
