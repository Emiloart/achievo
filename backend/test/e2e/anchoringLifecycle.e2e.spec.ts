import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { ensureBackend } from "./utils/harness";
import { loginAsWallet } from "./utils/auth";
import { createOrgOnchain, ensureIdentityRegistered, mineBlocks, readOrgCreateFee } from "./utils/contracts";
import { waitUntil } from "./utils/waitUntil";
import { ORG_HANDLE_ANCHOR, PROGRAM_SLUG, PROGRAM_TITLE, MILESTONE_TITLE, VALIDATION_TITLE } from "./fixtures/seed";

describe("E2E anchoring lifecycle", () => {
  let baseUrl = "";
  let runtime: any;
  let userToken = "";
  let validatorToken = "";
  let userKey = "";
  let validatorKey = "";

  beforeAll(async () => {
    runtime = await ensureBackend();
    baseUrl = runtime.backend?.baseUrl || "";

    const user = runtime.chain.accounts.find((account: any) => account.name === "user") || runtime.chain.accounts[1];
    const validator =
      runtime.chain.accounts.find((account: any) => account.name === "validator") || runtime.chain.accounts[2];
    userKey = user.privateKey;
    validatorKey = validator.privateKey;

    await ensureIdentityRegistered(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.identity, userKey);
    await ensureIdentityRegistered(
      runtime.chain.rpcUrl,
      runtime.chain.chainId,
      runtime.deployments.identity,
      validatorKey,
    );

    const userLogin = await loginAsWallet(baseUrl, userKey);
    userToken = userLogin.token;

    const validatorLogin = await loginAsWallet(baseUrl, validatorKey);
    validatorToken = validatorLogin.token;

    await request(baseUrl)
      .post("/validators/register")
      .set("Authorization", `Bearer ${validatorToken}`)
      .send({
        walletAddress: privateKeyToAccount(validatorKey as `0x${string}`).address,
        displayName: "E2E Validator",
        type: "INDIVIDUAL",
      })
      .expect(201);
  });

  it("anchors proof, export, validation, and submission", async () => {
    const proofRes = await request(baseUrl)
      .post("/proofs/url")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ sourceUrl: "https://example.com/proof", anchor: true })
      .expect(201);

    const proofId = proofRes.body?.data?.id as string;
    expect(proofId).toBeTruthy();

    const exportRes = await request(baseUrl)
      .post("/exports/profile")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ format: "JSON", anchor: true })
      .expect(201);

    const exportPublicId = exportRes.body?.data?.publicId as string;
    expect(exportPublicId).toBeTruthy();

    const validatorAddress = privateKeyToAccount(validatorKey as `0x${string}`).address;
    const requestRes = await request(baseUrl)
      .post("/validations/requests")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: VALIDATION_TITLE, requestedValidatorWallet: validatorAddress })
      .expect(201);

    const validationRequestId = requestRes.body?.data?.request?.id as string;
    expect(validationRequestId).toBeTruthy();

    const prepareRes = await request(baseUrl)
      .post(`/validations/requests/${validationRequestId}/attestation/prepare`)
      .set("Authorization", `Bearer ${validatorToken}`)
      .send({ status: "APPROVED", score: 88, message: "Looks good" })
      .expect(201);

    const typedData = prepareRes.body?.data?.typedData;
    const issuedAt = prepareRes.body?.data?.issuedAt;
    expect(typedData).toBeTruthy();
    expect(issuedAt).toBeTruthy();

    const validatorAccount = privateKeyToAccount(validatorKey as `0x${string}`);
    const signature = await validatorAccount.signTypedData(typedData);

    const attestRes = await request(baseUrl)
      .post(`/validations/requests/${validationRequestId}/attest`)
      .set("Authorization", `Bearer ${validatorToken}`)
      .send({
        status: "APPROVED",
        score: 88,
        message: "Looks good",
        signature,
        issuedAt,
        anchor: true,
      })
      .expect(201);

    const attestationId = attestRes.body?.data?.attestation?.id as string;
    expect(attestationId).toBeTruthy();

    const prepareOrg = await request(baseUrl)
      .post("/orgs/prepare")
      .set("X-Forwarded-For", "127.0.0.1")
      .send({ handle: ORG_HANDLE_ANCHOR })
      .expect(201);

    const feeRaw = prepareOrg.body?.data?.fee as string | null;
    const fee = feeRaw
      ? BigInt(feeRaw)
      : await readOrgCreateFee(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.orgRegistry);

    const orgTx = await createOrgOnchain({
      rpcUrl: runtime.chain.rpcUrl,
      chainId: runtime.chain.chainId,
      orgRegistry: runtime.deployments.orgRegistry,
      handle: ORG_HANDLE_ANCHOR,
      privateKey: userKey,
      feeWei: fee,
    });

    const orgRes = await request(baseUrl)
      .post("/orgs")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ handle: ORG_HANDLE_ANCHOR, displayName: "E2E Anchor Org", creationTxHash: orgTx })
      .expect(201);

    const orgId = orgRes.body?.data?.id as string;
    expect(orgId).toBeTruthy();

    const programRes = await request(baseUrl)
      .post(`/orgs/${orgId}/programs`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ slug: PROGRAM_SLUG, title: PROGRAM_TITLE, rules: { anchorSubmissions: true } })
      .expect(201);

    const programId = programRes.body?.data?.id as string;
    expect(programId).toBeTruthy();

    const milestoneRes = await request(baseUrl)
      .post(`/orgs/${orgId}/programs/${programId}/milestones`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ order: 0, title: MILESTONE_TITLE })
      .expect(201);

    const milestoneId = milestoneRes.body?.data?.id as string;
    expect(milestoneId).toBeTruthy();

    const submissionRes = await request(baseUrl)
      .post(`/orgs/${orgId}/programs/${programId}/milestones/${milestoneId}/submissions`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        note: "E2E submission",
        anchor: true,
        evidence: {
          proofArtifactIds: [proofId],
          validationIds: [validationRequestId],
          exportPublicIds: [exportPublicId],
          urls: ["https://example.com"],
        },
      })
      .expect(201);

    const submissionId = submissionRes.body?.data?.id as string;
    const submissionHash = submissionRes.body?.data?.submissionHash as string;
    expect(submissionId).toBeTruthy();
    expect(submissionHash).toBeTruthy();

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/proofs/${proofId}`)
          .set("Authorization", `Bearer ${userToken}`)
          .expect(200);
        return Boolean(res.body?.data?.anchorTxHash);
      },
      { timeoutMs: 60000, intervalMs: 2000, label: "proof_anchored" },
    );

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/exports/${exportPublicId}`)
          .set("Authorization", `Bearer ${userToken}`)
          .expect(200);
        return Boolean(res.body?.data?.anchor?.txHash || res.body?.data?.anchor?.contract);
      },
      { timeoutMs: 60000, intervalMs: 2000, label: "export_anchored" },
    );

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/validations/requests/${validationRequestId}`)
          .expect(200);
        return Boolean(res.body?.data?.attestation?.anchorTxHash || res.body?.data?.attestation?.anchorContract);
      },
      { timeoutMs: 60000, intervalMs: 2000, label: "validation_anchored" },
    );

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/orgs/${orgId}/submissions`)
          .set("Authorization", `Bearer ${userToken}`)
          .expect(200);
        const list = res.body?.data || [];
        const submission = list.find((item: any) => item.id === submissionId);
        return Boolean(submission?.anchorTxHash || submission?.anchorContract);
      },
      { timeoutMs: 60000, intervalMs: 2000, label: "submission_anchored" },
    );

    await mineBlocks(runtime.chain.rpcUrl, runtime.chain.chainId, 3);

    const verifyProof = await request(baseUrl).get(`/verify/proof/${proofId}`).expect(200);
    expect(verifyProof.body?.anchorVerified).toBe(true);

    const verifyExport = await request(baseUrl).get(`/verify/export/${exportPublicId}`).expect(200);
    expect(verifyExport.body?.anchorVerified).toBe(true);

    const verifyValidation = await request(baseUrl).get(`/verify/validation/${attestationId}`).expect(200);
    expect(verifyValidation.body?.anchorVerified).toBe(true);

    const verifySubmission = await request(baseUrl)
      .get(`/verify/anchor/${submissionHash}?contract=${runtime.deployments.anchorRegistry}`)
      .expect(200);
    expect(verifySubmission.body?.anchorVerified).toBe(true);
  });
});
