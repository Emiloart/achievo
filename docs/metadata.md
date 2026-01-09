# Achievo Metadata Schema (MVP)

This documents off-chain JSON structures referenced by on-chain CIDs.

- goalCID (createGoal): points to a JSON describing the goal.
- evidenceCID (submitProof): points to a JSON describing the proof.
- tokenURI (mintBadge): points to the final badge metadata JSON.

Example goal JSON
{
"$schema": "https://schema.achievo.example/goal-v1.json",
"title": "Finish Solidity Course",
"description": "Complete the 10-module Solidity bootcamp.",
"createdAt": 1731264000,
"tags": ["learning", "solidity"],
"links": ["https://course.example"]
}

Example evidence JSON
{
"$schema": "https://schema.achievo.example/evidence-v1.json",
"description": "Certificate + repo link",
"media": [
{ "type": "image", "uri": "ipfs://bafy.../cert.png" },
{ "type": "url", "uri": "https://github.com/user/repo" }
],
"submittedAt": 1731350400
}

Example badge metadata (tokenURI)
{
"name": "Achievo Badge: Finish Solidity Course",
"description": "Verified achievement badge.",
"image": "ipfs://bafy.../badge.png",
"external_url": "https://app.achievo.example/u/0x.../badges/123",
"properties": {
"goalId": 123,
"goalCID": "ipfs://bafy...goal.json",
"evidenceCID": "ipfs://bafy...evidence.json",
"verifyLevel": "SELF", // NONE | SELF | PEER | AUTO
"createdAt": 1731264000,
"verifiedAt": 1731436800
}
}

## Proof artifacts (v1.1)

Proof artifacts are stored off-chain and reference files or URLs attached to goals or badges.
Each artifact is hashed with sha256 and can be optionally anchored on-chain for tamper evidence.

Example proof record (backend DTO)
{
"id": "uuid",
"userId": "ACHUSR-0000000123",
"achievementId": "12",
"badgeTokenId": null,
"kind": "FILE",
"title": "Certificate",
"description": "Completion certificate",
"sourceUrl": null,
"mimeType": "image/png",
"sizeBytes": 24576,
"sha256": "0x...",
"contentHash": "0x...",
"anchorTxHash": null
}

## Validation attestations (v1.1)

Validators sign an EIP-712 typed message that attests to an achievement or badge.
The signed payload is stored off-chain and can be optionally anchored on-chain.

Example attestation payload (typed data message)
{
"requestId": "uuid",
"claimantUserId": "ACHUSR-0000000123",
"achievementId": "12",
"badgeTokenId": "",
"validatorWallet": "0x...",
"status": "APPROVED",
"score": 100,
"issuedAt": 1734630000,
"nonce": "uuid",
"messageHash": "0x..."
}
