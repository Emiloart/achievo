import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { AppModule } from "../../src/app.module";
import { GlobalHttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { Web3Service } from "../../src/web3/web3.service";

describe("Auth -> Proof flow", () => {
  const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f094538e2d7a1d8b6ab5f2f1f8b7a3b5f4c1d5b6");
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Web3Service)
      .useValue({
        publicClient: {
          readContract: jest.fn().mockResolvedValue(123n),
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.set("trust proxy", 1);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("authenticates and creates a URL proof", async () => {
    const nonceRes = await request(app.getHttpServer())
      .post("/auth/nonce")
      .set("X-Forwarded-For", "1.1.1.1")
      .send({ address: account.address })
      .expect(201);

    const nonce = nonceRes.body?.nonce;
    const message = nonceRes.body?.message;
    expect(nonce).toBeTruthy();
    expect(message).toBe(`Achievo login nonce: ${nonce}`);

    const signature = await account.signMessage({ message });

    const verifyRes = await request(app.getHttpServer())
      .post("/auth/verify")
      .set("X-Forwarded-For", "1.1.1.1")
      .send({ address: account.address, signature, nonce })
      .expect(201);

    const token = verifyRes.body?.token;
    expect(token).toBeTruthy();

    const proofRes = await request(app.getHttpServer())
      .post("/proofs/url")
      .set("X-Forwarded-For", "1.1.1.1")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceUrl: "https://example.com/proof" })
      .expect(201);

    expect(proofRes.body?.success).toBe(true);
    const proofId = proofRes.body?.data?.id;
    expect(proofId).toBeTruthy();

    const getRes = await request(app.getHttpServer())
      .get(`/proofs/${proofId}`)
      .set("X-Forwarded-For", "1.1.1.1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getRes.body?.success).toBe(true);
    expect(getRes.body?.data?.id).toBe(proofId);
  });
});
