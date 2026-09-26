"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import MoonHero from "@/components/moon/MoonHero";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarDays,
  Download,
  HeartPulse,
  MoreVertical,
  MessageCircleHeart,
  Moon,
  Sparkles,
} from "lucide-react";
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

const phases = [
  {
    label: "Day 01",
    title: "A gentle beginning",
    body: "Tell Luna “my period started today”, or tap once on your dashboard. Either way, it goes on your calendar.",
    icon: HeartPulse,
    color: palette.rose,
  },
  {
    label: "Day 14",
    title: "Quiet predictions",
    body: "A likely window for your next period that narrows as Luna learns you, plus a pattern check against FIGO reference ranges. A summary, never a diagnosis.",
    icon: CalendarDays,
    color: palette.lavender,
  },
  {
    label: "Anytime",
    title: "A companion with memory",
    body: "Let Luna hold onto the small details, so your body feels a little more understood.",
    icon: MessageCircleHeart,
    color: palette.honey,
  },
];

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
    card: "border-white/70 bg-white/50 shadow-[0_20px_40px_rgba(255,181,192,0.08)]",
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
    card: "border-[#D6CBE3] bg-white/65 shadow-[0_20px_40px_rgba(214,203,227,0.2)]",
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
    card: "border-[#FBE6B6] bg-white/50 shadow-[0_20px_40px_rgba(251,230,182,0.16)]",
  },
];

const primaryButton = `inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5A60] text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#5E4C52] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;
const quietButton = `inline-flex items-center justify-center gap-2 rounded-full border border-[#FFDDE0] bg-white/60 text-[11px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`;

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
  const heroRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroPhoneRef = useRef<HTMLDivElement>(null);
  const heroWashRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLElement>(null);
  const phaseTextRefs = useRef<Array<HTMLLIElement | null>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

      // Reduced motion: hold the hero video on its first frame.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        videoRef.current?.pause();
      });

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

        // No blur: the phone holds a playing video under a backdrop blur, and
        // filtering it during first paint is costly on phones.
        gsap.from([heroCopyRef.current, heroPhoneRef.current], {
          opacity: 0,
          y: 16,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
        });

        gsap.to(heroPhoneRef.current, {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to(heroWashRef.current, {
          yPercent: 20,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
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

      // Pinned, frame-scrubbed story: tablets and up only, so phones never
      // download the 428-frame sequence. Matches the motion-safe:md: classes
      // below; everywhere else the phases read as a static timeline.
      mm.add(
        "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
        () => {
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;

          const frameCount = 428;
          const frames = { frame: 0 };
          const images: HTMLImageElement[] = [];

          const drawFrame = () => {
            const image = images[Math.round(frames.frame)];
            if (!image?.complete || !image.naturalWidth) return;

            const scale = Math.max(
              canvas.width / image.width,
              canvas.height / image.height,
            );
            const width = image.width * scale;
            const height = image.height * scale;
            const x = (canvas.width - width) / 2;
            const y = (canvas.height - height) / 2;

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, x, y, width, height);
          };

          for (let index = 0; index < frameCount; index += 1) {
            const image = new window.Image();
            image.src = `/frames/frame_${String(index + 1).padStart(4, "0")}.jpg`;
            if (index === 0) image.onload = drawFrame;
            images.push(image);
          }

          const [first, second, third] = phaseTextRefs.current;
          gsap.set([first, second, third], {
            opacity: 0,
            y: 50,
            filter: "blur(10px)",
          });

          const show = { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power2.out" };
          const hide = { opacity: 0, y: -40, filter: "blur(8px)", duration: 0.6, ease: "power2.in" };

          gsap
            .timeline({
              scrollTrigger: {
                trigger: phaseRef.current,
                start: "top top",
                end: "+=300%",
                scrub: 0.6,
                pin: true,
              },
            })
            .to(first, { ...show }, 0)
            .to(first, { ...hide }, 1.2)
            .to(second, { ...show }, 1.0)
            .to(second, { ...hide }, 2.4)
            .to(third, { ...show }, 2.2);

          // Frame scrubbing synced to the same pinned trigger
          gsap.to(frames, {
            frame: frameCount - 1,
            snap: "frame",
            ease: "none",
            scrollTrigger: {
              trigger: phaseRef.current,
              start: "top top",
              end: "+=300%",
              scrub: 0.15,
            },
            onUpdate: drawFrame,
          });
        },
      );

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

      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-[#FFF9F9] via-[#FFF9F9]/85 to-transparent pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-12 md:py-5">
          <Link
            href="/"
            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-full font-serif text-3xl leading-none text-[#6D5A60] ${focusRing}`}
          >
            <Image
              src="/luna.png"
              alt=""
              width={36}
              height={36}
              loading="eager"
              className="h-9 w-9 rounded-full"
            />
            <span className="truncate">Luna</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* On phones the hero CTA carries this job; the menu keeps sign in / create account. */}
            <Link
              href={primaryHref}
              className={cn(primaryButton, "hidden h-11 px-5 sm:inline-flex")}
            >
              {isAuthenticated ? "Open Luna" : "Get started"}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menu"
                  className={`grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/60 text-[#6D5A60] shadow-[0_10px_30px_rgba(255,181,192,0.15)] backdrop-blur-md transition hover:bg-white/80 ${focusRing}`}
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

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative flex min-h-dvh items-center overflow-hidden px-5 pb-16 pt-[calc(6.5rem+env(safe-area-inset-top))] md:px-12 md:pb-24 md:pt-32"
      >
        <div ref={heroWashRef} aria-hidden className="absolute inset-0 z-0">
          <div className="absolute left-[10%] top-[10%] h-[60vw] w-[60vw] rounded-full bg-[#FFDDE0]/30 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] h-[50vw] w-[50vw] rounded-full bg-[#D6CBE3]/25 blur-[100px]" />
        </div>

        {/* Rises behind the wordmark; the lit crescent faces the open space between copy and phone. */}
        <MoonHero
          trigger={heroRef}
          className="absolute left-1/2 top-[calc(3.25rem+env(safe-area-inset-top))] z-[1] aspect-square w-[min(112vw,30rem)] -translate-x-1/2 md:left-[max(-2rem,calc(50%-35rem))] md:top-[6%] md:w-[min(44vw,38rem)] md:translate-x-0"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-16">
          <div
            ref={heroCopyRef}
            className="flex min-w-0 flex-col items-center text-center will-change-transform md:items-start md:text-left"
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#A34E68] shadow-sm backdrop-blur-md">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FFB5C0]" />
              Cycle tracking, softened
            </p>
            <h1 className="font-serif text-[clamp(4.5rem,16vw,9rem)] font-light leading-[0.9] tracking-tight text-[#6D5A60]">
              Luna
            </h1>
            <p className="mt-5 max-w-[22ch] text-[clamp(1.25rem,2.4vw,1.6rem)] leading-snug text-[#6D5A60] md:max-w-md">
              A calm cycle tracker you can simply talk to.
            </p>

            <div className="mt-9 flex w-full flex-col items-center gap-2 md:items-start">
              <Link
                href={primaryHref}
                className={cn(primaryButton, "h-14 w-full max-w-xs px-10 text-xs")}
              >
                {isAuthenticated ? "Open Luna" : "Start free"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!isAuthenticated && (
                <p className="flex items-center gap-1 text-sm text-[#75636A]">
                  Already tracking with Luna?
                  <Link
                    href="/login"
                    className={`inline-flex min-h-11 items-center rounded-md px-1 font-medium text-[#6D5A60] underline decoration-[#FFB5C0] underline-offset-4 hover:decoration-[#6D5A60] ${focusRing}`}
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div
            ref={heroPhoneRef}
            className="mx-auto w-[min(15rem,68vw)] will-change-transform md:w-full md:max-w-[19rem]"
          >
            <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/30 p-2 shadow-[0_40px_100px_rgba(255,181,192,0.2)] backdrop-blur-2xl md:rounded-[3rem]">
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem]">
                <video
                  ref={videoRef}
                  aria-hidden
                  className="h-full w-full object-cover opacity-90 mix-blend-multiply"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/frames/frame_0001.jpg"
                >
                  <source src="/video.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F9] via-transparent to-transparent opacity-80" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-center md:p-8">
                  <p className="font-serif text-2xl font-light leading-tight text-[#6D5A60] md:text-3xl">
                    Today feels tender.
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#75636A]">
                    Logged with Luna
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Journal ── */}
      <section className="relative z-10 bg-[#FFF9F9] px-5 py-20 md:px-12 md:py-40">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center md:gap-20">
          <div className="min-w-0 text-center md:text-left">
            <Moon
              aria-hidden
              className="mx-auto mb-6 h-9 w-9 text-[#D6CBE3] md:mx-0"
              strokeWidth={1}
            />
            <h2 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-light leading-[1.05] text-[#6D5A60]">
              Softer than a form.
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-[#75636A] md:mx-0 md:text-lg">
              Type it the way you would say it. Luna keeps the note with your
              cycle, so the small things add up to a pattern.
            </p>
          </div>

          <ol
            aria-label="Example notes"
            className="min-w-0 rounded-[2rem] border border-white/70 bg-white/55 px-5 py-1 shadow-[0_20px_40px_rgba(255,181,192,0.08)] sm:px-8"
          >
            {moments.map(({ day, note }) => (
              <li
                key={note}
                className="flex items-center gap-4 border-b border-[#FFDDE0]/70 py-5 last:border-b-0"
              >
                <MoonGlyph day={day} />
                <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-widest tabular-nums text-[#75636A]">
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

      {/* ── A month with Luna: static timeline on phones and with reduced
          motion; pinned, frame-scrubbed cards from md up otherwise. ── */}
      <section
        ref={phaseRef}
        aria-labelledby="month-title"
        className="relative w-full bg-[#FFF9F9] px-5 pb-20 pt-4 motion-safe:md:flex motion-safe:md:min-h-dvh motion-safe:md:items-center motion-safe:md:justify-center motion-safe:md:overflow-hidden motion-safe:md:p-0"
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          width={1920}
          height={1080}
          className="absolute inset-0 hidden h-full w-full object-cover opacity-50 motion-safe:md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_at_center,transparent_20%,#FFF9F9_80%)] motion-safe:md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-[#FFF9F9] via-transparent to-[#FFF9F9] motion-safe:md:block"
        />

        <div className="mx-auto max-w-xl">
          <h2
            id="month-title"
            className="mb-10 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#75636A] motion-safe:md:sr-only"
          >
            A month with Luna
          </h2>
          <ol className="motion-safe:md:absolute motion-safe:md:inset-0 motion-safe:md:flex motion-safe:md:items-center motion-safe:md:justify-center">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <li
                  key={phase.title}
                  ref={(el) => {
                    phaseTextRefs.current[index] = el;
                  }}
                  className="relative flex gap-5 pb-12 last:pb-0 before:absolute before:bottom-0 before:left-6 before:top-14 before:w-px before:bg-[#FFDDE0] last:before:hidden motion-safe:md:absolute motion-safe:md:mx-6 motion-safe:md:max-w-lg motion-safe:md:flex-col motion-safe:md:items-center motion-safe:md:gap-0 motion-safe:md:rounded-[3rem] motion-safe:md:border motion-safe:md:border-white/50 motion-safe:md:bg-white/85 motion-safe:md:px-14 motion-safe:md:py-14 motion-safe:md:text-center motion-safe:md:shadow-[0_30px_60px_rgba(255,181,192,0.12)] motion-safe:md:backdrop-blur-2xl motion-safe:md:will-change-transform motion-safe:md:before:hidden"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#FFDDE0] motion-safe:md:mb-6 motion-safe:md:h-auto motion-safe:md:w-auto motion-safe:md:bg-transparent motion-safe:md:shadow-none motion-safe:md:ring-0">
                    <Icon
                      aria-hidden
                      className="h-6 w-6 motion-safe:md:h-11 motion-safe:md:w-11"
                      strokeWidth={1.2}
                      style={{ color: phase.color }}
                    />
                  </span>
                  <div className="min-w-0 pt-1 motion-safe:md:pt-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A34E68]">
                      {phase.label}
                    </p>
                    <h3 className="mt-2 font-serif text-[clamp(1.9rem,5vw,3.5rem)] font-light leading-tight text-[#6D5A60]">
                      {phase.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-[#75636A] md:text-lg">
                      {phase.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden bg-[#FFF9F9] px-5 py-24 md:min-h-[70dvh] md:px-12 md:py-32">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute left-1/2 top-1/2 h-[80vw] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#FFF9F9] to-[#FFDDE0]/40 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-4xl text-center">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#75636A]">
            Less noise, more knowing
          </p>
          <h2 className="font-serif text-[clamp(2.75rem,8vw,6.5rem)] font-light leading-[1.05] text-[#6D5A60]">
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
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#A34E68]">
              Choose your companion
            </p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-light leading-[1.05] text-[#6D5A60]">
              Luna for every rhythm
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#75636A]">
              Same model, predictions, and tools on every plan. Plans change the
              layout and how Luna talks with you.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                aria-labelledby={`plan-${index}`}
                className={`relative flex min-w-0 flex-col rounded-[2rem] border px-6 py-8 backdrop-blur-xl transition duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-8 sm:py-10 ${plan.card}`}
              >
                {plan.badge && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#D6CBE3]/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60]">
                    {plan.badge}
                  </span>
                )}
                <h3
                  id={`plan-${index}`}
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#6D5A60]"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: plan.dot }}
                  />
                  {plan.name}
                </h3>
                <p className="mb-5 mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-5xl font-light text-[#6D5A60]">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[#75636A]">{plan.period}</span>
                  )}
                </p>
                <p className="mb-7 text-sm leading-relaxed text-[#75636A]">
                  {plan.blurb}
                </p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-[#6D5A60]"
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
          <h2 className="font-serif text-[clamp(2.75rem,7vw,5.5rem)] font-light leading-[1.05] text-[#6D5A60]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[#75636A] md:text-xl">
            Start with one log. Luna learns the rest slowly, and with care.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row-reverse">
            <Link
              href={primaryHref}
              className={cn(primaryButton, "h-14 w-full max-w-xs px-10 sm:w-auto")}
            >
              {isAuthenticated ? "Open Luna" : "Get started"}
            </Link>
            {!isAuthenticated && (
              <Link
                href={ctaHref}
                className={cn(quietButton, "h-14 w-full max-w-xs px-10 sm:w-auto")}
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#75636A]">
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
            <DialogTitle className="font-serif text-2xl font-light">
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
