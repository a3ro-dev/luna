import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, expect, it, vi } from "vitest";
import { logError } from "./utils";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("logError drops DrizzleQueryError params in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const err = new DrizzleQueryError('select * from "cycles" where "user_id" = $1', ["secret-2025-01-28"], new TypeError("fetch failed"));
  logError("cycles", err);
  const out = spy.mock.calls.flat().join(" ");
  expect(out).not.toContain("secret");
  expect(out).toContain('from "cycles"');
});
