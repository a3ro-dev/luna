export interface ChangelogEntry {
  version: string;
  date: string;
  type: "feat" | "fix" | "refactor" | "docs" | "chore";
  title: string;
  description: string;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.9.14",
    date: "2026-05-27",
    type: "fix",
    title: "Fix service worker errors and middleware credentials body drop",
    description:
      "Fixed three bugs: (1) Added HTTP/HTTPS scheme filter in the service worker to prevent caching requests from chrome-extensions; (2) Added range request check (response.status !== 206) in service worker to prevent Cache.put error on partial content responses (videos/audio); (3) Bypassed CSP header creation in middleware for all API routes, preventing Next.js from dropping request bodies on POST requests (such as NextAuth credentials sign-in).",
  },
  {
    version: "0.9.13",
    date: "2026-05-27",
    type: "fix",
    title: "Fix CSP nonce verification failure on client-side routes",
    description:
      "Separated landing, login, signup, forgot-password, reset-password, onboarding, chat, and settings pages into Server Component entry points and Client Component implementations. This allows Next.js to respect the `export const dynamic = 'force-dynamic'` configuration on the server page level, forcing request-time dynamic rendering and allowing the CSP nonces to be correctly stamped onto Next.js inline scripts.",
  },
  {
    version: "0.9.12",
    date: "2026-05-27",
    type: "fix",
    title: "Fix CSP nonce not applied to inline scripts on public pages",
    description:
      "Added `export const dynamic = 'force-dynamic'` to all public client-component pages (login, signup, forgot-password, reset-password, landing, onboarding). CSP nonces only work on dynamically rendered pages -- static pre-rendering builds HTML without the nonce, causing the browser to block every inline script.",
  },
  {
    version: "0.9.11",
    date: "2026-05-21",
    type: "fix",
    title: "Fix pnpm lockfile config mismatch for overrides in Vercel build",
    description:
      "Moved package overrides to pnpm-workspace.yaml in accordance with pnpm v11 workspace requirements to ensure local pnpm v11 correctly resolves and locks react type packages. Retained overrides in package.json for backward compatibility with Vercel's default pnpm v10 runner, eliminating the lockfile config mismatch error.",
  },
  {
    version: "0.9.10",
    date: "2026-05-21",
    type: "fix",
    title: "Documentation peer-review corrections & mathematical audit",
    description:
      "Audited and verified prediction engine mathematical derivations and logic in papers/luna-technical.md, ensuring 100% correctness of mixture prior blending equations and explanations. Completed documentation formatting verification, link and line-number hash check, and dashes compliance across all papers. Verified prediction engine vitest unit tests.",
  },
  {
    version: "0.9.9",
    date: "2026-05-19",
    type: "fix",
    title: "Fix CSP blocking Next.js inline hydration scripts",
    description:
      "Moved Content-Security-Policy from a static next.config.ts header to per-request generation in middleware. Each response now carries a unique 'nonce-...' value (base64 UUID). 'strict-dynamic' allows Next.js chunk loaders to propagate the nonce. 'unsafe-eval' is added only in development (for HMR). The static CSP in next.config.ts is removed to avoid double-header conflicts.",
  },
  {
    version: "0.9.8",
    date: "2026-05-19",
    type: "fix",
    title: "Fix Zod v4 z.record() build error in import route",
    description:
      "Zod v4 changed z.record() to require two arguments (key schema + value schema). Fixed the lunaCycleSchema in the data import route by passing z.string() as the key schema: z.record(z.string(), z.unknown()). This unblocked the Vercel production build.",
  },
  {
    version: "0.9.7",
    date: "2026-05-19",
    type: "fix",
    title: "Security audit fixes (Kiro audit, May 2026)",
    description:
      "Applied 10 security fixes from the full Kiro audit: (1) pinned @openuidev packages to exact versions (supply chain hardening); (2) set package.json private:true to block accidental npm publish; (3) removed unsafe-eval and unsafe-inline from production Content-Security-Policy script-src; (4) replaced open-ended conditions string array with an allowlist enum in profileUpdateSchema and onboardingSchema (prompt-injection prevention); (5) added IP-based rate limiting (3/hour) and proper RFC-5322 email validation to the public /api/subscribe endpoint; (6) added Zod validation to parseLuna() import parser to prevent type confusion and prototype pollution attacks; (7) added AbortSignal.timeout(3000) to both Supermemory API calls; (8) added AbortSignal.timeout(5000) to the HackClub web search call; (9) moved hardcoded admin email to ADMIN_EMAIL env var; (10) added per-user rate limiting (1/5min) to the login-notification endpoint; (11) added CRON_SECRET, NEXT_PUBLIC_APP_URL, ADMIN_EMAIL, and KV Redis vars to .env.example.",
  },
  {
    version: "0.9.6",
    date: "2026-05-11",
    type: "fix",
    title: "Fix PWA install help build errors",
    description:
      "Fixed missing install platform wiring on the landing page and restored the missing InstallHelpDialog component so production builds succeed.",
  },
  {
    version: "0.9.5",
    date: "2026-05-08",
    type: "fix",
    title: "Homepage header no longer clips logo on mobile",
    description:
      "Collapsed homepage header actions into a single primary CTA plus an overflow menu on small screens, preventing the Luna wordmark from being clipped.",
  },
  {
    version: "0.9.4",
    date: "2026-05-08",
    type: "fix",
    title: "Chat empty state no longer collapses into a blank screen",
    description:
      "Fixed the /chat layout when there are zero messages so the empty state fills the available space instead of leaving a large blank area above the composer (especially noticeable when the mobile keyboard opens).",
  },
  {
    version: "0.9.3",
    date: "2026-05-08",
    type: "fix",
    title: "Install help opens a mini-modal",
    description:
      "Changed the install banner's 'How to install' state from inline expanding text to a compact dialog with step-by-step instructions for iOS and other browsers.",
  },
  {
    version: "0.9.2",
    date: "2026-05-08",
    type: "fix",
    title: "PWA install banner uses Luna logo and always offers install help",
    description:
      "Replaced the emoji in the install banner with the Luna logo and added a fallback install-help action for browsers that never fire beforeinstallprompt (users can still install via the browser menu).",
  },
  {
    version: "0.9.1",
    date: "2026-05-08",
    type: "fix",
    title: "Dashboard mobile header pills no longer overflow",
    description:
      "Made the dashboard top navigation pills horizontally scrollable on small screens and tightened padding and font size so Dashboard/Chat/Settings/Sign out stay usable without clipping.",
  },
  {
    version: "0.9.0",
    date: "2026-05-08",
    type: "feat",
    title: "PWA install support for iOS, Android, and desktop",
    description:
      "Added full Progressive Web App support. Web App Manifest with standalone display, shortcuts, and maskable icons (192px and 512px generated from luna.png). Service worker with network-first HTML caching and cache-first static assets. PWAInstallPrompt component detects the platform and shows a native install banner (Chrome/Edge/Android via beforeinstallprompt) or a manual iOS Safari hint (share > Add to Home Screen). Dismiss state persisted in localStorage. CSP updated with worker-src, manifest-src, and blob: directives. Root layout updated with viewport metadata, apple-web-app capable, and theme color.",
  },
  {
    version: "0.8.0",
    date: "2026-05-07",
    type: "refactor",
    title:
      "Chat UI overhaul: memoized components, scroll perf, mobile keyboard safety, session switching",
    description:
      "Split the 700-line monolith page.tsx into 7 memoized sub-components (ChatHeader, ChatSidebar, MobileSidebar, MessageList, ChatComposer, AssistantMessage, UserMessage). Fixed session switching to prevent empty flash by keeping old messages until new ones load then swapping atomically. Replaced Framer Motion on non-essential elements with CSS animations. Removed triple backdrop-blur-xl stack (now single blur on header). Added overscroll-contain on scroll container. Coalesced scroll state updates via requestAnimationFrame instead of setState on every scroll event. Made composer keyboard-safe with safe-area-inset-bottom and dvh viewport. Removed will-change-transform from 10+ elements. Removed infinite scale animation on logo. Added prefers-reduced-motion safety. Reduced nav text from 10px to 12px. Used next/image for all chat images.",
  },
  {
    version: "0.7.4",
    date: "2026-05-07",
    type: "fix",
    title:
      "Phase coupling: derive follicular length from cycle+period+luteal (drop and derive)",
    description:
      "Eliminated the phase coupling inconsistency where four metrics smoothed independently could violate the physiological constraint cycleLength+1 = periodLength+follicularLength+lutealLength. Now only three metrics (cycleLength, periodLength, lutealLength) are smoothed independently; follicularLength is derived as cycleLength+1-periodLength-lutealLength via deriveFollicularLength(). Updated refreshCycleAnalytics to skip smoothing follicular and instead derive+upsert it after the three independent metrics. Updated buildPredictionPayload and buildAveragesFromParams to use the derivation. Fixed two pre-existing test failures: skipGate condition-specific threshold test now accounts for soft-clamp, and adaptive alpha test uses varying sequence instead of gated spike. Added 8 tests for deriveFollicularLength. Total: 68 vitest tests.",
  },
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
