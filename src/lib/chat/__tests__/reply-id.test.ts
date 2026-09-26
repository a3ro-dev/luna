import { describe, expect, it } from "vitest";
import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";

/**
 * The chat route saves each reply under the id it streams. The SDK only honours
 * generateMessageId when originalMessages is set, so the route passes []. If the
 * start chunk ever loses messageId, the client invents its own id and every reply
 * shows twice after the chat refreshes from the server.
 */
describe("chat reply id", () => {
  it("streams the generated id in the start chunk and finishes with the same id", async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "hello" },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } } },
          ],
        }),
      }),
    });
    const result = streamText({ model, prompt: "hi" });
    let finishedId = "";
    const res = result.toUIMessageStreamResponse({
      originalMessages: [],
      generateMessageId: () => "11111111-1111-4111-8111-111111111111",
      onFinish: ({ responseMessage }) => {
        finishedId = responseMessage.id;
      },
    });
    const body = await res.text();
    expect(body).toContain('"messageId":"11111111-1111-4111-8111-111111111111"');
    expect(finishedId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
