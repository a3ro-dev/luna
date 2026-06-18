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

export default function TermsOfUseClient() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["not-medical"]));
  const [activeSection, setActiveSection] = useState("not-medical");

  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll("[data-section]");
      let current = "not-medical";
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
              Terms of Use
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
              data-section="not-medical"
            >
              <p className="text-[#6D5A60] font-light leading-relaxed">
                By using Luna, you agree to these terms. They&apos;re written to
                be clear about what Luna can and can&apos;t do — particularly
                that it is not a medical device, not clinically validated, and
                not a substitute for a doctor. Using Luna means you accept these
                limitations.
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
            These terms are part of Luna&apos;s open-source repository. &copy;{" "}
            {new Date().getFullYear()} Luna.
          </p>
        </footer>
      </div>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: "not-medical",
    title: "Not medical advice",
    content: (
      <>
        <p>
          Luna is a menstrual cycle tracking and prediction application. It is{" "}
          <strong>
            not a medical device, not a healthcare provider, and is not
            FDA-approved
          </strong>
          .
        </p>
        <p>
          Any predictions, AI-generated insights, or health-related information
          provided by Luna are for informational and educational purposes only.
          Luna is not intended to be used for:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Contraception or fertility awareness</li>
          <li>Medical diagnosis of any condition</li>
          <li>Treatment or prevention of any disease</li>
          <li>Replacement for professional medical consultation</li>
        </ul>
        <p>
          Natural Cycles is the only period tracker with FDA clearance as a
          contraceptive. Luna has no such clearance. Always consult a qualified
          healthcare provider for medical advice.
        </p>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2">
          <p className="text-xs text-[#8E7D82] flex items-start gap-2">
            <span className="text-[#FFB5C0] shrink-0">⚠</span>
            Luna is unvalidated. No clinical studies, no accuracy benchmarks,
            no published user research. 68 unit tests verify the prediction
            engine behaves as specified — but we don&apos;t know if it produces
            accurate predictions for real people.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "prediction-engine",
    title: "About the prediction engine",
    content: (
      <>
        <p>
          Luna uses adaptive exponential smoothing with 10 condition-specific
          population priors. Here&apos;s what that actually means:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Cold start.</strong> With no data, Luna uses published
            research averages — and those averages differ by condition. A PCOS
            user starts at 51-day cycles, not 28.
          </li>
          <li>
            <strong>Warm start (1-5 cycles).</strong> Luna blends your data with
            the starting averages using inverse-variance weighting. The more
            cycles you log, the less influence the averages have.
          </li>
          <li>
            <strong>Mature (6+ cycles).</strong> Luna trusts your data. The
            prior fades out. Predictions come from jackknife confidence intervals.
          </li>
        </ul>
        <p>
          These predictions are statistical estimates based on the cycles
          you&apos;ve logged. They are <strong>not guarantees</strong>. Cycle
          lengths can vary naturally. The AI assistant may misinterpret dates
          or miss information. Always verify what Luna logs.
        </p>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2">
          <p className="text-xs text-[#8E7D82]">
            The prediction engine is fully open source. You can read the exact
            algorithm in{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/engine.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFB5C0] hover:underline"
            >
              engine.ts
            </Link>{" "}
            and its 68 vitest tests in{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/__tests__/engine.test.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFB5C0] hover:underline"
            >
              engine.test.ts
            </Link>
            .
          </p>
        </div>
      </>
    ),
  },
  {
    id: "responsibilities",
    title: "Your responsibilities",
    content: (
      <>
        <p>
          Luna&apos;s predictions depend on the data you provide. You are
          responsible for:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Providing accurate and timely cycle information.</li>
          <li>
            Correctly identifying your health conditions during onboarding.
            Misreporting (e.g., a PCOS user selecting &quot;irregular&quot;)
            produces suboptimal predictions.
          </li>
          <li>
            Maintaining the confidentiality of your account credentials. Use
            a strong, unique password — Luna uses bcryptjs (12 rounds) but
            weak passwords are still guessable.
          </li>
          <li>Using the application in a lawful and respectful manner.</li>
          <li>
            Understanding that Luna&apos;s AI can make mistakes. Always check
            what was logged against what you intended.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "age",
    title: "Age requirement",
    content: (
      <>
        <p>
          You must be at least <strong>13 years of age</strong> to use Luna.
          By creating an account, you represent that you meet this requirement.
          If we learn that we have collected personal information from someone
          under 13, we will delete that information as quickly as possible.
        </p>
        <p>
          Luna does not currently enforce age verification during signup. The
          date of birth field during onboarding is optional. This is a known gap.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Account termination",
    content: (
      <>
        <p>
          We may suspend or terminate your account if you violate these terms
          or if your use poses a risk to the application or other users.
        </p>
        <p>
          You can request account deletion by contacting us. Full self-service
          deletion is coming soon to settings. When your account is deleted,
          all associated data is permanently removed from Luna&apos;s database.
        </p>
        <p className="text-[#8E7D82] text-xs">
          Note: Data logged by third-party services (HackClub AI proxy,
          Supermemory) may persist according to their own retention policies.
          Luna can only delete data in its own database.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property & your data",
    content: (
      <>
        <p>
          Luna&apos;s source code is licensed under the{" "}
          <strong>MIT License</strong>. You are free to read, modify, and
          redistribute the code.
        </p>
        <p>
          The Luna name, branding, and design elements are protected by
          copyright and trademark. You may not use them to imply endorsement
          or create confusingly similar services.
        </p>
        <p>
          <strong>You own your data.</strong> Any cycle data, notes, chat
          messages, or content you upload remains yours. By using Luna, you
          grant us a limited license to process this data solely for providing
          the application&apos;s services. This license ends when your account
          is deleted.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          Luna is provided <strong>&quot;as is&quot;</strong> without
          warranties of any kind, express or implied. To the maximum extent
          permitted by law, Luna and its developer shall not be liable for:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Incorrect predictions or cycle estimates</li>
          <li>AI misinterpretation of your messages</li>
          <li>Data loss or service interruptions</li>
          <li>
            Any decisions or actions taken based on Luna&apos;s predictions
            or information
          </li>
          <li>Indirect, incidental, or consequential damages</li>
        </ul>
        <p>
          If you rely on Luna for health decisions, you accept the risk that
          Luna may be wrong. We strongly recommend using clinically validated
          methods for contraception and consulting healthcare professionals
          for medical concerns.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party services",
    content: (
      <>
        <p>
          Luna depends on three third-party services that process your data:
        </p>
        <div className="space-y-2 mt-2">
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-3">
            <p className="text-sm font-medium text-[#6D5A60] mb-1">
              Neon (database)
            </p>
            <p className="text-xs text-[#8E7D82]">
              SOC 2 Type II, ISO 27001 certified. AES-256 at rest, TLS 1.2+ in
              transit. Acquired by Databricks (May 2025). HIPAA only on Scale
              plan — Luna does not use this plan.
            </p>
          </div>
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-3">
            <p className="text-sm font-medium text-[#6D5A60] mb-1">
              HackClub (AI proxy + search)
            </p>
            <p className="text-xs text-[#8E7D82]">
              US 501(c)(3) nonprofit. Logs all AI prompts and responses in full.
              No documented retention period. No service-specific privacy policy.
              Code is open source and verifiable.
            </p>
          </div>
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-3">
            <p className="text-sm font-medium text-[#6D5A60] mb-1">
              Supermemory (AI memory)
            </p>
            <p className="text-xs text-[#8E7D82]">
              Early-stage company. Claims SOC 2, HIPAA, GDPR compliance — no
              public audits. Encryption at rest not documented. Core engine
              is open source (MIT).
            </p>
          </div>
        </div>
        <p className="mt-3 text-[#8E7D82] text-xs">
          Self-hosting with replacement infrastructure is the only path to full
          data control. See our{" "}
          <Link href="/transparency" className="text-[#FFB5C0] hover:underline">
            Transparency
          </Link>{" "}
          page for details.
        </p>
      </>
    ),
  },
  {
    id: "consent",
    title: "Consent requirements",
    content: (
      <>
        <p>
          Luna requires explicit consent before use. During onboarding, you
          must:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acknowledge that Luna is not medical advice</li>
          <li>Understand how your data is processed by third-party services</li>
          <li>Accept the limitations of the prediction engine</li>
          <li>Agree to these Terms of Use and Privacy Policy</li>
        </ul>
        <p>
          If you decline consent, onboarding stops and you cannot use Luna.
          Consent is tracked in Luna&apos;s database (consent_given,
          consent_given_at, consent_version) and is re-required if you re-do
          onboarding from settings. If consent is revoked in the future, your
          access will be suspended.
        </p>
      </>
    ),
  },
  {
    id: "governing",
    title: "Governing law & changes",
    content: (
      <>
        <p>
          These terms are governed by the laws of the jurisdiction where the
          developer resides (India), without regard to conflict of law provisions.
        </p>
        <p>
          We may update these Terms from time to time. Significant changes will
          be posted on this page with an updated date. Continued use after
          changes constitutes acceptance. If you do not agree with the updated
          terms, stop using Luna and contact us to delete your account.
        </p>
        <p className="text-[#8E7D82] text-xs">
          These terms are tracked in Luna&apos;s open-source Git repository.
          You can see the full history of changes on GitHub.
        </p>
      </>
    ),
  },
];
