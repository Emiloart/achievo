import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { buildOpenApiDocument } from "../../src/common/swagger/swagger";

describe("OpenAPI contract", () => {
  it("generates an OpenAPI document with critical paths", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    const doc = buildOpenApiDocument(app);

    expect(doc.openapi).toBeTruthy();
    expect(doc.paths["/health"]).toBeDefined();
    expect(doc.paths["/orgs/prepare"]).toBeDefined();
    expect(doc.paths["/usernames/availability"]).toBeDefined();
    expect(doc.components?.schemas?.ApiErrorResponseDto).toBeDefined();

    await app.close();
  });
});
