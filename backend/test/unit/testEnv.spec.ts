import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { assertIsolatedTestDatabaseUrl, DEFAULT_TEST_ENV, loadTestEnv } from "../testEnv";

describe("testEnv", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  function makeTempDir() {
    const dir = mkdtempSync(join(tmpdir(), "achievo-test-env-"));
    tempDirs.push(dir);
    return dir;
  }

  it("uses safe defaults when no env file exists", () => {
    const rootDir = makeTempDir();
    const result = loadTestEnv(rootDir);

    expect(result.file).toBeNull();
    expect(result.env.DATABASE_URL).toBe(DEFAULT_TEST_ENV.DATABASE_URL);
    expect(result.env.JWT_SECRET).toBe(DEFAULT_TEST_ENV.JWT_SECRET);
  });

  it("prefers .env.test.local over .env.test.example", () => {
    const rootDir = makeTempDir();
    writeFileSync(join(rootDir, ".env.test.example"), "JWT_SECRET=example-secret\n");
    writeFileSync(join(rootDir, ".env.test.local"), "JWT_SECRET=local-secret\n");

    const result = loadTestEnv(rootDir);

    expect(result.file).toBe(join(rootDir, ".env.test.local"));
    expect(result.env.JWT_SECRET).toBe("local-secret");
    expect(result.env.DATABASE_URL).toBe(DEFAULT_TEST_ENV.DATABASE_URL);
  });

  it("rejects obvious non-test database URLs", () => {
    expect(() => assertIsolatedTestDatabaseUrl("postgresql://postgres:postgres@localhost:5432/achievo")).toThrow(
      /Refusing to run backend tests/,
    );
    expect(() =>
      assertIsolatedTestDatabaseUrl("postgresql://achievo_test:achievo_test@localhost:54321/achievo_test?schema=public"),
    ).not.toThrow();
  });
});
