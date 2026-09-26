"use client";

import React from "react";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "../privacy/privacy-client";

export default function TermsOfUseClient() {
  return (
    <LegalDocument
      title="Terms of Use"
      updated="September 24, 2026"
      intro={
        <p>
          By using Luna, you agree to these terms. They&apos;re written to
          be clear about what Luna can and can&apos;t do — particularly
          that it is not a medical device, not clinically validated, and
          not a substitute for a doctor. Using Luna means you accept these
          limitations.
        </p>
      }
      sections={SECTIONS}
      footer={
        <>
          These terms are part of Luna&apos;s open-source repository. &copy;{" "}
          {new Date().getFullYear()} Luna.
        </>
      }
    />
  );
}

const SECTIONS: LegalSection[] = [
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
          <p className="text-xs text-[#75636A] flex items-start gap-2">
            <span aria-hidden className="text-[#A34E68] shrink-0">⚠</span>
            Luna is unvalidated. No clinical studies, no accuracy benchmarks,
            no published user research. 80 unit tests and synthetic backtests
            verify the implementation — but the live dataset is too small to
            establish accuracy for real people.
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
          Luna uses a versioned posterior-predictive model. Here&apos;s what that
          actually means:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Cold start.</strong> With no personal data, Luna uses a
            broad population starting point and shows a wide range.
          </li>
          <li>
            <strong>Personal learning.</strong> Luna combines usable history
            with the starting point and estimates both your typical cycle and
            cycle-to-cycle variation.
          </li>
          <li>
            <strong>Likely window.</strong> Luna reports an 80% prediction
            interval for the next cycle, not a confidence percentage or a
            guarantee. Sparse and variable histories stay wider.
          </li>
        </ul>
        <p>
          These predictions are statistical estimates based on the cycles
          you&apos;ve logged. They are <strong>not guarantees</strong>. Cycle
          lengths can vary naturally. The AI assistant may misinterpret dates
          or miss information. Always verify what Luna logs.
        </p>
        <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-4 mt-2">
          <p className="text-xs text-[#75636A]">
            The prediction engine is fully open source. You can read the exact
            algorithm in{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/forecast.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
            >
              forecast.ts
            </Link>{" "}
            and the forecast test suite in{" "}
            <Link
              href="https://github.com/a3ro-dev/luna/blob/main/src/lib/prediction/__tests__/engine.test.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]"
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
        <p className="text-[#75636A] text-xs">
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
            <p className="text-xs text-[#75636A]">
              SOC 2 Type II, ISO 27001 certified. AES-256 at rest, TLS 1.2+ in
              transit. Acquired by Databricks (May 2025). HIPAA only on Scale
              plan — Luna does not use this plan.
            </p>
          </div>
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-3">
            <p className="text-sm font-medium text-[#6D5A60] mb-1">
              HackClub (AI proxy + search)
            </p>
            <p className="text-xs text-[#75636A]">
              US 501(c)(3) nonprofit. Logs all AI prompts and responses in full.
              No documented retention period. No service-specific privacy policy.
              Code is open source and verifiable.
            </p>
          </div>
          <div className="rounded-xl border border-[#FFDDE0]/20 bg-[#FFF9F9] p-3">
            <p className="text-sm font-medium text-[#6D5A60] mb-1">
              Supermemory (AI memory)
            </p>
            <p className="text-xs text-[#75636A]">
              Early-stage company. Claims SOC 2, HIPAA, GDPR compliance — no
              public audits. Encryption at rest not documented. Core engine
              is open source (MIT).
            </p>
          </div>
        </div>
        <p className="mt-3 text-[#75636A] text-xs">
          Self-hosting with replacement infrastructure is the only path to full
          data control. See our{" "}
          <Link href="/transparency" className="text-[#A34E68] underline decoration-[#FFB5C0] underline-offset-2 hover:decoration-[#A34E68]">
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
        <p className="text-[#75636A] text-xs">
          These terms are tracked in Luna&apos;s open-source Git repository.
          You can see the full history of changes on GitHub.
        </p>
      </>
    ),
  },
];
