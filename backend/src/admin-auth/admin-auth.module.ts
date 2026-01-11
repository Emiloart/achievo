import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminRolesGuard } from "./admin-roles.guard";
import { AdminCsrfGuard } from "./admin-csrf.guard";
import { PasswordService } from "./password.service";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AdminAuditModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const raw = Number(config.get("ADMIN_ACCESS_TTL_MIN", 15));
        const ttl = Number.isFinite(raw) && raw > 0 ? raw : 15;
        return {
          secret: config.get<string>("JWT_SECRET"),
          signOptions: { expiresIn: `${ttl}m` },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard, AdminRolesGuard, AdminCsrfGuard, PasswordService],
  exports: [AdminAuthService, AdminAuthGuard, AdminRolesGuard, AdminCsrfGuard, JwtModule, PasswordService],
})
export class AdminAuthModule {}
