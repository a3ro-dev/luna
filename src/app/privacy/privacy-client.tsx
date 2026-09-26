"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-ink)]";

/**
 * Shared reading layout for /privacy, /terms and /transparency: a ~65ch
 * column, a sticky sidebar contents list on large screens, and a sticky,
 * collapsible "On this page" bar on phones. Every section is a plain anchor.
 */
export function LegalDocument({
  title,
  updated,
  intro,
  sections,
  footer,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  footer: React.ReactNode;
}) {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  useEffect(() => {
    const handleScroll = () => {
      let current = sections[0].id;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 120) current = section.id;
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const activeTitle =
    sections.find((s) => s.id === activeSection)?.title ?? sections[0].title;

  // In the phone bar, following a link also folds the <details> away.
  const closeDetails = (e: React.MouseEvent<HTMLAnchorElement>) =>
    e.currentTarget.closest("details")?.removeAttribute("open");

  const tocLinks = () =>
    sections.map((s, index) => (
      <li key={s.id}>
        <a
          href={`#${s.id}`}
          onClick={closeDetails}
          aria-current={activeSection === s.id ? "location" : undefined}
          className={`flex min-h-11 items-baseline gap-3 rounded-xl px-3 py-2.5 text-sm leading-snug transition-colors lg:min-h-0 lg:py-1.5 lg:text-[13px] ${focusRing} ${
            activeSection === s.id
              ? "bg-[var(--landing-blush)]/40 text-[var(--landing-ink)]"
              : "text-[var(--landing-secondary)] hover:bg-[var(--landing-hover)] hover:text-[var(--landing-ink)]"
          }`}
        >
          <span className="w-5 shrink-0 text-[13px] tabular-nums text-[var(--landing-secondary)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">{s.title}</span>
        </a>
      </li>
    ));

  return (
    <div className="luna-landing min-h-dvh bg-[var(--luna-page)] font-sans text-[var(--landing-ink)] selection:bg-[var(--landing-blush)] selection:text-[var(--landing-ink)]">
      <div className="mx-auto max-w-5xl px-5 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] md:px-8 md:pb-24 md:pt-20">
        <header className="mb-8 lg:mb-16">
          <Link
            href="/"
            aria-label="Back to Luna home"
            className={`mb-8 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--landing-blush)] bg-[var(--landing-surface)]/60 pl-3 pr-4 text-xs font-medium text-[var(--landing-ink)] transition hover:bg-[var(--landing-hover)] ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Luna
          </Link>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--landing-ink)]">
            {title}
          </h1>
          <p className="mt-3 text-sm text-[var(--landing-secondary)]">Last updated {updated}</p>
        </header>

        {/* Phones and tablets: sticky, collapsible contents bar */}
        <div className="sticky top-0 z-30 -mx-5 mb-8 border-y border-[var(--landing-blush)]/60 bg-[var(--luna-page)]/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md md:-mx-8 md:px-8 lg:hidden">
          <details className="group">
            <summary
              className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 text-[13px] font-medium text-[var(--landing-secondary)]">
                  On this page
                </span>
                <span className="truncate text-sm text-[var(--landing-ink)]">
                  {activeTitle}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--landing-secondary)] transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <nav aria-label="On this page" className="pb-3">
              <ol className="max-h-[60dvh] space-y-0.5 overflow-y-auto overscroll-contain">
                {tocLinks()}
              </ol>
            </nav>
          </details>
        </div>

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-10">
              <p className="mb-2 px-3 text-[13px] font-semibold text-[var(--landing-secondary)]">
                On this page
              </p>
              <ol className="space-y-0.5">{tocLinks()}</ol>
            </div>
          </nav>

          <article className="min-w-0 max-w-[65ch]">
            <div className="text-[1.25rem] leading-[1.45] tracking-[-0.012em] text-[var(--landing-ink)] md:text-[1.375rem]">
              {intro}
            </div>

            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="mt-12 scroll-mt-20 border-t border-[var(--landing-blush)]/70 pt-10 lg:scroll-mt-10"
              >
                <p
                  aria-hidden
                  className="mb-2 text-[13px] font-medium tabular-nums text-[var(--landing-accent)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2
                  id={`${section.id}-title`}
                  className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.022em] text-[var(--landing-ink)] md:text-[1.625rem]"
                >
                  <a
                    href={`#${section.id}`}
                    className={`group/anchor rounded-md ${focusRing}`}
                  >
                    {section.title}
                    <span
                      aria-hidden
                      className="ml-2 text-[var(--landing-accent)] opacity-0 transition-opacity group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100"
                    >
                      #
                    </span>
                  </a>
                </h2>
                <div className="mt-5 space-y-4 text-[0.95rem] leading-[1.7] text-[var(--landing-ink)] [&_strong]:font-semibold">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>

        <footer className="mt-20 border-t border-[var(--landing-blush)]/70 pt-10 text-center md:mt-24">
          <p className="text-sm text-[var(--landing-secondary)]">{footer}</p>
          <nav
            aria-label="Legal"
            className="mt-4 flex flex-wrap justify-center gap-x-2 text-xs"
          >
            {[
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/transparency", "Transparency"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-[var(--landing-secondary)] underline decoration-[var(--landing-blush)] underline-offset-4 transition-colors hover:text-[var(--landing-ink)] hover:decoration-[var(--landing-accent)] ${focusRing}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}

export default function PrivacyPolicyClient() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="September 24, 2026"
      intro={
        <p>
          Luna is a free, open-source menstrual cycle tracking companion.
          This policy explains exactly what data we collect, where it
          goes, and who touches it. We wrote it in plain language because
          you should know what happens to your data — especially health
          data — without needing a lawyer.
        </p>
      }
      sections={SECTIONS}
      footer={
        <>
          We don&apos;t sell your data. We never will. &copy;{" "}
          {new Date().getFullYear()} Luna.
        </>
      }
    />
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    content: (
      <>
        <p>
          To provide predictions and a personalized AI experience, Luna collects:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account info.</strong> Your email address and a bcryptjs-hashed
            password (12 rounds). We never see your plain-text password.
          </li>
          <li>
            <strong>Profile data.</strong> Your name (optional), date of birth
            (optional, max 2 edits), timezone, and week start preference.
          </li>
          <li>
            <strong>Health conditions.</strong> Self-reported conditions you select
            during onboarding — PCOS, endometriosis, thyroid disorders, hormonal
            birth control, perimenopause, and others. These tune the prediction
            engine. Stored as a validated allowlist array (10 possible values).
          </li>
          <li>
            <strong>Cycle data.</strong> Period start/end dates, ovulation dates,
            symptoms, moods, and personal notes. All date-parsed through timezone-aware
            normalizers.
          </li>
          <li>
            <strong>Chat messages.</strong> Everything you type to the AI assistant.
            Stored as UIMessage parts (not plain content) with auto-generated summaries
            after 30+ messages.
          </li>
          <li>
            <strong>AI traces.</strong> Model used, input/output token counts, cost,
            latency, and feature type — logged after every AI response for monitoring.
          </li>
          <li>
            <strong>Images.</strong> Any photos you upload for analysis. Stored as
            base64 in PostgreSQL with a 7-day TTL. Auto-deleted by a cron job.
          </li>
          <li>
            <strong>Personal facts.</strong> When you say &quot;remember I have PCOS,&quot;
            Luna stores that fact in Supermemory for cross-session recall. Scoped
            per user via containerTag — no cross-user leakage.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "database",
    title: "Where your data lives — Neon PostgreSQL",
    content: (
      <>
        <p>
          All structured data lives in a Neon PostgreSQL database. Neon is a
          serverless Postgres platform running on AWS.
        </p>
        <div className="rounded-[1.125rem] bg-[var(--landing-surface)] shadow-[var(--landing-shadow-card)] p-4 mt-2 space-y-1 text-xs [&_span:last-child]:text-right">
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Encryption at rest</span>
            <span className="text-[var(--landing-ink)] font-medium">AES-256</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Encryption in transit</span>
            <span className="text-[var(--landing-ink)] font-medium">TLS 1.2+</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Certifications</span>
            <span className="text-[var(--landing-ink)] font-medium">SOC 2 Type II, ISO 27001</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">HIPAA</span>
            <span className="text-[var(--landing-secondary)]">
              Scale plan only (~$700/mo)
            </span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Infrastructure</span>
            <span className="text-[var(--landing-ink)] font-medium">AWS, 8 regions</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-[var(--landing-secondary)]">Open source</span>
            <span className="text-[var(--landing-ink)] font-medium">Apache 2.0</span>
          </div>
        </div>
        <p className="mt-3 text-[var(--landing-secondary)] text-xs">
          Neon was acquired by Databricks in May 2025. Privacy policy now falls
          under Databricks&apos; legal framework. Luna uses Neon&apos;s HTTP
          serverless driver with <code>cache: no-store</code> to prevent Vercel
          from caching query results.{" "}
          <a
            href="https://trust.neon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 hover:decoration-[var(--landing-accent)]"
          >
            Neon Trust Center
          </a>{" "}
          ·{" "}
          <a
            href="https://neon.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 hover:decoration-[var(--landing-accent)]"
          >
            Security
          </a>
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "AI processing — HackClub proxy",
    content: (
      <>
        <p>
          All AI chat goes through HackClub&apos;s infrastructure, a US 501(c)(3)
          nonprofit. Their proxy forwards prompts to OpenRouter, which then routes
          to xAI (Grok) and Anthropic (Claude). Web searches use HackClub&apos;s
          search API.
        </p>
        <div className="rounded-[1.125rem] bg-[var(--landing-surface)] shadow-[var(--landing-shadow-card)] p-4 mt-2 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--landing-rose)] mt-1.5 shrink-0" />
            <p className="text-[var(--landing-ink)]">
              <strong>Full prompt logging.</strong> HackClub logs every AI prompt
              and response in full (jsonb), linked to your user ID and IP address.
              This includes anything you type to the AI — symptoms, cycle details,
              health questions.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--landing-rose)] mt-1.5 shrink-0" />
            <p className="text-[var(--landing-ink)]">
              <strong>No retention policy.</strong> There is no documented deletion
              schedule for these logs. HackClub&apos;s general privacy policy does
              not specifically address the AI proxy or search API.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--landing-lavender)] mt-1.5 shrink-0" />
            <p className="text-[var(--landing-ink)]">
              <strong>Verifiable.</strong> HackClub&apos;s AI proxy code is fully
              open source. You can verify exactly what they log. But you cannot
              opt out of it.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--landing-tertiary)]/40 mt-1.5 shrink-0" />
            <p className="text-[var(--landing-secondary)] text-xs">
              Upstream: HackClub → OpenRouter → xAI/Anthropic. Each upstream
              provider has their own data policies.{" "}
              <a
                href="https://hackclub.com/privacy-and-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 hover:decoration-[var(--landing-accent)]"
              >
                HackClub Privacy & Terms
              </a>
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "supermemory",
    title: "Personal facts — Supermemory",
    content: (
      <>
        <p>
          When you tell Luna to remember something (&quot;I have PCOS,&quot;
          &quot;I&apos;m allergic to ibuprofen&quot;), that fact is stored in
          Supermemory v4 API for cross-session recall. Luna sends only personal
          facts — never cycle data or chat messages. Each user&apos;s facts are
          scoped via containerTag.
        </p>
        <div className="rounded-[1.125rem] bg-[var(--landing-surface)] shadow-[var(--landing-shadow-card)] p-4 mt-2 space-y-1 text-xs [&_span:last-child]:text-right">
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Infrastructure</span>
            <span className="text-[var(--landing-ink)] font-medium">Timescale + Cloudflare</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Encryption at rest</span>
            <span className="text-[var(--landing-secondary)]">
              Not explicitly documented
            </span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Compliance claims</span>
            <span className="text-[var(--landing-ink)] font-medium">SOC 2, HIPAA (unverified)</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-[var(--landing-line)]">
            <span className="text-[var(--landing-secondary)]">Public audit reports</span>
            <span className="text-[var(--landing-secondary)]">None available</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-[var(--landing-secondary)]">Third-party AI</span>
            <span className="text-[var(--landing-secondary)]">
              Content may be sent to OpenAI/Gemini
            </span>
          </div>
        </div>
        <p className="mt-3 text-[var(--landing-secondary)] text-xs">
          Supermemory is an early-stage company (Supermemory Inc., founded by
          Dhravya Shah). Their core engine is open source (MIT). Luna queries
          Supermemory with a 3-second AbortSignal timeout.{" "}
          <a
            href="https://supermemory.ai/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 hover:decoration-[var(--landing-accent)]"
          >
            Supermemory Privacy
          </a>
        </p>
      </>
    ),
  },
  {
    id: "email",
    title: "Email — Resend",
    content: (
      <>
        <p>
          Transactional emails (welcome, password reset, OTP, login notifications)
          are sent via Resend. Emails go to the address you provided at signup.
          No marketing emails are sent. Luna uses the ADMIN_EMAIL environment
          variable for the from address.{" "}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 hover:decoration-[var(--landing-accent)]"
          >
            Resend Privacy
          </a>
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "Data retention & your rights",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Images auto-deleted after 7 days.</strong> A cron job purges
            expired uploads. Images are stored as base64 in PostgreSQL (not an
            object store like S3).
          </li>
          <li>
            <strong>Export your data.</strong> Download all your cycle data as
            a JSON file through the chat or via the export route. Format: Luna
            JSON v1 with mStart, mEnd, ovulationDate, cycleLength, periodLength, notes.
          </li>
          <li>
            <strong>Account deletion.</strong> Coming soon through settings.
            Currently available by contacting us directly. All your data is
            permanently removed from Luna&apos;s database.
          </li>
          <li>
            <strong>HackClub logs.</strong> As noted above, HackClub logs AI
            prompts and responses with no documented retention. These logs are
            outside Luna&apos;s control. If you need full data sovereignty,
            self-host Luna with your own AI backend.
          </li>
          <li>
            <strong>Rate limiting.</strong> Sensitive endpoints (login, password
            reset, OTP, login-notification, subscribe) are rate-limited via
            Upstash Redis with in-memory fallback.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & local storage",
    content: (
      <>
        <p>
          Luna uses <strong>only essential cookies and localStorage</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>NextAuth.js session JWT cookie.</strong> Keeps you signed
            in. 7-day expiry. HttpOnly, Secure in production. No tracking.
          </li>
          <li>
            <strong>localStorage — cookie consent.</strong> Remembers that you
            dismissed the cookie banner so we don&apos;t show it again.
          </li>
          <li>
            <strong>localStorage — PWA install.</strong> Remembers that you
            dismissed the install prompt.
          </li>
        </ul>
        <p>
          No analytics cookies. No tracking cookies. No third-party cookies.
          No fingerprinting. No ads. The cookie banner at the bottom of the
          screen tells you this on first visit.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security measures",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Password hashing.</strong> bcryptjs, 12 rounds. Plain-text
            passwords never stored.
          </li>
          <li>
            <strong>Content Security Policy.</strong> Per-request nonces generated
            in the request proxy. strict-dynamic for script loading. No unsafe-eval or
            unsafe-inline in production.
          </li>
          <li>
            <strong>Rate limiting.</strong> Sliding-window counters on auth
            endpoints via Upstash Redis (fallback to in-memory per-process).
          </li>
          <li>
            <strong>Input validation.</strong> Zod schemas on all API routes.
            Conditions restricted to a 10-element allowlist. Password capped
            at 128 characters to prevent bcrypt DoS.
          </li>
          <li>
            <strong>Third-party timeouts.</strong> AbortSignal.timeout on
            Supermemory (3s) and HackClub search (5s) calls.
          </li>
          <li>
            <strong>Email enumeration prevention.</strong> Registration route
            returns success even if email already exists.
          </li>
          <li>
            <strong>No logs in production.</strong> Email and error messages
            use placeholder addresses, not real user data.
          </li>
        </ul>
        <p className="mt-3 text-[var(--landing-secondary)] text-xs">
          Security audit by Kiro (May 2025). 10 fixes applied: Redis rate
          limiting, CSP hardening, Zod import validation, conditions allowlist,
          third-party timeouts, admin email env var, and more.
        </p>
      </>
    ),
  },
  {
    id: "no-sell",
    title: "What we don't do",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sell your data. To anyone. Ever.</li>
          <li>Show you ads. No ad networks, no ad tracking.</li>
          <li>Share data with insurers, employers, or data brokers.</li>
          <li>Train AI models on your conversations.</li>
          <li>Use tracking cookies or analytics.</li>
          <li>Share cycle data with a partner or doctor.</li>
          <li>Connect to wearable devices (no Apple Watch, Oura Ring, etc.).</li>
        </ul>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>
          Questions about this policy or how we handle your data?
        </p>
        <p>
          <a
            href="mailto:akshatsingh14372@outlook.com"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 transition-colors hover:decoration-[var(--landing-accent)]"
          >
            akshatsingh14372@outlook.com
          </a>
        </p>
        <p className="mt-2">
          <Link
            href="https://github.com/a3ro-dev/luna"
            className="text-[var(--landing-accent)] underline decoration-[var(--landing-rose)] underline-offset-2 transition-colors hover:decoration-[var(--landing-accent)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/a3ro-dev/luna
          </Link>
        </p>
        <p className="mt-4 text-[var(--landing-secondary)] text-xs">
          This policy is part of Luna&apos;s open-source repository. You can
          see its history and suggest changes on GitHub.
        </p>
      </>
    ),
  },
];
