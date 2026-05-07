export interface ChangelogEntry {
  version: string;
  date: string;
  type: "feat" | "fix" | "refactor" | "docs" | "chore";
  title: string;
  description: string;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.7.3",
    date: "2026-05-07",
    type: "fix",
    title:
      "Peer-review fixes round 2: unified anomaly detection, inverse-variance mixture with spread, perimenopause sub-conditions, luteal prior fix, expanded tests",
    description:
      "Fixed 8 peer-review findings: (1) unified anomaly detection -- refreshCycleAnalytics now delegates entirely to skipGate() as the single source of truth, removing the old z-score first pass; (2) replaced simple inverse-variance pool with mixture that includes between-condition spread term; (3) added 40+ unit tests for the prediction engine covering skipGate, exponentialSmooth, blendWithPrior, predictNextCycle, and resolveEffectivePrior; (4) added perimenopause_early and perimenopause_late as direct condition IDs in ConditionId and CONDITION_PRIORS, with onboarding UI and chat route updates; (5) corrected POPULATION_PRIOR and none condition lutealLength from 12.0 to 11.7d matching Najmabadi et al.; (6) added serverless rate limiter warning JSDoc; (7) added base64 image storage limitation note to schema; (8) passed perimenoStage through all refreshCycleAnalytics callers.",
  },
  {
    version: "0.7.2",
    date: "2026-05-07",
    type: "fix",
    title:
      "Peer-review fixes: unified anomaly detection, mixture priors, CI reliability, perimenopause sub-priors, tests",
    description:
      "Fixed 7 peer-review findings: (1) unified anomaly detection by replacing the manual z-score second pass in refreshCycleAnalytics with the engine's skipGate(); (2) replaced 'highest variance wins' multi-condition resolution with inverse-variance weighted mixture blending; (3) added ciReliable flag to jackknife CI and prediction output, with AI disclaimer when unreliable; (4) added early/late perimenopause sub-priors with perimenoStage user metadata; (5) fixed package.json version mismatch; (6) added 30 unit tests for the prediction engine using Vitest; (7) added CI reliability warning and enhanced anovulatory disclaimer to AI system prompt.",
  },
  {
    version: "0.7.1",
    date: "06-05-2026",
    type: "docs",
    title: "Humanize all papers and project docs",
    description:
      "Rewrote all papers (technical, nontechnical, references, research notes) and project docs (README, PRODUCT, DESIGN, CONTRIBUTING) to remove AI writing patterns: sentence-case headings, no em dashes (use --), active voice, added voice and opinions. Fixed all source code citations to be clickable markdown links with line-number fragments. Added changelog and paper-sync conventions to AGENTS.md.",
  },
  {
    version: "0.7.0",
    date: "2026-05-06",
    type: "feat",
    title: "Condition-aware prediction engine & Luna responses",
    description:
      "Added 7 condition-specific population priors (PCOS, PCOD, endometriosis, thyroid, hormonal BC, irregular cycles, perimenopause) based on clinical research. Adaptive skip thresholds per condition (e.g. 120d for PCOS vs 45d for general population). Updated general population prior with better evidence. Luna now adapts her language and prediction confidence based on the user's health conditions. Ovulation predictions suppressed for hormonal BC users. Fixed Grok-4.3 token pricing.",
  },
  {
    version: "0.6.2",
    date: "2026-05-05",
    type: "fix",
    title: "Period length off-by-one, dashboard count & favicon",
    description:
      "Fixed period length calculation to use inclusive day count (a period Jan 28–31 is 4 days, not 3). Fixed dashboard showing only 6 cycles tracked instead of the actual total. Added proper Luna favicon replacing the default Vercel icon. Compact mobile navigation on /chat with icon-only buttons.",
  },
  {
    version: "0.6.1",
    date: "2026-05-05",
    type: "fix",
    title: "Landing page auth redirect for signed-in users",
    description:
      "Fixed /start and landing page CTAs always redirecting to /signup even when already signed in. Signed-in users now see 'Dashboard' / 'Open Luna' CTAs and get auto-redirected to /dashboard.",
  },
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
