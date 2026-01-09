/**
 * Application entrypoint and global HTTP configuration.
 *
 * Guarantees BigInt JSON serialization, consistent validation, and error handling across all routes.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

import "reflect-metadata";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { resolveLogLevels } from "./common/logging/log-levels";
import { setupSwagger } from "./common/swagger/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: resolveLogLevels(process.env.LOG_LEVEL),
  });

  const bodyLimitMb = Number(process.env.REQUEST_BODY_LIMIT_MB || 2);
  const limitMb = Number.isFinite(bodyLimitMb) && bodyLimitMb > 0 ? bodyLimitMb : 2;
  const bodyLimit = `${limitMb}mb`;
  app.useBodyParser("json", { limit: bodyLimit });
  app.useBodyParser("urlencoded", { limit: bodyLimit, extended: true });

  app.enableCors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: "x-api-version",
    defaultVersion: "1",
  });

  setupSwagger(app);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Achievo backend listening on http://127.0.0.1:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Bootstrap error", err);
  process.exit(1);
});
