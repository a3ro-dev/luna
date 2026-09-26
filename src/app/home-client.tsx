"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import CycleHero from "@/components/moon/CycleHero";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, Download, MoreVertical, Moon } from "lucide-react";
import { usePWAInstall } from "@/components/PWAInstallPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeMode, type ThemeMode } from "@/lib/theme/mode";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-ink)]";

const moments = [
  { day: 2, note: "cramps after coffee" },
  { day: 5, note: "tender and quiet" },
  { day: 11, note: "energy returning" },
  { day: 24, note: "heavy sleep today" },
];

/** What every plan includes: stated once, because it is the same everywhere. */
const everyPlan = [
  "Log by chat, or with one tap",
  "Next-period window and ovulation estimate",
  "Pattern check (a summary, never a diagnosis)",
  "Chat with photos and web search",
];

/** Plans differ only in the room and the voice. */
const plans = [
  { name: "Luna", price: "Free", period: "", dot: "var(--landing-rose)", room: "Calendar first", voice: "Practical and direct" },
  { name: "Luna Premium", price: "$5", period: "/mo", dot: "var(--landing-lavender)", room: "A summary that circles back to your notes", voice: "Warmer, takes more time" },
  { name: "Luna Premium+", price: "$12", period: "/mo", dot: "var(--landing-honey)", room: "A journal for each cycle", voice: "Luna's gentlest voice" },
];

const primaryButton = `inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-ink)] text-[15px] font-medium tracking-[-0.01em] text-[var(--landing-surface)] shadow-[var(--landing-shadow-button)] transition hover:bg-[var(--landing-ink-hover)] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;
const quietButton = `inline-flex items-center justify-center gap-2 rounded-full border border-[var(--landing-line)] bg-[var(--landing-surface)]/70 text-[15px] font-medium tracking-[-0.01em] text-[var(--landing-ink)] transition hover:bg-[var(--landing-hover)] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;

/** Decorative moon for a cycle day: dark at day 0, full near day 14. */
function MoonGlyph({ day }: { day: number }) {
  const maskId = `moon${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = (day % 28) / 28;
  const shadowX = 10 + (p <= 0.5 ? -32 * p : 32 * (1 - p));
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--landing-rose)]">
      <mask id={maskId}>
        <rect width="20" height="20" fill="white" />
        <circle cx={shadowX} cy="10" r="8" fill="black" />
      </mask>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.6" />
      <circle cx="10" cy="10" r="8" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export default function HomeClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // Subscription modal state
  const [subModal, setSubModal] = useState<{ open: boolean; plan: string }>({
    open: false,
    plan: "",
  });
  const [subForm, setSubForm] = useState({ email: "", name: "" });
  const [subStatus, setSubStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [subError, setSubError] = useState("");

  const { status: authStatus } = useSession();
  const router = useRouter();
  const isAuthenticated = authStatus === "authenticated";
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const signupHref = "/signup";
  const primaryHref = isAuthenticated ? "/dashboard" : signupHref;

  const { canInstall, isInstalled, platform, triggerInstall } = usePWAInstall();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [themeMode, setThemeMode] = useThemeMode();

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => router.push("/dashboard"), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router]);

  const openSubscribeModal = (plan: string) => {
    setSubModal({ open: true, plan });
    setSubForm({ email: "", name: "" });
    setSubStatus("idle");
    setSubError("");
  };

  const closeSubscribeModal = () => {
    setSubModal({ open: false, plan: "" });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.email.trim()) return;
    setSubStatus("loading");
    setSubError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: subForm.email,
          name: subForm.name,
          plan: subModal.plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubStatus("error");
        setSubError(data.error || "Something went wrong.");
        return;
      }
      setSubStatus("success");
    } catch {
      setSubStatus("error");
      setSubError("Network error. Please try again.");
    }
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(progressRef.current, {
          scaleX: 0,
          transformOrigin: "left center",
        });
        gsap.to(progressRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.2,
          },
        });

        // Transform and opacity only: blurring a full-width section is paint-heavy.
        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 85%",
              once: true,
            },
          },
        );
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <main
      ref={rootRef}
      className="luna-landing min-h-dvh overflow-x-hidden bg-[var(--landing-bg)] font-sans text-[var(--landing-ink)] selection:bg-[var(--landing-blush)] selection:text-[var(--landing-ink)]"
    >
      <div
        aria-hidden
        className="fixed left-0 top-0 z-50 h-[3px] w-full bg-[var(--landing-blush)]/30"
      >
        <div ref={progressRef} className="h-full w-full bg-[var(--landing-rose)]" />
      </div>

      <header className="material hairline-b fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-1.5 md:px-12 md:py-2">
          <Link
            href="/"
            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-full font-serif text-[1.65rem] leading-none text-[var(--landing-ink)] ${focusRing}`}
          >
            <Image
              src="/luna.png"
              alt=""
              width={36}
              height={36}
              loading="eager"
              className="h-8 w-8 rounded-full"
            />
            <span className="truncate">Luna</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Wide: beside the menu. Phones: inside it, below the links. */}
            <div className="hidden sm:block">
              <ThemeToggle className="landing-control" />
            </div>
            {/* On phones the hero CTA carries this job; the menu keeps sign in / create account. */}
            <Link
              href={primaryHref}
              className={cn(primaryButton, "hidden h-9 px-4 text-[14px] sm:inline-flex")}
            >
              {isAuthenticated ? "Open Luna" : "Get started"}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menu"
                  className={`grid h-11 w-11 place-items-center rounded-full text-[var(--landing-ink)] transition hover:bg-[var(--landing-ink)]/[0.06] ${focusRing}`}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 [&_[role^=menuitem]]:min-h-11">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/chat">Chat</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login">Sign in</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/signup">Create account</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {/* Phones: the menu's own radios, so arrow keys and VoiceOver reach them. */}
                <div className="sm:hidden">
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[13px] text-[var(--landing-secondary)]">Appearance</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    aria-label="Appearance"
                    value={themeMode}
                    onValueChange={(v) => setThemeMode(v as ThemeMode)}
                  >
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero: a cycle, told by the moon (pinned 3D story; a plain page with reduced motion) ── */}
      <CycleHero
        intro={
          <div className="flex min-w-0 max-w-xl flex-col items-center text-center wide:max-w-md wide:items-start wide:text-left">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--landing-surface)]/70 px-3.5 py-1.5 text-[13px] font-medium text-[var(--landing-accent)] shadow-[var(--landing-shadow-card)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--landing-rose)]" />
              Cycle tracking, softened
            </p>
            <h1 className="font-serif text-[clamp(4.75rem,17vw,9.5rem)] font-light leading-[0.88] tracking-[-0.02em] text-[var(--landing-ink)]">
              Luna
            </h1>
            <p className="mt-5 max-w-[20ch] font-display text-[clamp(1.4rem,2.6vw,1.85rem)] font-semibold leading-[1.15] tracking-[-0.022em] text-[var(--landing-ink)] md:max-w-md">
              A calm cycle tracker you can simply talk to.
            </p>
            <div className="mt-9 flex w-full flex-col items-center gap-2 wide:items-start">
              <Link href={primaryHref} className={cn(primaryButton, "h-[3.25rem] w-full max-w-xs px-8")}>
                {isAuthenticated ? "Open Luna" : "Start free"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!isAuthenticated && (
                <p className="flex items-center gap-1 text-[15px] text-[var(--landing-secondary)]">
                  Already tracking with Luna?
                  <Link
                    href="/login"
                    className={`inline-flex min-h-11 items-center rounded-md px-1 font-medium text-[var(--landing-accent)] hover:underline ${focusRing}`}
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>
            <p aria-hidden className="mt-10 hidden text-[13px] text-[var(--landing-tertiary)] wide:block">Scroll to watch a cycle go by</p>
          </div>
        }
        finale={
          <div className="flex flex-col items-start gap-2">
            <Link href={primaryHref} className={cn(primaryButton, "h-[3.25rem] px-8")}>
              {isAuthenticated ? "Open Luna" : "Start free"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="text-[13px] text-[var(--landing-secondary)]">Free forever. Every plan gets the same forecasts and tools.</p>
          </div>
        }
      />

      {/* ── Journal ── */}
      <section className="relative z-10 bg-[var(--landing-bg)] px-5 py-20 md:px-12 md:py-40">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center md:gap-20">
          <div className="min-w-0 text-center md:text-left">
            <Moon
              aria-hidden
              className="mx-auto mb-6 h-9 w-9 text-[var(--landing-lavender)] md:mx-0"
              strokeWidth={1}
            />
            <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--landing-ink)] text-[clamp(2.25rem,5.2vw,3.75rem)]">
              Softer than a form.
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-[17px] leading-[1.47] text-[var(--landing-secondary)] md:mx-0 md:text-[19px]">
              Type it the way you would say it. Luna keeps the note with your
              cycle, so the small things add up to a pattern.
            </p>
          </div>

          <ol
            aria-label="Example notes"
            className="min-w-0 rounded-[1.375rem] bg-[var(--landing-surface)] px-5 py-1 shadow-[var(--landing-shadow-card)] sm:px-7"
          >
            {moments.map(({ day, note }) => (
              <li
                key={note}
                className="flex items-center gap-4 border-b border-[var(--landing-ink)]/10 py-4 last:border-b-0"
              >
                <MoonGlyph day={day} />
                <span className="w-14 shrink-0 text-[13px] font-medium tabular-nums text-[var(--landing-secondary)]">
                  Day {day}
                </span>
                <span className="min-w-0 font-serif text-[1.45rem] leading-snug text-[var(--landing-ink)] sm:text-[1.6rem]">
                  {note}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="relative z-10 bg-[var(--landing-bg)] px-5 py-20 md:px-12 md:py-32"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-xl text-center md:mb-14">
            <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--landing-ink)] text-[clamp(2.25rem,5.2vw,3.75rem)]">
              One Luna, three rooms
            </h2>
            <p className="mt-4 text-[17px] leading-[1.47] text-[var(--landing-secondary)]">
              Every plan gets the same forecasts, tools and privacy. You choose the layout and the voice.
            </p>
          </div>

          <ul
            aria-label="Every plan includes"
            className="mx-auto mb-12 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-[15px] text-[var(--landing-ink)] md:mb-16"
          >
            {everyPlan.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check aria-hidden className="size-4 shrink-0 text-[var(--landing-accent)]" strokeWidth={2.25} />
                {item}
              </li>
            ))}
          </ul>

          <div className="grid md:grid-cols-3 md:gap-8">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                aria-labelledby={`plan-${index}`}
                className="flex min-w-0 flex-col border-t border-[var(--landing-line)] py-7 md:py-8"
              >
                <h3
                  id={`plan-${index}`}
                  className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[var(--landing-ink)]"
                >
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: plan.dot }} />
                  {plan.name}
                </h3>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-[2.5rem] font-semibold tabular-nums tracking-[-0.03em] text-[var(--landing-ink)]">
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-[15px] text-[var(--landing-secondary)]">{plan.period}</span>}
                </p>
                <dl className="mb-7 mt-4 space-y-2 text-[15px] leading-[1.47]">
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-[var(--landing-secondary)]">Room</dt>
                    <dd className="text-[var(--landing-ink)]">{plan.room}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-[var(--landing-secondary)]">Voice</dt>
                    <dd className="text-[var(--landing-ink)]">{plan.voice}</dd>
                  </div>
                </dl>
                <div className="mt-auto">
                  {plan.price === "Free" ? (
                    <Link href={ctaHref} className={cn(primaryButton, "h-12 w-full")}>
                      {isAuthenticated ? "Go to app" : "Start free"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSubscribeModal(plan.name)}
                      className={cn(quietButton, "h-12 w-full cursor-pointer")}
                    >
                      Request {plan.name.replace("Luna ", "")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={ctaRef}
        className="relative z-10 overflow-hidden bg-[var(--landing-bg)] px-5 pb-24 pt-16 text-center md:px-12 md:pb-40 md:pt-20"
      >
        <div className="relative mx-auto max-w-3xl">
          <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--landing-ink)] text-[clamp(2.5rem,6vw,4.25rem)]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[19px] leading-[1.42] text-[var(--landing-secondary)] md:text-[21px]">
            Start with one log. Luna learns the rest slowly, and with care.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row-reverse">
            <Link
              href={primaryHref}
              className={cn(primaryButton, "h-[3.25rem] w-full max-w-xs px-8 sm:w-auto")}
            >
              {isAuthenticated ? "Open Luna" : "Get started"}
            </Link>
            {!isAuthenticated && (
              <Link
                href={ctaHref}
                className={cn(quietButton, "h-[3.25rem] w-full max-w-xs px-8 sm:w-auto")}
              >
                Sign in
              </Link>
            )}
          </div>
          {/* Install CTA: prompt when available; otherwise show helpful instructions */}
          {!isInstalled && (
            <div className="mt-6 flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  if (canInstall) {
                    triggerInstall();
                    return;
                  }
                  setShowInstallHelp((v) => !v);
                }}
                aria-expanded={canInstall ? undefined : showInstallHelp}
                aria-controls={canInstall ? undefined : "install-help"}
                className={cn(quietButton, "h-12 cursor-pointer px-7")}
              >
                <Download className="h-4 w-4" aria-hidden />
                {platform === "ios" ? "How to install on iOS" : "Install app"}
              </button>

              <p
                id="install-help"
                aria-live="polite"
                className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--landing-secondary)]"
              >
                {showInstallHelp &&
                  (platform === "ios"
                    ? "In Safari, tap the Share button, then choose Add to Home Screen."
                    : "If you don’t see an install prompt, open your browser menu and choose Install app (or Add to Home Screen).")}
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="relative z-10 bg-[var(--landing-bg)] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-10 text-center">
        <nav
          aria-label="Legal"
          className="flex flex-wrap justify-center gap-x-1 text-xs"
        >
          {[
            ["/privacy", "Privacy"],
            ["/terms", "Terms"],
            ["/transparency", "Transparency"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-[var(--landing-secondary)] underline decoration-[var(--landing-blush)] underline-offset-4 transition-colors hover:text-[var(--landing-ink)] hover:decoration-[var(--landing-accent)] ${focusRing}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p suppressHydrationWarning className="mt-4 text-[13px] text-[var(--landing-secondary)]">
          Luna, {new Date().getFullYear()}.
        </p>
        <p className="mt-2 text-xs text-[var(--landing-secondary)]">
          Questions?{" "}
          <a
            href="mailto:akshatsingh14372@outlook.com"
            className={`break-all rounded-sm underline decoration-[var(--landing-rose)] underline-offset-2 transition-colors hover:text-[var(--landing-ink)] hover:decoration-[var(--landing-ink)] ${focusRing}`}
          >
            akshatsingh14372@outlook.com
          </a>
        </p>
      </footer>

      <Dialog
        open={subModal.open}
        onOpenChange={(open) => {
          if (!open) closeSubscribeModal();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border border-[var(--landing-blush)] bg-[var(--landing-bg)] text-[var(--landing-ink)]">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-semibold tracking-[-0.022em]">
              {subStatus === "success" ? "Request received" : `Request ${subModal.plan}`}
            </DialogTitle>
            <DialogDescription className="text-[var(--landing-secondary)]">
              {subStatus === "success"
                ? "We will email you with the next steps soon."
                : "Subscriptions are handled personally for now. Leave your email and we will follow up with the next steps."}
            </DialogDescription>
          </DialogHeader>

          <p aria-live="polite" className="sr-only">
            {subStatus === "loading"
              ? "Sending your request."
              : subStatus === "success"
                ? "Request received. We will email you with the next steps soon."
                : ""}
          </p>

          {subStatus === "success" ? (
            <button
              type="button"
              onClick={closeSubscribeModal}
              className="h-11 rounded-full bg-[var(--landing-ink)] px-6 text-sm font-medium text-[var(--landing-surface)] hover:bg-[var(--landing-ink-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-ink)]"
            >
              Done
            </button>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="subscribe-name" className="block text-sm font-medium">
                  Name (optional)
                </label>
                <input
                  id="subscribe-name"
                  type="text"
                  autoComplete="name"
                  value={subForm.name}
                  onChange={(e) => setSubForm((form) => ({ ...form, name: e.target.value }))}
                  className="h-12 w-full rounded-xl border border-[var(--landing-field-line)] bg-[var(--landing-surface)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-ink)]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="subscribe-email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="subscribe-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={subForm.email}
                  onChange={(e) => setSubForm((form) => ({ ...form, email: e.target.value }))}
                  aria-invalid={subStatus === "error" || undefined}
                  aria-describedby={subStatus === "error" ? "subscribe-error" : undefined}
                  className="h-12 w-full rounded-xl border border-[var(--landing-field-line)] bg-[var(--landing-surface)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-ink)]"
                />
              </div>
              {subStatus === "error" && (
                <p id="subscribe-error" role="alert" className="text-sm text-[var(--landing-danger)]">
                  {subError}
                </p>
              )}
              <button
                type="submit"
                disabled={subStatus === "loading"}
                className="h-12 w-full rounded-full bg-[var(--landing-ink)] px-6 text-sm font-medium text-[var(--landing-surface)] hover:bg-[var(--landing-ink-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-ink)] disabled:cursor-wait disabled:opacity-60"
              >
                {subStatus === "loading" ? "Sending…" : "Send request"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
