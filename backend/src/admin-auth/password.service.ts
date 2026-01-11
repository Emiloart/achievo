/**
 * Admin password hashing and verification.
 */
import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

@Injectable()
export class PasswordService {
  private readonly options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 1,
  };

  hash(password: string) {
    return argon2.hash(password, this.options);
  }

  verify(hash: string, password: string) {
    return argon2.verify(hash, password, this.options);
  }
}
