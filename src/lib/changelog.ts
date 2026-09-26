export interface ChangelogEntry {
  version: string;
  date: string;
  type: "feat" | "fix" | "refactor" | "docs" | "chore";
  title: string;
  description: string;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.14.4",
    date: "2026-09-26",
    type: "feat",
    title: "A clearer front page",
    description:
      "The landing page says what Luna is in one line with one clear action, lists one-tap logging and the pattern check honestly, and no longer downloads the scroll animation on phones. The cookie notice and install prompt never cover each other or the main button. Legal pages are easier to read on small screens.",
  },
  {
    version: "0.14.3",
    date: "2026-09-26",
    type: "feat",
    title: "Warmer sign-in and onboarding",
    description:
      "Sign-in, sign-up and password pages are one thumb-friendly column on phones with larger text, show/hide password buttons, correct autofill hints, and clear inline errors. Onboarding moves focus to each new step for screen-reader users and keeps focus in place while saving.",
  },
  {
    version: "0.14.2",
    date: "2026-09-26",
    type: "feat",
    title: "Calmer, clearer settings",
    description:
      "Settings are grouped into sections with their own save and error messages, inline validation, and focus moving to the first problem. Every timezone is available and India no longer appears twice. An empty date of birth no longer blocks saving. The bottom tab bar is available on phones.",
  },
  {
    version: "0.14.1",
    date: "2026-09-26",
    type: "feat",
    title: "Chat that works well on a phone",
    description:
      "The chat composer stays above the keyboard, the chat list opens as a proper drawer (focus stays inside, Escape and tapping outside close it), and Today and Settings are always one tap away. If a reply fails, a Try again card resends it without duplicating your message. Deleting a chat now always moves you to another one.",
  },
  {
    version: "0.14.0",
    date: "2026-09-26",
    type: "feat",
    title: "A dashboard built around today",
    description:
      "The dashboard now opens with a Today card: a cycle ring that shows where you are in your cycle, the logged period, the likely next-start window and the estimated ovulation, next to the next-period estimate. The calendar pages back three months and ahead two, and shows a period in progress from its start through today. On phones the order is Today, Quick log, then everything else, and a bottom tab bar replaces the top buttons. Contrast, reduced-motion handling and screen-reader labels are improved throughout.",
  },
  {
    version: "0.13.3",
    date: "2026-09-26",
    type: "fix",
    title: "Steadier chat: no stuck sessions, faster replies, less shared",
    description:
      "Stopping a reply mid-tool no longer breaks the conversation. Tool calls in one reply run in order, so 'log it and show my forecast' uses the new log. The conversation summary runs after the reply instead of delaying it. Memory recall now reads your saved facts by account only, so chat text is no longer sent to the memory service. Chat history loads photos by link instead of inline data, and the nightly cleanup of old photo copies now actually matches them.",
  },
  {
    version: "0.13.2",
    date: "2026-09-26",
    type: "fix",
    title: "Reliable data import and private error logs",
    description:
      "Re-importing a Luna export no longer drops cycles. One bad record now rejects the whole import with a clear message instead of being skipped silently. Imported ovulation dates must fall inside their cycle. Apple Health exports with nested metadata are read correctly and 'no flow' entries are ignored. Database errors in server logs no longer include the health data that was being saved.",
  },
  {
    version: "0.13.1",
    date: "2026-09-26",
    type: "fix",
    title: "Security hardening for sign-in, sessions, and emails",
    description:
      "Sign-in now allows 10 attempts per email every 15 minutes and takes the same time whether or not an account exists. Changing or resetting a password signs out every other session. Names and emails are escaped in all outgoing emails. Email addresses are stored in lower case. Email changes are rate limited. Login alerts no longer send your IP address to a third-party lookup service. Passwords and emails are no longer written to server logs. Everyone will be asked to sign in once after this update.",
  },
  {
    version: "0.13.0",
    date: "2026-09-26",
    type: "feat",
    title: "Pattern check against clinical reference ranges",
    description:
      "The dashboard now compares your last six months with FIGO's published ranges for typical periods: cycles of 24 to 38 days, bleeding of 8 days or less, and cycle lengths that stay close together (the range depends on age). Each item reads typical, outside the range, or needs more data, and chat can explain it. It is a pattern summary, not a diagnosis, and it is switched off on hormonal contraception.",
  },
  {
    version: "0.12.2",
    date: "2026-09-26",
    type: "fix",
    title: "Photos in chat now really expire after 7 days",
    description:
      "Uploaded photos were deleted from image storage after 7 days, but a copy also lived inside the saved chat message. Chat history now keeps only a reference, so the 7-day deletion covers it, and the daily cleanup removes copies saved by earlier versions. Chat replies also start faster because Luna now loads your forecast, memories, and recent messages in parallel.",
  },
  {
    version: "0.12.1",
    date: "2026-09-26",
    type: "fix",
    title: "Smoother onboarding with a first period date",
    description:
      "Onboarding now asks (optionally) when your last period started, so predictions appear right away. Perimenopause stage is actually saved from your selection, early and late can no longer both be picked, every timezone is available with your own detected automatically, and error messages are easier to read.",
  },
  {
    version: "0.12.0",
    date: "2026-09-26",
    type: "feat",
    title: "Log your period straight from the dashboard",
    description:
      "A new card on the dashboard lets you log that your period started or ended today, or on another day, without opening chat. It uses the same checks as chat, so overlapping or future dates are rejected with a plain explanation. Adds /api/cycles routes for creating, editing, and removing period logs.",
  },
  {
    version: "0.11.3",
    date: "2026-09-26",
    type: "chore",
    title: "Adopt the Next.js 16 proxy convention",
    description:
      "Renamed the request middleware to proxy.ts as Next.js 16 recommends, and cleaned up stale pnpm settings that produced warnings on every command. Behavior is unchanged.",
  },
  {
    version: "0.11.2",
    date: "2026-09-26",
    type: "chore",
    title: "Remove unused UI components and packages",
    description:
      "Deleted 49 vendored interface components and eight packages that no part of Luna used, which shrinks installs and removes most lint errors.",
  },
  {
    version: "0.11.1",
    date: "2026-09-24",
    type: "docs",
    title: "Bring project documentation in line with the current release",
    description:
      "Updated repository and in-app documentation for Next.js 16, forecast-v2, the eight-table schema, and plan-specific layouts. The docs now state clearly that plans alter presentation, not forecasting or health features.",
  },
  {
    version: "0.11.0",
    date: "2026-09-24",
    type: "feat",
    title: "Distinct layouts for each Luna plan",
    description:
      "Free, Premium, and Premium+ now have their own dashboard, chat, and settings layouts, with plan-specific color and navigation. Every plan keeps the same cycle data, forecasts, chat tools, and account controls.",
  },
  {
    version: "0.10.2",
    date: "2026-09-24",
    type: "docs",
    title: "Correct and reorganize forecast research papers",
    description:
      "Rewrote the technical, plain-language, source, and research records with renderable equations, reproducible commands, explicit model and backtest limitations, and corrected primary-study citations and denominators.",
  },
  {
    version: "0.10.1",
    date: "2026-09-24",
    type: "fix",
    title: "Restore landing page subscription requests",
    description:
      "The Premium Subscribe buttons now open the request form and show sending, error, and success states. Subscription requests report an error when the admin email is rejected. Password reset email delivery is kept alive after the API response, and reset links use the configured app URL.",
  },
  {
    version: "0.10.0",
    date: "2026-09-24",
    type: "feat",
    title: "Calibrated forecasts, safer cycle writes, and shared prediction truth",
    description:
      "Introduced forecast-v2, an explainable posterior-predictive model with explicit 80% next-cycle ranges, structured provenance, cautious condition handling, uncertain-log gates, and honest abstention for unsupported ovulation estimates. Dashboard and chat now use the same forecast service. Cycle edits, imports, deletions, and profile changes share strict calendar, overlap, and refresh validation. Added privacy-bounded database profiling, leakage-free rolling-origin evaluation, synthetic stress tests, and durable research documentation. Chat streaming now preserves structured UIMessage parts and scopes session updates to the authenticated user.",
  },
  {
    version: "0.9.17",
    date: "2026-06-23",
    type: "fix",
    title: "Fix service worker crashed page errors on network disconnect",
    description:
      "Fixed a bug in public/sw.js where a network fetch failure would cause a TypeError: Failed to convert value to 'Response' because the catch handler resolved with undefined when the page was not cached. Now returns a premium styled fallback error response.",
  },
  {
    version: "0.9.16",
    date: "2026-06-19",
    type: "fix",
    title: "Fix onboarding 'something went wrong' errors and perimenopause stage sync",
    description:
      "Fixed 5 bugs in the onboarding flow: (1) Perimenopause stage was never sent to the API because the condition check looked for 'perimenopause' but the UI uses 'perimenopause_early'/'perimenopause_late' IDs. (2) Removed router.refresh() after router.push() in signup-client to prevent race conditions during post-registration navigation. (3) Added error display to all onboarding steps (previously only steps 2 and 3 showed errors). (4) Changed consentGivenAt from .toISOString() to a Date object for safer Drizzle/Neon timestamp serialization. (5) Added explicit session.update() call after onboarding completion to ensure the JWT picks up consentGiven=true before the dashboard redirect, preventing middleware from redirecting back to onboarding.",
  },
  {
    version: "0.9.15",
    date: "2026-06-18",
    type: "feat",
    title: "Consent screen, transparency page & onboarding compliance",
    description:
      "Added mandatory consent step to onboarding with clear plain-language summaries of Terms, Privacy, and Limitations. Created /transparency page explaining honestly how Luna works, what it can and can't do, and how data is processed by each third-party service. Added consent tracking (consent_given, consent_given_at, consent_version) to the database. Consent is enforced for all existing users via middleware — unconsented users are redirected to onboarding. Consent is re-required on re-do onboarding. If consent is declined, onboarding stops entirely. Added minimal cookie consent banner (essential cookies only — no tracking, no ads). Updated privacy policy cookies section.",
  },
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
