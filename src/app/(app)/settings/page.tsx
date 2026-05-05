"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ──────────────────────────────────────────────────────────────
   Constants
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
  {
    id: "endometriosis",
    label: "Endometriosis",
    description: "Tissue grows outside the uterus",
  },
  {
    id: "thyroid",
    label: "Thyroid condition",
    description: "Hypo- or hyperthyroidism",
  },
  {
    id: "hormonal_bc",
    label: "On hormonal birth control",
    description: "Pill, IUD, implant, etc.",
  },
  {
    id: "irregular",
    label: "Irregular cycles",
    description: "Unpredictable cycle length",
  },
  {
    id: "perimenopause",
    label: "Perimenopause / Menopause",
    description: "Transitioning or post",
  },
  { id: "none", label: "None of these", description: "No known conditions" },
];

const PLAN_INFO: Record<string, { label: string; description: string }> = {
  free: {
    label: "Luna Free",
    description:
      "NLP cycle logging, predictions, dashboard, calendar, and web search.",
  },
  premium: {
    label: "Luna Premium",
    description:
      "Everything in Free, plus a softer companion, image understanding, deeper reasoning, and push notifications.",
  },
  "premium+": {
    label: "Luna Premium+",
    description:
      "Everything in Premium, plus the most capable model and priority access to new features.",
  },
};

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

interface UserProfile {
  name: string | null;
  email: string;
  timezone: string;
  dateOfBirth: string | null;
  conditions: string[] | null;
  pushNotificationsEnabled: boolean;
  weekStart: number;
  plan: string;
  dobEditCount: number;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/* ──────────────────────────────────────────────────────────────
   Settings Page
   ────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Cycle preferences
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [weekStart, setWeekStart] = useState(1);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  // Notifications
  const [pushEnabled, setPushEnabled] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Plan
  const [plan, setPlan] = useState("free");
  const [dobEditCount, setDobEditCount] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<SaveStatus>("idle");
  const [cycleStatus, setCycleStatus] = useState<SaveStatus>("idle");
  const [notifStatus, setNotifStatus] = useState<SaveStatus>("idle");
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Redirect unauthenticated users
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Load profile data
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data: UserProfile = await res.json();

        setName(data.name || "");
        setEmail(data.email);
        setTimezone(data.timezone || "Asia/Kolkata");
        setWeekStart(data.weekStart ?? 1);
        setDateOfBirth(data.dateOfBirth || "");
        setSelectedConditions(
          Array.isArray(data.conditions) ? data.conditions : [],
        );
        setPushEnabled(data.pushNotificationsEnabled ?? false);
        setPlan(data.plan || "free");
        setDobEditCount(data.dobEditCount ?? 0);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [authStatus]);

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

  // Generic save helper
  const saveSection = useCallback(
    async (
      fields: Record<string, unknown>,
      setStatus: (s: SaveStatus) => void,
      setError: (e: string) => void,
    ) => {
      setStatus("saving");
      setError("");
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Something went wrong.");
          return;
        }
        setStatus("saved");
        if (data.user) {
          setDobEditCount(data.user.dobEditCount ?? 0);
        }
        setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setStatus("error");
        setError("Network error. Please try again.");
      }
    },
    [],
  );

  const handleSaveProfile = () =>
    saveSection({ name, email }, setProfileStatus, setErrorMsg);

  const handleSaveCycle = () =>
    saveSection(
      { dateOfBirth, timezone, weekStart, conditions: selectedConditions },
      setCycleStatus,
      setErrorMsg,
    );

  const handleSaveNotif = () =>
    saveSection(
      { pushNotificationsEnabled: pushEnabled },
      setNotifStatus,
      setErrorMsg,
    );

  const handleSavePassword = () => {
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    saveSection(
      { passwordChange: { currentPassword, newPassword } },
      setPasswordStatus,
      setPasswordError,
    );
  };

  // Re-do onboarding
  const handleRedoOnboarding = () => {
    router.push("/onboarding");
  };

  // Loading state
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9F9] flex items-center justify-center selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
        <div className="w-6 h-6 border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0] rounded-full animate-spin" />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;

  const currentPlan = PLAN_INFO[plan] || PLAN_INFO.free;
  const maxDobEdits = 2;
  const dobEditsRemaining = dateOfBirth
    ? maxDobEdits - dobEditCount
    : maxDobEdits;

  return (
    <div className="min-h-screen bg-[#FFF9F9] text-[#8E7D82] font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FFDDE0]/60 text-[#8E7D82] transition hover:bg-[#FFF5F7] hover:text-[#6D5A60] shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light text-[#6D5A60] tracking-tight">
              Settings
            </h1>
            <p className="text-sm font-light text-[#8E7D82]">
              Manage your account and preferences
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Profile ─────────────────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
              Profile
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="you@example.com"
                />
                <p className="mt-1.5 text-[11px] font-light text-[#8E7D82]/40 ml-1">
                  Changing your email may require re-verification.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileStatus === "saving"}
                className="h-12 rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer"
              >
                {profileStatus === "saving" ? "Saving..." : "Save profile"}
              </button>
              {profileStatus === "saved" && (
                <span className="text-[11px] font-light text-[#D6CBE3]">
                  Saved ✓
                </span>
              )}
              {profileStatus === "error" && errorMsg && (
                <span className="text-[11px] font-light text-[#FFB5C0]">
                  {errorMsg}
                </span>
              )}
            </div>
          </section>

          {/* ── Cycle Preferences ───────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
              Cycle preferences
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                />
                {dateOfBirth && (
                  <p className="mt-1.5 text-[11px] font-light text-[#8E7D82]/40 ml-1">
                    {dobEditsRemaining > 0
                      ? `${dobEditsRemaining} edit${dobEditsRemaining !== 1 ? "s" : ""} remaining`
                      : "No edits remaining — contact support to change"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Week starts on
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setWeekStart(0)}
                    className={`h-11 rounded-full px-6 text-[10px] font-semibold uppercase tracking-widest transition cursor-pointer ${
                      weekStart === 0
                        ? "bg-[#6D5A60] text-white shadow-[0_8px_16px_rgba(109,90,96,0.2)]"
                        : "border border-[#FFDDE0]/60 text-[#6D5A60] hover:bg-[#FFF5F7]"
                    }`}
                  >
                    Sunday
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekStart(1)}
                    className={`h-11 rounded-full px-6 text-[10px] font-semibold uppercase tracking-widest transition cursor-pointer ${
                      weekStart === 1
                        ? "bg-[#6D5A60] text-white shadow-[0_8px_16px_rgba(109,90,96,0.2)]"
                        : "border border-[#FFDDE0]/60 text-[#6D5A60] hover:bg-[#FFF5F7]"
                    }`}
                  >
                    Monday
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-3 ml-1">
                  Health conditions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONDITIONS.map((c) => {
                    const isSelected = selectedConditions.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCondition(c.id)}
                        className={`text-left rounded-2xl border px-5 py-4 transition cursor-pointer ${
                          isSelected
                            ? "border-[#FFB5C0]/60 bg-[#FFEEF1]/50"
                            : "border-[#FFDDE0]/30 bg-[#FFF9F9] hover:border-[#FFDDE0]/60"
                        }`}
                      >
                        <p
                          className={`text-sm font-light ${isSelected ? "text-[#6D5A60]" : "text-[#8E7D82]"}`}
                        >
                          {c.label}
                        </p>
                        <p className="text-[11px] font-light text-[#8E7D82]/50 mt-0.5">
                          {c.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveCycle}
                disabled={cycleStatus === "saving"}
                className="h-12 rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer"
              >
                {cycleStatus === "saving" ? "Saving..." : "Save preferences"}
              </button>
              {cycleStatus === "saved" && (
                <span className="text-[11px] font-light text-[#D6CBE3]">
                  Saved ✓
                </span>
              )}
              {cycleStatus === "error" && errorMsg && (
                <span className="text-[11px] font-light text-[#FFB5C0]">
                  {errorMsg}
                </span>
              )}
            </div>
          </section>

          {/* ── Notifications ───────────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
              Notifications
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-[#6D5A60]">
                  Push notifications
                </p>
                <p className="text-[11px] font-light text-[#8E7D82]/50 mt-0.5">
                  Coming soon — Luna will send gentle reminders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`relative h-7 w-12 rounded-full transition-colors cursor-pointer ${
                  pushEnabled ? "bg-[#D6CBE3]" : "bg-[#FFDDE0]/60"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    pushEnabled ? "translate-x-[20px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveNotif}
                disabled={notifStatus === "saving"}
                className="h-12 rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer"
              >
                {notifStatus === "saving" ? "Saving..." : "Save"}
              </button>
              {notifStatus === "saved" && (
                <span className="text-[11px] font-light text-[#D6CBE3]">
                  Saved ✓
                </span>
              )}
            </div>
          </section>

          {/* ── Password ────────────────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
              Password
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            {passwordError && (
              <p className="mt-4 text-[11px] font-light text-[#FFB5C0]">
                {passwordError}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={passwordStatus === "saving"}
                className="h-12 rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] disabled:opacity-50 cursor-pointer"
              >
                {passwordStatus === "saving"
                  ? "Changing..."
                  : "Change password"}
              </button>
              {passwordStatus === "saved" && (
                <span className="text-[11px] font-light text-[#D6CBE3]">
                  Password updated ✓
                </span>
              )}
              <Link
                href="/forgot-password"
                className="text-[11px] font-light text-[#8E7D82] hover:text-[#FFB5C0] transition-colors ml-2"
              >
                Forgot password?
              </Link>
            </div>
          </section>

          {/* ── Plan ────────────────────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-6">
              Plan
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-[#6D5A60]">
                  {currentPlan.label}
                </p>
                <p className="text-[11px] font-light text-[#8E7D82]/60 mt-0.5 max-w-md">
                  {currentPlan.description}
                </p>
              </div>
              {plan === "free" && (
                <Link
                  href="/#pricing"
                  className="h-11 rounded-full border border-[#FFDDE0]/60 px-6 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] inline-flex items-center shrink-0"
                >
                  Upgrade
                </Link>
              )}
            </div>
          </section>

          {/* ── Onboarding ──────────────────────────── */}
          <section className="rounded-[2.5rem] border border-white/60 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-4">
              Onboarding
            </h2>
            <p className="text-sm font-light text-[#8E7D82] mb-6">
              Want to revisit the setup flow? You can go through onboarding
              again to update your preferences and re-verify your email.
            </p>
            <button
              type="button"
              onClick={handleRedoOnboarding}
              className="h-12 rounded-full border border-[#D6CBE3]/60 px-8 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#D6CBE3]/10 cursor-pointer"
            >
              Redo onboarding
            </button>
          </section>

          {/* ── Danger Zone ─────────────────────────── */}
          <section className="rounded-[2.5rem] border border-[#FFB5C0]/30 bg-white/50 p-8 shadow-[0_20px_40px_rgba(255,181,192,0.04)] backdrop-blur-xl">
            <h2 className="font-serif text-2xl font-light text-[#FFB5C0] mb-6">
              Danger zone
            </h2>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  import("next-auth/react").then(({ signOut }) =>
                    signOut({ callbackUrl: "/login" }),
                  );
                }}
                className="h-12 rounded-full border border-[#FFDDE0]/60 px-8 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] cursor-pointer"
              >
                Sign out
              </button>

              <div>
                <button
                  type="button"
                  disabled
                  className="h-12 rounded-full border border-[#FFB5C0]/30 px-8 text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0]/50 cursor-not-allowed"
                >
                  Delete account — coming soon
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer spacing */}
        <div className="h-10" />
      </div>
    </div>
  );
}
