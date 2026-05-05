export interface ChangelogEntry {
  version: string;
  date: string;
  type: "feat" | "fix" | "refactor" | "docs" | "chore";
  title: string;
  description: string;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.6.0",
    date: "2026-05-05",
    type: "feat",
    title: "Onboarding, manual logging, password reset & changelog",
    description:
      "Added a multi-step onboarding flow with date of birth, timezone (IST default), health conditions, push notifications, and an animated algorithm walkthrough. Dashboard now supports manual period logging alongside NLP. Password reset via Resend email. Changelog added to landing page.",
  },
  {
    version: "0.5.3",
    date: "2026-05-05",
    type: "chore",
    title: "Git LFS for large media files",
    description:
      "Set up Git LFS to handle image frames and video assets cleanly in the repository.",
  },
  {
    version: "0.5.2",
    date: "2026-05-05",
    type: "fix",
    title: "Chat scroll anchoring, next.config & documentation",
    description:
      "Fixed the custom scroll-to-bottom behavior in chat so it sticks correctly. Cleaned up Next.js config and updated all documentation files.",
  },
  {
    version: "0.5.1",
    date: "2026-05-05",
    type: "fix",
    title: "Chat layout uses dynamic viewport height",
    description:
      "Switched chat page to use h-dvh for proper mobile viewport handling, preventing layout overflow on iOS.",
  },
  {
    version: "0.5.0",
    date: "2026-05-05",
    type: "feat",
    title: "Chat rewrite with AI Elements + OpenUI + shadcn",
    description:
      "Rewrote the chat page using AI Elements components (Conversation, Message, PromptInput, Suggestions, Reasoning, Tool, Sources). Added OpenUI rendering for structured responses and shadcn UI components for dialogs and menus.",
  },
  {
    version: "0.4.1",
    date: "2026-05-05",
    type: "fix",
    title: "AI SDK v6 migration, Supermemory v4 & web search",
    description:
      "Migrated to AI SDK v6 APIs (stopWhen, inputTokens). Updated Supermemory to v4 endpoints. Integrated HackClub web search. Added auto-rename for chat sessions.",
  },
  {
    version: "0.4.0",
    date: "2026-05-05",
    type: "feat",
    title: "AI chat with context-aware tools & session memory",
    description:
      "Implemented the full AI chat interface with 10 cycle tools, dynamic context (recent messages + summaries + keyword snippets + Supermemory recall), and persistent chat sessions.",
  },
  {
    version: "0.3.1",
    date: "2026-05-05",
    type: "feat",
    title: "Agent-based NLP tools & OpenUI rendering",
    description:
      "Added cycle tools as AI agent functions (logPeriodStart, logPeriodEnd, logOvulation, addNoteSymptom, fetchRecentCycles, computePredictions, fetchStats, exportData, rememberFact, searchWeb). OpenUI Lang rendering for structured outputs.",
  },
  {
    version: "0.3.0",
    date: "2026-05-05",
    type: "feat",
    title: "Cycle management utilities & Tailwind setup",
    description:
      "Implemented the prediction engine with adaptive exponential smoothing, population priors (ACOG data), skip/anomaly gate, and outlier soft-clamping. Set up Tailwind CSS v4 with the Luna design system.",
  },
  {
    version: "0.2.2",
    date: "2026-05-05",
    type: "feat",
    title: "Auth session management & sign-out",
    description:
      "Added SessionProvider wrapper and SignOutButton component. Wired up NextAuth JWT sessions with proper callbacks.",
  },
  {
    version: "0.2.1",
    date: "2026-05-05",
    type: "docs",
    title: "Design & product documentation",
    description:
      "Created comprehensive DESIGN.md and PRODUCT.md with the Luna color palette, typography scale, motion principles, and product voice & tone guidelines.",
  },
  {
    version: "0.2.0",
    date: "2026-05-05",
    type: "feat",
    title: "Chat sessions: rename, delete & management",
    description:
      "Built chat session management with creation, selection, renaming via AI, and deletion. Added a sidebar with session list and a mobile overlay.",
  },
  {
    version: "0.1.2",
    date: "2026-05-05",
    type: "feat",
    title: "Dashboard with cycle prediction & calendar",
    description:
      "Implemented the server-rendered dashboard with a monthly calendar (phase color-coding), prediction cards, rhythm stats, and recent cycle history.",
  },
  {
    version: "0.1.1",
    date: "2026-05-04",
    type: "feat",
    title: "User authentication: registration & login",
    description:
      "Built sign-up and sign-in pages with email + password auth using Auth.js v5, bcryptjs hashing, and DrizzleAdapter for Neon Postgres.",
  },
  {
    version: "0.1.0",
    date: "2026-05-04",
    type: "feat",
    title: "Interactive landing page with GSAP animations",
    description:
      "Created the Luna landing page with GSAP scroll-triggered animations, canvas-based frame sequencing, frosted glass cards, and responsive layout.",
  },
  {
    version: "0.0.1",
    date: "2026-05-04",
    type: "chore",
    title: "Project initialization",
    description:
      "Initialized the Next.js 15 project with App Router, Tailwind CSS, and basic file structure.",
  },
];
