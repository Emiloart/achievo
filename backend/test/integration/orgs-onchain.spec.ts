import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request, { type Response } from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { AppModule } from "../../src/app.module";
import { GlobalHttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { Web3Service } from "../../src/web3/web3.service";
import { OrgRegistryService } from "../../src/organizations/orgRegistry.service";

function extractCookie(setCookies: string[] | undefined, name: string) {
  const match = (setCookies || []).find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return { raw: "", value: "" };
  const [pair] = match.split(";");
  const value = pair.split("=")[1] || "";
  return { raw: pair, value };
}

function getSetCookies(res: Response) {
  const header = res.headers["set-cookie"];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

describe("Org creation on-chain gating", () => {
  const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f094538e2d7a1d8b6ab5f2f1f8b7a3b5f4c1d5b6");
  let app: any;

  beforeAll(async () => {
    process.env.IDENTITY_ADDRESS = "0x0000000000000000000000000000000000000001";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Web3Service)
      .useValue({
        publicClient: {
          readContract: jest.fn().mockResolvedValue(123n),
        },
      })
      .overrideProvider(OrgRegistryService)
      .useValue({
        isRequired: () => true,
        getRegistryAddressSafe: () => "0x0000000000000000000000000000000000000001",
        getRpcUrl: () => "http://127.0.0.1:8545",
        getChainId: () => 84532,
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
    delete process.env.IDENTITY_ADDRESS;
    if (app) {
      await app.close();
    }
  });

  it("rejects org creation without tx hash when on-chain is required", async () => {
    const nonceRes = await request(app.getHttpServer())
      .post("/auth/nonce")
      .send({ address: account.address })
      .expect(201);
    const signature = await account.signMessage({ message: nonceRes.body?.message });

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ address: account.address, signature })
      .expect(201);

    const cookies = getSetCookies(loginRes);
    const accessCookie = extractCookie(cookies, "ach_access");
    const csrfCookie = extractCookie(cookies, "ach_csrf");

    const res = await request(app.getHttpServer())
      .post("/orgs")
      .set("Cookie", [accessCookie.raw, csrfCookie.raw])
      .set("x-ach-csrf", csrfCookie.value)
      .send({
        handle: "onchain-test",
        displayName: "Onchain Test",
        visibility: "PUBLIC",
      })
      .expect(400);

    expect(res.body?.error?.message).toBe("ORG_CREATION_TX_REQUIRED");
  });
});
