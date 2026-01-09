// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBadgeV11 {
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
 * @title AchievoCoreV11
 * @notice v1.1 registry for goals with legacy-compatible surface plus creator enumeration and import hooks.
 */
contract AchievoCoreV11 is Ownable, ReentrancyGuard {
    enum VerifyLevel {
        NONE,
        SELF,
        PEER,
        AUTO
    }

    struct Goal {
        uint256 id;
        address creator;
        string goalCID;
        string evidenceCID;
        uint8 level; // VerifyLevel
        uint8 approvals;
        uint64 createdAt;
        bool verified;
        bool badgeMinted;
        bool peersRestricted;
        address autoVerifier;
        bytes32 autoDataHash;
        uint64 autoVerifiedAt;
        uint256 legacyId;
        bytes32 legacyTxHash;
    }

    uint8 public peerThreshold = 5;
    uint256 public nextGoalId = 1;

    address public badge;

    mapping(uint256 => Goal) private _goals;
    mapping(uint256 => mapping(address => bool)) private _approved;
    mapping(uint256 => address[]) private _approversList;
    mapping(uint256 => mapping(address => bool)) private _allowedPeers;
    mapping(uint256 => address[]) private _allowedPeersList;
    mapping(address => bool) private _authorizedVerifiers;
    mapping(address => uint256[]) private _creatorGoals;
    mapping(uint256 => uint256) private _legacyToGoal; // legacyId => new goalId

    event GoalCreated(uint256 indexed goalId, address indexed creator, string goalCID, uint8 level);
    event GoalImported(uint256 indexed goalId, uint256 indexed legacyId, bytes32 legacyTxHash, address indexed creator);
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

    function setAutoVerifier(address verifier, bool allowed) external onlyOwner {
        require(verifier != address(0), "verifier=0");
        _authorizedVerifiers[verifier] = allowed;
        emit AutoVerifierUpdated(verifier, allowed);
    }

    /// @notice Admin migration hook from legacy v1.
    function importGoalFromLegacy(
        address creator,
        string calldata goalCID,
        string calldata evidenceCID,
        uint8 level,
        uint8 approvals,
        bool verified,
        bool badgeMinted,
        bool peersRestricted,
        address autoVerifier,
        bytes32 autoDataHash,
        uint64 autoVerifiedAt,
        uint64 createdAt,
        uint256 legacyId,
        bytes32 legacyTxHash
    ) external onlyOwner returns (uint256 goalId) {
        if (legacyId != 0) {
            require(_legacyToGoal[legacyId] == 0, "Legacy already imported");
        }
        goalId = _pushGoal(
            creator,
            goalCID,
            evidenceCID,
            level,
            approvals,
            verified,
            badgeMinted,
            peersRestricted,
            autoVerifier,
            autoDataHash,
            autoVerifiedAt,
            createdAt,
            legacyId,
            legacyTxHash
        );
        emit GoalImported(goalId, legacyId, legacyTxHash, creator);
    }

    // ---------- Creator allowlist ----------

    function setPeerAllowList(uint256 goalId, address[] calldata peers, bool restricted) external nonReentrant {
        _mustBeCreator(goalId);
        _updatePeerAllowList(goalId, peers, restricted);
    }

    // ---------- User flows ----------

    /// @notice Legacy signature retained for UI compatibility; defaults to level NONE.
    function createGoal(string calldata goalCID) external nonReentrant returns (uint256 goalId) {
        goalId = _createGoal(msg.sender, goalCID, uint8(VerifyLevel.NONE));
    }

    /// @notice Explicit level variant for downstream integrations.
    function createGoalWithLevel(string calldata goalCID, uint8 level) external nonReentrant returns (uint256 goalId) {
        goalId = _createGoal(msg.sender, goalCID, level);
    }

    function createGoalWithPeers(string calldata goalCID, address[] calldata peers, bool restricted) external nonReentrant returns (uint256 goalId) {
        goalId = _createGoal(msg.sender, goalCID, uint8(VerifyLevel.NONE));
        if (peers.length > 0 || restricted) {
            _updatePeerAllowList(goalId, peers, restricted);
        }
    }

    function submitProof(uint256 goalId, string calldata evidenceCID) external nonReentrant {
        Goal storage g = _mustBeCreator(goalId);
        require(bytes(evidenceCID).length > 0, "evidenceCID empty");
        g.evidenceCID = evidenceCID;
        emit ProofSubmitted(goalId, evidenceCID);
    }

    function selfVerify(uint256 goalId) external nonReentrant {
        Goal storage g = _mustBeCreator(goalId);
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(!g.verified, "Already verified");
        g.level = uint8(VerifyLevel.SELF);
        g.verified = true;
        emit SelfVerified(goalId, msg.sender);
        emit Verified(goalId, VerifyLevel.SELF);
    }

    function approve(uint256 goalId) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(!g.verified || g.level == uint8(VerifyLevel.SELF), "Already peer/auto verified");
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
            g.level = uint8(VerifyLevel.PEER);
            g.verified = true;
            emit Verified(goalId, VerifyLevel.PEER);
        }
    }

    function verifyAuto(uint256 goalId, bytes32 dataHash) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(_authorizedVerifiers[msg.sender], "Not verifier");
        require(dataHash != bytes32(0), "dataHash empty");
        g.level = uint8(VerifyLevel.AUTO);
        g.verified = true;
        g.autoVerifier = msg.sender;
        g.autoDataHash = dataHash;
        g.autoVerifiedAt = uint64(block.timestamp);
        emit Verified(goalId, VerifyLevel.AUTO);
        emit AutoVerified(goalId, g.creator, msg.sender, dataHash);
    }

    function mintBadge(uint256 goalId, string calldata tokenURI_) external nonReentrant {
        Goal storage g = _mustExist(goalId);
        require(msg.sender == g.creator, "Not creator");
        require(badge != address(0), "badge not set");
        require(g.verified, "Not verified yet");
        require(bytes(g.evidenceCID).length > 0, "evidence required");
        require(!g.badgeMinted, "Badge already minted");
        require(bytes(tokenURI_).length > 0, "tokenURI empty");

        IBadgeV11(badge).mint(g.creator, goalId, tokenURI_);
        g.badgeMinted = true;

        emit BadgeMinted(goalId, g.creator, tokenURI_);
    }

    // -------- Views --------

    function getGoal(uint256 goalId) external view returns (Goal memory) {
        return _mustExist(goalId);
    }

    function getGoalsByCreator(address creator) external view returns (Goal[] memory) {
        uint256[] storage ids = _creatorGoals[creator];
        Goal[] memory list = new Goal[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = _goals[ids[i]];
        }
        return list;
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

    function _createGoal(address creator, string calldata goalCID, uint8 level) internal returns (uint256 goalId) {
        require(bytes(goalCID).length > 0, "goalCID empty");
        goalId = _pushGoal(
            creator,
            goalCID,
            "",
            level,
            0,
            false,
            false,
            false,
            address(0),
            bytes32(0),
            0,
            uint64(block.timestamp),
            0,
            bytes32(0)
        );
        emit GoalCreated(goalId, creator, goalCID, level);
    }

    function _pushGoal(
        address creator,
        string memory goalCID,
        string memory evidenceCID,
        uint8 level,
        uint8 approvals,
        bool verified,
        bool badgeMinted,
        bool peersRestricted,
        address autoVerifier,
        bytes32 autoDataHash,
        uint64 autoVerifiedAt,
        uint64 createdAt,
        uint256 legacyId,
        bytes32 legacyTxHash
    ) internal returns (uint256 goalId) {
        require(creator != address(0), "creator=0");
        goalId = nextGoalId++;
        _goals[goalId] = Goal({
            id: goalId,
            creator: creator,
            goalCID: goalCID,
            evidenceCID: evidenceCID,
            level: level,
            approvals: approvals,
            createdAt: createdAt,
            verified: verified,
            badgeMinted: badgeMinted,
            peersRestricted: peersRestricted,
            autoVerifier: autoVerifier,
            autoDataHash: autoDataHash,
            autoVerifiedAt: autoVerifiedAt,
            legacyId: legacyId,
            legacyTxHash: legacyTxHash
        });
        if (legacyId != 0) {
            _legacyToGoal[legacyId] = goalId;
        }
        _creatorGoals[creator].push(goalId);
    }

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
