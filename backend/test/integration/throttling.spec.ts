import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalHttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { Web3Service } from "../../src/web3/web3.service";

const TEST_ADDRESS = "0x000000000000000000000000000000000000dead";

describe("Auth throttling", () => {
  let app: any;
  const previousLimit = process.env.THROTTLE_AUTH_LIMIT;
  const previousTtl = process.env.THROTTLE_AUTH_TTL;

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = "3";
    process.env.THROTTLE_AUTH_TTL = "60";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Web3Service)
      .useValue({
        publicClient: {
          readContract: jest.fn().mockResolvedValue(1n),
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
    if (previousLimit === undefined) {
      delete process.env.THROTTLE_AUTH_LIMIT;
    } else {
      process.env.THROTTLE_AUTH_LIMIT = previousLimit;
    }
    if (previousTtl === undefined) {
      delete process.env.THROTTLE_AUTH_TTL;
    } else {
      process.env.THROTTLE_AUTH_TTL = previousTtl;
    }
    if (app) {
      await app.close();
    }
  });

  it("throttles repeated nonce requests", async () => {
    const first = await request(app.getHttpServer())
      .post("/auth/nonce")
      .set("X-Forwarded-For", "2.2.2.2")
      .send({ address: TEST_ADDRESS })
      .expect(201);
    const limitRaw = first.headers["x-ratelimit-limit"];
    const limit = Number(limitRaw);
    expect(Number.isFinite(limit)).toBe(true);
    expect(limit).toBeGreaterThan(0);
    for (let i = 1; i < limit; i += 1) {
      await request(app.getHttpServer())
        .post("/auth/nonce")
        .set("X-Forwarded-For", "2.2.2.2")
        .send({ address: TEST_ADDRESS })
        .expect(201);
    }
    const throttled = await request(app.getHttpServer())
      .post("/auth/nonce")
      .set("X-Forwarded-For", "2.2.2.2")
      .send({ address: TEST_ADDRESS })
      .expect(429);
    expect(throttled.body?.error?.requestId).toBeTruthy();
  });
});
