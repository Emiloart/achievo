import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ApiErrorDetailDto, ApiErrorResponseDto } from "../dto/error-response.dto";

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

export function buildOpenApiDocument(app: INestApplication) {
  const builder = new DocumentBuilder()
    .setTitle("Achievo API")
    .setDescription("Achievo backend API")
    .setVersion("1")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "bearer",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "x-api-version",
        description: "Optional API version header (default: 1)",
      },
      "apiVersion",
    );

  return SwaggerModule.createDocument(app, builder.build(), {
    deepScanRoutes: true,
    extraModels: [ApiErrorResponseDto, ApiErrorDetailDto],
  });
}

export function setupSwagger(app: INestApplication) {
  const document = buildOpenApiDocument(app);
  const adapter = app.getHttpAdapter().getInstance();
  if (adapter?.get) {
    adapter.get("/openapi.json", (_req: any, res: any) => {
      res.json(document);
    });
  }

  const docsEnabled = toBooleanEnv("DOCS_ENABLED", false);
  if (docsEnabled) {
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  return document;
}
