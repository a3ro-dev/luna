"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ──────────────────────────────────────────────────────────────
   Timezone list (common ones, IST default)
   ────────────────────────────────────────────────────────────── */

const TIMEZONES = [
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

/* ──────────────────────────────────────────────────────────────
   Motion — Jakub Krehel enter/exit recipe
   ────────────────────────────────────────────────────────────── */

const enter = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { type: "spring", duration: 0.45, bounce: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerChild = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { type: "spring", duration: 0.4, bounce: 0 },
};

/* ──────────────────────────────────────────────────────────────
   Onboarding Page
   ────────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [perimenoStage, setPerimenoStage] = useState<
    "early" | "late" | "unknown"
  >("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 3;

  // Redirect unauthenticated users
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Auto-detect timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES.includes(detected)) {
        setTimezone(detected);
      }
    } catch {
      // Fallback to IST
    }
  }, []);

  // Toggle condition
  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) => {
      if (id === "none") return prev.includes("none") ? [] : ["none"];
      const filtered = prev.filter((c) => c !== "none");
      return filtered.includes(id)
        ? filtered.filter((c) => c !== id)
        : [...filtered, id];
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
          // Legacy perimenopause with stage metadata — new users use
          // perimenopause_early / perimenopause_late directly.
          perimenoStage: selectedConditions.includes("perimenopause")
            ? perimenoStage
            : undefined,
          pushNotificationsEnabled: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F9] flex items-center justify-center selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
        <div className="w-5 h-5 border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      {/* Progress — thin, elegant */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#FFDDE0]/30 z-50">
        <motion.div
          className="h-full bg-[#FFB5C0]"
          initial={false}
          animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="w-full max-w-md">
        <div className="min-h-[460px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Welcome ────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="welcome"
                {...enter}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                {/* Breathing glow orb */}
                <div className="relative mb-10">
                  <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFDDE0] to-[#D6CBE3] flex items-center justify-center text-4xl"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    ✨
                  </motion.div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFDDE0]/40 to-[#D6CBE3]/40 blur-xl -z-10" />
                </div>

                <h1 className="font-serif text-[clamp(2.2rem,6vw,3.2rem)] font-light text-[#6D5A60] leading-[1.1] mb-4">
                  Hey{" "}
                  {session?.user?.name
                    ? session.user.name.split(" ")[0]
                    : "there"}
                </h1>
                <p className="text-base font-light text-[#8E7D82] leading-relaxed max-w-xs">
                  Luna learns your rhythm so you don&apos;t have to think about
                  tracking. Let&apos;s make it yours.
                </p>
              </motion.div>
            )}

            {/* ── Step 1: Quick setup ────────────────────── */}
            {step === 1 && (
              <motion.div
                key="setup"
                {...enter}
                className="flex-1 flex flex-col"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFB5C0] mb-3"
                >
                  Quick setup
                </motion.p>
                <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-1">
                  When were you born?
                </h2>
                <p className="text-sm font-light text-[#8E7D82] mb-8">
                  This helps Luna calibrate to your body&apos;s stage.
                </p>

                {error && (
                  <div className="rounded-2xl bg-[#FFB5C0]/10 px-4 py-3 text-sm text-[#FFB5C0] text-center mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-5 flex-1">
                  <div>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all"
                    />
                    <p className="mt-2 text-[11px] font-light text-[#8E7D82]/40 ml-1">
                      Optional. Can be changed up to 2 times later.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-light text-[#8E7D82]/60 mb-2 ml-1">
                      Timezone — we detected{" "}
                      <span className="text-[#6D5A60]">{timezone}</span>
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all appearance-none cursor-pointer"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Your rhythm ────────────────────── */}
            {step === 2 && (
              <motion.div
                key="rhythm"
                {...enter}
                className="flex-1 flex flex-col"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFB5C0] mb-3"
                >
                  Your rhythm
                </motion.p>
                <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-1">
                  Anything Luna should know?
                </h2>
                <p className="text-sm font-light text-[#8E7D82] mb-6">
                  Pick what applies. This helps predictions adapt to you.
                </p>

                {error && (
                  <div className="rounded-2xl bg-[#FFB5C0]/10 px-4 py-3 text-sm text-[#FFB5C0] text-center mb-4">
                    {error}
                  </div>
                )}

                <motion.div
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 gap-3 flex-1 content-start"
                >
                  {CONDITIONS.map((c) => {
                    const isSelected = selectedConditions.includes(c.id);
                    return (
                      <motion.button
                        key={c.id}
                        variants={staggerChild}
                        type="button"
                        onClick={() => toggleCondition(c.id)}
                        className={`text-left rounded-2xl border px-4 py-4 transition-all duration-200 cursor-pointer will-change-transform ${
                          isSelected
                            ? "border-[#FFB5C0]/50 bg-[#FFEEF1]/60 scale-[1.02]"
                            : "border-[#FFDDE0]/30 bg-[#FFF9F9] hover:border-[#FFDDE0]/50 active:scale-[0.98]"
                        }`}
                      >
                        <p
                          className={`text-sm font-light leading-snug ${
                            isSelected ? "text-[#6D5A60]" : "text-[#8E7D82]"
                          }`}
                        >
                          {c.label}
                        </p>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {selectedConditions.length > 0 &&
                  !selectedConditions.includes("none") &&
                  !selectedConditions.includes("perimenopause_early") &&
                  !selectedConditions.includes("perimenopause_late") && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-[11px] font-light text-[#8E7D82]/50 text-center"
                    >
                      Luna adapts to your unique rhythm over time
                    </motion.p>
                  )}

                {/* Perimenopause stage follow-up no longer needed — users select
                    perimenopause_early or perimenopause_late directly. Legacy
                    perimenopause condition is handled via perimenoStage in the
                    onboarding API route. */}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation ──────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#FFDDE0]/20">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] hover:text-[#6D5A60] transition-colors cursor-pointer"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={isSubmitting}
                className="h-12 px-8 rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-200 hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="h-12 px-8 rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-200 hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Start tracking
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Step counter — minimal */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === step
                    ? "w-6 bg-[#FFB5C0]"
                    : i < step
                      ? "w-1.5 bg-[#FFB5C0]/40"
                      : "w-1.5 bg-[#FFDDE0]/40"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-light text-[#8E7D82]/40">
          You can revisit this from settings anytime
        </p>
      </div>
    </div>
  );
}
