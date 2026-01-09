/**
 * Request-level authentication helpers.
 */
import type { Request } from "express";
import { JwtService } from "@nestjs/jwt";
import { getAccessTokenFromRequest } from "./auth.util";

/** Resolves and verifies a JWT from the request, returning null on failure. */
export async function resolveJwtFromRequest<T extends { sub?: string }>(
  req: Request,
  jwt: JwtService,
): Promise<T | null> {
  const token = getAccessTokenFromRequest(req);
  if (!token) return null;
  try {
    return (await jwt.verifyAsync(token)) as T;
  } catch {
    return null;
  }
}
