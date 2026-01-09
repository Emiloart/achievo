/**
 * Validation domain service.
 *
 * Responsibilities:
 * - Enforce validation request and attestation invariants.
 * - Build and verify EIP-712 typed data for attestations.
 * - Coordinate anchoring requests without performing DTO parsing.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ValidationStatus } from "@prisma/client";
import { getAddress, isAddress } from "viem";
import { PrismaService } from "../prisma/prisma.service";
import { Eip712Service } from "./eip712.service";
import { ValidatorsService } from "./validators.service";
import { SocialIdentityService } from "../social/socialIdentity.service";
import { ActivityEventService } from "../consistency/activityEvent.service";
import { ActivityEventType } from "../consistency/activityEvent.types";
import { PrivacyPolicyService } from "../privacy/privacy.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { AnchoringQueueService } from "../anchoring/anchoring.queue.service";
import { AnchorKinds } from "../anchoring/anchoring.constants";

const ATTESTATION_HASH_ALGO = "EIP712_KECCAK256";

type ValidationViewer = {
  achusrId?: string | null;
  walletAddress?: string | null;
};

type ValidationFilters = {
  limit?: string;
  cursor?: string;
  status?: string;
  achievementId?: string | number | null;
  badgeTokenId?: string | number | null;
};

type ValidationRequestInput = {
  title?: string;
  summary?: string;
  achievementId?: string | number | null;
  badgeTokenId?: string | number | null;
  evidenceLinks?: string[] | string | null;
  requestedValidatorWallet?: string;
};

type AttestationInput = {
  status?: string;
  score?: number;
  issuedAt?: number;
  signature?: string;
  message?: string;
  issuerOrgId?: string | null;
  anchor?: boolean;
};

type GetRequestPrivacyParams = {
  viewerAchusrId?: string | null;
  token?: string | null;
};

function normalizeOptional(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeEvidenceLinks(raw?: string[] | string | null) {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(raw);
}

@Injectable()
export class ValidationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(Eip712Service) private readonly eip712: Eip712Service,
    @Inject(ValidatorsService) private readonly validators: ValidatorsService,
    @Inject(SocialIdentityService) private readonly identities: SocialIdentityService,
    @Inject(ActivityEventService) private readonly activity: ActivityEventService,
    @Inject(PrivacyPolicyService) private readonly privacy: PrivacyPolicyService,
    @Inject(AnchoringService) private readonly anchoring: AnchoringService,
    @Inject(AnchoringQueueService) private readonly queue: AnchoringQueueService,
  ) {}

  private normalizeWallet(raw?: string) {
    const trimmed = (raw || "").trim();
    if (!trimmed || !isAddress(trimmed)) throw new BadRequestException("INVALID_WALLET");
    return getAddress(trimmed).toLowerCase();
  }

  private envDomain() {
    const chainRaw = Number(process.env.VALIDATION_EIP712_CHAIN_ID || 84532);
    const chainId = Number.isFinite(chainRaw) ? chainRaw : 84532;
    const registry = this.anchoring.getRegistryAddressSafe();
    const legacy = process.env.VALIDATION_ANCHOR_CONTRACT_ADDRESS || "";
    const legacyContract = legacy ? (legacy.startsWith("0x") ? legacy : `0x${legacy}`) : "";
    return {
      name: process.env.VALIDATION_EIP712_DOMAIN_NAME || "Achievo",
      version: process.env.VALIDATION_EIP712_DOMAIN_VERSION || "1",
      chainId,
      verifyingContract: registry || legacyContract || "0x0000000000000000000000000000000000000000",
    };
  }

  private isPublicRead() {
    const raw = process.env.VALIDATION_PUBLIC_READ;
    if (!raw) return true;
    return String(raw).toLowerCase() === "true";
  }

  private buildAttestationDto(attestation: any, validatorProfile: any) {
    if (!attestation) return null;
    return {
      id: attestation.id,
      requestId: attestation.requestId,
      validatorWallet: attestation.validatorWallet,
      issuerOrgId: attestation.issuerOrgId || null,
      status: attestation.status,
      message: attestation.message,
      score: attestation.score,
      issuedAt: attestation.issuedAt ? new Date(attestation.issuedAt).toISOString() : null,
      domainName: attestation.domainName,
      domainVersion: attestation.domainVersion,
      chainId: attestation.chainId,
      verifyingContract: attestation.verifyingContract,
      nonce: attestation.nonce,
      typedData: attestation.typedData,
      signature: attestation.signature,
      signerRecovered: attestation.signerRecovered,
      attestationHash: attestation.attestationHash,
      hashAlgo: attestation.hashAlgo,
      anchorTxHash: attestation.anchorTxHash,
      anchorContract: attestation.anchorContract,
      anchoredAt: attestation.anchoredAt ? new Date(attestation.anchoredAt).toISOString() : null,
      version: attestation.version,
      validator: validatorProfile
        ? {
            walletAddress: validatorProfile.walletAddress,
            displayName: validatorProfile.displayName,
            type: validatorProfile.type,
            userId: validatorProfile.userId,
            website: validatorProfile.website,
          }
        : null,
    };
  }

  private buildRequestDto(request: any, attestation: any, claimantSummary?: any, validatorProfile?: any) {
    return {
      request: {
        id: request.id,
        claimantUserId: request.claimantUserId,
        achievementId: request.achievementId,
        badgeTokenId: request.badgeTokenId,
        title: request.title,
        summary: request.summary,
        evidenceLinks: request.evidenceLinks,
        requestedValidatorWallet: request.requestedValidatorWallet,
        status: request.status,
        createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : null,
      },
      claimant: claimantSummary || null,
      attestation: this.buildAttestationDto(attestation, validatorProfile),
    };
  }

  async createRequest(achusrId: string, input: ValidationRequestInput) {
    const title = (input.title || "").trim();
    if (!title) throw new BadRequestException("TITLE_REQUIRED");
    if (!input.requestedValidatorWallet) throw new BadRequestException("VALIDATOR_REQUIRED");
    const requestedValidatorWallet = this.normalizeWallet(input.requestedValidatorWallet);
    const request = await this.prisma.validationRequest.create({
      data: {
        claimantUserId: achusrId,
        achievementId: normalizeOptional(input.achievementId),
        badgeTokenId: normalizeOptional(input.badgeTokenId),
        title,
        summary: normalizeOptional(input.summary),
        evidenceLinks: normalizeEvidenceLinks(input.evidenceLinks),
        requestedValidatorWallet,
        status: "PENDING",
      },
    });
    return this.buildRequestDto(request, null);
  }

  async getRequest(id: string, viewer?: ValidationViewer, token?: string | null) {
    const request = await this.prisma.validationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("REQUEST_NOT_FOUND");
    const viewerWallet = viewer?.walletAddress ? this.normalizeWallet(viewer.walletAddress) : null;
    if (!this.isPublicRead()) {
      const isClaimant = viewer?.achusrId && viewer.achusrId === request.claimantUserId;
      const isValidator = viewerWallet && viewerWallet === request.requestedValidatorWallet;
      if (!isClaimant && !isValidator) throw new ForbiddenException("NOT_AUTHORIZED");
    }
    const attestation = await this.prisma.validationAttestation.findFirst({
      where: { requestId: request.id },
      orderBy: { version: "desc" },
    });
    const validatorProfile = attestation
      ? await this.prisma.validatorProfile.findUnique({ where: { walletAddress: attestation.validatorWallet } })
      : null;
    const claimantSummary = await this.identities.getSummaries([request.claimantUserId]);
    const dto = this.buildRequestDto(
      request,
      attestation,
      claimantSummary.get(request.claimantUserId) || null,
      validatorProfile,
    );
    const decision = await this.privacy.resolvePolicy(request.claimantUserId, "VALIDATION", request.id);
    const isValidator = viewerWallet && viewerWallet === request.requestedValidatorWallet;
    const viewerId = viewer?.achusrId || null;
    const canView = isValidator || this.privacy.canView(viewerId, request.claimantUserId, decision, token || null);
    if (!canView) throw new NotFoundException("REQUEST_NOT_FOUND");
    const decorated = this.privacy.decorateValidation(
      dto,
      decision,
      isValidator ? request.claimantUserId : viewerId,
      request.claimantUserId,
    );
    if (!decorated) throw new NotFoundException("REQUEST_NOT_FOUND");
    return decorated;
  }

  async listUserValidations(achusrId: string, viewerAchusrId: string | null, filters: ValidationFilters) {
    const take = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const where: any = { claimantUserId: achusrId };
    if (filters.status) where.status = filters.status;
    if (filters.badgeTokenId) where.badgeTokenId = normalizeOptional(filters.badgeTokenId);
    if (filters.achievementId) where.achievementId = normalizeOptional(filters.achievementId);
    const query: any = {
      where,
      orderBy: { createdAt: "desc" },
      take,
    };
    if (filters.cursor) {
      query.cursor = { id: filters.cursor };
      query.skip = 1;
    }
    const requests = await this.prisma.validationRequest.findMany(query);
    const requestIds = requests.map((r: any) => r.id);
    const attestations = await this.prisma.validationAttestation.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { version: "desc" },
    });
    const attestationMap = new Map<string, any>();
    for (const att of attestations) {
      if (!attestationMap.has(att.requestId)) {
        attestationMap.set(att.requestId, att);
      }
    }
    const validatorWallets = Array.from(new Set(attestations.map((a: any) => a.validatorWallet)));
    const validatorProfiles = await this.prisma.validatorProfile.findMany({
      where: { walletAddress: { in: validatorWallets } },
    });
    const validatorMap = new Map<string, any>();
    for (const profile of validatorProfiles) {
      validatorMap.set(profile.walletAddress, profile);
    }
    const claimantSummary = await this.identities.getSummaries([achusrId]);
    const data: any[] = [];
    for (const request of requests) {
      const dto = this.buildRequestDto(
        request,
        attestationMap.get(request.id),
        claimantSummary.get(achusrId) || null,
        validatorMap.get(attestationMap.get(request.id)?.validatorWallet || ""),
      );
      const decision = await this.privacy.resolvePolicy(achusrId, "VALIDATION", request.id);
      const canView = this.privacy.canView(viewerAchusrId, achusrId, decision, null);
      if (!canView) continue;
      const decorated = this.privacy.decorateValidation(dto, decision, viewerAchusrId, achusrId);
      if (decorated) data.push(decorated);
    }
    const nextCursor = requests.length ? requests[requests.length - 1].id : null;
    return { data, nextCursor };
  }

  async getRequestWithPrivacy(id: string, params: GetRequestPrivacyParams) {
    return this.getRequest(id, { achusrId: params.viewerAchusrId || null }, params.token || null);
  }

  async listValidatorRequests(walletAddressRaw: string) {
    const walletAddress = this.normalizeWallet(walletAddressRaw);
    const requests = await this.prisma.validationRequest.findMany({
      where: { requestedValidatorWallet: walletAddress, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    const claimantIds = requests.map((r: any) => r.claimantUserId);
    const claimantSummaries = await this.identities.getSummaries(claimantIds);
    return {
      data: requests.map((request: any) =>
        this.buildRequestDto(request, null, claimantSummaries.get(request.claimantUserId) || null),
      ),
    };
  }

  async prepareAttestation(id: string, validatorWallet: string, input: AttestationInput) {
    const request = await this.prisma.validationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("REQUEST_NOT_FOUND");
    const wallet = this.normalizeWallet(validatorWallet);
    if (wallet !== request.requestedValidatorWallet) throw new ForbiddenException("NOT_ASSIGNED");
    const status = input.status;
    if (!["APPROVED", "REJECTED", "REVOKED"].includes(String(status))) {
      throw new BadRequestException("INVALID_STATUS");
    }
    const score = Number.isFinite(input.score) ? Math.floor(Number(input.score)) : null;
    if (score !== null && (score < 1 || score > 100)) throw new BadRequestException("INVALID_SCORE");
    const domain = this.envDomain();
    const issuedAt = Math.floor(Date.now() / 1000);
    const typedData = this.eip712.buildTypedData({
      requestId: request.id,
      claimantUserId: request.claimantUserId,
      achievementId: request.achievementId,
      badgeTokenId: request.badgeTokenId,
      validatorWallet: wallet,
      status,
      score: score ?? 0,
      issuedAt,
      nonce: request.id,
      message: input.message || "",
      domainName: domain.name,
      domainVersion: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    });
    return { typedData, issuedAt, nonce: request.id };
  }

  async attest(id: string, validatorWallet: string, input: AttestationInput) {
    const request = await this.prisma.validationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("REQUEST_NOT_FOUND");
    const wallet = this.normalizeWallet(validatorWallet);
    if (wallet !== request.requestedValidatorWallet) throw new ForbiddenException("NOT_ASSIGNED");
    const statusValue = String(input.status || "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(statusValue)) throw new BadRequestException("INVALID_STATUS");
    const status = statusValue as ValidationStatus;
    const score = Number.isFinite(input.score) ? Math.floor(Number(input.score)) : null;
    if (score !== null && (score < 1 || score > 100)) throw new BadRequestException("INVALID_SCORE");
    const signature = (input.signature || "").trim();
    if (!signature) throw new BadRequestException("SIGNATURE_REQUIRED");
    const issuedAt = input.issuedAt ? Math.floor(Number(input.issuedAt)) : 0;
    if (!issuedAt) throw new BadRequestException("ISSUED_AT_REQUIRED");
    const domain = this.envDomain();
    const typedData = this.eip712.buildTypedData({
      requestId: request.id,
      claimantUserId: request.claimantUserId,
      achievementId: request.achievementId,
      badgeTokenId: request.badgeTokenId,
      validatorWallet: wallet,
      status,
      score: score ?? 0,
      issuedAt,
      nonce: request.id,
      message: input.message || "",
      domainName: domain.name,
      domainVersion: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    });
    const recovered = await this.eip712.recoverSigner(typedData, signature);
    if (recovered.toLowerCase() !== wallet) throw new BadRequestException("SIGNATURE_MISMATCH");
    const attestationHash = this.eip712.hashTypedData(typedData);
    const latest = await this.prisma.validationAttestation.findFirst({
      where: { requestId: request.id },
      orderBy: { version: "desc" },
    });
    const version = latest ? latest.version + 1 : 1;
    const validatorProfile = await this.prisma.validatorProfile.findUnique({ where: { walletAddress: wallet } });
    const issuedAtDate = new Date(issuedAt * 1000);
    const hashAlgo = ATTESTATION_HASH_ALGO;
    const anchorRequested = Boolean(input.anchor);
    const anchorEnabled = anchorRequested && this.anchoring.isEnabled();
    const registry = anchorEnabled ? this.anchoring.getRegistryAddressSafe() : null;
    const anchorTxHash = null;
    const anchorContract = registry || null;
    const anchoredAt = null;
    const attestation = await this.prisma.validationAttestation.create({
      data: {
        requestId: request.id,
        validatorWallet: wallet,
        validatorProfileId: validatorProfile?.id || null,
        issuerOrgId: input.issuerOrgId || null,
        status,
        message: normalizeOptional(input.message),
        score: score ?? null,
        issuedAt: issuedAtDate,
        domainName: domain.name,
        domainVersion: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
        nonce: request.id,
        typedData,
        signature,
        signerRecovered: recovered.toLowerCase(),
        attestationHash,
        hashAlgo,
        anchorTxHash,
        anchorContract,
        anchoredAt,
        version,
      },
    });
    if (anchorEnabled && anchorContract) {
      void this.queue
        .enqueue({
          kind: AnchorKinds.VALIDATION,
          hash: attestationHash,
          entityType: "VALIDATION",
          entityId: attestation.id,
        })
        .catch(() => {});
    }
    await this.prisma.validationRequest.update({
      where: { id: request.id },
      data: { status },
    });
    const updatedRequest = { ...request, status };
    void this.activity
      .recordEvent({
        userId: request.claimantUserId,
        type: status === "APPROVED" ? ActivityEventType.VALIDATION_APPROVED : ActivityEventType.VALIDATION_REJECTED,
        refId: attestation.id,
        occurredAt: issuedAtDate,
      })
      .catch(() => {});
    return this.buildRequestDto(updatedRequest, attestation, null, validatorProfile);
  }

  async revoke(id: string, validatorWallet: string, input: AttestationInput) {
    const request = await this.prisma.validationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("REQUEST_NOT_FOUND");
    const wallet = this.normalizeWallet(validatorWallet);
    if (wallet !== request.requestedValidatorWallet) throw new ForbiddenException("NOT_ASSIGNED");
    const signature = (input.signature || "").trim();
    if (!signature) throw new BadRequestException("SIGNATURE_REQUIRED");
    const issuedAt = input.issuedAt ? Math.floor(Number(input.issuedAt)) : 0;
    if (!issuedAt) throw new BadRequestException("ISSUED_AT_REQUIRED");
    const domain = this.envDomain();
    const typedData = this.eip712.buildTypedData({
      requestId: request.id,
      claimantUserId: request.claimantUserId,
      achievementId: request.achievementId,
      badgeTokenId: request.badgeTokenId,
      validatorWallet: wallet,
      status: "REVOKED",
      score: 0,
      issuedAt,
      nonce: request.id,
      message: input.message || "",
      domainName: domain.name,
      domainVersion: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    });
    const recovered = await this.eip712.recoverSigner(typedData, signature);
    if (recovered.toLowerCase() !== wallet) throw new BadRequestException("SIGNATURE_MISMATCH");
    const attestationHash = this.eip712.hashTypedData(typedData);
    const latest = await this.prisma.validationAttestation.findFirst({
      where: { requestId: request.id },
      orderBy: { version: "desc" },
    });
    const version = latest ? latest.version + 1 : 1;
    const validatorProfile = await this.prisma.validatorProfile.findUnique({ where: { walletAddress: wallet } });
    const issuedAtDate = new Date(issuedAt * 1000);
    const hashAlgo = ATTESTATION_HASH_ALGO;
    const anchorRequested = Boolean(input.anchor);
    const anchorEnabled = anchorRequested && this.anchoring.isEnabled();
    const registry = anchorEnabled ? this.anchoring.getRegistryAddressSafe() : null;
    const anchorTxHash = null;
    const anchorContract = registry || null;
    const anchoredAt = null;
    const attestation = await this.prisma.validationAttestation.create({
      data: {
        requestId: request.id,
        validatorWallet: wallet,
        validatorProfileId: validatorProfile?.id || null,
        issuerOrgId: input.issuerOrgId || null,
        status: "REVOKED",
        message: normalizeOptional(input.message),
        score: null,
        issuedAt: issuedAtDate,
        domainName: domain.name,
        domainVersion: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
        nonce: request.id,
        typedData,
        signature,
        signerRecovered: recovered.toLowerCase(),
        attestationHash,
        hashAlgo,
        anchorTxHash,
        anchorContract,
        anchoredAt,
        version,
      },
    });
    if (anchorEnabled && anchorContract) {
      void this.queue
        .enqueue({
          kind: AnchorKinds.VALIDATION,
          hash: attestationHash,
          entityType: "VALIDATION",
          entityId: attestation.id,
        })
        .catch(() => {});
    }
    await this.prisma.validationRequest.update({
      where: { id: request.id },
      data: { status: "REVOKED" },
    });
    const updatedRequest = { ...request, status: "REVOKED" };
    return this.buildRequestDto(updatedRequest, attestation, null, validatorProfile);
  }
}
