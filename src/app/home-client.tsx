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
import { ArrowRight, Download, MoreVertical, Moon, Sparkles } from "lucide-react";
import { usePWAInstall } from "@/components/PWAInstallPrompt";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// Pastels are decoration only (dots, icons, borders). Text uses ink #6D5A60,
// muted #75636A or accent #A34E68, all >= 4.5:1 on the cream background.
const palette = {
  cream: "#FFF9F9",
  blush: "#FFDDE0",
  rose: "#FFB5C0",
  mauve: "#6D5A60",
  lavender: "#D6CBE3",
  honey: "#FBE6B6",
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D5A60]";

const moments = [
  { day: 2, note: "cramps after coffee" },
  { day: 5, note: "tender and quiet" },
  { day: 11, note: "energy returning" },
  { day: 24, note: "heavy sleep today" },
];

const plans = [
  {
    name: "Luna",
    price: "Free",
    period: "",
    dot: palette.rose,
    blurb: "A focused, calendar-first space with a practical, direct Luna.",
    features: [
      "Log by chat, or with one tap on the dashboard",
      "Next-period window and ovulation estimates",
      "Pattern check against FIGO reference ranges (a summary, not a diagnosis)",
      "Chat, images, and web search",
    ],
    card: "border-transparent bg-white shadow-[0_1px_1px_rgba(109,90,96,0.03),0_12px_40px_-8px_rgba(109,90,96,0.12)]",
  },
  {
    name: "Luna Premium",
    price: "$5",
    period: "/mo",
    dot: palette.lavender,
    badge: "Popular",
    blurb: "A guided layout and a warmer companion who takes more time with you.",
    features: [
      "Same features as Free",
      "Guided dashboard layout",
      "Lavender chat space",
      "Warmer conversation style",
      "Same predictions and tools",
    ],
    card: "border-[#D6CBE3] bg-white shadow-[0_1px_1px_rgba(109,90,96,0.03),0_16px_48px_-10px_rgba(150,120,190,0.28)]",
  },
  {
    name: "Luna Premium+",
    price: "$12",
    period: "/mo",
    dot: palette.honey,
    blurb: "A spacious, reflective layout with Luna’s gentlest voice.",
    features: [
      "Same features as every plan",
      "Spacious dashboard and timeline",
      "Cycle context beside chat",
      "Gentlest conversation style",
      "Same model and predictions",
    ],
    card: "border-[#F1DCA8] bg-white shadow-[0_1px_1px_rgba(109,90,96,0.03),0_16px_48px_-10px_rgba(210,170,90,0.22)]",
  },
];

const primaryButton = `inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5A60] text-[15px] font-medium tracking-[-0.01em] text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#5E4C52] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;
const quietButton = `inline-flex items-center justify-center gap-2 rounded-full border border-[#F3DDE2] bg-white/70 text-[15px] font-medium tracking-[-0.01em] text-[#6D5A60] transition hover:bg-[#FFF5F7] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;

/** Decorative moon for a cycle day: dark at day 0, full near day 14. */
function MoonGlyph({ day }: { day: number }) {
  const maskId = `moon${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = (day % 28) / 28;
  const shadowX = 10 + (p <= 0.5 ? -32 * p : 32 * (1 - p));
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0">
      <mask id={maskId}>
        <rect width="20" height="20" fill="white" />
        <circle cx={shadowX} cy="10" r="8" fill="black" />
      </mask>
      <circle cx="10" cy="10" r="8" fill="none" stroke={palette.rose} strokeOpacity="0.6" />
      <circle cx="10" cy="10" r="8" fill={palette.rose} mask={`url(#${maskId})`} />
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
      className="min-h-dvh overflow-x-hidden bg-[#FFF9F9] font-sans text-[#6D5A60] selection:bg-[#FFDDE0] selection:text-[#6D5A60]"
    >
      <div
        aria-hidden
        className="fixed left-0 top-0 z-50 h-[3px] w-full bg-[#FFDDE0]/30"
      >
        <div ref={progressRef} className="h-full w-full bg-[#FFB5C0]" />
      </div>

      <header className="material hairline-b fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-1.5 md:px-12 md:py-2">
          <Link
            href="/"
            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-full font-serif text-[1.65rem] leading-none text-[#6D5A60] ${focusRing}`}
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
                  className={`grid h-11 w-11 place-items-center rounded-full text-[#6D5A60] transition hover:bg-[#6D5A60]/[0.06] ${focusRing}`}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 [&_[role=menuitem]]:min-h-11">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero: a cycle, told by the moon (pinned 3D story; a plain page with reduced motion) ── */}
      <CycleHero
        intro={
          <div className="flex min-w-0 max-w-xl flex-col items-center text-center md:items-start md:text-left">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[13px] font-medium text-[#A34E68] shadow-[0_1px_2px_rgba(109,90,96,0.06)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FFB5C0]" />
              Cycle tracking, softened
            </p>
            <h1 className="font-serif text-[clamp(4.75rem,17vw,9.5rem)] font-light leading-[0.88] tracking-[-0.02em] text-[#6D5A60]">
              Luna
            </h1>
            <p className="mt-5 max-w-[20ch] font-display text-[clamp(1.4rem,2.6vw,1.85rem)] font-semibold leading-[1.15] tracking-[-0.022em] text-[#6D5A60] md:max-w-md">
              A calm cycle tracker you can simply talk to.
            </p>
            <div className="mt-9 flex w-full flex-col items-center gap-2 md:items-start">
              <Link href={primaryHref} className={cn(primaryButton, "h-[3.25rem] w-full max-w-xs px-8")}>
                {isAuthenticated ? "Open Luna" : "Start free"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!isAuthenticated && (
                <p className="flex items-center gap-1 text-[15px] text-[#75636A]">
                  Already tracking with Luna?
                  <Link
                    href="/login"
                    className={`inline-flex min-h-11 items-center rounded-md px-1 font-medium text-[#A34E68] hover:underline ${focusRing}`}
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>
            <p aria-hidden className="mt-10 hidden text-[13px] text-[#8A6F77] md:block">Scroll to watch a cycle go by</p>
          </div>
        }
        finale={
          <div className="flex flex-col items-start gap-2">
            <Link href={primaryHref} className={cn(primaryButton, "h-[3.25rem] px-8")}>
              {isAuthenticated ? "Open Luna" : "Start free"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="text-[13px] text-[#75636A]">Free forever. Every plan gets the same forecasts and tools.</p>
          </div>
        }
      />

      {/* ── Journal ── */}
      <section className="relative z-10 bg-[#FFF9F9] px-5 py-20 md:px-12 md:py-40">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center md:gap-20">
          <div className="min-w-0 text-center md:text-left">
            <Moon
              aria-hidden
              className="mx-auto mb-6 h-9 w-9 text-[#D6CBE3] md:mx-0"
              strokeWidth={1}
            />
            <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[#6D5A60] text-[clamp(2.25rem,5.2vw,3.75rem)]">
              Softer than a form.
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-[17px] leading-[1.47] text-[#75636A] md:mx-0 md:text-[19px]">
              Type it the way you would say it. Luna keeps the note with your
              cycle, so the small things add up to a pattern.
            </p>
          </div>

          <ol
            aria-label="Example notes"
            className="min-w-0 rounded-[1.375rem] bg-white px-5 py-1 shadow-[0_1px_1px_rgba(109,90,96,0.03),0_12px_40px_-8px_rgba(109,90,96,0.12)] sm:px-7"
          >
            {moments.map(({ day, note }) => (
              <li
                key={note}
                className="flex items-center gap-4 border-b border-[#6D5A60]/10 py-4 last:border-b-0"
              >
                <MoonGlyph day={day} />
                <span className="w-14 shrink-0 text-[13px] font-medium tabular-nums text-[#75636A]">
                  Day {day}
                </span>
                <span className="min-w-0 font-serif text-[1.45rem] leading-snug text-[#6D5A60] sm:text-[1.6rem]">
                  {note}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden bg-[#FFF9F9] px-5 py-24 md:min-h-[70dvh] md:px-12 md:py-32">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute left-1/2 top-1/2 h-[80vw] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#FFF9F9] to-[#FFDDE0]/40 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-4xl text-center">
          <p className="mb-5 text-[17px] font-semibold tracking-[-0.01em] text-[#A34E68]">
            Less noise, more knowing
          </p>
          <h2 className="font-serif text-[clamp(2.75rem,8vw,6.25rem)] font-light leading-[1.02] tracking-[-0.02em] text-[#6D5A60]">
            Your body can feel familiar again.
          </h2>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="relative z-10 bg-[#FFF9F9] px-5 py-20 md:px-12 md:py-32"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-xl text-center md:mb-16">
            <p className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-[#A34E68]">
              Choose your companion
            </p>
            <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[#6D5A60] text-[clamp(2.25rem,5.2vw,3.75rem)]">
              Luna for every rhythm
            </h2>
            <p className="mt-4 text-[17px] leading-[1.47] text-[#75636A]">
              Same model, predictions, and tools on every plan. Plans change the
              layout and how Luna talks with you.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                aria-labelledby={`plan-${index}`}
                className={`relative flex min-w-0 flex-col rounded-[1.375rem] border px-6 py-7 transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-7 sm:py-8 ${plan.card}`}
              >
                {plan.badge && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#D6CBE3]/45 px-2.5 py-0.5 text-[12px] font-semibold text-[#6D5A60]">
                    {plan.badge}
                  </span>
                )}
                <h3
                  id={`plan-${index}`}
                  className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#6D5A60]"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: plan.dot }}
                  />
                  {plan.name}
                </h3>
                <p className="mb-5 mt-3 flex items-baseline gap-1">
                  <span className="font-display text-[2.75rem] font-semibold tabular-nums tracking-[-0.03em] text-[#6D5A60]">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[#75636A]">{plan.period}</span>
                  )}
                </p>
                <p className="mb-6 text-[15px] leading-[1.47] text-[#75636A]">
                  {plan.blurb}
                </p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-[15px] leading-[1.47] text-[#6D5A60]"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: plan.dot }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {plan.price === "Free" ? (
                    <Link href={ctaHref} className={cn(quietButton, "h-12 w-full")}>
                      {isAuthenticated ? "Go to app" : "Get started"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSubscribeModal(plan.name)}
                      className={cn(plan.badge ? primaryButton : quietButton, "h-12 w-full cursor-pointer")}
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
        className="relative z-10 overflow-hidden bg-[#FFF9F9] px-5 pb-24 pt-16 text-center md:px-12 md:pb-40 md:pt-20"
      >
        <div className="relative mx-auto max-w-3xl">
          <Sparkles
            aria-hidden
            className="mx-auto mb-8 h-9 w-9 text-[#FFB5C0]"
            strokeWidth={1}
          />
          <h2 className="font-display font-semibold leading-[1.06] tracking-[-0.03em] text-[#6D5A60] text-[clamp(2.5rem,6vw,4.25rem)]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[19px] leading-[1.42] text-[#75636A] md:text-[21px]">
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
                className={cn(quietButton, "h-12 cursor-pointer border-[#FFDDE0]/80 bg-white/40 px-7 backdrop-blur-md")}
              >
                <Download className="h-4 w-4" aria-hidden />
                {platform === "ios" ? "How to install on iOS" : "Install app"}
              </button>

              <p
                id="install-help"
                aria-live="polite"
                className="mt-3 max-w-xs text-sm leading-relaxed text-[#75636A]"
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

      <footer className="relative z-10 bg-[#FFF9F9] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-10 text-center">
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
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-[#75636A] underline decoration-[#FFDDE0] underline-offset-4 transition-colors hover:text-[#6D5A60] hover:decoration-[#A34E68] ${focusRing}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p suppressHydrationWarning className="mt-4 text-[13px] text-[#75636A]">
          Luna, {new Date().getFullYear()}.
        </p>
        <p className="mt-2 text-xs text-[#75636A]">
          Questions?{" "}
          <a
            href="mailto:akshatsingh14372@outlook.com"
            className={`break-all rounded-sm underline decoration-[#FFB5C0] underline-offset-2 transition-colors hover:text-[#6D5A60] hover:decoration-[#6D5A60] ${focusRing}`}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border border-[#FFDDE0] bg-[#FFF9F9] text-[#6D5A60]">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-semibold tracking-[-0.022em]">
              {subStatus === "success" ? "Request received" : `Request ${subModal.plan}`}
            </DialogTitle>
            <DialogDescription className="text-[#75636A]">
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
              className="h-11 rounded-full bg-[#6D5A60] px-6 text-sm font-medium text-white hover:bg-[#5E4C52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D5A60]"
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
                  className="h-12 w-full rounded-xl border border-[#A08A92] bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#6D5A60]"
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
                  className="h-12 w-full rounded-xl border border-[#A08A92] bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#6D5A60]"
                />
              </div>
              {subStatus === "error" && (
                <p id="subscribe-error" role="alert" className="text-sm text-red-700">
                  {subError}
                </p>
              )}
              <button
                type="submit"
                disabled={subStatus === "loading"}
                className="h-12 w-full rounded-full bg-[#6D5A60] px-6 text-sm font-medium text-white hover:bg-[#5E4C52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D5A60] disabled:cursor-wait disabled:opacity-60"
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
