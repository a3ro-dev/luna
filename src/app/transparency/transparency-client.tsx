"use client";

import React from "react";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "../privacy/privacy-client";

export default function TransparencyClient() {
  return (
    <LegalDocument
      title="Transparency"
      updated="September 24, 2026"
      intro={
        <p>
          This page exists to be honest about what Luna is, what it
          isn&apos;t, and how it works under the hood. No fine print.
          No weasel words. We wrote this because legal polish is easy,
          but real transparency means telling you what we don&apos;t know.
        </p>
      }
      sections={SECTIONS}
      footer={
        <>
          Everything on this page is verifiable from Luna&apos;s source code.{" "}
          &copy; {new Date().getFullYear()} Luna.
        </>
      }
    />
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "what-luna-is",
    title: "What Luna is",
    content: (
      <>
        <p>
          Luna is a free, open-source menstrual cycle tracking companion. You
          log your cycles by talking to an AI assistant — type things like
          &quot;my period started today&quot; or &quot;I&apos;m feeling
          crampy&quot; and Luna records it. Over time, it learns your patterns
          and predicts when your next period might come.
        </p>
        <p>
          The prediction engine starts with a broad population range, then
          learns your typical cycle and variability from usable logged
          history. It reports a likely window for the next cycle and stays
          deliberately cautious when history is sparse, variable, or possibly
          incomplete. Conditions widen or withhold estimates where the
          evidence supports caution; they do not create unsupported precision.
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
            <strong>Not validated.</strong> We don&apos;t know how accurate
            Luna&apos;s predictions are. The automated suite and synthetic
            backtests verify the implementation, but the live dataset is too
            small for a responsible accuracy comparison. Predictions are
            statistical estimates and may be wrong. Automated regression tests
            check the implementation, but there is no clinical validation or
            publishable real-world benchmark.
          </li>
          <li>
            <strong>Not HIPAA-compliant.</strong> While Neon (our database)
            offers HIPAA on their Scale plan, Luna doesn&apos;t use that plan.
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
          Luna&apos;s current prediction engine is open source in{" "}
          <Link
            href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/forecast.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
          >
            forecast.ts
          </Link>
          . Here&apos;s exactly what it does:
        </p>

        <div className="space-y-4 mt-2">
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              1. Broad starting assumptions
            </h3>
            <p>
              With no personal history, Luna uses a deliberately broad
              population starting point drawn from prospective cycle studies.
              Published total variation is not treated as if it were certainty
              about one person. PCOS, thyroid conditions, endometriosis, and
              contraception do not receive invented means when the source only
              supports a directional association.
            </p>
            <p className="mt-2 text-xs text-[#75636A]">
              The numerical assumptions, source populations, and transfer
              limits are listed in papers/references.md. Several components are
              conservative engineering assumptions that still require
              prospective calibration.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              2. Learning from your history
            </h3>
            <p>
              Luna estimates your typical cycle and your cycle-to-cycle
              variation. Personal observations gradually outweigh the starting
              point, but a variance floor prevents one or two similar cycles
              from producing a falsely precise prediction.
            </p>
            <p className="mt-1 text-xs text-[#75636A]">
              Only the 12 most recent usable intervals inform a forecast. The
              exact shrinkage strength remains an assumption to validate.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              3. Uncertain logs
            </h3>
            <p>
              One very short or long interval is set aside as a possible
              duplicate, spotting entry, or missed log. It remains visible and
              is counted in the forecast basis. Repeated long intervals are
              treated as a personal pattern instead of being discarded.
            </p>
            <p className="mt-1 text-xs text-[#75636A]">
              Luna does not know whether a long gap is a missed log or a genuine
              long cycle. This is an uncertainty rule, not a diagnosis.
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              4. Prediction intervals
            </h3>
            <p>
              Luna gives an 80% likely window for the next observation, not a
              confidence interval around an average. The range includes both
              estimated personal variability and uncertainty about the
              person&apos;s typical cycle. Ovulation is clearly labelled as a
              calendar estimate or withheld when unsuitable.
            </p>
            <p className="mt-1 text-xs text-[#75636A]">
              Synthetic tests check calibration under known assumptions. The
              live dataset is too small to establish real-world coverage.
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
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span className="text-[#75636A]">Encryption at rest</span>
              <span className="text-[#6D5A60] font-medium">AES-256</span>
              <span className="text-[#75636A]">In transit</span>
              <span className="text-[#6D5A60] font-medium">TLS 1.2+</span>
              <span className="text-[#75636A]">Certifications</span>
              <span className="text-[#6D5A60] font-medium">SOC 2, ISO 27001</span>
              <span className="text-[#75636A]">HIPAA</span>
              <span className="text-[#75636A]">Scale plan only</span>
              <span className="text-[#75636A]">Parent company</span>
              <span className="text-[#6D5A60] font-medium">Databricks (acquired 2025)</span>
            </div>
            <p className="mt-2 text-xs text-[#75636A]">
              Neon does not sell personal data. Core engine is Apache 2.0
              open source. Luna uses the HTTP serverless driver with cache:
              no-store.{" "}
              <a href="https://trust.neon.com" target="_blank" rel="noopener noreferrer" className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]">Trust Center</a>{" "}
              ·{" "}
              <a href="https://neon.com/security" target="_blank" rel="noopener noreferrer" className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]">Security</a>
            </p>
          </div>

          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4">
            <h3 className="text-sm font-medium text-[#6D5A60] mb-2">
              HackClub (AI proxy + search)
            </h3>
            <p>
              US 501(c)(3) nonprofit. Provides free AI and search to its
              community. Luna&apos;s AI proxy sends prompts to OpenRouter, which
              may route them to xAI or Anthropic. Web search requests use
              HackClub&apos;s search API.
            </p>
            <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-[#FFDDE0]/20">
              <span aria-hidden className="text-[#A34E68] shrink-0 text-base">⚠</span>
              <p className="text-xs text-[#6D5A60]">
                <strong>Critical concern:</strong> HackClub logs every AI prompt
                and response in full (jsonb), linked to user ID and IP. No
                retention policy. No deletion schedule. No service-specific
                privacy notice. This means health information in your chat
                messages is stored indefinitely on their infrastructure.
              </p>
            </div>
            <p className="mt-2 text-xs text-[#75636A]">
              All code is open source — the logging is verifiable. But it is
              not optional. If you need strong privacy, self-host Luna with
              your own AI backend.{" "}
              <a href="https://hackclub.com/privacy-and-terms" target="_blank" rel="noopener noreferrer" className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]">HackClub Privacy & Terms</a>
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
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span className="text-[#75636A]">Infrastructure</span>
              <span className="text-[#6D5A60] font-medium">Timescale + Cloudflare</span>
              <span className="text-[#75636A]">At-rest encryption</span>
              <span className="text-[#75636A]">Not documented</span>
              <span className="text-[#75636A]">Compliance</span>
              <span className="text-[#75636A]">Claims only (no audits)</span>
              <span className="text-[#75636A]">Third-party AI</span>
              <span className="text-[#75636A]">May use OpenAI/Gemini</span>
            </div>
            <p className="mt-2 text-xs text-[#75636A]">
              Supermemory Inc. is early-stage (founded by Dhravya Shah). Core
              engine is MIT open source. Luna uses a 3-second AbortSignal
              timeout on all Supermemory calls.{" "}
              <a href="https://supermemory.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]">Supermemory Privacy</a>
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
      <div
        role="region"
        aria-label="Data flow summary table, scrolls sideways on small screens"
        tabIndex={0}
        className="-mx-5 overflow-x-auto px-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D5A60] sm:mx-0 sm:px-0"
      >
        <table className="w-full min-w-[34rem] text-xs leading-relaxed">
          <thead>
            <tr className="border-b border-[#FFDDE0] text-[#75636A]">
              <th scope="col" className="text-left py-2 pr-2 font-medium">Data type</th>
              <th scope="col" className="text-left py-2 px-2 font-medium">Stored in</th>
              <th scope="col" className="text-left py-2 px-2 font-medium">Also processed by</th>
              <th scope="col" className="text-left py-2 pl-2 font-medium">Logging</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Cycle records", "Neon (AWS)", "—", "SOC 2 audited; no HIPAA"],
              ["Chat messages", "Neon (AWS)", "HackClub → OpenRouter → xAI/Anthropic", "Full prompt+response logged by HackClub"],
              ["Personal facts", "Supermemory", "Possibly OpenAI/Gemini", "No at-rest encryption documented"],
              ["Web searches", "—", "HackClub search API", "Subject to HackClub's handling"],
              ["Auth credentials", "Neon (AWS)", "—", "bcryptjs hashed"],
            ].map(([type, stored, processed, logging]) => (
              <tr key={type} className="border-b border-[#FFDDE0]/60 align-top">
                <th scope="row" className="text-left py-2 pr-2 text-[#6D5A60] font-medium">{type}</th>
                <td className="py-2 px-2">{stored}</td>
                <td className="py-2 px-2">{processed}</td>
                <td className="py-2 pl-2 text-[#75636A]">{logging}</td>
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
            <strong>No publishable real-world benchmark.</strong> Luna now has
            a leakage-free evaluation harness and synthetic benchmarks, but
            only four live users have retrospective targets. That is below our
            minimum reporting threshold, so real-data accuracy stays unknown.
          </li>
          <li>
            <strong>AI can misunderstand you.</strong> Chat-based logging is
            convenient but imperfect. The date normalizer supports natural
            language (&quot;yesterday,&quot; &quot;May 3&quot;), but the AI
            might misinterpret what you say or miss information.
          </li>
          <li>
            <strong>Population evidence is not personal truth.</strong> The
            starting assumptions come from selected research populations and
            may not transfer to you. The model&apos;s variance split and
            shrinkage strength remain engineering assumptions to calibrate.
          </li>
          <li>
            <strong>Condition evidence is limited.</strong> Luna no longer
            assigns unsupported means to PCOS, PCOD, endometriosis, thyroid
            conditions, or every hormonal method. It usually widens or
            withholds an estimate, but those choices still need evaluation.
          </li>
          <li>
            <strong>Distribution assumptions.</strong> Cycle length uses a
            log-normal predictive distribution and bleeding duration uses a
            bounded normal approximation. Real personal patterns can still be
            multimodal or change over time.
          </li>
          <li>
            <strong>Tests are not clinical validation.</strong> Eighty unit and
            regression tests cover the engine, validation, and leakage
            invariants. Authenticated browser journeys and user studies remain
            incomplete.
          </li>
          <li>
            <strong>Limited with very little data.</strong> With 1-2 cycles,
            predictions are mostly driven by population averages — which may
            not match you at all.
          </li>
          <li>
            <strong>No wearable integration.</strong> Luna cannot read data
            from Oura Ring, Apple Watch, or any wearable. If you track basal
            body temperature, you&apos;ll need to enter it manually.
          </li>
          <li>
            <strong>Uncertain-log rules are heuristic.</strong> One extreme gap
            is set aside as possibly incomplete; repeated long gaps become a
            personal pattern. The app still cannot know whether a particular
            gap is a missed log or a genuine long cycle.
          </li>
          <li>
            <strong>HackClub logs everything.</strong> Every message you type to
            the AI — which may include symptoms, cycle details, health questions
            — is stored indefinitely, linked to your identity, with no documented
            deletion schedule.
          </li>
        </ul>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-4">
          <p className="text-xs text-[#75636A]">
            These limitations are documented in detail in Luna&apos;s{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/tree/main/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
            >
              papers directory
            </Link>
            , particularly the nontechnical paper and technical paper&apos;s
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
            and responses indefinitely — outside Luna&apos;s control.</li>
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
            className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
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
            "Review every forecast assumption and its evidence",
            "Run your own copy with your own infrastructure",
            "Read the 67 technical paper pages in papers/",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-xs p-2 rounded-lg bg-[#FFF9F9]"
            >
              <span aria-hidden className="text-[#A34E68] shrink-0">→</span>
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
        Luna has three pricing tiers: Free, Premium at $5/month, and Premium+
        at $12/month. All use the same Grok 4.3 chat model through the
        HackClub proxy, the same cycle data, the same forecast service, and
        the same chat tools. Plans change page composition, color, navigation,
        and conversational tone. Free is calendar-first; Premium adds guided
        navigation and a chat rail; Premium+ adds a split dashboard and
        wide-screen cycle context. The persona prompts are defined in{" "}
        <Link
          href="https://github.com/a3ro-dev/luna/blob/main/src/lib/chat/models.ts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
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
            className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 transition-colors hover:decoration-[#A34E68]"
          >
            akshatsingh14372@outlook.com
          </a>
        </p>
        <p className="mt-2">
          <Link
            href="https://github.com/a3ro-dev/luna"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 transition-colors hover:decoration-[#A34E68]"
          >
            github.com/a3ro-dev/luna
          </Link>
        </p>
      </>
    ),
  },
];
