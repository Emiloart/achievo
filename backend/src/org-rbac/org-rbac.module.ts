import { Module } from "@nestjs/common";
import { OrgGuard } from "./org-rbac.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [OrgGuard],
  exports: [OrgGuard],
})
export class OrgRbacModule {}
