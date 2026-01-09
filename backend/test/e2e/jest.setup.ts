import { stopBackend } from "./utils/startBackend";
import { disconnectPrisma } from "./utils/prisma";

process.env.NODE_ENV = "test";

afterAll(async () => {
  await stopBackend();
  await disconnectPrisma();
});
