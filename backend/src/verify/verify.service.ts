/**
 * Verification service for proofs, validations, exports, and submissions.
 *
 * Produces structured verification checks with explicit "unknown" states on RPC failure.
 */
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileExportsService } from "../profile-exports/profileExports.service";
import { PrivacyPolicyService } from "../privacy/privacy.service";
import { ProofHashService } from "../proofs/proofHash.service";
import { Eip712Service } from "../validations/eip712.service";
import { ChainVerifyService } from "./chainVerify.service";
import { toAnchorKindLabel } from "../anchoring/anchoring.constants";

type AnchorChecks = {
  anchorPresent: boolean;
  anchorVerified: boolean | "unknown";
  anchorKind?: string | null;
  contract?: string | null;
  chainId?: number | null;
};

type CheckStatus = "pass" | "fail" | "warn" | "unknown";
type VerificationCheck = { name: string; status: CheckStatus; details?: any };

function normalizeHex(value?: string | null) {
  if (!value) return "";
  return value.startsWith("0x") ? value.toLowerCase() : `0x${value.toLowerCase()}`;
}

function hashIsValid(hash?: string | null) {
  if (!hash) return false;
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

function toIso(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function statusFromBoolean(value: boolean | "unknown"): CheckStatus {
  if (value === "unknown") return "unknown";
  return value ? "pass" : "fail";
}

function anchorStatuses(anchorPresent: boolean, anchorVerified: boolean | "unknown") {
  const verifiedStatus = statusFromBoolean(anchorVerified);
  const presentStatus = anchorVerified === "unknown" ? "unknown" : statusFromBoolean(anchorPresent);
  return { presentStatus, verifiedStatus };
}

function computeTrustState(checks: VerificationCheck[], redacted: boolean) {
  if (redacted) return "redacted";
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "unknown")) return "unknown";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

@Injectable()
/** Computes verification checks and anchor status for requested entities. */
export class VerifyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ProfileExportsService) private readonly exportsService: ProfileExportsService,
    @Inject(PrivacyPolicyService) private readonly privacy: PrivacyPolicyService,
    @Inject(ProofHashService) private readonly hashService: ProofHashService,
    @Inject(Eip712Service) private readonly eip712: Eip712Service,
    @Inject(ChainVerifyService) private readonly chain: ChainVerifyService,
  ) {}

  private isEnabled() {
    return toBooleanEnv("VERIFY_PORTAL_ENABLED", true);
  }

  private ensureEnabled() {
    if (!this.isEnabled()) throw new NotFoundException("VERIFY_NOT_AVAILABLE");
  }

  private expectedSigner() {
    const raw = process.env.VERIFY_PROFILE_EXPORT_SIGNER_ADDRESS || "";
    if (!raw) return "";
    return normalizeHex(raw);
  }

  private maxProofBytes() {
    const raw = Number(process.env.PROOF_MAX_SIZE_MB || 10);
    const safe = Number.isFinite(raw) && raw > 0 ? raw : 10;
    return Math.floor(safe * 1024 * 1024);
  }

  private async buildAnchorChecks(
    hash?: string | null,
    contract?: string | null,
    txHash?: string | null,
    expectedKind?: string | null,
  ): Promise<AnchorChecks> {
    const anchorResult = await this.chain.verifyAnchor({ hash, contract, txHash });
    const actualKind = toAnchorKindLabel(anchorResult.kind);
    if (anchorResult.anchorVerified === "unknown") {
      return {
        anchorPresent: false,
        anchorVerified: "unknown",
        anchorKind: actualKind,
        contract: anchorResult.contract || null,
        chainId: anchorResult.chainId || null,
      };
    }
    const kindMatches = expectedKind ? actualKind === expectedKind : true;
    return {
      anchorPresent: kindMatches ? anchorResult.anchorPresent : false,
      anchorVerified: kindMatches ? anchorResult.anchorVerified : false,
      anchorKind: actualKind,
      contract: anchorResult.contract || null,
      chainId: anchorResult.chainId || null,
    };
  }

  async verifyExport(publicId: string, token?: string | null) {
    this.ensureEnabled();
    const record = await this.prisma.profileExport.findUnique({ where: { publicId } });
    if (!record) throw new NotFoundException("EXPORT_NOT_FOUND");
    const decision = await this.privacy.resolvePolicy(record.userId, "EXPORT", record.publicId);
    const accessToken = token || record.publicId;
    const canView = this.privacy.canView(null, record.userId, decision, accessToken);
    if (!canView || decision.redaction === "FULL") throw new NotFoundException("EXPORT_NOT_FOUND");

    const verified = await this.exportsService.verifyExport(record.snapshot, record.signature, record.signerAddress);
    const hashMatch = normalizeHex(verified.snapshotHash) === normalizeHex(record.snapshotHash);
    const signatureValid = verified.valid;
    const expectedSigner = this.expectedSigner();
    const expectedSignerMatch = expectedSigner ? normalizeHex(record.signerAddress) === expectedSigner : true;
    const anchorExpected = Boolean(record.anchorTxHash || record.anchorContract);
    const anchorChecks = anchorExpected
      ? await this.buildAnchorChecks(record.snapshotHash, record.anchorContract, record.anchorTxHash, "EXPORT")
      : {
          anchorPresent: false,
          anchorVerified: false,
          anchorKind: null,
          contract: record.anchorContract || null,
          chainId: record.chainId || null,
        };
    const chain = anchorExpected
      ? {
          chainId: record.chainId || anchorChecks.chainId,
          contract: record.anchorContract || anchorChecks.contract,
          txHash: record.anchorTxHash,
          kind: anchorChecks.anchorKind,
        }
      : null;

    const checksDetailed: VerificationCheck[] = [
      { name: "hash_match", status: statusFromBoolean(hashMatch) },
      { name: "signature_valid", status: statusFromBoolean(signatureValid) },
      { name: "expected_signer", status: statusFromBoolean(expectedSignerMatch) },
    ];
    if (anchorExpected) {
      const { presentStatus, verifiedStatus } = anchorStatuses(anchorChecks.anchorPresent, anchorChecks.anchorVerified);
      checksDetailed.push({ name: "anchor_present", status: presentStatus });
      checksDetailed.push({ name: "anchor_verified", status: verifiedStatus });
    }

    const valid = Boolean(hashMatch && signatureValid && expectedSignerMatch);
    const redacted = decision.redaction !== "NONE";

    return {
      type: "PROFILE_EXPORT",
      publicId: record.publicId,
      valid,
      redacted,
      anchorVerified: anchorExpected ? anchorChecks.anchorVerified : false,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, redacted),
      checks: {
        hashMatch,
        signatureValid,
        expectedSignerMatch,
        anchorPresent: anchorChecks.anchorPresent,
        anchorVerified: anchorChecks.anchorVerified,
      },
      details: {
        snapshotHash: record.snapshotHash,
        signerAddress: record.signerAddress,
        issuedAt: toIso(record.createdAt),
        chain,
      },
    };
  }

  async verifyProof(id: string, token?: string | null) {
    this.ensureEnabled();
    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");

    const decision = await this.privacy.resolvePolicy(proof.userId, "PROOF", proof.id);
    const canView = this.privacy.canView(null, proof.userId, decision, token || null);
    if (!canView || decision.redaction === "FULL") throw new NotFoundException("PROOF_NOT_FOUND");

    const hashOk = hashIsValid(proof.sha256);
    const anchorExpected = Boolean(proof.anchorTxHash || proof.anchorContract);
    const anchorChecks = anchorExpected
      ? await this.buildAnchorChecks(proof.sha256, proof.anchorContract, proof.anchorTxHash, "PROOF")
      : {
          anchorPresent: false,
          anchorVerified: false,
          anchorKind: null,
          contract: proof.anchorContract || null,
          chainId: proof.chainId || null,
        };
    const chain = anchorExpected
      ? {
          chainId: proof.chainId || anchorChecks.chainId,
          contract: proof.anchorContract || anchorChecks.contract,
          txHash: proof.anchorTxHash,
          kind: anchorChecks.anchorKind,
        }
      : null;

    const checksDetailed: VerificationCheck[] = [
      { name: "hash_present", status: statusFromBoolean(hashOk) },
    ];
    if (anchorExpected) {
      const { presentStatus, verifiedStatus } = anchorStatuses(anchorChecks.anchorPresent, anchorChecks.anchorVerified);
      checksDetailed.push({ name: "anchor_present", status: presentStatus });
      checksDetailed.push({ name: "anchor_verified", status: verifiedStatus });
    }
    const redacted = decision.redaction !== "NONE";

    return {
      type: "PROOF",
      id: proof.id,
      valid: hashOk,
      redacted,
      anchorVerified: anchorExpected ? anchorChecks.anchorVerified : false,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, redacted),
      checks: {
        hashPresent: hashOk,
        anchorPresent: anchorChecks.anchorPresent,
        anchorVerified: anchorChecks.anchorVerified,
      },
      details: {
        sha256: proof.sha256,
        kind: proof.kind,
        createdAt: toIso(proof.createdAt),
        chain,
      },
    };
  }

  async verifyProofFile(id: string, file: { buffer?: Buffer; size?: number }, token?: string | null) {
    this.ensureEnabled();
    if (!file?.buffer) throw new BadRequestException("FILE_REQUIRED");
    if (file.size && file.size > this.maxProofBytes()) throw new BadRequestException("FILE_TOO_LARGE");

    const proof = await this.prisma.proofArtifact.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
    const decision = await this.privacy.resolvePolicy(proof.userId, "PROOF", proof.id);
    const canView = this.privacy.canView(null, proof.userId, decision, token || null);
    if (!canView || decision.redaction === "FULL") throw new NotFoundException("PROOF_NOT_FOUND");

    const { sha256 } = this.hashService.hashBuffer(file.buffer);
    const match = normalizeHex(sha256) === normalizeHex(proof.sha256);

    const checksDetailed: VerificationCheck[] = [{ name: "hash_match", status: statusFromBoolean(match) }];
    const redacted = decision.redaction !== "NONE";
    return {
      type: "PROOF",
      id: proof.id,
      valid: match,
      redacted,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, redacted),
      checks: {
        hashMatch: match,
      },
      details: {
        expectedHash: proof.sha256,
        providedHash: sha256,
      },
    };
  }

  async verifyValidation(id: string, token?: string | null) {
    this.ensureEnabled();
    const attestation = await this.prisma.validationAttestation.findUnique({ where: { id } });
    if (!attestation) throw new NotFoundException("ATTESTATION_NOT_FOUND");
    const request = await this.prisma.validationRequest.findUnique({ where: { id: attestation.requestId } });
    if (!request) throw new NotFoundException("REQUEST_NOT_FOUND");

    const decision = await this.privacy.resolvePolicy(request.claimantUserId, "VALIDATION", request.id);
    const canView = this.privacy.canView(null, request.claimantUserId, decision, token || null);
    if (!canView || decision.redaction === "FULL") throw new NotFoundException("REQUEST_NOT_FOUND");

    const recovered = await this.eip712.recoverSigner(
      attestation.typedData as any,
      attestation.signature as `0x${string}`,
    );
    const signatureValid = recovered.toLowerCase() === attestation.validatorWallet.toLowerCase();
    const typedHash = this.eip712.hashTypedData(attestation.typedData as any);
    const hashMatch = attestation.attestationHash
      ? normalizeHex(typedHash) === normalizeHex(attestation.attestationHash)
      : true;
    const anchorExpected = Boolean(attestation.anchorTxHash || attestation.anchorContract);
    const anchorChecks = anchorExpected
      ? await this.buildAnchorChecks(
          attestation.attestationHash || typedHash,
          attestation.anchorContract,
          attestation.anchorTxHash,
          "VALIDATION",
        )
      : {
          anchorPresent: false,
          anchorVerified: false,
          anchorKind: null,
          contract: attestation.anchorContract || null,
          chainId: attestation.chainId || null,
        };
    const chain = anchorExpected
      ? {
          chainId: anchorChecks.chainId,
          contract: attestation.anchorContract || anchorChecks.contract,
          txHash: attestation.anchorTxHash,
          kind: anchorChecks.anchorKind,
        }
      : null;
    const checksDetailed: VerificationCheck[] = [
      { name: "signature_valid", status: statusFromBoolean(signatureValid) },
      { name: "hash_match", status: statusFromBoolean(hashMatch) },
    ];
    if (anchorExpected) {
      const { presentStatus, verifiedStatus } = anchorStatuses(anchorChecks.anchorPresent, anchorChecks.anchorVerified);
      checksDetailed.push({ name: "anchor_present", status: presentStatus });
      checksDetailed.push({ name: "anchor_verified", status: verifiedStatus });
    }
    const valid = signatureValid && hashMatch;
    const redacted = decision.redaction !== "NONE";

    return {
      type: "VALIDATION",
      id: attestation.id,
      valid,
      redacted,
      anchorVerified: anchorExpected ? anchorChecks.anchorVerified : false,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, redacted),
      checks: {
        signatureValid,
        hashMatch,
        anchorPresent: anchorChecks.anchorPresent,
        anchorVerified: anchorChecks.anchorVerified,
      },
      details: {
        requestId: request.id,
        status: attestation.status,
        achievementId: request.achievementId,
        badgeTokenId: request.badgeTokenId,
        issuedAt: toIso(attestation.issuedAt),
        validatorWallet: attestation.validatorWallet,
        attestationHash: attestation.attestationHash || typedHash,
        hashAlgo: attestation.hashAlgo || null,
        signature: attestation.signature,
        chain,
      },
    };
  }

  async verifyAnchor(hash: string, contract?: string | null, txHash?: string | null) {
    this.ensureEnabled();
    const normalized = normalizeHex(hash);
    if (!hashIsValid(normalized)) throw new BadRequestException("INVALID_HASH");

    const anchor = await this.chain.verifyAnchor({ hash: normalized, contract, txHash });
    const kindLabel = toAnchorKindLabel(anchor.kind);

    const anchorStatus = anchorStatuses(anchor.anchorPresent, anchor.anchorVerified);
    const checksDetailed: VerificationCheck[] = [
      { name: "anchor_present", status: anchorStatus.presentStatus },
      { name: "anchor_verified", status: anchorStatus.verifiedStatus },
    ];

    return {
      type: "ANCHOR",
      hash: normalized,
      valid: anchor.anchorPresent,
      anchorVerified: anchor.anchorVerified,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, false),
      checks: {
        anchorPresent: anchor.anchorPresent,
        anchorVerified: anchor.anchorVerified,
      },
      details: {
        chainId: anchor.chainId || null,
        contract: anchor.contract || null,
        kind: kindLabel,
        submitter: anchor.submitter || null,
        anchoredAt: anchor.timestamp ? toIso(new Date(anchor.timestamp * 1000)) : null,
        txHash: txHash || anchor.txHash || null,
      },
    };
  }

  async verifyAnchorTx(txHash: string, contract?: string | null) {
    this.ensureEnabled();
    const normalized = normalizeHex(txHash);
    if (!hashIsValid(normalized)) throw new BadRequestException("INVALID_TX_HASH");

    const anchor = await this.chain.verifyAnchorTx({ txHash: normalized, contract });
    const kindLabel = toAnchorKindLabel(anchor.kind);

    const anchorStatus = anchorStatuses(anchor.anchorPresent, anchor.anchorVerified);
    const checksDetailed: VerificationCheck[] = [
      { name: "anchor_present", status: anchorStatus.presentStatus },
      { name: "anchor_verified", status: anchorStatus.verifiedStatus },
    ];

    return {
      type: "ANCHOR_TX",
      txHash: normalized,
      valid: anchor.anchorPresent,
      anchorVerified: anchor.anchorVerified,
      checksDetailed,
      trustState: computeTrustState(checksDetailed, false),
      checks: {
        anchorPresent: anchor.anchorPresent,
        anchorVerified: anchor.anchorVerified,
      },
      details: {
        hash: anchor.hash || null,
        chainId: anchor.chainId || null,
        contract: anchor.contract || null,
        kind: kindLabel,
        submitter: anchor.submitter || null,
        anchoredAt: anchor.timestamp ? toIso(new Date(anchor.timestamp * 1000)) : null,
      },
    };
  }

  async verifyUniversal(body: { kind?: string; id?: string; token?: string }) {
    const kind = String(body?.kind || "")
      .trim()
      .toUpperCase();
    const id = String(body?.id || "").trim();
    if (!kind || !id) throw new BadRequestException("INVALID_REQUEST");
    if (kind === "EXPORT") return this.verifyExport(id, body?.token || null);
    if (kind === "PROOF") return this.verifyProof(id, body?.token || null);
    if (kind === "VALIDATION") return this.verifyValidation(id, body?.token || null);
    if (kind === "ANCHOR") return this.verifyAnchor(id, null, null);
    if (kind === "TX") return this.verifyAnchorTx(id, null);
    throw new BadRequestException("INVALID_KIND");
  }
}
