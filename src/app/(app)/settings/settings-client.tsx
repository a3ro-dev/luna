"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MotionConfig } from "motion/react";
import { Bell, ChevronLeft, Download, Gem, Heart, Lock, LogOut, Moon, SunMoon, User } from "lucide-react";
import AppTabBar from "@/components/AppTabBar";
import { LargeTitle } from "@/components/apple/LargeTitle";
import { GroupedRow, GroupedSection, RowIcon } from "@/components/apple/Grouped";
import { Segmented } from "@/components/apple/Segmented";
import { Sheet } from "@/components/apple/Sheet";
import ThemeToggle from "@/components/ThemeToggle";
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
  ButtonRow,
  CheckRow,
  ControlRow,
  IdentityCard,
  InputRow,
  PickerRow,
  SaveRow,
  StatusText,
  Switch,
  describedBy,
  inputClass,
  pickerSelectClass,
  plainButton,
  primaryButton,
  rowClass,
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
  // No subtitle: Premium+'s serif line is the screen's one display moment.
  "premium+": {
    label: "Luna Premium+",
    description:
      "A spacious, reflective layout and Luna's gentlest voice. The same tools and cycle data are available on every plan.",
  },
} as const;

// Icon tiles appear only in Premium's sidebar source list, where they act as
// navigation, like System Settings; grouped lists stay text-only so every row
// in a group lines up. Two token tones keep them calm and let dark mode restyle
// them. The glyph takes the surface colour (RowIcon defaults to white).
const TINT = "var(--tint)";
const QUIET = "var(--tier-muted)";
const G = { className: "size-4 text-[var(--tier-surface)]", strokeWidth: 2.25 } as const;
const PANES = [
  { key: "profile", label: "Profile", color: TINT, icon: <User {...G} /> },
  { key: "cycle", label: "Cycle", color: TINT, icon: <Moon {...G} fill="currentColor" /> },
  { key: "health", label: "Health context", color: TINT, icon: <Heart {...G} fill="currentColor" /> },
  { key: "appearance", label: "Appearance", color: QUIET, icon: <SunMoon {...G} /> },
  { key: "notifications", label: "Notifications", color: TINT, icon: <Bell {...G} /> },
  { key: "password", label: "Password", color: QUIET, icon: <Lock {...G} /> },
  { key: "plan", label: "Plan", color: TINT, icon: <Gem {...G} /> },
  { key: "data", label: "Data", color: QUIET, icon: <Download {...G} /> },
  { key: "account", label: "Account", color: QUIET, icon: <LogOut {...G} /> },
] as const;
type PaneKey = (typeof PANES)[number]["key"];

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

type SectionKey = "profile" | "cycle" | "health" | "notifications" | "password";
type Status = { state: SaveState; message?: string };
const IDLE: Status = { state: "idle" };

export default function SettingsPageClient() {
  return (
    <MotionConfig reducedMotion="user">
      <Settings />
    </MotionConfig>
  );
}

function Settings() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  // Profile (the header shows the saved account, never unsaved typing)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState({ name: "", email: "" });
  // The last values the server confirmed; a failed instant change returns to these.
  const confirmed = useRef<UserProfile | null>(null);

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
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Plan
  const [plan, setPlan] = useState("free");
  const [dobEditCount, setDobEditCount] = useState(0);

  // UI state
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [status, setStatus] = useState<Record<SectionKey, Status>>({
    profile: IDLE,
    cycle: IDLE,
    health: IDLE,
    notifications: IDLE,
    password: IDLE,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  // Premium's desktop source list shows one pane at a time, like System Settings.
  const [pane, setPane] = useState<PaneKey>("profile");

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

        confirmed.current = data;
        setAccount({ name: data.name || "", email: data.email });
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
        confirmed.current = data.user;
        setAccount({ name: data.user.name || "", email: data.user.email });
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

  // Only the typed fields (name, email, birthday) wait for Save.
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next["s-name"] = "Add a name so Luna knows what to call you.";
    if (!EMAIL_RE.test(email.trim())) next["s-email"] = "That email doesn't look quite right.";
    if (dateOfBirth && dateOfBirth > localIsoDate()) next["s-dob"] = "That date is in the future.";
    else if (dateOfBirth && dateOfBirth < "1900-01-01") next["s-dob"] = "Please check the year.";
    if (applyErrors(["s-name", "s-email", "s-dob"], next)) return;
    save("profile", {
      name: name.trim(),
      email: email.trim(),
      // An empty string fails the API's date check, so leave it out instead
      dateOfBirth: dateOfBirth || undefined,
    });
  };

  // Pickers, switches and checkmarks apply at once, as in iOS Settings. Requests
  // go out one at a time so the last tap wins on the server; if the latest change
  // to a field fails, the control returns to the value the server last confirmed.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<Record<string, number>>({});
  const applyNow = (
    key: SectionKey,
    fields: Record<string, unknown>,
    restore: (saved: UserProfile) => void,
  ) => {
    const field = Object.keys(fields).join();
    const n = (latest.current[field] = (latest.current[field] ?? 0) + 1);
    queue.current = queue.current.then(async () => {
      if (!(await save(key, fields)) && latest.current[field] === n && confirmed.current) {
        restore(confirmed.current);
      }
    });
  };

  const changeZone = (zone: string) => {
    setTimezone(zone);
    applyNow("cycle", { timezone: zone }, (s) => setTimezone(s.timezone || "Asia/Kolkata"));
  };

  const changeWeekStart = (value: string) => {
    setWeekStart(Number(value));
    applyNow("cycle", { weekStart: Number(value) }, (s) => setWeekStart(s.weekStart ?? 1));
  };

  // Conditions are the only settings the forecast reads, and the API refreshes it when they arrive.
  const toggleHealth = (id: string) => {
    const next = toggleCondition(selectedConditions, id);
    setSelectedConditions(next);
    applyNow("health", { conditions: next, perimenoStage: perimenoStageFor(next) }, (s) =>
      setSelectedConditions(normalizeConditions(s.conditions ?? [], s.perimenoStage)),
    );
  };

  const togglePush = () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    applyNow("notifications", { pushNotificationsEnabled: next }, (s) =>
      setPushEnabled(s.pushNotificationsEnabled ?? false),
    );
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordChanged) return;
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
      // The server ends every session when the password changes; leave time to read why.
      setPasswordChanged(true);
      setTimeout(() => signOut({ callbackUrl: "/login" }), 2200);
    }
  };

  // While the change is in flight, or Luna is about to sign out, the sheet stays
  // up so the reason is still on screen when the redirect happens.
  const passwordBusy = status.password.state === "saving" || passwordChanged;
  const onPasswordSheet = (open: boolean) => {
    if (!open && passwordBusy) return;
    setPasswordOpen(open);
    if (open) return;
    // Don't keep typed passwords around once the sheet is dismissed.
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    applyErrors(["s-current-password", "s-new-password", "s-confirm-password"], {});
    setStatus((prev) => ({ ...prev, password: IDLE }));
  };

  const tier = normalizeUserPlan(plan);
  // Rows inside grouped lists keep their focus ring inside the rounded surface.
  const rootClass = "tier-app font-sans [&_.grouped_:is(a,button):focus-visible]:-outline-offset-3!";

  if (authStatus === "loading" || (authStatus === "authenticated" && loadState !== "ready")) {
    return (
      <div className={rootClass} data-plan={tier}>
        <main className="flex min-h-dvh items-center justify-center px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {loadState === "error" ? (
            <div role="alert" className="max-w-sm text-center">
              <p className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--tier-ink)]">
                We couldn&apos;t load your settings
              </p>
              <p className="mt-2 text-[15px] leading-snug text-[var(--label-secondary)]">
                Nothing was changed. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoadState("loading");
                  setReloadKey((k) => k + 1);
                }}
                className={`${primaryButton} mt-6 px-7`}
              >
                Try again
              </button>
            </div>
          ) : (
            <div role="status" className="flex flex-col items-center gap-3 text-[15px] text-[var(--label-secondary)]">
              <span className="size-6 animate-spin rounded-full border-2 border-[var(--separator)] border-t-[var(--label-secondary)] motion-reduce:animate-none" />
              Loading your settings…
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
    ? "Your date of birth can't be changed again here. Contact support if it needs fixing."
    : savedDob
      ? `You can change your date of birth ${dobEditsLeft} more time${dobEditsLeft === 1 ? "" : "s"}.`
      : "Once saved, your date of birth can be changed twice.";
  const today = localIsoDate();
  const zoneLabel = timeZones.find((z) => z.value === timezone)?.label ?? timezone;
  const showDeviceZone = Boolean(deviceZone) && canonicalZone(deviceZone!) !== canonicalZone(timezone);

  const panes: Record<PaneKey, React.ReactNode> = {
    profile: (
      <form onSubmit={handleSaveProfile} noValidate>
        <GroupedSection
          id="profile"
          header="Profile"
          className="scroll-mt-16"
          footer={
            <>
              <span id="s-email-hint">Changing your email may need a fresh verification.</span>{" "}
              <span id="s-dob-hint">{dobHint}</span>
            </>
          }
        >
          <InputRow id="s-name" label="Name" error={errors["s-name"]}>
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
          </InputRow>
          <InputRow id="s-email" label="Email" error={errors["s-email"]}>
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
          </InputRow>
          <InputRow id="s-dob" label="Birthday" error={errors["s-dob"]}>
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
          </InputRow>
        </GroupedSection>
        <SaveRow what="profile" state={status.profile.state} message={status.profile.message} />
      </form>
    ),

    cycle: (
      <div className="space-y-8">
        <div>
          <GroupedSection
            id="cycle"
            header="Cycle"
            className="scroll-mt-16"
            footer={<span id="s-timezone-hint">Your time zone sets when each day starts in Luna.</span>}
          >
            <PickerRow id="s-timezone" label="Time zone" display={zoneLabel.replace(/^.*\//, "")}>
              <select
                {...describedBy("s-timezone", undefined, true)}
                value={timezone}
                onChange={(e) => changeZone(e.target.value)}
                className={pickerSelectClass}
              >
                {timeZones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </PickerRow>
            {showDeviceZone ? (
              <GroupedRow
                tone="accent"
                label="Use this device's time zone"
                detail={deviceZone!.replace(/_/g, " ")}
                onClick={() => changeZone(deviceZone!)}
              />
            ) : null}
            <ControlRow label="Week starts on">
              <Segmented
                label="Week starts on"
                className="w-44"
                options={[
                  { value: "0", label: "Sunday" },
                  { value: "1", label: "Monday" },
                ]}
                value={String(weekStart) as "0" | "1"}
                onChange={changeWeekStart}
              />
            </ControlRow>
          </GroupedSection>
          <StatusText state={status.cycle.state} message={status.cycle.message} className="px-4 pt-1.5" />
        </div>

        <GroupedSection footer="Walk through the welcome steps again to refresh your details.">
          <GroupedRow href="/onboarding" label="Redo onboarding" />
        </GroupedSection>
      </div>
    ),

    health: (
      <div>
        <GroupedSection
          id="health"
          header="Health context"
          className="scroll-mt-16"
          footer="Choose any that apply. Luna adjusts its estimates to match."
        >
          {CONDITIONS.map((c) => (
            <CheckRow
              key={c.id}
              checked={selectedConditions.includes(c.id)}
              onToggle={() => toggleHealth(c.id)}
              label={c.label}
              detail={c.description}
            />
          ))}
        </GroupedSection>
        <StatusText state={status.health.state} message={status.health.message} className="px-4 pt-1.5" />
      </div>
    ),

    appearance: (
      <GroupedSection
        id="appearance"
        header="Appearance"
        footer="System follows your device, day or night."
        className="scroll-mt-16"
      >
        <ControlRow label="Mode">
          <ThemeToggle className="w-56" />
        </ControlRow>
      </GroupedSection>
    ),

    notifications: (
      <div>
        <GroupedSection id="notifications" header="Notifications" className="scroll-mt-16">
          <GroupedRow
            label={<span id="s-push-label">Push notifications</span>}
            detail={<span id="s-push-hint">Coming soon. Luna will send gentle reminders.</span>}
            value={
              <Switch
                checked={pushEnabled}
                onChange={togglePush}
                labelledBy="s-push-label"
                describedById="s-push-hint"
              />
            }
          />
        </GroupedSection>
        <StatusText
          state={status.notifications.state}
          message={status.notifications.message}
          className="px-4 pt-1.5"
        />
      </div>
    ),

    password: (
      <GroupedSection
        id="password"
        header="Password"
        className="scroll-mt-16"
        footer="Changing your password signs you out on every device, so only the new one works."
      >
        <GroupedRow label="Change password" chevron onClick={() => onPasswordSheet(true)} />
        <GroupedRow href="/forgot-password" tone="accent" label="Forgot password?" />
      </GroupedSection>
    ),

    plan: (
      <GroupedSection id="plan" header="Plan" className="scroll-mt-16" footer={currentPlan.description}>
        <GroupedRow label="Current plan" value={currentPlan.label} />
        {tier === "free" ? <GroupedRow href="/#pricing" tone="accent" label="Explore plans" /> : null}
      </GroupedSection>
    ),

    data: (
      <GroupedSection
        id="data"
        header="Data"
        className="scroll-mt-16"
        footer="A file of your logged cycles and notes. You can also ask Luna for it in chat."
      >
        {/* A plain anchor: the route returns a file, not a page to route to */}
        <a
          href="/api/data/export"
          download="luna-cycles.json"
          className={`${rowClass} flex min-h-11 items-center py-2.5 pr-4 text-[17px] tracking-[-0.01em] text-[var(--tint)]`}
        >
          Export your data
        </a>
      </GroupedSection>
    ),

    // Destructive actions sit apart, last, in their own groups.
    account: (
      <div className="space-y-8">
        <GroupedSection
          id="account"
          header="Account"
          className="scroll-mt-16"
          footer="Your cycles stay saved. Sign back in anytime."
        >
          {confirmSignOut ? (
            <div role="group" aria-labelledby="s-signout-q">
              <p
                id="s-signout-q"
                className="px-4 py-3 text-center text-[13px] leading-snug text-[var(--label-secondary)]"
              >
                Sign out of Luna on this device?
              </p>
              <ButtonRow tone="destructive" label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })} />
              <ButtonRow tone="accent" label="Stay signed in" autoFocus onClick={() => setConfirmSignOut(false)} />
            </div>
          ) : (
            <ButtonRow tone="destructive" label="Sign out" onClick={() => setConfirmSignOut(true)} />
          )}
        </GroupedSection>
        <GroupedSection footer="Coming soon. Until then, you can export your data at any time.">
          {/* Greyed like an unavailable iOS row: nothing to tap yet */}
          <GroupedRow label={<span className="text-[var(--label-tertiary)]">Delete account</span>} value="Soon" />
        </GroupedSection>
      </div>
    ),
  };

  const identity = <IdentityCard name={account.name} email={account.email} plan={currentPlan.label} />;
  const backLink = (
    <Link
      href="/dashboard"
      className="-ml-2 hidden min-h-11 items-center gap-0.5 rounded-lg px-1 text-[17px] tracking-[-0.01em] text-[var(--tint)] transition-opacity duration-150 active:opacity-60 md:inline-flex"
    >
      <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
      Today
    </Link>
  );
  const title = (
    <LargeTitle
      title="Settings"
      subtitle={tier === "premium+" ? undefined : PLAN_INFO[tier].subtitle}
      leading={backLink}
    />
  );

  let body: React.ReactNode;
  if (tier === "premium") {
    // Sidebar source list on desktop (one pane at a time); a single stacked list below lg.
    body = (
      <div className="mx-auto max-w-5xl">
        {title}
        <div className="mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <nav
            aria-label="Settings sections"
            className="hidden lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top))] lg:block lg:self-start"
          >
            <IdentityCard name={account.name} email={account.email} plan={currentPlan.label} compact />
            <ul className="mt-4 space-y-0.5">
              {PANES.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    aria-current={pane === p.key ? "true" : undefined}
                    onClick={() => setPane(p.key)}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-[15px] tracking-[-0.01em] text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--fill-tertiary)_60%,transparent)] aria-[current=true]:bg-[var(--fill-tertiary)]"
                  >
                    <RowIcon color={p.color}>{p.icon}</RowIcon>
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0">
            <div className="mb-8 lg:hidden">{identity}</div>
            {/* Panes switch instantly, like System Settings; below lg they all stack. */}
            <div className="space-y-8">
              {PANES.map((p) => (
                <div key={p.key} className={pane === p.key ? "" : "lg:hidden"}>
                  {panes[p.key]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (tier === "premium+") {
    // Wide two-column spread on desktop. Fixed columns (not CSS multi-column), so a
    // growing section never hops sides under the pointer; account stays last on the right.
    const column = (keys: PaneKey[]) => (
      <div className="space-y-8">
        {keys.map((k) => (
          <div key={k}>{panes[k]}</div>
        ))}
      </div>
    );
    body = (
      <div className="mx-auto max-w-6xl">
        {title}
        <div className="mb-10 mt-4 grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          {identity}
          <div className="px-1">
            <p className="max-w-[22ch] font-serif text-[28px] leading-tight text-[var(--tier-ink)]">
              Make Luna feel like your own quiet space.
            </p>
            <p className="mt-2 max-w-md text-[15px] leading-snug text-[var(--label-secondary)]">
              Update your details, cycle context and account at your own pace. Each change stays under your control.
            </p>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
          {column(["profile", "cycle", "health"])}
          {column(["appearance", "notifications", "password", "plan", "data", "account"])}
        </div>
      </div>
    );
  } else {
    // Free: one calm column, the iOS Settings list as it is.
    body = (
      <div className="mx-auto max-w-[40rem]">
        {title}
        <div className="mb-8 mt-4">{identity}</div>
        <div className="space-y-8">
          {PANES.map((p) => (
            <div key={p.key}>{panes[p.key]}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass} data-plan={tier}>
      <main className="w-full min-w-0 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-16">{body}</main>

      <Sheet
        open={passwordOpen}
        onOpenChange={onPasswordSheet}
        title="Change password"
        description="Afterwards Luna signs you out on every device, so only the new password works."
      >
        <form onSubmit={handleSavePassword} noValidate>
          {/* Lets password managers attach the new password to the right account */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <GroupedSection footer={<span id="s-new-password-hint">Use at least 6 characters.</span>}>
            <InputRow id="s-current-password" label="Current" error={errors["s-current-password"]}>
              <input
                {...describedBy("s-current-password", errors["s-current-password"])}
                aria-label="Current password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  clearError("s-current-password");
                }}
                className={inputClass}
                placeholder="Required"
              />
            </InputRow>
            <InputRow id="s-new-password" label="New" error={errors["s-new-password"]}>
              <input
                {...describedBy("s-new-password", errors["s-new-password"], true)}
                aria-label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearError("s-new-password");
                }}
                className={inputClass}
                placeholder="Required"
              />
            </InputRow>
            <InputRow id="s-confirm-password" label="Verify" error={errors["s-confirm-password"]}>
              <input
                {...describedBy("s-confirm-password", errors["s-confirm-password"])}
                aria-label="Verify new password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError("s-confirm-password");
                }}
                className={inputClass}
                placeholder="Required"
              />
            </InputRow>
          </GroupedSection>
          <StatusText
            state={passwordChanged ? "saved" : status.password.state}
            message={status.password.message}
            savedLabel="Password changed, so Luna is signing you out everywhere to keep your account safe."
            className="px-4 pt-3"
          />
          <button type="submit" disabled={passwordBusy} className={`${primaryButton} mt-3 w-full`}>
            {status.password.state === "saving" ? "Changing…" : "Change password"}
          </button>
          {/* The one dismiss control screen-reader and switch users can reach (Escape and the backdrop aren't). */}
          <button
            type="button"
            disabled={passwordBusy}
            onClick={() => onPasswordSheet(false)}
            className={`${plainButton} mt-1 w-full`}
          >
            Cancel
          </button>
        </form>
      </Sheet>

      <AppTabBar />
    </div>
  );
}
