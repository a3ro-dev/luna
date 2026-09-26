import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

vi.mock("@/lib/db", () => ({ db: {} })); // pure helpers only; no database

const { isUuid, textOf, toSessionSummary, toUIMessage } = await import("@/lib/chat/store");
const { prepareImageParts } = await import("@/lib/chat/images");

type Parts = UIMessage["parts"];

describe("chat store mapping", () => {
  it("maps a row to a UIMessage and tolerates non-array parts", () => {
    const parts = [{ type: "text", text: "hi" }];
    expect(toUIMessage({ id: "a", role: "user", parts })).toEqual({ id: "a", role: "user", parts });
    expect(toUIMessage({ id: "b", role: "assistant", parts: null })).toEqual({ id: "b", role: "assistant", parts: [] });
  });

  it("joins only text parts", () => {
    expect(textOf([{ type: "text", text: "a" }, { type: "file", url: "x" }, { type: "text", text: "b" }])).toBe("ab");
    expect(textOf("nope")).toBe("");
  });

  it("serialises session dates as ISO strings", () => {
    const d = new Date("2026-09-26T10:00:00Z");
    expect(toSessionSummary({ id: "s", title: null, createdAt: d, updatedAt: null })).toEqual({
      id: "s",
      title: null,
      createdAt: "2026-09-26T10:00:00.000Z",
      updatedAt: "2026-09-26T10:00:00.000Z",
    });
  });

  it("accepts only UUIDs", () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
    expect(isUuid("abc123")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("prepareImageParts", () => {
  it("moves inline images out, keeps stored ones as references, drops unsupported", () => {
    const parts = [
      { type: "text", text: "look" },
      { type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA", filename: "a.png" },
      { type: "file", mediaType: "image/jpeg", url: "/api/chat/sessions/images/old-id" },
      { type: "file", mediaType: "image/svg+xml", url: "data:image/svg+xml;base64,AAAA" },
    ] as Parts;
    const { parts: out, images } = prepareImageParts(parts, () => "new-id");
    expect(images).toEqual([
      { id: "new-id", image_data: "data:image/png;base64,AAAA", media_type: "image/png", filename: "a.png" },
    ]);
    expect(out).toEqual([
      { type: "text", text: "look" },
      { type: "file", mediaType: "image/png", url: "luna-image:new-id", filename: "a.png" },
      { type: "file", mediaType: "image/jpeg", url: "luna-image:old-id" },
    ]);
  });
});
