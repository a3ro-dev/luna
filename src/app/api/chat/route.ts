import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import {
  aiTraces,
  chatMessages,
  chatSessions,
  chatSummaries,
  users,
  uploadedImages,
} from "@/lib/db/schema";
import { auth } from "@/auth";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { logError } from "@/lib/utils";
import { baseOpenUiPrompt } from "@/lib/chat/prompt";
import {
  resolveEffectivePrior,
  predictNextCycle,
  type PerimenoStage,
} from "@/lib/prediction/engine";
import {
  addCycleNoteEntry,
  fetchRecentCyclesEntry,
  getCurrentIsoDate,
  getCycleInsightsEntry,
  logOvulationEntry,
  logPeriodEndEntry,
  logPeriodStartEntry,
  refreshCycleAnalytics,
  resolveUserTimeZone,
  sanitizeTimeZone,
} from "@/lib/cycle-tools";
import { looksLikeOpenUiLang } from "@/lib/chat/openui";
import { getModelConfig } from "@/lib/chat/models";
import { storeImage } from "@/lib/chat/images";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// Chat rate limit: 30 messages per minute per user to prevent AI cost abuse
const CHAT_RATE_LIMIT = 30;
const CHAT_RATE_WINDOW_MS = 60 * 1000;

// Max request body size: 15MB (accounts for base64 image payloads)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

// HackClub AI provider
const hackClubAI = createOpenAI({
  baseURL: "https://ai.hackclub.com/proxy/v1",
  apiKey: process.env.HACKCLUB_AI_API_KEY,
});

// Supermemory — only stores personal profile facts about the user
// (health conditions, life context, preferences, recurring patterns)
// NOT cycle data (that's in our DB) and NOT chat messages (that's in our DB).

async function recallMemory(userId: string, query: string): Promise<string> {
  if (!process.env.SUPERMEMORY_API_KEY || !query.trim()) return "";
  try {
    const res = await fetch("https://api.supermemory.ai/v4/search", {
      headers: {
        Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        containerTag: userId,
        limit: 5,
        searchMode: "memories",
      }),
      method: "POST",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const results: Array<{ memory?: string }> = data.results ?? [];
    return results
      .filter((r) => typeof r.memory === "string" && r.memory.trim().length > 0)
      .map((r) => r.memory!.trim())
      .join("\n");
  } catch {
    return "";
  }
}

async function storeMemoryFact(
  userId: string,
  fact: string,
  isStatic = false,
): Promise<void> {
  if (!process.env.SUPERMEMORY_API_KEY || !fact.trim()) return;
  try {
    await fetch("https://api.supermemory.ai/v4/memories", {
      headers: {
        Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        containerTag: userId,
        memories: [{ content: fact.trim(), isStatic }],
      }),
      method: "POST",
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error("Supermemory write failed", e);
  }
}

const RECENT_MESSAGE_LIMIT = 20;
const SUMMARY_TRIGGER_COUNT = 30;
const SUMMARY_MIN_DELTA = 12;

const getTextFromParts = (parts: UIMessage["parts"]): string => {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
};

const getOrCreateSession = async (userId: string) => {
  const existing = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const created = await db.insert(chatSessions).values({ userId }).returning();

  return created[0];
};

const getSessionById = async (sessionId: string, userId: string) => {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  return rows[0];
};

const getRecentMessages = async (sessionId: string) => {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(RECENT_MESSAGE_LIMIT);

  return rows
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
    }));
};

const getLatestSummary = async (sessionId: string) => {
  const rows = await db
    .select()
    .from(chatSummaries)
    .where(eq(chatSummaries.sessionId, sessionId))
    .orderBy(desc(chatSummaries.createdAt))
    .limit(1);

  return rows[0];
};

const extractKeywords = (text: string) => {
  const stopwords = new Set([
    "the",
    "and",
    "with",
    "this",
    "that",
    "have",
    "about",
    "your",
    "from",
    "what",
    "when",
    "where",
    "like",
    "just",
    "feel",
    "feels",
    "been",
    "were",
    "want",
    "need",
    "been",
    "im",
    "i'm",
    "you",
    "are",
    "for",
    "but",
  ]);

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopwords.has(word)),
    ),
  ).slice(0, 6);
};

const getContextSnippets = async (sessionId: string, queryText: string) => {
  const keywords = extractKeywords(queryText);
  if (keywords.length === 0) return [];

  const conditions = keywords.map((keyword) =>
    ilike(chatMessages.textContent, `%${keyword}%`),
  );

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.sessionId, sessionId), or(...conditions)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(6);

  return rows
    .slice()
    .reverse()
    .map((row) => `${row.role}: ${row.textContent ?? ""}`)
    .filter((line) => line.trim().length > 0);
};

const buildSystemPrompt = ({
  memoryContext,
  latestSummary,
  contextSnippets,
  timeZone,
  conditions = [],
  perimenoStage,
  ciReliable,
}: {
  memoryContext: string;
  latestSummary?: string;
  contextSnippets: string[];
  timeZone: string;
  conditions?: string[];
  perimenoStage?: "early" | "late" | "unknown";
  ciReliable?: boolean;
}) => {
  const summaryContext = latestSummary
    ? `Conversation Summary:\n${latestSummary}\n\n`
    : "";
  const snippetContext =
    contextSnippets.length > 0
      ? `Relevant Context Snippets:\n${contextSnippets.join("\n")}\n\n`
      : "";

  // Build condition-aware context for the AI
  const conditionSection =
    conditions.length > 0 && !conditions.includes("none")
      ? buildConditionContext(conditions, perimenoStage, ciReliable)
      : "";

  return `${baseOpenUiPrompt}\n\n${summaryContext}${snippetContext}${conditionSection}User Context & Memory:\n${memoryContext}\n\nToday in the user's timezone (${timeZone}) is ${getCurrentIsoDate(timeZone)}.`;
};

// Build condition-aware context section for the system prompt
const buildConditionContext = (
  conditions: string[],
  perimenoStage?: "early" | "late" | "unknown",
  ciReliable?: boolean,
): string => {
  const prior = resolveEffectivePrior({ conditions, perimenoStage });
  const conditionLabels: Record<string, string> = {
    pcos: "PCOS (Polycystic Ovary Syndrome)",
    pcod: "PCOD (Polycystic Ovarian Disease)",
    endometriosis: "Endometriosis",
    thyroid: "Thyroid condition",
    hormonal_bc: "On hormonal birth control",
    irregular: "Irregular cycles (unexplained)",
    perimenopause: "Perimenopause",
    perimenopause_early: "Early perimenopause",
    perimenopause_late: "Late perimenopause",
  };
  const labels = conditions
    .filter((c) => c !== "none")
    .map((c) => conditionLabels[c] ?? c)
    .join(", ");

  let section = `## User Health Conditions\nThis user has: ${labels}.\n\n`;
  section += `${prior.note}\n\n`;

  if (prior.anovulatoryCommon) {
    section +=
      "Because anovulatory cycles are common for this user, ovulation predictions may be unreliable. " +
      "Be transparent about uncertainty when predicting ovulation or fertile windows. " +
      "If the user asks about ovulation, acknowledge the lower confidence and explain why. " +
      "Do not present ovulation predictions as reliable. Explicitly state high uncertainty.\n\n";
  }

  if (conditions.includes("hormonal_bc")) {
    section +=
      "This user is on hormonal birth control. Their bleeds are withdrawal bleeds, not true menstrual periods. " +
      "Do NOT predict ovulation or refer to follicular/luteal phases. " +
      "Focus on bleed tracking and any symptoms they report.\n\n";
  }

  section +=
    `Prediction engine configuration for this user:\n` +
    `- Expected cycle length: ~${Math.round(prior.cycleLength.mean)} days (σ≈${Math.round(Math.sqrt(prior.cycleLength.variance))}d)\n` +
    `- Expected period length: ~${prior.periodLength.mean} days (σ≈${Math.round(Math.sqrt(prior.periodLength.variance))}d)\n` +
    `- Maximum realistic cycle length before flagging as missed log: ${prior.maxCycleLength} days\n`;

  if (ciReliable === false) {
    section +=
      "\nNote: confidence interval has low statistical reliability for this user's data. " +
      "Present as an approximate range, not a precise forecast.\n";
  }

  return section;
};

const createChatTools = ({
  userId,
  timeZone,
  conditions = [],
  perimenoStage,
}: {
  userId: string;
  timeZone: string;
  conditions?: string[];
  perimenoStage?: "early" | "late" | "unknown";
}) => ({
  logPeriodStart: tool({
    description: "Log the start date of a menstrual period.",
    inputSchema: z.object({
      date: z
        .string()
        .describe("The period start date, ideally normalized to YYYY-MM-DD."),
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used to normalize the date."),
      notes: z
        .string()
        .optional()
        .describe("Optional free-text note or symptom detail."),
    }),
    execute: async ({ date, timezone, notes }) =>
      logPeriodStartEntry({
        userId,
        date,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        notes,
        conditions,
      }),
  }),
  logPeriodEnd: tool({
    description: "Log the end date of a menstrual period.",
    inputSchema: z.object({
      date: z
        .string()
        .describe("The period end date, ideally normalized to YYYY-MM-DD."),
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used to normalize the date."),
      notes: z
        .string()
        .optional()
        .describe("Optional free-text note or symptom detail."),
    }),
    execute: async ({ date, timezone, notes }) =>
      logPeriodEndEntry({
        userId,
        date,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        notes,
        conditions,
      }),
  }),
  logOvulation: tool({
    description:
      "Log an ovulation date for the user's current or most recent cycle.",
    inputSchema: z.object({
      date: z
        .string()
        .describe("The ovulation date, ideally normalized to YYYY-MM-DD."),
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used to normalize the date."),
      notes: z
        .string()
        .optional()
        .describe("Optional free-text note or symptom detail."),
    }),
    execute: async ({ date, timezone, notes }) =>
      logOvulationEntry({
        userId,
        date,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        notes,
        conditions,
      }),
  }),
  addNoteSymptom: tool({
    description:
      "Add a free-text note or symptom to the closest matching cycle.",
    inputSchema: z.object({
      note: z.string().describe("Free-text note or symptom description."),
      date: z
        .string()
        .optional()
        .describe(
          "Optional date for the note, ideally normalized to YYYY-MM-DD.",
        ),
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used to normalize the date."),
      symptoms: z
        .array(z.string())
        .optional()
        .describe("Optional symptom phrases to include."),
    }),
    execute: async ({ note, date, timezone, symptoms }) =>
      addCycleNoteEntry({
        userId,
        note,
        date,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        symptoms,
        conditions,
      }),
  }),
  fetchRecentCycles: tool({
    description: "Fetch the most recent menstrual cycles for the user.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(10).default(3),
    }),
    execute: async ({ limit }) =>
      fetchRecentCyclesEntry({ userId, limit, conditions }),
  }),
  computePredictions: tool({
    description:
      "Compute the next period and ovulation predictions from the user's cycle history.",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used for date calculations."),
    }),
    execute: async ({ timezone }) =>
      getCycleInsightsEntry({
        userId,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        mode: "prediction",
        conditions,
        perimenoStage,
      }),
  }),
  fetchStats: tool({
    description:
      "Fetch cycle statistics and compact prediction-ready insights.",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe("Optional IANA timezone used for date calculations."),
    }),
    execute: async ({ timezone }) =>
      getCycleInsightsEntry({
        userId,
        timeZone: sanitizeTimeZone(timezone, timeZone),
        mode: "stats",
        conditions,
        perimenoStage,
      }),
  }),
  exportData: tool({
    description: "Return the user's export link for their cycle data.",
    inputSchema: z.object({}),
    execute: async () => ({
      responseMode: "plain" as const,
      kind: "export" as const,
      message: "Your export is ready. Open /api/data/export to download it.",
      exportUrl: "/api/data/export",
    }),
  }),
  rememberFact: tool({
    description:
      "Remember a personal fact about the user that should persist across all future conversations. Use ONLY for things NOT already stored in cycle data: health conditions (PCOS, endometriosis, etc.), life context (trying to conceive, on birth control, perimenopausal), personal preferences, recurring symptom patterns they mention, or important context that affects how you should respond. Do NOT use for cycle dates, period lengths, or chat messages — those are already stored.",
    inputSchema: z.object({
      fact: z
        .string()
        .describe(
          "A concise, entity-centric fact. e.g. 'User has PCOS' or 'User is trying to conceive' or 'User gets migraines before every period'",
        ),
      isStatic: z
        .boolean()
        .optional()
        .describe(
          "True for permanent traits (name, diagnosis, on birth control). False or omitted for evolving context.",
        ),
    }),
    execute: async ({ fact, isStatic }) => {
      await storeMemoryFact(userId, fact, isStatic ?? false);
      return {
        responseMode: "plain" as const,
        kind: "confirmation" as const,
        message: `remembered: ${fact}`,
      };
    },
  }),
  searchWeb: tool({
    description:
      "Search the web for current information. Use when the user asks about something that requires up-to-date knowledge: health topics, recent studies, current events, or anything your training data may not cover. Do NOT use for cycle data, predictions, or things already in the user's data.",
    inputSchema: z.object({
      query: z.string().describe("Search query. Be specific and concise."),
    }),
    execute: async ({ query }) => {
      if (!process.env.HACKCLUB_WEB_SEARCH_API_KEY) {
        return {
          responseMode: "plain" as const,
          kind: "search" as const,
          message: "Web search is not available right now.",
        };
      }
      try {
        const res = await fetch(
          `https://search.hackclub.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
          {
            headers: {
              Authorization: `Bearer ${process.env.HACKCLUB_WEB_SEARCH_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!res.ok) {
          return {
            responseMode: "plain" as const,
            kind: "search" as const,
            message: "Search is temporarily unavailable.",
          };
        }
        const data = await res.json();
        const results: Array<{
          title?: string;
          url?: string;
          description?: string;
        }> = data?.web?.results ?? [];
        if (results.length === 0) {
          return {
            responseMode: "plain" as const,
            kind: "search" as const,
            message: "No results found.",
          };
        }
        const formatted = results
          .map((r, i) => {
            // Sanitize URLs — only allow http/https schemes
            const safeUrl = r.url && /^https?:\/\//i.test(r.url) ? r.url : "#";
            return `${i + 1}. [${r.title ?? "Untitled"}](${safeUrl})\n${r.description ?? ""}`;
          })
          .join("\n\n");
        return {
          responseMode: "plain" as const,
          kind: "search" as const,
          message: `Here are the search results for "${query}":\n\n${formatted}`,
        };
      } catch {
        return {
          responseMode: "plain" as const,
          kind: "search" as const,
          message: "Search failed. Try again later.",
        };
      }
    },
  }),
});

const maybeSummarizeSession = async (
  sessionId: string,
  userId: string,
  modelName: string,
) => {
  const summaryRow = await getLatestSummary(sessionId);

  const messageCountRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt));

  const messageCount = messageCountRows.length;
  const lastSummaryCount = summaryRow?.messageCount ?? 0;

  if (messageCount < SUMMARY_TRIGGER_COUNT) return;
  if (messageCount - lastSummaryCount < SUMMARY_MIN_DELTA) return;

  const recentForSummary = messageCountRows
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
    }));

  const summaryPrompt =
    "Summarize the conversation so far for future context. Focus on user preferences, symptoms, cycle events, goals, and any explicit requests. Keep it concise and factual.";

  const summaryResult = await streamText({
    model: hackClubAI.chat(modelName),
    system: summaryPrompt,
    messages: await convertToModelMessages(recentForSummary),
  });

  const summaryText = await summaryResult.text;
  if (summaryText.trim().length === 0) return;

  await db.insert(chatSummaries).values({
    sessionId,
    userId,
    summary: summaryText.trim(),
    messageCount,
  });
};

export async function POST(req: Request) {
  const authSession = await auth();
  const userId = authSession?.user?.id;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limit: 30 messages per minute per user
  const chatRateResult = await rateLimit(
    `chat:${userId}`,
    CHAT_RATE_LIMIT,
    CHAT_RATE_WINDOW_MS,
  );
  if (!chatRateResult.success) {
    return new Response(
      JSON.stringify({ error: "Too many messages. Please slow down." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const {
    messages,
    sessionId: requestSessionId,
    timezone: clientTimeZone,
  } = await req.json();
  const userMessages = (Array.isArray(messages) ? messages : []) as UIMessage[];
  const userTimeZone = await resolveUserTimeZone(
    userId,
    sanitizeTimeZone(clientTimeZone),
  );

  const resolvedSession = requestSessionId
    ? await getSessionById(requestSessionId, userId)
    : undefined;
  const chatSession = resolvedSession ?? (await getOrCreateSession(userId));
  const sessionId = chatSession.id;

  const lastIncoming = userMessages[userMessages.length - 1];
  if (lastIncoming && lastIncoming.role === "user") {
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: "user",
      parts: lastIncoming.parts ?? [],
      textContent: getTextFromParts(lastIncoming.parts ?? []),
    });

    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
  }

  // --- Store any uploaded images in DB (7-day retention) ---
  if (lastIncoming && Array.isArray(lastIncoming.parts)) {
    for (const part of lastIncoming.parts) {
      if (
        part.type === "file" &&
        (
          part as {
            type: string;
            mediaType?: string;
            url?: string;
            filename?: string;
          }
        ).mediaType?.startsWith("image/") &&
        (part as { type: string; url?: string }).url
      ) {
        const filePart = part as {
          type: string;
          mediaType: string;
          url: string;
          filename?: string;
        };

        // Validate image size and media type before storing
        const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
        const ALLOWED_MEDIA_TYPES = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ];

        if (filePart.url.length > MAX_IMAGE_SIZE_BYTES * 1.37) {
          // base64 is ~37% larger than raw bytes
          logError(
            "image-upload",
            `Image too large, skipping: ${filePart.filename}`,
          );
          continue;
        }

        if (!ALLOWED_MEDIA_TYPES.includes(filePart.mediaType)) {
          logError(
            "image-upload",
            `Unsupported image type, skipping: ${filePart.mediaType}`,
          );
          continue;
        }

        try {
          await storeImage({
            userId,
            imageData: filePart.url,
            mediaType: filePart.mediaType,
            filename: filePart.filename,
          });
        } catch (imgErr) {
          logError("image-upload", imgErr);
        }
      }
    }
  }

  // --- Resolve user's plan tier and conditions ---
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true, conditions: true, perimenoStage: true },
  });
  const modelConfig = getModelConfig(userRow?.plan);
  const userConditions: string[] = Array.isArray(userRow?.conditions)
    ? (userRow.conditions as string[])
    : [];
  const userPerimenoStage =
    (userRow?.perimenoStage as "early" | "late" | "unknown" | undefined) ??
    undefined;

  // Compute CI reliability from a quick prediction on cycle lengths
  let ciReliable: boolean | undefined;
  try {
    const analyticsForCi = await refreshCycleAnalytics(
      userId,
      userConditions,
      userPerimenoStage,
    );
    if (analyticsForCi.cycleLengths.length > 0) {
      const quickPred = predictNextCycle(
        analyticsForCi.cycleLengths,
        "cycleLength",
        userConditions,
        userPerimenoStage,
      );
      ciReliable = quickPred.ciReliable;
    }
  } catch {
    // If prediction fails, leave ciReliable undefined
  }

  const lastUserText = getTextFromParts(lastIncoming?.parts ?? []);
  const memoryContext = await recallMemory(userId, lastUserText);
  const recentMessages = await getRecentMessages(sessionId);
  const latestSummary = await getLatestSummary(sessionId);
  const contextSnippets = await getContextSnippets(sessionId, lastUserText);

  // Append plan-specific persona + condition context to the system prompt
  const systemPrompt =
    buildSystemPrompt({
      memoryContext,
      latestSummary: latestSummary?.summary,
      contextSnippets,
      timeZone: userTimeZone,
      conditions: userConditions,
      perimenoStage: userPerimenoStage,
      ciReliable,
    }) +
    "\n\n" +
    modelConfig.personaPrompt;

  const startTime = Date.now();
  const modelName = modelConfig.modelId;
  const tools = createChatTools({
    userId,
    timeZone: userTimeZone,
    conditions: userConditions,
    perimenoStage: userPerimenoStage,
  });

  const result = await streamText({
    model: hackClubAI.chat(modelName),
    system: systemPrompt,
    messages: await convertToModelMessages(recentMessages),
    tools,
    stopWhen: stepCountIs(modelConfig.maxSteps),
    onFinish: async ({ usage, text, steps }) => {
      const latencyMs = Date.now() - startTime;

      await db.insert(chatMessages).values({
        sessionId,
        userId,
        role: "assistant",
        parts: [{ type: "text", text }],
        textContent: text,
      });

      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));

      await maybeSummarizeSession(sessionId, userId, modelName);

      // Grok-4.3 pricing: $1.25 per 1M input tokens, $2.50 per 1M output tokens
      const costUsd =
        (usage.inputTokens ?? 0) * (1.25 / 1_000_000) +
        (usage.outputTokens ?? 0) * (2.5 / 1_000_000);

      // Track AI usage
      await db.insert(aiTraces).values({
        userId,
        model: modelName,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        costUsd,
        latencyMs,
        feature: "chat",
        hasImages: userMessages.some(
          (m) =>
            Array.isArray(m.parts) && m.parts.some((p) => p.type === "file"),
        ),
        hadWebSearch:
          steps?.some((step) =>
            step.toolResults?.some(
              (tr: { toolName?: string }) => tr.toolName === "searchWeb",
            ),
          ) ?? false,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
