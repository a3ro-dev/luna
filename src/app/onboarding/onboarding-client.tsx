"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Variants,
} from "motion/react";
import Link from "next/link";
import { spring } from "@/lib/motion";
import { GroupedSection } from "@/components/apple/Grouped";

// The device's own zone. Onboarding doesn't ask; Settings can change it.
function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
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
  "Date of birth",
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

// Steps push sideways like a navigation stack: forward arrives from the
// trailing edge, Back from the leading edge. <MotionConfig reducedMotion="user">
// below drops the movement and keeps the fade, with identical SSR markup. The
// exit is quicker than the enter: with mode="wait" the next step waits for it.
const stepVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: 24 * dir }),
  center: { opacity: 1, x: 0, transition: spring.smooth },
  exit: (dir: number) => ({ opacity: 0, x: -24 * dir, transition: spring.snappy }),
};

// Inset grouped rows with a hairline inset to the label, like Settings. Focus
// is an outline drawn inside the row, so it follows the rounded corners and
// survives forced-colors mode (a box-shadow ring would not).
const hairline =
  "relative first:rounded-t-[1.125rem] last:rounded-b-[1.125rem] not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:border-t not-first:before:border-[var(--separator)]";
const row = `${hairline} flex min-h-11 w-full items-center gap-3 px-4 text-left`;
const pressableRow =
  "cursor-pointer transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--fill-tertiary)_60%,transparent)] focus-visible:outline-2! focus-visible:-outline-offset-2! active:bg-[var(--fill-tertiary)]";
// A row wrapping a field: the whole 44px row is the tap target and shows focus.
const fieldRow = `${row} cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[var(--tint)]`;
const rowLabel = "shrink-0 text-[17px] text-[var(--tier-ink)]";
// A compact, pill-shaped value like UIKit's compact date picker. The min width
// keeps an empty pill visible where the browser shows no placeholder (iOS).
const datePill =
  "ml-auto h-9 min-w-[7.5rem] cursor-pointer rounded-lg bg-[var(--fill-tertiary)] px-2.5 text-[17px] text-[var(--tier-ink)] outline-hidden! [&::-webkit-date-and-time-value]:text-right";
const stepTitle =
  "font-display text-[2.125rem] leading-[1.1] font-bold tracking-[-0.026em] text-balance text-[var(--tier-ink)] outline-none";
const stepLede =
  "mx-auto mt-3 max-w-sm text-[17px] leading-snug text-pretty text-[var(--label-secondary)]";
// Links inside running text keep an underline: hue alone is under 3:1 here.
const inlineLink =
  "text-[var(--tint)] underline decoration-[color-mix(in_oklch,var(--tint)_45%,transparent)] underline-offset-2 hover:decoration-current";
const primaryButton =
  "inline-flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--tint)] px-5 text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-surface)] transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_85%,var(--tier-ink))] active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:scale-100";
// The global focus outline uses --tier-accent (about 2:1); recolour it to
// --tint so every control's focus reads at 3:1 or better.
const page =
  "tier-app flex flex-col font-sans selection:bg-[var(--tier-tint)] [&_:focus-visible]:outline-[var(--tint)]!";
// Translucent bars pinned over the scrolling step on phones; plain on larger
// screens, where nothing scrolls under them. `!` beats the unlayered .material.
const barOnPhones =
  "z-10 sm:static sm:border-0! sm:bg-transparent! sm:backdrop-filter-none!";
const quietButton =
  "inline-flex min-h-11 cursor-pointer items-center rounded-lg text-[17px] text-[var(--tint)] transition-opacity hover:opacity-70";

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

// "user": follow prefers-reduced-motion. Movement and scale become instant,
// fades stay, and SSR markup is identical either way.
export default function OnboardingPageClient() {
  return (
    <MotionConfig reducedMotion="user">
      <Onboarding />
    </MotionConfig>
  );
}

function Onboarding() {
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  // 1 moving forward, -1 for Back: which edge the next step slides in from
  const [direction, setDirection] = useState(1);
  const [dateOfBirth, setDateOfBirth] = useState("");
  // Steps that show the timezone never render on the server, so a lazy
  // client-side default cannot cause a hydration mismatch.
  const [timezone] = useState(detectTimeZone);
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
  // A page change is in flight until the old step has finished leaving. A
  // second press in that window would skip a page, or finish onboarding before
  // the last page is seen, so presses are ignored until then.
  const navigating = useRef(false);

  const setDeclined = (declined: boolean) => {
    if (navigating.current) return;
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
    if (navigating.current) return;
    navigating.current = true;
    focusHeadingNext.current = true;
    setDirection(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  // Enter in a field moves forward, same as the primary button
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navigating.current || isSubmitting || (step === 1 && !consentChecked))
      return;
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
          className="size-6 animate-spin rounded-full border-2 border-[var(--separator)] border-t-[var(--tint)]"
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  // ── Consent declined: exit screen ──────────────────
  if (consentDeclined) {
    return (
      <main className={`${page} sm:justify-center`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={spring.smooth}
          className="mx-auto flex w-full max-w-md min-w-0 flex-1 flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top)+2rem)] text-center sm:flex-none sm:pt-0"
        >
          <MoonPhase fraction={0.25} className="mx-auto mb-6 size-14" />
          <h1 ref={headingRef} tabIndex={-1} className={stepTitle}>
            We understand
          </h1>
          <p className={stepLede}>
            Luna requires your consent to process data and provide predictions.
            Without it, we can&apos;t offer the service safely. You&apos;re
            always welcome to change your mind.
          </p>
        </motion.div>
        <div className="mx-auto w-full max-w-md px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pt-10">
          <Link href="/" className={primaryButton}>
            Back to home
          </Link>
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setDeclined(false)}
              className={`${quietButton} px-3`}
            >
              I changed my mind
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isLastStep = step === totalSteps - 1;
  const showAdaptNote =
    selectedConditions.length > 0 &&
    !selectedConditions.includes("none") &&
    !selectedConditions.includes("perimenopause_early") &&
    !selectedConditions.includes("perimenopause_late");

  // A checkmark row, like picking from a list in Settings
  const conditionRow = (c: (typeof CONDITIONS)[number]) => {
    const isSelected = selectedConditions.includes(c.id);
    return (
      <button
        key={c.id}
        type="button"
        aria-pressed={isSelected}
        onClick={() => toggleCondition(c.id)}
        className={`${row} ${pressableRow}`}
      >
        <span className="min-w-0 flex-1 py-2.5 text-[17px] leading-snug text-[var(--tier-ink)]">
          {c.label}
        </span>
        <motion.svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.6 }}
          transition={spring.snappy}
          className="size-[18px] shrink-0 text-[var(--tint)]"
        >
          <path d="M20 6 9 17l-5-5" />
        </motion.svg>
      </button>
    );
  };

  return (
    // overflow-x-clip: the sideways step push must not make phones pan
    <main className={`${page} overflow-x-clip sm:justify-center`}>
      <form onSubmit={handleSubmit} className="contents">
        {/* ── Navigation bar: Back, and a page control for progress ── */}
        <div className={`sticky top-0 material hairline-b pt-[env(safe-area-inset-top)] ${barOnPhones}`}>
          <div className="mx-auto grid h-11 w-full max-w-md grid-cols-[1fr_auto_1fr] items-center px-2">
            <div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  disabled={isSubmitting}
                  className={`${quietButton} gap-1 px-2 disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 10 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[18px] w-2.5"
                  >
                    <path d="M8.5 1.5 1.5 9l7 7.5" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            <div aria-hidden className="flex items-center gap-2">
              {STEP_NAMES.map((name, i) => (
                <span
                  key={name}
                  className={`size-[7px] rounded-full transition-colors duration-200 ${
                    i === step
                      ? "bg-[var(--tier-ink)]"
                      : "bg-[color-mix(in_oklch,var(--tier-ink)_20%,transparent)]"
                  }`}
                />
              ))}
            </div>
          </div>
          <p aria-live="polite" className="sr-only">
            Step {step + 1} of {totalSteps}: {STEP_NAMES[step]}
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-md min-w-0 flex-1 flex-col px-5 pt-6 pb-8 sm:min-h-[30rem] sm:flex-none sm:pt-10">
          <AnimatePresence
            mode="wait"
            initial={false}
            custom={direction}
            onExitComplete={() => {
              navigating.current = false;
            }}
          >
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className={`flex flex-col text-center ${step === 0 ? "flex-1 justify-center" : ""}`}
            >
              {/* The moon waxes one phase per step and is full on the last */}
              <MoonPhase
                fraction={(step + 1) / totalSteps}
                className="mx-auto mb-6 size-14"
              />

              {/* ── Step 0: Welcome ────────────────────────── */}
              {step === 0 && (
                <>
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-serif text-[clamp(2.75rem,11vw,3.5rem)] leading-[1.02] break-words text-[var(--tier-ink)] outline-none"
                  >
                    Hey{" "}
                    {session?.user?.name
                      ? session.user.name.split(" ")[0]
                      : "there"}
                    .
                  </h1>
                  <p className={stepLede}>
                    Luna learns your rhythm so you don&apos;t have to think
                    about tracking. Let&apos;s make it yours.
                  </p>
                  <p className="mx-auto mt-6 max-w-xs text-[15px] leading-snug text-pretty text-[var(--label-tertiary)]">
                    A few short questions, about a minute. Only consent is
                    required, and you can revisit everything from settings.
                  </p>
                </>
              )}

              {/* ── Step 1: Your consent ──────────────────── */}
              {step === 1 && (
                <>
                  <h1 ref={headingRef} tabIndex={-1} className={stepTitle}>
                    We take your privacy seriously
                  </h1>
                  <p className={stepLede}>
                    Here&apos;s what you should know before using Luna.
                  </p>

                  <ul className="grouped mt-8 text-left">
                    {CONSENT_POINTS.map((point) => (
                      <li key={point.title} className={`${hairline} px-4 pt-3`}>
                        <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.022em] text-[var(--tier-ink)]">
                          {point.title}
                        </h2>
                        <p className="mt-1 text-[15px] leading-snug text-[var(--label-secondary)]">
                          {point.body}
                        </p>
                        <Link
                          href={point.href}
                          target="_blank"
                          className="inline-flex min-h-11 items-center rounded-lg text-[15px] text-[var(--tint)] underline-offset-4 hover:underline"
                        >
                          {point.link}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <label className="grouped mt-6 flex cursor-pointer items-start gap-3 px-4 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-px size-[22px] shrink-0 cursor-pointer accent-[var(--tint)]"
                    />
                    <span className="text-[15px] leading-snug text-[var(--tier-ink)]">
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
                </>
              )}

              {/* ── Step 2: Date of birth ──────────────────── */}
              {step === 2 && (
                <>
                  <h1 ref={headingRef} tabIndex={-1} className={stepTitle}>
                    When were you born?
                  </h1>
                  <p className={stepLede}>
                    This helps Luna calibrate to your body&apos;s stage.
                  </p>

                  <GroupedSection
                    className="mt-8 text-left"
                    footer={
                      <>
                        <span id="dob-hint">
                          Optional. You can change this up to 2 times later.
                        </span>{" "}
                        Luna follows this device&apos;s time zone,{" "}
                        {timezone.replace(/_/g, " ")}. You can pick another in
                        Settings.
                      </>
                    }
                  >
                    <label className={fieldRow}>
                      <span className={rowLabel}>Date of birth</span>
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
                        className={datePill}
                      />
                    </label>
                  </GroupedSection>
                </>
              )}

              {/* ── Step 3: Your rhythm ────────────────────── */}
              {step === 3 && (
                <>
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    id="rhythm-heading"
                    className={stepTitle}
                  >
                    Anything Luna should know?
                  </h1>
                  <p className={stepLede}>
                    Pick what applies. This helps predictions adapt to you.
                  </p>

                  <div
                    role="group"
                    aria-labelledby="rhythm-heading"
                    className="mt-8 space-y-6 text-left"
                  >
                    <GroupedSection
                      footer={
                        showAdaptNote && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={spring.smooth}
                          >
                            Luna adapts to your unique rhythm over time.
                          </motion.span>
                        )
                      }
                    >
                      {CONDITIONS.filter((c) => c.id !== "none").map(
                        conditionRow,
                      )}
                    </GroupedSection>
                    <GroupedSection>
                      {CONDITIONS.filter((c) => c.id === "none").map(
                        conditionRow,
                      )}
                    </GroupedSection>
                  </div>
                </>
              )}

              {/* ── Step 4: Last period ────────────────────── */}
              {step === 4 && (
                <>
                  <h1 ref={headingRef} tabIndex={-1} className={stepTitle}>
                    When did your last period start?
                  </h1>
                  <p className={stepLede}>
                    With one date Luna can give you a first estimate right away.
                    It gets more personal with every cycle you log.
                  </p>

                  <GroupedSection
                    className="mt-8 text-left"
                    footer={
                      <span id="last-period-hint">
                        Optional. Not sure? Skip it and tell Luna in chat later.
                      </span>
                    }
                  >
                    <label className={fieldRow}>
                      <span className={rowLabel}>
                        First day
                        <span className="sr-only"> of your last period</span>
                      </span>
                      <input
                        id="last-period-start"
                        type="date"
                        autoComplete="off"
                        value={lastPeriodStart}
                        max={localIsoDate()}
                        onChange={(e) => setLastPeriodStart(e.target.value)}
                        aria-describedby="last-period-hint"
                        className={datePill}
                      />
                    </label>
                  </GroupedSection>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Actions: pinned within thumb reach on phones ── */}
        <div className={`sticky bottom-0 material hairline-t ${barOnPhones}`}>
          <div className="mx-auto w-full max-w-md px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-12">
            {error && (
              <p
                role="alert"
                className="mb-3 text-center text-[15px] leading-snug text-[color-mix(in_oklch,var(--destructive)_70%,var(--tier-ink))]"
              >
                {error}
              </p>
            )}
            <p role="status" className="sr-only">
              {isSubmitting ? "Saving your preferences" : ""}
            </p>

            <button
              type="submit"
              // aria-disabled, not disabled: a disabled button drops focus to
              // <body>. handleSubmit already ignores these presses.
              aria-disabled={isSubmitting || (step === 1 && !consentChecked)}
              className={primaryButton}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Setting things up…
                </>
              ) : step === 0 ? (
                "Let’s begin"
              ) : step === 1 ? (
                "I agree and continue"
              ) : !isLastStep ? (
                "Continue"
              ) : (
                "Start tracking"
              )}
            </button>

            {/* The secondary slot keeps its height so the button never jumps */}
            <div className="flex min-h-11 justify-center pt-1">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setDeclined(true)}
                  className={`${quietButton} px-3`}
                >
                  I do not agree
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
