import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { Web3Module } from "../web3/web3.module";
import { JwtGuard } from "./jwt.guard";

@Module({
  imports: [
    PrismaModule,
    Web3Module,
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const raw = Number(config.get("AUTH_ACCESS_TTL_MINUTES", 15));
        const ttl = Number.isFinite(raw) && raw > 0 ? raw : 15;
        return {
          secret: config.get<string>("JWT_SECRET"),
          signOptions: { expiresIn: `${ttl}m` },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard, JwtModule],
})
export class AuthModule {}
