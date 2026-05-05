"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  { id: "pcos", label: "PCOS", description: "Polycystic Ovary Syndrome" },
  { id: "pcod", label: "PCOD", description: "Polycystic Ovarian Disease" },
  { id: "endometriosis", label: "Endometriosis", description: "Tissue grows outside the uterus" },
  { id: "thyroid", label: "Thyroid condition", description: "Hypo- or hyperthyroidism" },
  { id: "hormonal_bc", label: "On hormonal birth control", description: "Pill, IUD, implant, etc." },
  { id: "irregular", label: "Irregular cycles", description: "Unpredictable cycle length" },
  { id: "perimenopause", label: "Perimenopause / Menopause", description: "Transitioning or post" },
  { id: "none", label: "None of these", description: "No known conditions" },
];

/* ──────────────────────────────────────────────────────────────
   Animation variants
   ────────────────────────────────────────────────────────────── */

const slideVariants = {
  enter: { opacity: 0, x: 60, filter: "blur(8px)" },
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -60, filter: "blur(8px)" },
};

const transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [algoStep, setAlgoStep] = useState(0);

  const totalSteps = 5;

  // Redirect unauthenticated users
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Calculate age from DOB
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birth = new Date(dob + "T00:00:00");
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(dateOfBirth);

  // Send OTP
  const handleSendOtp = useCallback(async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code.");
        return;
      }
      setOtpSent(true);
      setOtpEmail(data.email || session?.user?.email || "");
    } catch {
      setError("Failed to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  // Verify OTP
  const handleVerifyOtp = useCallback(async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code.");
        return;
      }
      setOtpVerified(true);
      // Auto-advance after verification
      setTimeout(() => setStep(2), 800);
    } catch {
      setError("Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [otp]);

  // Toggle condition
  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) => {
      if (id === "none") return prev.includes("none") ? [] : ["none"];
      const filtered = prev.filter((c) => c !== "none");
      return filtered.includes(id) ? filtered.filter((c) => c !== id) : [...filtered, id];
    });
  };

  // Request push notification permission
  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      setPushEnabled(false);
      return;
    }
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === "granted");
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
          pushNotificationsEnabled: pushEnabled,
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

  // Algorithm walkthrough steps
  const algoSteps = [
    { emoji: "📝", title: "You log your period", desc: "Tell Luna when your period starts and ends — in your own words." },
    { emoji: "🔢", title: "Luna calculates your rhythm", desc: "Cycle length, period length, follicular and luteal phases — all computed from your data." },
    { emoji: "📊", title: "Adaptive smoothing blends data", desc: "Luna uses exponential smoothing with population averages (ACOG data) for cold starts, then adapts as it learns your body." },
    { emoji: "⚠️", title: "Anomaly detection flags unusual cycles", desc: "Cycles over 45 days are flagged. Outliers are soft-clamped so they don't distort predictions." },
    { emoji: "🌸", title: "Predictions improve over time", desc: "Every cycle you log makes Luna smarter. After 6+ cycles, the algorithm fully relies on your personal data." },
  ];

  // Auto-advance algorithm walkthrough
  useEffect(() => {
    if (step !== 4) return;
    const timer = setInterval(() => {
      setAlgoStep((prev) => (prev < algoSteps.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(timer);
  }, [step]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F9] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#FFDDE0]/30 z-50">
        <div
          className="h-full bg-[#FFB5C0] transition-all duration-700 ease-out"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-lg">
        <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_30px_60px_rgba(255,181,192,0.1)] backdrop-blur-2xl min-h-[480px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div key="welcome" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFDDE0] to-[#D6CBE3] flex items-center justify-center text-3xl shadow-[0_20px_40px_rgba(255,181,192,0.2)] mb-8">
                  ✨
                </div>
                <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] font-light text-[#6D5A60] mb-4">
                  Welcome to Luna
                </h1>
                <p className="text-base font-light text-[#8E7D82] leading-relaxed max-w-sm">
                  Let&apos;s set up your experience. A few quick questions and you&apos;ll be tracking your cycle in no time.
                </p>
              </motion.div>
            )}

            {/* Step 1: DOB + Timezone + OTP */}
            {step === 1 && (
              <motion.div key="dob" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="flex-1 flex flex-col">
                <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-2">About you</h2>
                <p className="text-sm font-light text-[#8E7D82] mb-8">This helps Luna personalize your experience.</p>

                {error && (
                  <div className="rounded-2xl bg-[#FFB5C0]/10 px-4 py-3 text-sm text-[#FFB5C0] text-center mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-6 flex-1">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                      Date of birth
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all"
                    />
                    {age !== null && (
                      <p className="mt-2 text-xs font-light text-[#8E7D82] ml-1">
                        You are <span className="text-[#6D5A60] font-medium">{age}</span> years old
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-light text-[#8E7D82]/50 ml-1">
                      Can be changed up to 2 times later
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all appearance-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email verification */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                      Email verification
                    </label>
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-2xl border border-[#FFDDE0]/60 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] disabled:opacity-50"
                      >
                        {isSubmitting ? "Sending..." : "Send verification code"}
                      </button>
                    ) : !otpVerified ? (
                      <div className="space-y-3">
                        <p className="text-xs font-light text-[#8E7D82]">
                          We sent a code to <span className="text-[#6D5A60]">{otpEmail}</span>
                        </p>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            placeholder="6-digit code"
                            className="flex-1 px-5 py-3 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isSubmitting || otp.length < 6}
                            className="h-12 px-6 rounded-2xl bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white transition hover:bg-[#8E7D82] disabled:opacity-50"
                          >
                            {isSubmitting ? "..." : "Verify"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-[10px] text-[#FFB5C0] hover:text-[#6D5A60] transition-colors"
                        >
                          Resend code
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-[#6D5A60]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D6CBE3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Verified
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Health Conditions */}
            {step === 2 && (
              <motion.div key="conditions" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="flex-1 flex flex-col">
                <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-2">Your health</h2>
                <p className="text-sm font-light text-[#8E7D82] mb-6">Select any that apply. This helps Luna calibrate predictions for you.</p>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1">
                  {CONDITIONS.map((cond) => {
                    const isSelected = selectedConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleCondition(cond.id)}
                        className={`w-full text-left rounded-2xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? "border-[#FFB5C0]/60 bg-[#FFDDE0]/20 shadow-[0_4px_12px_rgba(255,181,192,0.1)]"
                            : "border-[#FFDDE0]/30 bg-[#FFF9F9] hover:border-[#FFDDE0]/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-[#FFB5C0] bg-[#FFB5C0]" : "border-[#FFDDE0]/60"
                          }`}>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#6D5A60]">{cond.label}</p>
                            <p className="text-[10px] font-light text-[#8E7D82]">{cond.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl bg-[#FBE6B6]/15 border border-[#FBE6B6]/30 p-4">
                  <p className="text-[11px] font-light text-[#8E7D82] leading-relaxed">
                    <span className="font-semibold text-[#FBE6B6]">Transparency note:</span> Luna&apos;s predictions are most precise for regular menstrual cycles. Conditions like PCOS, PCOD, endometriosis, or thyroid issues can cause irregular patterns that may reduce prediction accuracy. <span className="text-[#6D5A60]">Everyone is welcome here</span> — Luna will still do its best to learn your unique rhythm over time.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Push Notifications */}
            {step === 3 && (
              <motion.div key="notifications" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#D6CBE3]/20 flex items-center justify-center text-2xl mb-8">
                  🔔
                </div>
                <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-3">Stay in the loop</h2>
                <p className="text-sm font-light text-[#8E7D82] leading-relaxed max-w-sm mb-8">
                  Get gentle reminders for period predictions, ovulation alerts, and symptom check-ins — like a friend who remembers so you don&apos;t have to.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className={`w-full h-14 rounded-2xl text-[11px] font-semibold uppercase tracking-widest transition duration-300 ${
                      pushEnabled
                        ? "bg-[#D6CBE3]/20 border border-[#D6CBE3]/40 text-[#6D5A60]"
                        : "bg-[#6D5A60] text-white shadow-[0_16px_32px_rgba(109,90,96,0.2)] hover:bg-[#8E7D82]"
                    }`}
                  >
                    {pushEnabled ? "✓ Notifications enabled" : "Enable notifications"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="w-full h-12 rounded-2xl text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] transition hover:text-[#6D5A60]"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Algorithm Walkthrough (skippable) */}
            {step === 4 && (
              <motion.div key="algorithm" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-2xl font-light text-[#6D5A60]">How Luna works</h2>
                    <p className="text-[10px] font-light text-[#8E7D82]">The algorithm behind your predictions</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] hover:text-[#6D5A60] transition-colors"
                  >
                    Skip →
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={algoStep}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="text-center py-8"
                    >
                      <div className="text-4xl mb-4">{algoSteps[algoStep].emoji}</div>
                      <h3 className="font-serif text-xl font-light text-[#6D5A60] mb-3">
                        {algoSteps[algoStep].title}
                      </h3>
                      <p className="text-sm font-light text-[#8E7D82] leading-relaxed max-w-sm mx-auto">
                        {algoSteps[algoStep].desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-2 mt-6">
                    {algoSteps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAlgoStep(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === algoStep ? "w-8 bg-[#FFB5C0]" : "w-2 bg-[#FFDDE0]/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#FFDDE0]/20">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] hover:text-[#6D5A60] transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0) {
                    setStep(1);
                  } else if (step === 1) {
                    // Can proceed without OTP verification, but encourage it
                    setStep(2);
                  } else if (step === 2) {
                    setStep(3);
                  } else if (step === 3) {
                    setStep(4);
                  }
                }}
                disabled={isSubmitting}
                className="h-12 px-8 rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82] disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="h-12 px-8 rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82] disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Start tracking →"
                )}
              </button>
            )}
          </div>

          {/* Step counter */}
          <p className="text-center text-[10px] text-[#8E7D82]/40 mt-4">
            {step + 1} of {totalSteps}
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] font-light text-[#8E7D82]/40">
          You can re-run onboarding from your account settings anytime
        </p>
      </div>
    </div>
  );
}
