import fs from "fs";
import path from "path";
import { ValidationsService } from "../../src/validations/validations.service";

describe("ValidationsService", () => {
  const validWallet = "0x0000000000000000000000000000000000000001";

  function buildService() {
    const prisma = {
      validationRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      validationAttestation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      validatorProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const eip712 = {
      buildTypedData: jest.fn(),
      recoverSigner: jest.fn(),
      hashTypedData: jest.fn(),
    } as any;

    const validators = {} as any;
    const identities = { getSummaries: jest.fn().mockResolvedValue(new Map()) } as any;
    const activity = { recordEvent: jest.fn().mockResolvedValue(undefined) } as any;
    const privacy = {
      resolvePolicy: jest.fn().mockResolvedValue({}),
      canView: jest.fn().mockReturnValue(true),
      decorateValidation: jest.fn((data) => data),
    } as any;
    const anchoring = {
      isEnabled: jest.fn().mockReturnValue(false),
      getRegistryAddressSafe: jest.fn().mockReturnValue(null),
    } as any;
    const queue = { enqueue: jest.fn() } as any;

    const service = new ValidationsService(prisma, eip712, validators, identities, activity, privacy, anchoring, queue);
    return { service, prisma, eip712 };
  }

  it("rejects a request without a title", async () => {
    const { service } = buildService();

    await expect(
      service.createRequest("ACHUSR-0000000001", { requestedValidatorWallet: validWallet }),
    ).rejects.toThrow("TITLE_REQUIRED");
  });

  it("rejects prepareAttestation when validator is not assigned", async () => {
    const { service, prisma } = buildService();

    prisma.validationRequest.findUnique.mockResolvedValue({
      id: "req-1",
      requestedValidatorWallet: "0x0000000000000000000000000000000000000002",
      claimantUserId: "ACHUSR-0000000001",
      achievementId: null,
      badgeTokenId: null,
    });

    await expect(service.prepareAttestation("req-1", validWallet, { status: "APPROVED" })).rejects.toThrow(
      "NOT_ASSIGNED",
    );
  });

  it("rejects attestations with signature mismatch", async () => {
    const { service, prisma, eip712 } = buildService();

    prisma.validationRequest.findUnique.mockResolvedValue({
      id: "req-1",
      requestedValidatorWallet: validWallet,
      claimantUserId: "ACHUSR-0000000001",
      achievementId: null,
      badgeTokenId: null,
    });
    eip712.buildTypedData.mockReturnValue({ domain: {}, types: {}, primaryType: "Validation", message: {} });
    eip712.recoverSigner.mockResolvedValue("0x0000000000000000000000000000000000000003");

    await expect(
      service.attest("req-1", validWallet, { status: "APPROVED", signature: "0xdead", issuedAt: 123 }),
    ).rejects.toThrow("SIGNATURE_MISMATCH");
  });

  it("does not include MetricsInterceptor content in the service source", () => {
    const filePath = path.join(__dirname, "../../src/validations/validations.service.ts");
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).not.toContain("MetricsInterceptor");
  });
});
