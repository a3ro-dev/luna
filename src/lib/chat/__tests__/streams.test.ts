import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} })); // request parsing only; no database or Redis

const { parseChatRequest } = await import("@/lib/chat/streams");

const SESSION = "0b6f2a4e-8a53-4c1e-9d59-5b1f3f0f7a10";
const MESSAGE = "5d0c3b1a-2e4f-4a6b-8c9d-0e1f2a3b4c5d";
const text = (t: string) => ({ type: "text", text: t });

describe("parseChatRequest", () => {
  it("accepts the contract body and keeps a uuid message id", () => {
    const parsed = parseChatRequest({
      id: SESSION,
      message: { id: MESSAGE, role: "user", parts: [text("hi")], metadata: { x: 1 } },
      trigger: "regenerate-message",
      timezone: "Asia/Kolkata",
    });
    expect(parsed).toEqual({
      sessionId: SESSION,
      message: { id: MESSAGE, role: "user", parts: [text("hi")] },
      trigger: "regenerate-message",
      timeZone: "Asia/Kolkata",
    });
  });

  it("rejects a missing or non-uuid session id", () => {
    const message = { id: MESSAGE, role: "user", parts: [text("hi")] };
    expect(parseChatRequest({ message })).toBeNull();
    expect(parseChatRequest({ id: "abc", message })).toBeNull();
    expect(parseChatRequest(null)).toBeNull();
    expect(parseChatRequest("nope")).toBeNull();
  });

  it("gives an old client's non-uuid message id a fresh uuid", () => {
    const parsed = parseChatRequest({ id: SESSION, message: { id: "nanoid123", role: "user", parts: [text("hi")] } });
    expect(parsed?.message.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(parsed?.message.id).not.toBe("nanoid123");
    expect(parsed?.trigger).toBe("submit-message");
    expect(parsed?.timeZone).toBeUndefined();
  });

  it("keeps only text and file parts and requires a user message with content", () => {
    const file = { type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" };
    const parsed = parseChatRequest({
      id: SESSION,
      message: { id: MESSAGE, role: "user", parts: [text("a"), { type: "tool-logPeriodStart", output: {} }, file] },
    });
    expect(parsed?.message.parts).toEqual([text("a"), file]);
    expect(parseChatRequest({ id: SESSION, message: { id: MESSAGE, role: "assistant", parts: [text("a")] } })).toBeNull();
    expect(parseChatRequest({ id: SESSION, message: { id: MESSAGE, role: "user", parts: [] } })).toBeNull();
    expect(parseChatRequest({ id: SESSION, message: { id: MESSAGE, role: "user" } })).toBeNull();
  });
});
