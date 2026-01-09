import { normalizeUsername, validateUsername } from "../../../packages/username";

describe("username normalization", () => {
  it("normalizes and hashes deterministically", () => {
    const result = normalizeUsername(" Alice ");
    expect(result.normalized).toBe("alice");
    expect(result.handleHash.startsWith("0x")).toBe(true);
    expect(result.handleHash.length).toBe(66);
  });

  it("rejects invalid usernames", () => {
    expect(validateUsername("ab").valid).toBe(false);
    expect(validateUsername("abc").valid).toBe(true);
    expect(validateUsername("ab--c").valid).toBe(false);
    expect(validateUsername("ab_c").valid).toBe(false);
    expect(validateUsername("-abcd").valid).toBe(false);
    expect(validateUsername("abcd-").valid).toBe(false);
  });
});
