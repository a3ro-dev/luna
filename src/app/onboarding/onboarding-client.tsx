"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import Link from "next/link";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Hong_Kong",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
];

// Every IANA zone the browser knows, so no one is stuck with a wrong local date
const TIMEZONES = (() => {
  try {
    const all = Intl.supportedValuesOf("timeZone");
    return all.includes("UTC") ? all : [...all, "UTC"];
  } catch {
    return COMMON_TIMEZONES;
  }
})();

function detectTimeZone() {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.includes(detected)) return detected;
  } catch {
    // fall through
  }
  return "Asia/Kolkata";
}

const localIsoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PERIMENO = ["perimenopause_early", "perimenopause_late"];

const CONDITIONS = [
  { id: "pcos", label: "PCOS" },
  { id: "pcod", label: "PCOD" },
  { id: "endometriosis", label: "Endometriosis" },
  { id: "thyroid", label: "Thyroid" },
  { id: "hormonal_bc", label: "On birth control" },
  { id: "irregular", label: "Irregular cycles" },
  { id: "perimenopause_early", label: "Perimenopause (early)" },
  { id: "perimenopause_late", label: "Perimenopause (late)" },
  { id: "none", label: "None of these" },
];

const STEP_NAMES = [
  "Welcome",
  "Your consent",
  "Quick setup",
  "Your rhythm",
  "A starting point",
];

const CONSENT_POINTS = [
  {
    title: "Not medical advice",
    body: "Luna is not a medical device, not FDA-approved, and not a substitute for a healthcare provider. Predictions are statistical estimates, and they can be wrong.",
    href: "/terms",
    link: "Read Terms of Use",
  },
  {
    title: "AI and data processing",
    body: "Your messages go through HackClub's AI proxy to xAI and Anthropic. Your cycle data lives in Neon PostgreSQL. We don't sell your data. HackClub logs conversations.",
    href: "/privacy",
    link: "Read Privacy Policy",
  },
  {
    title: "Limitations",
    body: "Luna has no clinical validation, no accuracy benchmarks, and no published user studies. We're honest about what we don't know.",
    href: "/transparency",
    link: "Read full transparency",
  },
];

const enter = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { type: "spring", duration: 0.45, bounce: 0 },
} as const;

// Reduced motion: opacity only, no movement or blur
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerChild: Variants = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.4, bounce: 0 },
  },
};

const fadeChild: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

const stepHeading =
  "outline-none font-serif text-[2.25rem] leading-[1.08] text-[var(--tier-ink)] sm:text-[2.5rem]";
const stepLede = "mt-3 text-base leading-relaxed text-[var(--tier-muted)]";
const fieldLabel = "mb-2 block text-sm font-medium text-[var(--tier-ink)]";
const hint = "mt-2 text-sm text-[var(--tier-muted)]";
const field =
  "block h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-base text-[var(--tier-ink)] transition-colors hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] [&::-webkit-date-and-time-value]:text-left";
const inlineLink =
  "font-medium text-[var(--tier-ink)] underline decoration-[#FFB5C0] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--tier-ink)]";

/** A waxing moon lit from the right; fraction 0 is new, 1 is full. */
function MoonPhase({
  fraction,
  className,
}: {
  fraction: number;
  className?: string;
}) {
  const rx = 10 * Math.abs(1 - 2 * fraction);
  const lit = `M12 2A10 10 0 0 1 12 22A${rx} 10 0 0 ${fraction > 0.5 ? 1 : 0} 12 2Z`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="var(--tier-tint)"
        stroke="var(--tier-accent)"
        strokeOpacity={0.5}
      />
      <path d={lit} fill="var(--tier-accent)" />
    </svg>
  );
}

const Spinner = () => (
  <span
    aria-hidden
    className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
  />
);

export default function OnboardingPageClient() {
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const stepMotion = reduceMotion ? fade : enter;
  const childMotion = reduceMotion ? fadeChild : staggerChild;

  const [step, setStep] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState("");
  // Steps that show the timezone never render on the server, so a lazy
  // client-side default cannot cause a hydration mismatch.
  const [timezone, setTimezone] = useState(detectTimeZone);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Consent state
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentDeclined, setConsentDeclined] = useState(false);

  const totalSteps = STEP_NAMES.length;

  // When the view changes, move focus to the new heading so keyboard and
  // screen-reader users keep their place. A callback ref fires when the
  // heading actually mounts, which with AnimatePresence mode="wait" is after
  // the previous step has finished exiting.
  const focusHeadingNext = useRef(false);
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    if (el && focusHeadingNext.current) {
      focusHeadingNext.current = false;
      el.focus();
    }
  }, []);
  const setDeclined = (declined: boolean) => {
    focusHeadingNext.current = true;
    setConsentDeclined(declined);
  };

  // Redirect unauthenticated users
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Toggle condition
  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) => {
      if (id === "none") return prev.includes("none") ? [] : ["none"];
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      // Early and late perimenopause are one choice, not two
      const exclusive = PERIMENO.includes(id) ? PERIMENO : [];
      return [
        ...prev.filter((c) => c !== "none" && !exclusive.includes(c)),
        id,
      ];
    });
  };

  // Complete onboarding
  const handleComplete = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: dateOfBirth || undefined,
          timezone,
          conditions: selectedConditions,
          perimenoStage: selectedConditions.includes("perimenopause_late")
            ? "late"
            : selectedConditions.includes("perimenopause_early")
              ? "early"
              : undefined,
          pushNotificationsEnabled: false,
          consentGiven: true,
          consentVersion: "2026-06",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }
      if (lastPeriodStart) {
        // Best effort: a duplicate from re-running onboarding is harmless
        await fetch("/api/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mStart: lastPeriodStart }),
        }).catch(() => undefined);
      }
      // Refresh session so JWT picks up consentGiven before dashboard navigation
      try {
        await update();
      } catch {
        // Non-fatal — middleware will re-fetch consent from DB on next request
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong.");
      setIsSubmitting(false);
    }
  };

  const goTo = (next: number) => {
    focusHeadingNext.current = true;
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  // Enter in a field moves forward, same as the primary button
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || (step === 1 && !consentChecked)) return;
    if (step < totalSteps - 1) goTo(step + 1);
    else void handleComplete();
  };

  if (authStatus === "loading") {
    return (
      <div
        role="status"
        className="tier-app flex items-center justify-center font-sans"
      >
        <span
          aria-hidden
          className="size-5 animate-spin rounded-full border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0]"
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  // ── Consent declined: exit screen ──────────────────
  if (consentDeclined) {
    return (
      <main className="tier-app flex flex-col items-center justify-center px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] font-sans selection:bg-[#FFDDE0]">
        <motion.div {...stepMotion} className="w-full max-w-sm min-w-0">
          <MoonPhase fraction={0.25} className="mb-8 size-14" />
          <h1 ref={headingRef} tabIndex={-1} className={stepHeading}>
            We understand.
          </h1>
          <p className={stepLede}>
            Luna requires your consent to process data and provide predictions.
            Without it, we can&apos;t offer the service safely. You&apos;re
            always welcome to change your mind.
          </p>
          <div className="mt-10 flex flex-col items-center gap-2">
            <Link href="/" className="tier-primary-action h-12 w-full">
              Back to home
            </Link>
            <button
              type="button"
              onClick={() => setDeclined(false)}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-[var(--tier-muted)] transition-colors hover:text-[var(--tier-ink)]"
            >
              I changed my mind
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  const isLastStep = step === totalSteps - 1;

  return (
    <main className="tier-app flex flex-col overflow-x-clip font-sans selection:bg-[#FFDDE0] sm:justify-center">
      <form onSubmit={handleSubmit} className="contents">
        <div className="mx-auto flex w-full max-w-md min-w-0 flex-1 flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:flex-none sm:pt-12">
          {/* Progress: the moon waxes one phase per step and is full on the last */}
          <div className="flex items-center gap-3">
            <MoonPhase
              fraction={(step + 1) / totalSteps}
              className="size-8 shrink-0"
            />
            <p
              aria-live="polite"
              className="min-w-0 text-sm text-[var(--tier-muted)]"
            >
              <span className="font-medium tabular-nums text-[var(--tier-ink)]">
                Step {step + 1} of {totalSteps}
              </span>
              <span aria-hidden> · </span>
              {STEP_NAMES[step]}
            </p>
          </div>

          <div className="flex flex-1 flex-col pt-10 pb-8 sm:min-h-[26rem] sm:flex-none">
            <AnimatePresence mode="wait">
              {/* ── Step 0: Welcome ────────────────────────── */}
              {step === 0 && (
                <motion.div
                  key="welcome"
                  {...stepMotion}
                  className="flex flex-1 flex-col justify-center"
                >
                  {/* Breathing glow orb */}
                  <div className="relative isolate mb-10 size-24">
                    <motion.div
                      aria-hidden
                      className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-[#FFDDE0] to-[#D6CBE3] text-4xl"
                      animate={
                        reduceMotion ? undefined : { scale: [1, 1.05, 1] }
                      }
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      ✨
                    </motion.div>
                    <div
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-[#FFDDE0]/40 to-[#D6CBE3]/40 blur-xl"
                    />
                  </div>

                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="break-words font-serif outline-none text-[clamp(2.75rem,11vw,3.5rem)] leading-[1.02] text-[var(--tier-ink)]"
                  >
                    Hey{" "}
                    {session?.user?.name
                      ? session.user.name.split(" ")[0]
                      : "there"}
                    .
                  </h1>
                  <p className="mt-4 max-w-xs text-base leading-relaxed text-[var(--tier-muted)]">
                    Luna learns your rhythm so you don&apos;t have to think
                    about tracking. Let&apos;s make it yours.
                  </p>
                  <p className="mt-8 border-t border-[var(--tier-line)] pt-4 text-sm leading-relaxed text-[var(--tier-muted)]">
                    A few short questions, about a minute. Only consent is
                    required, and you can revisit everything from settings.
                  </p>
                </motion.div>
              )}

              {/* ── Step 1: Your consent ──────────────────── */}
              {step === 1 && (
                <motion.div
                  key="consent"
                  {...stepMotion}
                  className="flex flex-col"
                >
                  <h1 ref={headingRef} tabIndex={-1} className={stepHeading}>
                    We take your privacy seriously.
                  </h1>
                  <p className={stepLede}>
                    Here&apos;s what you should know before using Luna.
                  </p>

                  <motion.ul
                    variants={stagger}
                    initial="initial"
                    animate="animate"
                    className="mt-6 divide-y divide-[var(--tier-line)] rounded-3xl border border-[var(--tier-line)] bg-[var(--tier-surface)]"
                  >
                    {CONSENT_POINTS.map((point) => (
                      <motion.li
                        key={point.title}
                        variants={childMotion}
                        className="px-5 pt-4 pb-1"
                      >
                        <h2 className="text-sm font-semibold text-[var(--tier-ink)]">
                          {point.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--tier-muted)]">
                          {point.body}
                        </p>
                        <Link
                          href={point.href}
                          target="_blank"
                          className={`${inlineLink} inline-block py-3 text-sm`}
                        >
                          {point.link}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>

                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-4 transition-colors has-[:checked]:border-[var(--tier-accent)] has-[:checked]:bg-[var(--tier-tint)]">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#B45A75]"
                    />
                    <span className="text-sm leading-relaxed text-[var(--tier-ink)]">
                      I understand and agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className={inlineLink}
                      >
                        Terms of Use
                      </Link>
                      ,{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className={inlineLink}
                      >
                        Privacy Policy
                      </Link>
                      , and the limitations described above.
                    </span>
                  </label>
                </motion.div>
              )}

              {/* ── Step 2: Quick setup ────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="setup"
                  {...stepMotion}
                  className="flex flex-col"
                >
                  <h1 ref={headingRef} tabIndex={-1} className={stepHeading}>
                    When were you born?
                  </h1>
                  <p className={stepLede}>
                    This helps Luna calibrate to your body&apos;s stage.
                  </p>

                  <div className="mt-8 space-y-6">
                    <div>
                      <label htmlFor="dob" className={fieldLabel}>
                        Date of birth{" "}
                        <span className="font-normal text-[var(--tier-muted)]">
                          Optional
                        </span>
                      </label>
                      <input
                        id="dob"
                        name="bday"
                        type="date"
                        autoComplete="bday"
                        min="1900-01-01"
                        max={localIsoDate()}
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        aria-describedby="dob-hint"
                        className={field}
                      />
                      <p id="dob-hint" className={hint}>
                        You can change this up to 2 times later.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="timezone" className={fieldLabel}>
                        Timezone
                      </label>
                      <div className="relative">
                        <select
                          id="timezone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          aria-describedby="timezone-hint"
                          className={`${field} cursor-pointer appearance-none truncate pr-11`}
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                        <svg
                          aria-hidden
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-[var(--tier-muted)]"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                      <p id="timezone-hint" className={hint}>
                        Set from this device, so Luna knows when your day
                        begins.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Your rhythm ────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="rhythm"
                  {...stepMotion}
                  className="flex flex-col"
                >
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    id="rhythm-heading"
                    className={stepHeading}
                  >
                    Anything Luna should know?
                  </h1>
                  <p className={stepLede}>
                    Pick what applies. This helps predictions adapt to you.
                  </p>

                  <motion.div
                    role="group"
                    aria-labelledby="rhythm-heading"
                    variants={stagger}
                    initial="initial"
                    animate="animate"
                    className="mt-6 grid grid-cols-2 gap-2.5"
                  >
                    {CONDITIONS.map((c) => {
                      const isSelected = selectedConditions.includes(c.id);
                      return (
                        <motion.button
                          key={c.id}
                          variants={childMotion}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleCondition(c.id)}
                          className={`flex min-h-14 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition-colors active:scale-[0.98] ${
                            c.id === "none" ? "col-span-2" : ""
                          } ${
                            isSelected
                              ? "border-[var(--tier-accent)] bg-[var(--tier-tint)] font-medium text-[var(--tier-ink)]"
                              : "border-[var(--tier-line)] bg-[var(--tier-surface)] text-[var(--tier-muted)] hover:border-[var(--tier-accent)] hover:text-[var(--tier-ink)]"
                          }`}
                        >
                          <span className="min-w-0">{c.label}</span>
                          <span
                            aria-hidden
                            className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                              isSelected
                                ? "border-[#B45A75] bg-[#B45A75] text-white"
                                : "border-[var(--tier-line)]"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="size-3"
                              >
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  {selectedConditions.length > 0 &&
                    !selectedConditions.includes("none") &&
                    !selectedConditions.includes("perimenopause_early") &&
                    !selectedConditions.includes("perimenopause_late") && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-sm text-[var(--tier-muted)]"
                      >
                        Luna adapts to your unique rhythm over time.
                      </motion.p>
                    )}
                </motion.div>
              )}

              {/* ── Step 4: Last period ────────────────────── */}
              {step === 4 && (
                <motion.div
                  key="last-period"
                  {...stepMotion}
                  className="flex flex-col"
                >
                  <h1 ref={headingRef} tabIndex={-1} className={stepHeading}>
                    When did your last period start?
                  </h1>
                  <p className={stepLede}>
                    With one date Luna can give you a first estimate right away.
                    It gets more personal with every cycle you log.
                  </p>

                  <div className="mt-8">
                    <label htmlFor="last-period-start" className={fieldLabel}>
                      First day of your last period{" "}
                      <span className="font-normal text-[var(--tier-muted)]">
                        Optional
                      </span>
                    </label>
                    <input
                      id="last-period-start"
                      type="date"
                      autoComplete="off"
                      value={lastPeriodStart}
                      max={localIsoDate()}
                      onChange={(e) => setLastPeriodStart(e.target.value)}
                      aria-describedby="last-period-hint"
                      className={field}
                    />
                    <p id="last-period-hint" className={hint}>
                      Not sure? Skip it and tell Luna in chat later.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Actions: pinned within thumb reach on phones ── */}
        <div className="sticky bottom-0 z-10 border-t border-[var(--tier-line)] bg-[var(--tier-bg)]/90 backdrop-blur-md sm:static sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none">
          <div className="mx-auto w-full max-w-md px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-12">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-2xl bg-[#FFB5C0]/15 px-4 py-3 text-sm text-[#B4485F]"
              >
                {error}
              </p>
            )}
            <p role="status" className="sr-only">
              {isSubmitting ? "Saving your preferences" : ""}
            </p>

            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  disabled={isSubmitting}
                  aria-label="Back"
                  className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--tier-line)] bg-[var(--tier-surface)] text-[var(--tier-ink)] transition-colors hover:bg-[var(--tier-tint)] disabled:opacity-50"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                // aria-disabled, not disabled: a disabled button drops focus to
                // <body>. handleSubmit already ignores these presses.
                aria-disabled={isSubmitting || (step === 1 && !consentChecked)}
                className="tier-primary-action h-12 flex-1 cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:ml-auto sm:min-w-48 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Setting things up
                  </>
                ) : step === 0 ? (
                  "Let’s begin"
                ) : step === 1 ? (
                  "I agree and continue"
                ) : !isLastStep ? (
                  "Continue"
                ) : (
                  <>
                    Start tracking
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="mx-auto mt-2 flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm text-[var(--tier-muted)] transition-colors hover:text-[var(--tier-ink)]"
              >
                I do not agree
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
