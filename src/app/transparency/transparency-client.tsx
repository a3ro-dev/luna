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

export default function TransparencyClient() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["what-luna-is"]));
  const [activeSection, setActiveSection] = useState("what-luna-is");

  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll("[data-section]");
      let current = "what-luna-is";
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
              Transparency
            </h1>
            <p className="text-sm font-light text-[#8E7D82]">
              Last updated June 18, 2026
            </p>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Sticky sidebar TOC */}
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

          <div className="min-w-0 flex-1 space-y-8">
            {/* Intro */}
            <div
              className="rounded-2xl border border-[#FFDDE0]/30 bg-white/40 p-6"
              data-section="what-luna-is"
            >
              <p className="text-[#6D5A60] font-light leading-relaxed">
                This page exists to be honest about what Luna is, what it
                isn't, and how it works under the hood. No fine print.
                No weasel words. We wrote this because legal polish is easy,
                but real transparency means telling you what we don't know.
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
            Everything on this page is verifiable from Luna's source code.{" "}
            &copy; {new Date().getFullYear()} Luna.
          </p>
        </footer>
      </div>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: "what-luna-is",
    title: "What Luna is",
    content: (
      <>
        <p>
          Luna is a free, open-source menstrual cycle tracking companion. You
          log your cycles by talking to an AI assistant — type things like
          &quot;my period started today&quot; or &quot;I'm feeling
          crampy&quot; and Luna records it. Over time, it learns your patterns
          and predicts when your next period might come.
        </p>
        <p>
          The prediction engine uses adaptive exponential smoothing with 10
          condition-specific population priors. It starts with research-based
          averages that differ depending on your health conditions (PCOS 51d,
          endometriosis 27d, thyroid 35d, etc.), then learns from your actual
          cycles. The more cycles you log, the more it trusts your data over
          the population averages.
        </p>
        <p>
          Luna is <strong>open source</strong> under the MIT license. You can
          read every line of code that handles your data and makes predictions.
          The full pipeline — database schema, prediction algorithm, AI tool
          definitions, API routes — is in one GitHub repository. Nothing is
          hidden.
        </p>
      </>
    ),
  },
  {
    id: "what-luna-is-not",
    title: "What Luna is not",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Not a medical device.</strong> Luna has no FDA clearance,
            no clinical validation, and is not intended to diagnose, treat, or
            prevent any medical condition.
          </li>
          <li>
            <strong>Not contraception.</strong> Luna cannot tell you when you
            are fertile or when it is safe to have unprotected sex. The only
            FDA-cleared contraceptive app is Natural Cycles, which uses basal
            body temperature — Luna does not.
          </li>
          <li>
            <strong>Not a healthcare provider.</strong> Luna does not replace
            a doctor, nurse, or therapist. If something in your cycle concerns
            you, talk to a qualified healthcare professional — not an app.
          </li>
          <li>
            <strong>Not validated.</strong> We don't know how accurate
            Luna's predictions are. No systematic testing has been done
            against real-world cycle data. Predictions are statistical estimates
            and may be wrong. There are 68 vitest unit tests verifying the
            engine behaves as specified — but zero accuracy benchmarks.
          </li>
          <li>
            <strong>Not HIPAA-compliant.</strong> While Neon (our database)
            offers HIPAA on their Scale plan, Luna doesn't use that plan.
            Supermemory claims HIPAA but provides no public BAA. HackClub has
            no HIPAA certifications. Health-adjacent data is stored on infra
            without healthcare-grade compliance guarantees.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "predictions",
    title: "How predictions actually work",
    content: (
      <>
        <p>
          Luna's prediction engine is a single file —{" "}
          <Link
            href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/engine.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline"
          >
            engine.ts
          </Link>{" "}
          — about 780 lines. Here's exactly what it does:
        </p>

        <div className="space-y-4 mt-2">
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              1. Starting assumptions (priors)
            </h3>
            <p>
              With no data, Luna uses published research averages — and those
              change by condition. A PCOS user starts at 51 days (not 28). An
              endometriosis user starts at 27 days. Someone on hormonal birth
              control starts at 28 days with suppressed ovulation predictions.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#FFDDE0]/20 text-[#8E7D82]">
                    <th className="text-left py-1 pr-2 font-medium">Condition</th>
                    <th className="text-right py-1 px-2 font-medium">Cycle mean</th>
                    <th className="text-right py-1 px-2 font-medium">Max threshold</th>
                    <th className="text-center py-1 pl-2 font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["General population", "30.3d", "45d", "Strong (N=581)"],
                    ["PCOS", "51d", "120d", "Weak (N=10)"],
                    ["PCOD", "45d", "120d", "Very weak (interpolated)"],
                    ["Endometriosis", "27d", "45d", "Weak (OR data)"],
                    ["Thyroid", "35d", "90d", "Very weak (directional)"],
                    ["Hormonal BC", "28d", "35d", "Strong (RCTs)"],
                    ["Irregular", "30d", "90d", "Very weak (catch-all)"],
                    ["Perimenopause early", "30d", "60d", "Moderate (NIH)"],
                    ["Perimenopause late", "80d", "180d", "Moderate (NIH)"],
                  ].map(([cond, mean, max, evidence]) => (
                    <tr key={cond} className="border-b border-[#FFDDE0]/10">
                      <td className="py-1 pr-2 text-[#6D5A60]">{cond}</td>
                      <td className="py-1 px-2 text-right">{mean}</td>
                      <td className="py-1 px-2 text-right">{max}</td>
                      <td className="py-1 pl-2 text-[#8E7D82]">{evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[#8E7D82]">
              Multiple conditions are combined via inverse-variance weighted
              mixture. Hormonal BC always takes priority. Source values mostly
              from published papers (Najmabadi et al. 2020, Holman 2006,
              Nutrients 2026 trial) — not independently verified against originals.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              2. Adaptive smoothing
            </h3>
            <p>
              As you log cycles, Luna blends your data with the priors using
              inverse-variance weighting. It learns faster (α → 0.5) when your
              cycles are irregular and slower (α → 0.1) when they're
              stable. After 6 cycles, the prior fades out completely — Luna
              trusts your actual data.
            </p>
            <p className="mt-1 text-[11px] text-[#8E7D82]">
              The n≥6 cutoff is an arbitrary heuristic, not a statistically
              derived threshold. No sensitivity analysis exists.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              3. Anomaly detection (skip gate)
            </h3>
            <p>
              Unusually long gaps are flagged as probable missed logs. If a
              cycle exceeds the condition-specific max threshold (e.g., 120d
              for PCOS), it's treated as a gap rather than a real cycle.
              A second soft-clamp catches outliers beyond 2.5σ — the value is
              pulled toward the mean rather than discarded entirely.
            </p>
            <p className="mt-1 text-[11px] text-[#8E7D82]">
              The 2.5σ threshold and condition-specific max thresholds are
              domain heuristics. No analysis of false positive/negative rates
              exists.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              4. Confidence intervals
            </h3>
            <p>
              Luna gives you a range — not just a date. These ranges use
              jackknife resampling (leave-one-out recalculation) for 6+
              observations, and parametric ±1.96σ for fewer. Follicular phase
              is derived from cycle + period + luteal to maintain physiological
              consistency rather than predicted independently.
            </p>
            <p className="mt-1 text-[11px] text-[#8E7D82]">
              The jackknife assumes a smooth estimator, but the skip gate
              introduces discontinuities. Coverage may be off from nominal 95%.
              No simulation study has been done.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "data-processing",
    title: "How we process your data",
    content: (
      <>
        <p>
          Your data touches three third-party services. Here is the unvarnished
          truth about each:
        </p>

        <div className="space-y-3 mt-2">
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              Neon (database)
            </h3>
            <p>
              All structured data — cycles, accounts, chat messages, predictions,
              AI traces — lives here. Neon is a serverless PostgreSQL platform
              on AWS (8 regions, 4 continents).
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
              <span className="text-[#8E7D82]">Encryption at rest</span>
              <span className="text-[#6D5A60] font-medium">AES-256</span>
              <span className="text-[#8E7D82]">In transit</span>
              <span className="text-[#6D5A60] font-medium">TLS 1.2+</span>
              <span className="text-[#8E7D82]">Certifications</span>
              <span className="text-[#6D5A60] font-medium">SOC 2, ISO 27001</span>
              <span className="text-[#8E7D82]">HIPAA</span>
              <span className="text-[#8E7D82]">Scale plan only</span>
              <span className="text-[#8E7D82]">Parent company</span>
              <span className="text-[#6D5A60] font-medium">Databricks (acquired 2025)</span>
            </div>
            <p className="mt-2 text-[11px] text-[#8E7D82]">
              Neon does not sell personal data. Core engine is Apache 2.0
              open source. Luna uses the HTTP serverless driver with cache:
              no-store.{" "}
              <a href="https://trust.neon.com" target="_blank" rel="noopener noreferrer" className="text-[#FFB5C0] hover:underline">Trust Center</a>{" "}
              ·{" "}
              <a href="https://neon.com/security" target="_blank" rel="noopener noreferrer" className="text-[#FFB5C0] hover:underline">Security</a>
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              HackClub (AI proxy + search)
            </h3>
            <p>
              US 501(c)(3) nonprofit. Provides free AI and search to its
              community. Luna's AI proxy sends prompts to OpenRouter
              (routing to xAI, Anthropic). Search goes to Brave.
            </p>
            <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-[#FFDDE0]/20">
              <span className="text-[#FFB5C0] shrink-0 text-base">⚠</span>
              <p className="text-[11px] text-[#6D5A60]">
                <strong>Critical concern:</strong> HackClub logs every AI prompt
                and response in full (jsonb), linked to user ID and IP. No
                retention policy. No deletion schedule. No service-specific
                privacy notice. This means health information in your chat
                messages is stored indefinitely on their infrastructure.
              </p>
            </div>
            <p className="mt-2 text-[11px] text-[#8E7D82]">
              All code is open source — the logging is verifiable. But it is
              not optional. If you need strong privacy, self-host Luna with
              your own AI backend.{" "}
              <a href="https://hackclub.com/privacy-and-terms" target="_blank" rel="noopener noreferrer" className="text-[#FFB5C0] hover:underline">HackClub Privacy & Terms</a>
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              Supermemory (personal facts)
            </h3>
            <p>
              When you say &quot;remember I have PCOS,&quot; that fact goes to
              Supermemory v4 API. Luna sends only personal facts — never cycle
              data or chat messages. Scoped per user via containerTag.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
              <span className="text-[#8E7D82]">Infrastructure</span>
              <span className="text-[#6D5A60] font-medium">Timescale + Cloudflare</span>
              <span className="text-[#8E7D82]">At-rest encryption</span>
              <span className="text-[#8E7D82]">Not documented</span>
              <span className="text-[#8E7D82]">Compliance</span>
              <span className="text-[#8E7D82]">Claims only (no audits)</span>
              <span className="text-[#8E7D82]">Third-party AI</span>
              <span className="text-[#8E7D82]">May use OpenAI/Gemini</span>
            </div>
            <p className="mt-2 text-[11px] text-[#8E7D82]">
              Supermemory Inc. is early-stage (founded by Dhravya Shah). Core
              engine is MIT open source. Luna uses a 3-second AbortSignal
              timeout on all Supermemory calls.{" "}
              <a href="https://supermemory.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FFB5C0] hover:underline">Supermemory Privacy</a>
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "data-flow",
    title: "Data flow summary",
    content: (
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#FFDDE0]/20 text-[#8E7D82]">
              <th className="text-left py-1.5 pr-2 font-medium">Data type</th>
              <th className="text-left py-1.5 px-2 font-medium">Stored in</th>
              <th className="text-left py-1.5 px-2 font-medium">Also processed by</th>
              <th className="text-left py-1.5 pl-2 font-medium">Logging</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Cycle records", "Neon (AWS)", "—", "SOC 2 audited; no HIPAA"],
              ["Chat messages", "Neon (AWS)", "HackClub → OpenRouter → xAI/Anthropic", "Full prompt+response logged by HackClub"],
              ["Personal facts", "Supermemory", "Possibly OpenAI/Gemini", "No at-rest encryption documented"],
              ["Web searches", "—", "HackClub → Brave", "Full query+headers logged"],
              ["Auth credentials", "Neon (AWS)", "—", "bcryptjs hashed"],
            ].map(([type, stored, processed, logging]) => (
              <tr key={type} className="border-b border-[#FFDDE0]/10">
                <td className="py-1.5 pr-2 text-[#6D5A60] font-medium">{type}</td>
                <td className="py-1.5 px-2">{stored}</td>
                <td className="py-1.5 px-2">{processed}</td>
                <td className="py-1.5 pl-2 text-[#8E7D82]">{logging}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "limitations",
    title: "Known limitations",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>No accuracy benchmarks.</strong> We have not measured MAE,
            RMSE, or any prediction metric. We don't know if Luna is better
            or worse than assuming a 28-day cycle.
          </li>
          <li>
            <strong>AI can misunderstand you.</strong> Chat-based logging is
            convenient but imperfect. The date normalizer supports natural
            language (&quot;yesterday,&quot; &quot;May 3&quot;), but the AI
            might misinterpret what you say or miss information.
          </li>
          <li>
            <strong>Condition priors are population averages.</strong> A 51-day
            PCOS prior is from a small trial (N=10). It represents what's
            typical for a population, not any specific person. Individual
            variation is substantial — PCOS cycles range from 21 to 111 days.
          </li>
          <li>
            <strong>Several priors have very weak evidence.</strong> The PCOD
            prior (45d) is interpolated — no separate PCOD data exists. Thyroid
            and irregular priors are constructed from directional clinical
            knowledge, not published distributions.
          </li>
          <li>
            <strong>Gaussian assumptions.</strong> Predictions assume
            approximately normal distributions, but menstrual cycle lengths —
            especially for PCOS and perimenopause — are right-skewed. The
            95% CI is presented symmetrically even when the true distribution
            is asymmetric.
          </li>
          <li>
            <strong>68 unit tests, zero integration tests.</strong> The
            prediction engine's core functions are unit-tested, but there
            are no integration tests, regression tests, or end-to-end tests.
            No user studies have been conducted.
          </li>
          <li>
            <strong>Limited with very little data.</strong> With 1-2 cycles,
            predictions are mostly driven by population averages — which may
            not match you at all.
          </li>
          <li>
            <strong>No wearable integration.</strong> Luna cannot read data
            from Oura Ring, Apple Watch, or any wearable. If you track basal
            body temperature, you'll need to enter it manually.
          </li>
          <li>
            <strong>Skip gate is a hard cutoff.</strong> Unlike Clue (which
            models missing logs probabilistically), Luna uses a hard threshold.
            A 46-day cycle in the general population gets flagged. Some people
            genuinely have 46-day cycles.
          </li>
          <li>
            <strong>HackClub logs everything.</strong> Every message you type to
            the AI — which may include symptoms, cycle details, health questions
            — is stored indefinitely, linked to your identity, with no documented
            deletion schedule.
          </li>
        </ul>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-4">
          <p className="text-xs text-[#8E7D82]">
            These limitations are documented in detail in Luna's{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/tree/main/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFB5C0] hover:underline"
            >
              papers directory
            </Link>
            , particularly the nontechnical paper and technical paper's
            Section 8 (Limitations), Section 6 (Experiments and evaluation),
            and Section 7 (Results).
          </p>
        </div>
      </>
    ),
  },
  {
    id: "dont-do",
    title: "What we don't do with your data",
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Sell your data.</strong> To anyone. Period.</li>
        <li><strong>Show you ads.</strong> No ad networks. No ad tracking.</li>
        <li><strong>Share data with insurers, employers, or brokers.</strong></li>
        <li><strong>Train AI models on your conversations.</strong> The model
          providers (xAI, Anthropic) may have their own policies.</li>
        <li><strong>Use tracking cookies or analytics.</strong> Only essential
          cookies (NextAuth.js session JWT) and localStorage for preferences.</li>
        <li><strong>Share cycle data with a partner or doctor.</strong></li>
        <li><strong>Connect to wearables.</strong> No Apple Watch, Oura Ring, etc.</li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "Data retention & your rights",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Images auto-deleted after 7 days.</strong> Cron job purges
            expired uploads from PostgreSQL.</li>
          <li><strong>Export anytime.</strong> Download all cycle data as Luna
            JSON v1 (mStart, mEnd, ovulationDate, cycleLength, periodLength,
            notes).</li>
          <li><strong>Account deletion.</strong> Coming soon to settings.
            Currently by contacting us.</li>
          <li><strong>Third-party logs.</strong> HackClub retains AI prompts
            and responses indefinitely — outside Luna's control.</li>
        </ul>
      </>
    ),
  },
  {
    id: "open-source",
    title: "Open source",
    content: (
      <>
        <p>
          Luna is MIT-licensed at{" "}
          <Link
            href="https://github.com/a3ro-dev/luna"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline"
          >
            github.com/a3ro-dev/luna
          </Link>
          . You can:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {[
            "Read exactly how predictions are calculated",
            "See every database query and API route",
            "Inspect how data is sent to each third-party service",
            "Verify the 10 condition-specific priors",
            "Run your own copy with your own infrastructure",
            "Read the 67 technical paper pages in papers/",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-xs p-2 rounded-lg bg-[#FFF9F9]"
            >
              <span className="text-[#D6CBE3] shrink-0">→</span>
              <span className="text-[#6D5A60]">{item}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "same-model",
    title: "Same AI model for all plans",
    content: (
      <p>
        Luna has three pricing tiers (Free, Premium at $5/month, Premium+ at
        $12/month), but all use the same AI model — Grok 4.3 via HackClub proxy.
        The only difference is the tone of the AI's responses (practical vs.
        warm vs. empathetic). Predictions, accuracy, and capabilities are
        identical across all tiers. You are not getting worse predictions on
        the free plan. The persona prompts are defined in{" "}
        <Link
          href="https://github.com/a3ro-dev/luna/blob/main/src/lib/chat/models.ts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FFB5C0] hover:underline"
        >
          models.ts
        </Link>
        .
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & local storage",
    content: (
      <p>
        Luna uses only essential cookies (NextAuth.js session JWT for
        authentication) and localStorage (cookie consent choice, PWA install
        preference). No tracking cookies. No analytics cookies. No third-party
        cookies. No fingerprinting. The cookie banner at the bottom of the
        screen tells you this on first visit.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>Questions, concerns, or want to discuss how Luna works?</p>
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
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFB5C0] hover:underline transition-all"
          >
            github.com/a3ro-dev/luna
          </Link>
        </p>
      </>
    ),
  },
];
