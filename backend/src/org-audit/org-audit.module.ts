import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrgAuditService } from "./org-audit.service";

@Module({
  imports: [PrismaModule],
  providers: [OrgAuditService],
  exports: [OrgAuditService],
})
export class OrgAuditModule {}
