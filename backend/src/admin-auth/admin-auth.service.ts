/**
 * Admin email/password session service with refresh rotation and lockout protection.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AdminRole, AdminUser } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "crypto";
import { PasswordService } from "./password.service";
import { AdminAuditService } from "../admin-audit/admin-audit.service";

type SessionContext = {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

type AdminIdentity = {
  id: string;
  email: string;
  role: AdminRole;
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "letmein",
  "welcome",
  "changeme",
  "achievo",
]);

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function now() {
  return new Date();
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly password: PasswordService,
    private readonly audit: AdminAuditService,
  ) {}

  private accessTtlMinutes() {
    const raw = Number(this.config.get("ADMIN_ACCESS_TTL_MIN", 15));
    return Number.isFinite(raw) && raw > 0 ? raw : 15;
  }

  private refreshTtlDays() {
    const raw = Number(this.config.get("ADMIN_REFRESH_TTL_DAYS", 30));
    return Number.isFinite(raw) && raw > 0 ? raw : 30;
  }

  private csrfTtlMinutes() {
    const raw = Number(this.config.get("ADMIN_CSRF_TTL_MIN", 60));
    return Number.isFinite(raw) && raw > 0 ? raw : 60;
  }

  private lockoutAttempts() {
    const raw = Number(this.config.get("ADMIN_LOCKOUT_ATTEMPTS", 5));
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  }

  private lockoutWindowMinutes() {
    const raw = Number(this.config.get("ADMIN_LOCKOUT_WINDOW_MIN", 15));
    return Number.isFinite(raw) && raw > 0 ? raw : 15;
  }

  private lockoutDurationMinutes() {
    const raw = Number(this.config.get("ADMIN_LOCKOUT_DURATION_MIN", 15));
    return Number.isFinite(raw) && raw > 0 ? raw : 15;
  }

  getAccessTokenTtlSeconds() {
    return Math.floor(this.accessTtlMinutes() * 60);
  }

  getRefreshTokenMaxAgeMs() {
    return Math.floor(this.refreshTtlDays() * 24 * 60 * 60 * 1000);
  }

  getCsrfTokenMaxAgeMs() {
    return Math.floor(this.csrfTtlMinutes() * 60 * 1000);
  }

  private createAccessToken(admin: AdminUser, sessionId: string) {
    return this.jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        sid: sessionId,
      },
      { expiresIn: this.getAccessTokenTtlSeconds() },
    );
  }

  private async issueSession(admin: AdminUser, context?: SessionContext, familyId?: string) {
    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = hashToken(refreshToken);
    const refreshFamilyId = familyId || randomUUID();
    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        refreshTokenHash,
        refreshFamilyId,
        lastUsedAt: now(),
        ip: context?.ip || null,
        userAgent: context?.userAgent || null,
      },
    });
    return { session, refreshToken };
  }

  private async issueCsrfToken(sessionId: string) {
    await this.prisma.adminCsrfToken.deleteMany({ where: { sessionId } });
    const token = randomBytes(16).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = addMinutes(this.csrfTtlMinutes());
    await this.prisma.adminCsrfToken.create({
      data: {
        sessionId,
        tokenHash,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  async validateCsrf(sessionId: string, token: string) {
    const tokenHash = hashToken(token);
    const record = await this.prisma.adminCsrfToken.findFirst({
      where: {
        sessionId,
        tokenHash,
        expiresAt: { gt: now() },
      },
    });
    return Boolean(record);
  }

  private async revokeFamily(refreshFamilyId: string) {
    await this.prisma.adminSession.updateMany({
      where: { refreshFamilyId, revokedAt: null },
      data: { revokedAt: now() },
    });
  }

  private async resetFailures(adminId: string) {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        failedCount: 0,
        lastFailedAt: null,
        lockedUntil: null,
      },
    });
  }

  private async recordFailure(admin: AdminUser) {
    const windowMs = this.lockoutWindowMinutes() * 60 * 1000;
    const withinWindow = admin.lastFailedAt ? Date.now() - admin.lastFailedAt.getTime() <= windowMs : false;
    const nextCount = withinWindow ? admin.failedCount + 1 : 1;
    const updates: Record<string, any> = {
      failedCount: nextCount,
      lastFailedAt: now(),
    };
    if (nextCount >= this.lockoutAttempts()) {
      updates.lockedUntil = addMinutes(this.lockoutDurationMinutes());
    }
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: updates });
  }

  private ensurePasswordPolicy(password: string) {
    if (password.length < 12) throw new BadRequestException("ADMIN_PASSWORD_TOO_SHORT");
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      throw new BadRequestException("ADMIN_PASSWORD_TOO_COMMON");
    }
  }

  async createAdminUser(params: { email: string; password: string; role?: AdminRole }) {
    const email = normalizeEmail(params.email);
    if (!email) throw new BadRequestException("ADMIN_EMAIL_REQUIRED");
    this.ensurePasswordPolicy(params.password);
    const passwordHash = await this.password.hash(params.password);
    try {
      return await this.prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          role: params.role || AdminRole.VIEWER,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new BadRequestException("ADMIN_EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async updateAdminUser(params: {
    id: string;
    role?: AdminRole;
    isActive?: boolean;
    password?: string;
  }) {
    const updates: Record<string, any> = {};
    if (params.role) updates.role = params.role;
    if (typeof params.isActive === "boolean") updates.isActive = params.isActive;
    if (params.password) {
      this.ensurePasswordPolicy(params.password);
      updates.passwordHash = await this.password.hash(params.password);
    }
    if (!Object.keys(updates).length) {
      throw new BadRequestException("ADMIN_UPDATE_EMPTY");
    }
    return this.prisma.adminUser.update({
      where: { id: params.id },
      data: updates,
    });
  }

  private ensureActive(admin: AdminUser) {
    if (!admin.isActive) {
      throw new ForbiddenException("ADMIN_INACTIVE");
    }
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      throw new ForbiddenException("ADMIN_LOCKED");
    }
  }

  async login(params: { email: string; password: string; context?: SessionContext }) {
    const email = normalizeEmail(params.email);
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException("ADMIN_CREDENTIALS_INVALID");
    }
    this.ensureActive(admin);

    const ok = await this.password.verify(admin.passwordHash, params.password);
    if (!ok) {
      await this.recordFailure(admin);
      throw new UnauthorizedException("ADMIN_CREDENTIALS_INVALID");
    }
    await this.resetFailures(admin.id);

    const { session, refreshToken } = await this.issueSession(admin, params.context);
    const accessToken = this.createAccessToken(admin, session.id);
    const csrf = await this.issueCsrfToken(session.id);

    await this.audit.record({
      adminUserId: admin.id,
      role: admin.role,
      action: "ADMIN_LOGIN",
      requestId: params.context?.requestId || null,
      ip: params.context?.ip || null,
      userAgent: params.context?.userAgent || null,
      result: { sessionId: session.id },
    });

    return {
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
      refreshToken,
      csrfToken: csrf.token,
      sessionId: session.id,
    };
  }

  async refresh(params: { refreshToken: string; context?: SessionContext }) {
    const refreshTokenHash = hashToken(params.refreshToken);
    const session = await this.prisma.adminSession.findUnique({ where: { refreshTokenHash } });
    if (!session) {
      throw new UnauthorizedException("ADMIN_REFRESH_INVALID");
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: session.adminUserId } });
    if (!admin) {
      await this.revokeFamily(session.refreshFamilyId);
      throw new UnauthorizedException("ADMIN_REFRESH_INVALID");
    }
    this.ensureActive(admin);

    if (session.revokedAt) {
      await this.revokeFamily(session.refreshFamilyId);
      await this.audit.record({
        adminUserId: admin.id,
        role: admin.role,
        action: "ADMIN_REFRESH_REUSE",
        requestId: params.context?.requestId || null,
        ip: params.context?.ip || null,
        userAgent: params.context?.userAgent || null,
        result: { sessionId: session.id },
      });
      throw new UnauthorizedException("ADMIN_REFRESH_REUSED");
    }

    const rotated = await this.issueSession(admin, params.context, session.refreshFamilyId);
    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: now(), lastUsedAt: now() },
    });
    await this.prisma.adminCsrfToken.deleteMany({ where: { sessionId: session.id } });
    const csrf = await this.issueCsrfToken(rotated.session.id);

    const accessToken = this.createAccessToken(admin, rotated.session.id);
    await this.audit.record({
      adminUserId: admin.id,
      role: admin.role,
      action: "ADMIN_REFRESH",
      requestId: params.context?.requestId || null,
      ip: params.context?.ip || null,
      userAgent: params.context?.userAgent || null,
      result: { sessionId: rotated.session.id },
    });

    return {
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
      refreshToken: rotated.refreshToken,
      csrfToken: csrf.token,
      sessionId: rotated.session.id,
    };
  }

  async logout(params: { refreshToken?: string | null; context?: SessionContext }) {
    if (!params.refreshToken) return;
    const refreshTokenHash = hashToken(params.refreshToken);
    const session = await this.prisma.adminSession.findUnique({ where: { refreshTokenHash } });
    if (!session) return;
    await this.revokeFamily(session.refreshFamilyId);
    await this.prisma.adminCsrfToken.deleteMany({ where: { sessionId: session.id } });
    await this.audit.record({
      adminUserId: session.adminUserId,
      action: "ADMIN_LOGOUT",
      requestId: params.context?.requestId || null,
      ip: params.context?.ip || null,
      userAgent: params.context?.userAgent || null,
      result: { sessionId: session.id },
    });
  }

  async me(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException("ADMIN_NOT_FOUND");
    this.ensureActive(admin);
    return { id: admin.id, email: admin.email, role: admin.role } as AdminIdentity;
  }

  async ensureCsrfToken(sessionId: string, existingToken?: string | null) {
    if (existingToken) {
      const valid = await this.validateCsrf(sessionId, existingToken);
      if (valid) return existingToken;
    }
    const csrf = await this.issueCsrfToken(sessionId);
    return csrf.token;
  }
}
