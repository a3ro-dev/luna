"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function PrivacyPolicyClient() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["info"]));
  const [activeSection, setActiveSection] = useState("info");

  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll("[data-section]");
      let current = "info";
      headings.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          current = el.getAttribute("data-section") || current;
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FCFBFB] font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-16">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FFDDE0]/60 text-[#8E7D82] transition hover:bg-[#FFF5F7] hover:text-[#6D5A60] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light text-[#6D5A60] tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm font-light text-[#8E7D82]">
              Last updated June 18, 2026
            </p>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Sticky sidebar TOC — desktop only */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-3">
                On this page
              </p>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-xs font-light py-1.5 px-2 rounded-lg transition-colors ${
                    activeSection === s.id
                      ? "text-[#6D5A60] bg-[#FFDDE0]/30"
                      : "text-[#8E7D82] hover:text-[#6D5A60]"
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-8">
            {/* Intro */}
            <div
              className="rounded-2xl border border-[#FFDDE0]/30 bg-white/40 p-6"
              data-section="info"
            >
              <p className="text-[#6D5A60] font-light leading-relaxed">
                Luna is a free, open-source menstrual cycle tracking companion.
                This policy explains exactly what data we collect, where it
                goes, and who touches it. We wrote it in plain language because
                you should know what happens to your data — especially health
                data — without needing a lawyer.
              </p>
            </div>

            {SECTIONS.map((section) => (
              <motion.div
                key={section.id}
                id={section.id}
                data-section={section.id}
                className="rounded-2xl border border-[#FFDDE0]/30 bg-white/40 overflow-hidden"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#FFF9F9]/50 transition-colors cursor-pointer"
                >
                  <h2 className="font-serif text-xl font-light text-[#6D5A60]">
                    {section.title}
                  </h2>
                  <motion.span
                    animate={{ rotate: expanded.has(section.id) ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-[#8E7D82]/60 ml-3 shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded.has(section.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-[#6D5A60] font-light leading-relaxed text-sm space-y-3">
                        {section.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        <footer className="mt-24 pt-12 border-t border-[#FFDDE0]/30 text-center">
          <p className="text-sm text-[#8E7D82] font-light">
            We don&apos;t sell your data. We never will. &copy;{" "}
            {new Date().getFullYear()} Luna.
          </p>
        </footer>
      </div>
    </div>
  );
}

const SECTIONS: Section[] = [
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
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2 space-y-1 text-xs">
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Encryption at rest</span>
            <span className="text-[#6D5A60] font-medium">AES-256</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Encryption in transit</span>
            <span className="text-[#6D5A60] font-medium">TLS 1.2+</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Certifications</span>
            <span className="text-[#6D5A60] font-medium">SOC 2 Type II, ISO 27001</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">HIPAA</span>
            <span className="text-[#8E7D82]">
              Scale plan only (~$700/mo)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Infrastructure</span>
            <span className="text-[#6D5A60] font-medium">AWS, 8 regions</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#8E7D82]">Open source</span>
            <span className="text-[#6D5A60] font-medium">Apache 2.0</span>
          </div>
        </div>
        <p className="mt-3 text-[#8E7D82] text-xs">
          Neon was acquired by Databricks in May 2025. Privacy policy now falls
          under Databricks' legal framework. Luna uses Neon's HTTP
          serverless driver with <code>cache: no-store</code> to prevent Vercel
          from caching query results.{" "}
          <a
            href="https://trust.neon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline"
          >
            Neon Trust Center
          </a>{" "}
          ·{" "}
          <a
            href="https://neon.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline"
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
          to xAI (Grok) and Anthropic (Claude). Web searches go through Brave Search
          via HackClub&apos;s search API.
        </p>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFB5C0] mt-1.5 shrink-0" />
            <p className="text-[#6D5A60]">
              <strong>Full prompt logging.</strong> HackClub logs every AI prompt
              and response in full (jsonb), linked to your user ID and IP address.
              This includes anything you type to the AI — symptoms, cycle details,
              health questions.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFB5C0] mt-1.5 shrink-0" />
            <p className="text-[#6D5A60]">
              <strong>No retention policy.</strong> There is no documented deletion
              schedule for these logs. HackClub&apos;s general privacy policy does
              not specifically address the AI proxy or search API.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D6CBE3] mt-1.5 shrink-0" />
            <p className="text-[#6D5A60]">
              <strong>Verifiable.</strong> HackClub&apos;s AI proxy code is fully
              open source. You can verify exactly what they log. But you cannot
              opt out of it.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8E7D82]/40 mt-1.5 shrink-0" />
            <p className="text-[#8E7D82] text-[11px]">
              Upstream: HackClub → OpenRouter → xAI/Anthropic. Each upstream
              provider has their own data policies.{" "}
              <a
                href="https://hackclub.com/privacy-and-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFB5C0] hover:underline"
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
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2 space-y-1 text-xs">
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Infrastructure</span>
            <span className="text-[#6D5A60] font-medium">Timescale + Cloudflare</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Encryption at rest</span>
            <span className="text-[#8E7D82]">
              Not explicitly documented
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Compliance claims</span>
            <span className="text-[#6D5A60] font-medium">SOC 2, HIPAA (unverified)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#FFDDE0]/10">
            <span className="text-[#8E7D82]">Public audit reports</span>
            <span className="text-[#8E7D82]">None available</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#8E7D82]">Third-party AI</span>
            <span className="text-[#8E7D82]">
              Content may be sent to OpenAI/Gemini
            </span>
          </div>
        </div>
        <p className="mt-3 text-[#8E7D82] text-xs">
          Supermemory is an early-stage company (Supermemory Inc., founded by
          Dhravya Shah). Their core engine is open source (MIT). Luna queries
          Supermemory with a 3-second AbortSignal timeout.{" "}
          <a
            href="https://supermemory.ai/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline"
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
            className="text-[#FFB5C0] hover:underline"
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
            in middleware. strict-dynamic for script loading. No unsafe-eval or
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
        <p className="mt-3 text-[#8E7D82] text-xs">
          Security audit by Kiro (May 2025). 10 fixes applied: Redis rate
          limiting, CSP hardening, Zod import validation, conditions allowlist,
          third-party timeouts, admin email env var, and more.
        </p>
      </>
    ),
  },
  {
    id: "no-sell",
    title: "What we don&apos;t do",
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
            className="text-[#FFB5C0] hover:underline transition-all"
          >
            akshatsingh14372@outlook.com
          </a>
        </p>
        <p className="mt-2">
          <Link
            href="https://github.com/a3ro-dev/luna"
            className="text-[#FFB5C0] hover:underline transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/a3ro-dev/luna
          </Link>
        </p>
        <p className="mt-4 text-[#8E7D82] text-xs">
          This policy is part of Luna&apos;s open-source repository. You can
          see its history and suggest changes on GitHub.
        </p>
      </>
    ),
  },
];
