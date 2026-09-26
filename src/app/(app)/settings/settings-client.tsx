"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppTabBar from "@/components/AppTabBar";
import { normalizeUserPlan } from "@/lib/theme/accent";
import {
  CONDITIONS,
  canonicalZone,
  deviceTimeZone,
  localIsoDate,
  normalizeConditions,
  perimenoStageFor,
  timeZoneOptions,
  toggleCondition,
  type PerimenoStage,
} from "./options";
import {
  Chip,
  Field,
  SaveRow,
  Section,
  describedBy,
  inputClass,
  labelClass,
  secondaryButtonClass,
  type SaveState,
} from "./settings-ui";

const PLAN_INFO = {
  free: {
    label: "Luna Free",
    subtitle: "Your account and preferences, in one place.",
    description: "A focused layout with your calendar first. All Luna features are included.",
  },
  premium: {
    label: "Luna Premium",
    subtitle: "A comfortable place to tune your Luna experience.",
    description:
      "A guided layout and a warmer companion. The same tools and cycle data are available on every plan.",
  },
  "premium+": {
    label: "Luna Premium+",
    subtitle: "Your space, your preferences.",
    description:
      "A spacious, reflective layout and Luna's gentlest voice. The same tools and cycle data are available on every plan.",
  },
} as const;

const SECTION_LINKS = [
  ["profile", "Profile"],
  ["cycle", "Cycle"],
  ["notifications", "Notifications"],
  ["security", "Password"],
  ["plan", "Plan"],
  ["onboarding", "Onboarding"],
  ["account-actions", "Account"],
] as const;

const MAX_DOB_EDITS = 2;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserProfile {
  name: string | null;
  email: string;
  timezone: string;
  dateOfBirth: string | null;
  conditions: string[] | null;
  perimenoStage: PerimenoStage | null;
  pushNotificationsEnabled: boolean;
  weekStart: number;
  plan: string;
  dobEditCount: number;
}

type SectionKey = "profile" | "cycle" | "notifications" | "password";
type Status = { state: SaveState; message?: string };
const IDLE: Status = { state: "idle" };

export default function SettingsPageClient() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Cycle preferences
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [savedDob, setSavedDob] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [savedTimezone, setSavedTimezone] = useState("");
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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [status, setStatus] = useState<Record<SectionKey, Status>>({
    profile: IDLE,
    cycle: IDLE,
    notifications: IDLE,
    password: IDLE,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Load profile data (bump reloadKey to retry)
  const [reloadKey, setReloadKey] = useState(0);
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
        setSavedTimezone(data.timezone || "Asia/Kolkata");
        setWeekStart(data.weekStart ?? 1);
        setDateOfBirth(data.dateOfBirth || "");
        setSavedDob(data.dateOfBirth || "");
        setSelectedConditions(
          normalizeConditions(Array.isArray(data.conditions) ? data.conditions : [], data.perimenoStage),
        );
        setPushEnabled(data.pushNotificationsEnabled ?? false);
        setPlan(data.plan || "free");
        setDobEditCount(data.dobEditCount ?? 0);
        setLoadState("ready");
      } catch (err) {
        // Never show the form on defaults: saving them would overwrite real data
        console.error("Failed to load profile:", err);
        setLoadState("error");
      }
    };

    loadProfile();
  }, [authStatus, reloadKey]);

  // Built from the loaded zone so it stays in the list after picking another
  const timeZones = useMemo(
    () => (loadState === "ready" ? timeZoneOptions(savedTimezone) : []),
    [loadState, savedTimezone],
  );
  const deviceZone = useMemo(() => {
    const zone = loadState === "ready" ? deviceTimeZone() : null;
    // Same zone under V8's legacy name (Asia/Calcutta): use the saved spelling, which is the listed one
    return zone && canonicalZone(zone) === canonicalZone(savedTimezone) ? savedTimezone : zone;
  }, [loadState, savedTimezone]);

  /** Replace the errors for `ids`; focus the first invalid field. Returns true if any. */
  const applyErrors = (ids: string[], next: Record<string, string>) => {
    setErrors((prev) => {
      const kept = Object.fromEntries(Object.entries(prev).filter(([k]) => !ids.includes(k)));
      return { ...kept, ...next };
    });
    const first = ids.find((id) => next[id]);
    // Next frame, so aria-describedby already points at the error when focus lands
    if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
    return Boolean(first);
  };

  const clearError = (id: string) =>
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });

  const save = useCallback(async (key: SectionKey, fields: Record<string, unknown>) => {
    setStatus((prev) => ({ ...prev, [key]: { state: "saving" } }));
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus((prev) => ({
          ...prev,
          [key]: { state: "error", message: data.error || "Something went wrong. Please try again." },
        }));
        return false;
      }
      setStatus((prev) => ({ ...prev, [key]: { state: "saved" } }));
      if (data.user) {
        setDobEditCount(data.user.dobEditCount ?? 0);
        setSavedDob(data.user.dateOfBirth || "");
      }
      setTimeout(
        () => setStatus((prev) => (prev[key].state === "saved" ? { ...prev, [key]: IDLE } : prev)),
        2500,
      );
      return true;
    } catch {
      setStatus((prev) => ({
        ...prev,
        [key]: { state: "error", message: "Network error. Please try again." },
      }));
      return false;
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next["s-name"] = "Add a name so Luna knows what to call you.";
    if (!EMAIL_RE.test(email.trim())) next["s-email"] = "That email doesn't look quite right.";
    if (applyErrors(["s-name", "s-email"], next)) return;
    save("profile", { name: name.trim(), email: email.trim() });
  };

  const handleSaveCycle = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (dateOfBirth && dateOfBirth > localIsoDate()) next["s-dob"] = "That date is in the future.";
    else if (dateOfBirth && dateOfBirth < "1900-01-01") next["s-dob"] = "Please check the year.";
    if (applyErrors(["s-dob"], next)) return;
    save("cycle", {
      // An empty string fails the API's date check, so leave it out instead
      dateOfBirth: dateOfBirth || undefined,
      timezone,
      weekStart,
      conditions: selectedConditions,
      perimenoStage: perimenoStageFor(selectedConditions),
    });
  };

  const handleSaveNotif = (e: React.FormEvent) => {
    e.preventDefault();
    save("notifications", { pushNotificationsEnabled: pushEnabled });
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!currentPassword) next["s-current-password"] = "Enter your current password.";
    if (newPassword.length < 6) next["s-new-password"] = "Use at least 6 characters.";
    else if (newPassword.length > 128) next["s-new-password"] = "Keep it under 128 characters.";
    if (confirmPassword !== newPassword) next["s-confirm-password"] = "These don't match yet.";
    if (applyErrors(["s-current-password", "s-new-password", "s-confirm-password"], next)) return;
    const ok = await save("password", { passwordChange: { currentPassword, newPassword } });
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const tier = normalizeUserPlan(plan);

  if (authStatus === "loading" || (authStatus === "authenticated" && loadState !== "ready")) {
    return (
      <div className="tier-app tier-settings font-sans" data-plan={tier}>
        <main className="flex min-h-dvh items-center justify-center px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {loadState === "error" ? (
            <div role="alert" className="max-w-sm text-center">
              <p className="font-serif text-3xl leading-tight">We couldn&apos;t load your settings.</p>
              <p className="mt-2 text-sm text-[var(--tier-muted)]">
                Nothing was changed. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoadState("loading");
                  setReloadKey((k) => k + 1);
                }}
                className="tier-primary-action mt-6 px-7"
              >
                Try again
              </button>
            </div>
          ) : (
            <div role="status" className="flex flex-col items-center gap-3 text-sm text-[var(--tier-muted)]">
              <span className="size-6 animate-spin rounded-full border-2 border-[var(--tier-line)] border-t-[var(--tier-ink)] motion-reduce:animate-none" />
              Loading your settings...
            </div>
          )}
        </main>
        <AppTabBar />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;

  const currentPlan = PLAN_INFO[tier];
  const dobLocked = Boolean(savedDob) && dobEditCount >= MAX_DOB_EDITS;
  const dobEditsLeft = Math.max(0, MAX_DOB_EDITS - dobEditCount);
  const dobHint = dobLocked
    ? "This can't be changed again here. Contact support if it needs fixing."
    : savedDob
      ? `You can change this ${dobEditsLeft} more time${dobEditsLeft === 1 ? "" : "s"}.`
      : "Once saved, you can change it twice.";
  const today = localIsoDate();

  const sections = (
    <>
      {/* Profile */}
      <Section id="profile" tier={tier} title="Profile" description="How Luna knows you.">
        <form onSubmit={handleSaveProfile} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="s-name" label="Name" error={errors["s-name"]}>
              <input
                {...describedBy("s-name", errors["s-name"])}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("s-name");
                }}
                className={inputClass}
                placeholder="Your name"
              />
            </Field>
            <Field
              id="s-email"
              label="Email"
              error={errors["s-email"]}
              hint="Changing it may need a fresh verification."
            >
              <input
                {...describedBy("s-email", errors["s-email"], true)}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("s-email");
                }}
                className={inputClass}
                placeholder="you@example.com"
              />
            </Field>
          </div>
          <SaveRow label="Save profile" state={status.profile.state} message={status.profile.message} />
        </form>
      </Section>

      {/* Cycle preferences */}
      <Section id="cycle" tier={tier} title="Cycle preferences" description="Context that shapes your calendar and predictions.">
        <form onSubmit={handleSaveCycle} noValidate className="space-y-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="s-dob" label="Date of birth" error={errors["s-dob"]} hint={dobHint}>
              <input
                {...describedBy("s-dob", errors["s-dob"], dobHint)}
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                max={today}
                disabled={dobLocked}
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  clearError("s-dob");
                }}
                className={inputClass}
              />
            </Field>

            <Field
              id="s-timezone"
              label="Timezone"
              hint={
                deviceZone && canonicalZone(deviceZone) !== canonicalZone(timezone) ? (
                  <>
                    Your device is on {deviceZone.replace(/_/g, " ")}.{" "}
                    <button
                      type="button"
                      onClick={() => setTimezone(deviceZone)}
                      className="inline-flex min-h-11 items-center font-semibold text-[var(--tier-ink)] underline decoration-[color:var(--tier-accent)] decoration-2 underline-offset-4"
                    >
                      Use it
                    </button>
                  </>
                ) : (
                  "Sets when your day starts in Luna."
                )
              }
            >
              <div className="relative">
                <select
                  {...describedBy("s-timezone", undefined, true)}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={`${inputClass} cursor-pointer appearance-none truncate pr-11`}
                >
                  {timeZones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--tier-muted)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </Field>
          </div>

          <fieldset>
            <legend className={labelClass}>Week starts on</legend>
            <div className="inline-flex rounded-full border border-[var(--tier-line)] bg-[var(--tier-bg)] p-1">
              {(
                [
                  [0, "Sunday"],
                  [1, "Monday"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={weekStart === value}
                  onClick={() => setWeekStart(value)}
                  className="min-h-11 rounded-full px-5 text-sm font-semibold text-[var(--tier-muted)] transition-colors duration-150 hover:text-[var(--tier-ink)] aria-pressed:bg-[var(--tier-ink)] aria-pressed:text-[var(--tier-surface)]"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Health context</legend>
            <p className="-mt-1 mb-3 text-sm text-[var(--tier-muted)]">
              Choose any that apply. Luna adjusts its estimates to match.
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CONDITIONS.map((c) => (
                <Chip
                  key={c.id}
                  pressed={selectedConditions.includes(c.id)}
                  onClick={() => setSelectedConditions((prev) => toggleCondition(prev, c.id))}
                  label={c.label}
                  description={c.description}
                />
              ))}
            </div>
          </fieldset>

          <SaveRow label="Save preferences" state={status.cycle.state} message={status.cycle.message} />
        </form>
      </Section>

      {/* Notifications */}
      <Section id="notifications" tier={tier} title="Notifications" description="Gentle nudges, when they arrive.">
        <form onSubmit={handleSaveNotif} noValidate>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p id="s-push-label" className="text-base text-[var(--tier-ink)]">
                Push notifications
              </p>
              <p id="s-push-hint" className="mt-0.5 text-sm text-[var(--tier-muted)]">
                Coming soon. Luna will send gentle reminders.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pushEnabled}
              aria-labelledby="s-push-label"
              aria-describedby="s-push-hint"
              onClick={() => setPushEnabled((v) => !v)}
              className="inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-full"
            >
              <span
                aria-hidden
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                  pushEnabled
                    ? "bg-[var(--tier-ink)]"
                    : "bg-[var(--tier-tint)] ring-1 ring-inset ring-[color:var(--tier-muted)]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 size-6 rounded-full shadow-sm transition-transform duration-200 ${
                    pushEnabled ? "translate-x-5 bg-[var(--tier-surface)]" : "bg-[var(--tier-muted)]"
                  }`}
                />
              </span>
            </button>
          </div>
          <SaveRow label="Save" state={status.notifications.state} message={status.notifications.message} />
        </form>
      </Section>

      {/* Password */}
      <Section id="security" tier={tier} title="Password" description="Change the password you sign in with.">
        <form onSubmit={handleSavePassword} noValidate>
          {/* Lets password managers attach the new password to the right account */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="s-current-password" label="Current password" error={errors["s-current-password"]} className="sm:col-span-2">
              <input
                {...describedBy("s-current-password", errors["s-current-password"])}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  clearError("s-current-password");
                }}
                className={inputClass}
              />
            </Field>
            <Field
              id="s-new-password"
              label="New password"
              error={errors["s-new-password"]}
              hint="At least 6 characters."
            >
              <input
                {...describedBy("s-new-password", errors["s-new-password"], true)}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearError("s-new-password");
                }}
                className={inputClass}
              />
            </Field>
            <Field id="s-confirm-password" label="Confirm new password" error={errors["s-confirm-password"]}>
              <input
                {...describedBy("s-confirm-password", errors["s-confirm-password"])}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError("s-confirm-password");
                }}
                className={inputClass}
              />
            </Field>
          </div>
          <SaveRow
            label="Change password"
            busyLabel="Changing..."
            savedLabel="Password updated"
            state={status.password.state}
            message={status.password.message}
          >
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center text-sm text-[var(--tier-muted)] underline-offset-4 transition-colors hover:text-[var(--tier-ink)] hover:underline sm:ml-auto"
            >
              Forgot password?
            </Link>
          </SaveRow>
        </form>
      </Section>

      {/* Plan */}
      <Section id="plan" tier={tier} title="Plan" description="Every plan has the same tools and cycle data.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center rounded-full bg-[var(--tier-tint)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tier-ink)]">
              {currentPlan.label}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--tier-muted)]">{currentPlan.description}</p>
          </div>
          {tier === "free" && (
            <Link href="/#pricing" className={secondaryButtonClass}>
              Upgrade
            </Link>
          )}
        </div>
      </Section>

      {/* Onboarding */}
      <Section id="onboarding" tier={tier} title="Onboarding" description="Walk through the welcome steps again.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm leading-relaxed text-[var(--tier-muted)]">
            Revisit setup to update your details and re-verify your email.
          </p>
          <Link href="/onboarding" className={secondaryButtonClass}>
            Redo onboarding
          </Link>
        </div>
      </Section>
    </>
  );

  const accountSection = (
    <Section id="account-actions" tier={tier} danger title="Account" description="Kept apart so nothing here happens by accident.">
      <div className="divide-y divide-[var(--tier-line)]">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base text-[var(--tier-ink)]">
              {confirmSignOut ? "Sign out on this device?" : "Sign out"}
            </p>
            <p className="mt-0.5 text-sm text-[var(--tier-muted)]">Your cycles stay saved. Sign back in anytime.</p>
          </div>
          {confirmSignOut ? (
            <div role="group" aria-label="Confirm sign out" className="flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={() => setConfirmSignOut(false)} className={secondaryButtonClass}>
                Stay signed in
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#9E4A63] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#86394F]"
              >
                Yes, sign out
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmSignOut(true)} className={secondaryButtonClass}>
              Sign out
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base text-[var(--tier-ink)]">Delete account</p>
            <p className="mt-0.5 text-sm text-[var(--tier-muted)]">
              Coming soon. Until then, ask Luna in chat to export your data.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-[var(--tier-line)] px-5 text-sm font-semibold text-[var(--tier-muted)]"
          >
            Coming soon
          </button>
        </div>
      </div>
    </Section>
  );

  return (
    <div className="tier-app tier-settings font-sans" data-plan={tier}>
      <main
        className={`mx-auto w-full min-w-0 px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-10 md:pt-14 md:pb-16 ${
          tier === "free" ? "max-w-3xl" : "max-w-6xl"
        }`}
      >
        {/* Header */}
        <header className="mb-8 flex items-start gap-4 sm:mb-12">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-full border border-[var(--tier-line)] text-[var(--tier-ink)] transition-colors hover:bg-[var(--tier-tint)] md:flex"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tier-muted)]">
              <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
                <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
              </svg>
              {currentPlan.label}
            </p>
            <h1 className="mt-2 font-serif text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl">Settings</h1>
            <p className="mt-2 text-base text-[var(--tier-muted)]">{currentPlan.subtitle}</p>
          </div>
        </header>

        {tier === "premium+" && (
          <div className="mb-10 grid gap-4 border-y border-[var(--tier-line)] py-8 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)] md:gap-10">
            <p className="max-w-[20ch] font-serif text-3xl leading-tight sm:text-4xl">
              Make Luna feel like your own quiet space.
            </p>
            <p className="self-end text-sm leading-relaxed text-[var(--tier-muted)]">
              Update your details, cycle context, and account at your own pace. Each change stays under your control.
            </p>
          </div>
        )}

        <div className={tier === "premium" ? "lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10" : ""}>
          {tier === "premium" && (
            <nav
              aria-label="Settings sections"
              className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-10 md:px-10 lg:sticky lg:top-8 lg:mx-0 lg:mb-0 lg:flex-col lg:gap-1 lg:self-start lg:overflow-visible lg:px-0"
            >
              {SECTION_LINKS.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex min-h-11 shrink-0 items-center rounded-full border border-[var(--tier-line)] px-4 text-sm text-[var(--tier-muted)] transition-colors hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)] lg:border-transparent"
                >
                  {label}
                </a>
              ))}
            </nav>
          )}
          <div className="min-w-0">
            <div className="space-y-5 sm:space-y-6">{sections}</div>
            <div className="mt-10 sm:mt-14">{accountSection}</div>
          </div>
        </div>
      </main>
      <AppTabBar />
    </div>
  );
}
