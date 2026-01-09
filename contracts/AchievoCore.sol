// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBadge {
    function mint(address to, uint256 tokenId, string calldata uri) external;
}


/// @notice Minimal Ownable (no external deps)
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

/// @notice Minimal ReentrancyGuard (no external deps)
abstract contract ReentrancyGuard {
    uint256 private _locked;
    modifier nonReentrant() {
        require(_locked == 0, "Reentrancy");
        _locked = 1;
        _;
        _locked = 0;
    }
}

/**
 * @title AchievoCore
 * @notice MVP registry for goals, proofs, and verification levels.
 *         L1: self-attested, L2: peer-verified (threshold). L3 reserved for future auto/oracle verify.
 */
contract AchievoCore is Ownable, ReentrancyGuard {
    enum VerifyLevel { NONE, SELF, PEER, AUTO }

    struct Goal {
        uint256 id;
        address creator;
        string goalCID;       // IPFS CID describing the goal
        string evidenceCID;   // IPFS CID for proof (optional until submit)
        VerifyLevel level;    // NONE/SELF/PEER/AUTO
        uint8 approvals;      // number of peer approvals collected
        uint64 createdAt;
        bool verified;        // true when level >= SELF
        bool badgeMinted;     // prevents duplicate mints
        bool peersRestricted; // restrict peer approvals to allowlist
        address autoVerifier; // address that issued AUTO verification
        bytes32 autoDataHash; // hash of structured verification payload
        uint64 autoVerifiedAt;
    }

    // MVP: anyone can approve; we use a simple threshold (min 5 for PEER path)
    uint8 public peerThreshold = 5;
    uint256 public nextGoalId = 1;

    // ---- Badge wiring ----
    address public badge; // BadgeSBT contract (set by owner)


    mapping(uint256 => Goal) private _goals;
    mapping(uint256 => mapping(address => bool)) private _approved; // goalId => approver => approved?
    mapping(uint256 => address[]) private _approversList; // approvers list for visibility on-chain
    mapping(uint256 => mapping(address => bool)) private _allowedPeers; // goalId => peer => allowed?
    mapping(uint256 => address[]) private _allowedPeersList; // to clear allowed peers
    mapping(address => bool) private _authorizedVerifiers; // auto verifiers allowlist

    event GoalCreated(uint256 indexed goalId, address indexed creator, string goalCID);
    event ProofSubmitted(uint256 indexed goalId, string evidenceCID);
    event SelfVerified(uint256 indexed goalId, address indexed by);
    event PeerApproved(uint256 indexed goalId, address indexed approver, uint8 approvals, uint8 threshold);
    event Verified(uint256 indexed goalId, VerifyLevel level);
    event BadgeAddressUpdated(address indexed previous, address indexed current);
    event BadgeMinted(uint256 indexed goalId, address indexed to, string tokenURI);
    event PeerAllowListUpdated(uint256 indexed goalId, bool restricted);
    event AutoVerified(uint256 indexed goalId, address indexed creator, address indexed verifier, bytes32 dataHash);
    event AutoVerifierUpdated(address indexed verifier, bool allowed);

    constructor() Ownable(msg.sender) {
        _authorizedVerifiers[msg.sender] = true;
        emit AutoVerifierUpdated(msg.sender, true);
    }

    // ---------- Admin ----------

    function setPeerThreshold(uint8 newThreshold) external onlyOwner {
        require(newThreshold >= 5 && newThreshold <= 50, "threshold out of range");
        peerThreshold = newThreshold;
    }

    function setBadge(address badgeAddr) external onlyOwner {
        emit BadgeAddressUpdated(badge, badgeAddr);
        badge = badgeAddr;
    }

    /// @notice Allow or remove an address as an AUTO verifier.
    function setAutoVerifier(address verifier, bool allowed) external onlyOwner {
        require(verifier != address(0), "verifier=0");
        _authorizedVerifiers[verifier] = allowed;
        emit AutoVerifierUpdated(verifier, allowed);
    }

    /// @notice Creator-defined allowlist for peer approvals.
    function setPeerAllowList(uint256 goalId, address[] calldata peers, bool restricted) external nonReentrant {
        _mustBeCreator(goalId);
        _updatePeerAllowList(goalId, peers, restricted);
    }

    // ---------- User flows ----------

    /// @notice Create a new goal with off-chain metadata.
    function createGoal(string calldata goalCID) external nonReentrant returns (uint256 goalId) {
        goalId = _createGoal(msg.sender, goalCID);
    }

    /// @notice Create goal and immediately configure allowed peers.
    function createGoalWithPeers(string calldata goalCID, address[] calldata peers, bool restricted) external nonReentrant returns (uint256 goalId) {
        goalId = _createGoal(msg.sender, goalCID);
        if (peers.length > 0 || restricted) {
            _updatePeerAllowList(goalId, peers, restricted);
        }
    }

    function _createGoal(address creator, string calldata goalCID) internal returns (uint256 goalId) {
        require(bytes(goalCID).length > 0, "goalCID empty");
        goalId = nextGoalId++;
        _goals[goalId] = Goal({
            id: goalId,
            creator: creator,
            goalCID: goalCID,
            evidenceCID: "",
            level: VerifyLevel.NONE,
            approvals: 0,
            createdAt: uint64(block.timestamp),
            verified: false,
            badgeMinted: false,
            peersRestricted: false,
            autoVerifier: address(0),
            autoDataHash: bytes32(0),
            autoVerifiedAt: 0
        });
        emit GoalCreated(goalId, creator, goalCID);
    }

    /// @notice Attach/replace evidence CID.
    function submitProof(uint256 goalId, string calldata evidenceCID) external nonReentrant {
        Goal storage g = _mustBeCreator(goalId);
        require(bytes(evidenceCID).length > 0, "evidenceCID empty");
        g.evidenceCID = evidenceCID;
        emit ProofSubmitted(goalId, evidenceCID);
    }

    /// @notice L1 self verification by the goal creator.
    function selfVerify(uint256 goalId) external nonReentrant {
        Goal storage g = _mustBeCreator(goalId);
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(!g.verified, "Already verified");
        g.level = VerifyLevel.SELF;
        g.verified = true;
        emit SelfVerified(goalId, msg.sender);
        emit Verified(goalId, g.level);
    }

    /// @notice L2 peer approval from any address (MVP). One approval per address.
    function approve(uint256 goalId) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(!g.verified || g.level == VerifyLevel.SELF, "Already peer/auto verified");
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(!_approved[goalId][msg.sender], "Already approved");
        if (msg.sender != g.creator && g.peersRestricted) {
            require(_allowedPeers[goalId][msg.sender], "Not allowed");
        }
        if (msg.sender != g.creator) {
            require(_approved[goalId][g.creator], "Creator must approve first");
        }

        _approved[goalId][msg.sender] = true;
        g.approvals += 1;
        _approversList[goalId].push(msg.sender);
        emit PeerApproved(goalId, msg.sender, g.approvals, peerThreshold);

        if (g.approvals >= peerThreshold) {
            g.level = VerifyLevel.PEER;
            g.verified = true;
            emit Verified(goalId, g.level);
        }
    }

    /// @notice Admin-reserved L3 (stub for oracle/verifier role).
    function verifyAuto(uint256 goalId, bytes32 dataHash) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(_authorizedVerifiers[msg.sender], "Not verifier");
        require(dataHash != bytes32(0), "dataHash empty");
        g.level = VerifyLevel.AUTO;
        g.verified = true;
        g.autoVerifier = msg.sender;
        g.autoDataHash = dataHash;
        g.autoVerifiedAt = uint64(block.timestamp);
        emit Verified(goalId, g.level);
        emit AutoVerified(goalId, g.creator, msg.sender, dataHash);
    }

    /// @notice Mint the SBT badge once verified. `tokenURI` should be an IPFS URI to the achievement metadata JSON.
    /// @dev Uses goalId as tokenId for simplicity (1:1 mapping).
    function mintBadge(uint256 goalId, string calldata tokenURI_) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(msg.sender == g.creator, "Not creator");
        require(badge != address(0), "badge not set");
        require(g.verified, "Not verified yet");
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(!g.badgeMinted, "Badge already minted");
        require(bytes(tokenURI_).length > 0, "tokenURI empty");

        IBadge(badge).mint(g.creator, goalId, tokenURI_);
        g.badgeMinted = true;

        emit BadgeMinted(goalId, g.creator, tokenURI_);
    }

    // -------- Views --------

    function getGoal(uint256 goalId) external view returns (Goal memory) {
        return _mustExist(goalId);
    }

    function isApprovedBy(uint256 goalId, address approver) external view returns (bool) {
        return _approved[goalId][approver];
    }

    function isVerified(uint256 goalId) external view returns (bool) {
        return _mustExist(goalId).verified;
    }

    function getApprovers(uint256 goalId) external view returns (address[] memory) {
        _mustExist(goalId);
        return _approversList[goalId];
    }

    function getAllowedPeers(uint256 goalId) external view returns (address[] memory) {
        _mustExist(goalId);
        return _allowedPeersList[goalId];
    }

    function isPeerAllowed(uint256 goalId, address account) external view returns (bool) {
        Goal storage g = _mustExist(goalId);
        if (!g.peersRestricted) {
            return true;
        }
        if (account == g.creator) {
            return true;
        }
        return _allowedPeers[goalId][account];
    }

    // -------- Internals --------

    function _mustExist(uint256 goalId) internal view returns (Goal storage g) {
        g = _goals[goalId];
        require(g.creator != address(0), "Goal !exist");
    }

    function _mustBeCreator(uint256 goalId) internal view returns (Goal storage g) {
        g = _mustExist(goalId);
        require(g.creator == msg.sender, "Not creator");
    }

    function _updatePeerAllowList(uint256 goalId, address[] calldata peers, bool restricted) internal {
        _clearPeerAllowList(goalId);
        Goal storage g = _goals[goalId];
        g.peersRestricted = restricted;
        if (restricted) {
            for (uint256 i = 0; i < peers.length; i++) {
                address peer = peers[i];
                require(peer != address(0), "peer=0");
                if (!_allowedPeers[goalId][peer]) {
                    _allowedPeers[goalId][peer] = true;
                    _allowedPeersList[goalId].push(peer);
                }
            }
        }
        emit PeerAllowListUpdated(goalId, restricted);
    }

    function _clearPeerAllowList(uint256 goalId) internal {
        address[] storage list = _allowedPeersList[goalId];
        for (uint256 i = 0; i < list.length; i++) {
            delete _allowedPeers[goalId][list[i]];
        }
        delete _allowedPeersList[goalId];
    }
}
