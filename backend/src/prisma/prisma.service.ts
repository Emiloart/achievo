/**
 * Prisma database client wrapper.
 *
 * Provides a single, shared PrismaClient instance with Nest lifecycle hooks.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
/** Exposes PrismaClient with application lifecycle management. */
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
