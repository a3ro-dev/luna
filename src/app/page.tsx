"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CalendarDays,
  Download,
  HeartPulse,
  MoreVertical,
  MessageCircleHeart,
  Moon,
  Sparkles,
} from "lucide-react";
import { usePWAInstall } from "@/components/PWAInstallPrompt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const palette = {
  cream: "#FFF9F9",
  blush: "#FFDDE0",
  rose: "#FFB5C0",
  mauve: "#6D5A60",
  dusk: "#8E7D82",
  lavender: "#D6CBE3",
  honey: "#FBE6B6",
};

const phases = [
  {
    label: "Day 01",
    title: "A gentle beginning",
    body: "Log your rhythm in plain language. Luna embraces it with soft structure.",
    icon: HeartPulse,
    color: palette.rose,
  },
  {
    label: "Day 14",
    title: "Quiet predictions",
    body: "Cycles adapt as your body changes. Confidence shown calmly, without the noise.",
    icon: CalendarDays,
    color: palette.lavender,
  },
  {
    label: "Anytime",
    title: "A companion with memory",
    body: "Let Luna hold onto the small details, making your body feel deeply understood.",
    icon: MessageCircleHeart,
    color: palette.honey,
  },
];

const moments = [
  "cramps after coffee",
  "tender and quiet",
  "energy returning",
  "heavy sleep today",
];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroPhoneRef = useRef<HTMLDivElement>(null);
  const heroWashRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLElement>(null);
  const phaseTextRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quoteRef = useRef<HTMLElement>(null);
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

        gsap.from([heroCopyRef.current, heroPhoneRef.current], {
          opacity: 0,
          y: 40,
          filter: "blur(16px)",
          duration: 1.5,
          stagger: 0.2,
          ease: "power3.out",
        });

        gsap.to(heroPhoneRef.current, {
          yPercent: -15,
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

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (canvas && context) {
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
            const image = new Image();
            image.src = `/frames/frame_${String(index + 1).padStart(4, "0")}.jpg`;
            if (index === 0) image.onload = drawFrame;
            images.push(image);
          }

          const phaseTl = gsap.timeline({
            scrollTrigger: {
              trigger: phaseRef.current,
              start: "top top",
              end: "+=300%",
              scrub: 0.6,
              pin: true,
            },
          });

          // Set initial state for all phase cards
          phaseTextRefs.current.forEach((el) => {
            if (el) gsap.set(el, { opacity: 0, y: 50, filter: "blur(10px)" });
          });

          // Card 0: fade in immediately
          phaseTl.to(
            phaseTextRefs.current[0],
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.8,
              ease: "power2.out",
            },
            0,
          );
          // Card 0: hold, then fade out
          phaseTl.to(
            phaseTextRefs.current[0],
            {
              opacity: 0,
              y: -40,
              filter: "blur(8px)",
              duration: 0.6,
              ease: "power2.in",
            },
            1.2,
          );

          // Card 1: fade in as card 0 fades out
          phaseTl.to(
            phaseTextRefs.current[1],
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.8,
              ease: "power2.out",
            },
            1.0,
          );
          // Card 1: hold, then fade out
          phaseTl.to(
            phaseTextRefs.current[1],
            {
              opacity: 0,
              y: -40,
              filter: "blur(8px)",
              duration: 0.6,
              ease: "power2.in",
            },
            2.4,
          );

          // Card 2: fade in as card 1 fades out
          phaseTl.to(
            phaseTextRefs.current[2],
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.8,
              ease: "power2.out",
            },
            2.2,
          );

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
        }

        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 40, filter: "blur(12px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 80%",
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
      className="min-h-screen overflow-x-hidden bg-[#FFF9F9] font-sans text-[#6D5A60] selection:bg-[#FFDDE0] selection:text-[#6D5A60]"
    >
      <div className="fixed left-0 top-0 z-50 h-[3px] w-full bg-[#FFDDE0]/30">
        <div ref={progressRef} className="h-full w-full bg-[#FFB5C0]" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12">
        <Link
          href="/"
          className="flex items-center gap-2 min-w-0 font-serif text-3xl font-light leading-none text-[#6D5A60]"
        >
          <img src="/luna.png" alt="Luna" className="h-9 w-9 rounded-full" />
          <span className="truncate">Luna</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Primary CTA */}
          <Link
            href={isAuthenticated ? "/dashboard" : signupHref}
            className="rounded-full bg-[#6D5A60] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(109,90,96,0.18)] transition hover:bg-[#8E7D82]"
          >
            {isAuthenticated ? "Open Luna" : "Get started"}
          </Link>

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menu"
                className="h-10 w-10 grid place-items-center rounded-full border border-white/60 bg-white/40 text-[#6D5A60] shadow-[0_10px_30px_rgba(255,181,192,0.15)] backdrop-blur-md transition hover:bg-white/60"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
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
      </header>

      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-20 pt-32"
      >
        <div ref={heroWashRef} className="absolute inset-0 z-0">
          <div className="absolute left-[10%] top-[10%] h-[60vw] w-[60vw] rounded-full bg-[#FFDDE0]/30 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] h-[50vw] w-[50vw] rounded-full bg-[#D6CBE3]/25 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div
            ref={heroCopyRef}
            className="flex flex-col items-center will-change-transform"
          >
            <div className="mb-6 rounded-full border border-white/60 bg-white/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#FFB5C0] shadow-sm backdrop-blur-md">
              Cycle tracking, softened
            </div>
            <h1 className="font-serif text-[clamp(4.5rem,14vw,9.5rem)] font-light leading-[0.95] tracking-tight text-[#6D5A60]">
              Luna
            </h1>
            <p className="mt-8 max-w-2xl text-[clamp(1.2rem,2.5vw,1.6rem)] font-light leading-relaxed text-[#8E7D82]">
              A beautiful cycle tracker that learns your rhythm without making
              your body feel like a dashboard.
            </p>
          </div>

          <div
            ref={heroPhoneRef}
            className="mt-16 w-full max-w-[20rem] will-change-transform"
          >
            <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[3rem] border border-white/60 bg-white/30 p-2 shadow-[0_40px_100px_rgba(255,181,192,0.2)] backdrop-blur-2xl">
              <div className="relative h-full w-full overflow-hidden rounded-[2.5rem]">
                <video
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
                <div className="absolute inset-x-0 bottom-0 p-8 text-center">
                  <p className="font-serif text-3xl font-light text-[#6D5A60]">
                    Today feels tender.
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82]">
                    Logged with Luna
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#FFF9F9] px-5 py-32 md:px-12 md:py-48 z-10">
        <div className="relative mx-auto max-w-5xl text-center">
          <Moon
            className="mx-auto mb-10 h-10 w-10 text-[#D6CBE3] opacity-80"
            strokeWidth={1}
          />
          <h2 className="font-serif text-[clamp(3rem,6vw,5.5rem)] font-light leading-tight text-[#6D5A60]">
            Softer than a form.
          </h2>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {moments.map((moment) => (
              <div
                key={moment}
                className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 px-6 py-10 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(255,181,192,0.12)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                <p className="relative text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0]">
                  quick log
                </p>
                <p className="relative mt-5 font-serif text-2xl font-light leading-snug text-[#6D5A60]">
                  {moment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={phaseRef}
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#FFF9F9]"
      >
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#FFF9F9_80%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF9F9] via-transparent to-[#FFF9F9] pointer-events-none" />

        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <div
              key={phase.title}
              ref={(el) => {
                phaseTextRefs.current[index] = el;
              }}
              className="absolute flex max-w-lg flex-col items-center rounded-[3rem] border border-white/50 bg-white/50 px-10 py-12 text-center shadow-[0_30px_60px_rgba(255,181,192,0.12)] backdrop-blur-2xl will-change-transform md:px-14 md:py-14"
              style={{ opacity: 0 }}
            >
              <Icon
                className="mb-6 h-10 w-10 md:h-11 md:w-11"
                strokeWidth={1.2}
                style={{ color: phase.color }}
              />
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFB5C0]">
                {phase.label}
              </p>
              <h2 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] font-light leading-tight text-[#6D5A60]">
                {phase.title}
              </h2>
              <p className="mt-5 text-base font-light leading-relaxed text-[#8E7D82] md:text-lg">
                {phase.body}
              </p>
            </div>
          );
        })}
      </section>

      <section
        ref={quoteRef}
        className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#FFF9F9] px-5 py-32 md:px-12"
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute left-1/2 top-1/2 h-[80vw] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#FFF9F9] to-[#FFDDE0]/40 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-4xl text-center">
          <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8E7D82]">
            Less noise, more knowing
          </p>
          <h2 className="font-serif text-[clamp(3.5rem,8vw,6.5rem)] font-light leading-[1.05] text-[#6D5A60]">
            Your body can feel familiar again.
          </h2>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative bg-[#FFF9F9] px-5 py-32 md:px-12 z-10">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#FFB5C0]">
            Choose your companion
          </p>
          <h2 className="font-serif text-[clamp(3rem,6vw,4.5rem)] font-light leading-tight text-[#6D5A60] mb-16">
            Luna for every rhythm
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 px-8 py-10 shadow-[0_20px_40px_rgba(255,181,192,0.06)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(255,181,192,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-2">
                  Luna
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-serif text-5xl font-light text-[#6D5A60]">
                    Free
                  </span>
                </div>
                <p className="text-sm font-light text-[#8E7D82] leading-relaxed mb-8">
                  Friendly, practical, gets the job done. Perfect for starting
                  your tracking journey.
                </p>
                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FFB5C0] mt-0.5">✓</span> NLP cycle
                    logging
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FFB5C0] mt-0.5">✓</span> Period &
                    ovulation predictions
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FFB5C0] mt-0.5">✓</span> Dashboard &
                    calendar
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FFB5C0] mt-0.5">✓</span> Web search
                  </li>
                </ul>
                <Link
                  href={ctaHref}
                  className="block w-full h-12 text-center leading-[3rem] rounded-full border border-[#FFDDE0]/60 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7]"
                >
                  {isAuthenticated ? "Go to app" : "Get started"}
                </Link>
              </div>
            </div>

            {/* Premium */}
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-[#D6CBE3]/60 bg-white/50 px-8 py-10 shadow-[0_20px_40px_rgba(214,203,227,0.1)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(214,203,227,0.18)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D6CBE3]/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="absolute top-4 right-4 rounded-full bg-[#D6CBE3]/20 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-[#6D5A60]">
                Popular
              </div>
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D6CBE3] mb-2">
                  Luna Premium
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-serif text-5xl font-light text-[#6D5A60]">
                    $5
                  </span>
                  <span className="text-sm font-light text-[#8E7D82]">/mo</span>
                </div>
                <p className="text-sm font-light text-[#8E7D82] leading-relaxed mb-8">
                  Warm, caring, deeply attentive. Luna remembers the little
                  things and circles back to them.
                </p>
                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#D6CBE3] mt-0.5">✓</span> Everything
                    in Free
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#D6CBE3] mt-0.5">✓</span> Softer,
                    more caring companion
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#D6CBE3] mt-0.5">✓</span> Image
                    understanding
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#D6CBE3] mt-0.5">✓</span> Deeper
                    reasoning
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#D6CBE3] mt-0.5">✓</span> Push
                    notifications
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => openSubscribeModal("Luna Premium")}
                  className="block w-full h-12 text-center leading-[3rem] rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] cursor-pointer"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Premium+ */}
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-[#FBE6B6]/60 bg-white/40 px-8 py-10 shadow-[0_20px_40px_rgba(251,230,182,0.06)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(251,230,182,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FBE6B6]/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FBE6B6] mb-2">
                  Luna Premium+
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-serif text-5xl font-light text-[#6D5A60]">
                    $12
                  </span>
                  <span className="text-sm font-light text-[#8E7D82]">/mo</span>
                </div>
                <p className="text-sm font-light text-[#8E7D82] leading-relaxed mb-8">
                  The softest, most intuitive Luna. A presence that feels like
                  home.
                </p>
                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FBE6B6] mt-0.5">✓</span> Everything
                    in Premium
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FBE6B6] mt-0.5">✓</span> Deepest
                    empathy & intuition
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FBE6B6] mt-0.5">✓</span> Extended
                    reasoning
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FBE6B6] mt-0.5">✓</span> Priority
                    support
                  </li>
                  <li className="flex items-start gap-2 text-sm font-light text-[#8E7D82]">
                    <span className="text-[#FBE6B6] mt-0.5">✓</span> Early
                    access to features
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => openSubscribeModal("Luna Premium+")}
                  className="block w-full h-12 text-center leading-[3rem] rounded-full border border-[#FBE6B6]/60 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FBE6B6]/10 cursor-pointer"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={ctaRef}
        className="relative overflow-hidden bg-[#FFF9F9] px-5 pb-40 pt-20 text-center md:px-12 z-10"
      >
        <div className="relative mx-auto max-w-3xl">
          <Sparkles
            className="mx-auto mb-10 h-10 w-10 text-[#FFB5C0] opacity-80"
            strokeWidth={1}
          />
          <h2 className="font-serif text-[clamp(3rem,7vw,5.5rem)] font-light leading-tight text-[#6D5A60]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-xl font-light leading-relaxed text-[#8E7D82]">
            Start with one log. Luna will learn the rest slowly, privately, and
            with care.
          </p>
          <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={ctaHref}
              className="inline-flex h-14 items-center justify-center rounded-full border border-[#FFDDE0]/60 bg-white/50 px-10 text-[11px] font-semibold uppercase tracking-widest text-[#6D5A60] shadow-[0_12px_24px_rgba(255,181,192,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_40px_rgba(255,181,192,0.2)]"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard" : signupHref}
              className="inline-flex h-14 items-center justify-center rounded-full bg-[#6D5A60] px-10 text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_20px_40px_rgba(109,90,96,0.25)] transition duration-300 hover:-translate-y-1 hover:bg-[#8E7D82] hover:shadow-[0_30px_60px_rgba(109,90,96,0.35)]"
            >
              {isAuthenticated ? "Open Luna" : "Get started"}
            </Link>
          </div>
          {/* Install CTA: prompt when available; otherwise show helpful instructions */}
          {!isInstalled && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (canInstall) {
                    triggerInstall();
                    return;
                  }
                  setShowInstallHelp((v) => !v);
                }}
                className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#FFDDE0]/60 bg-white/40 px-8 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] shadow-[0_10px_30px_rgba(255,181,192,0.15)] backdrop-blur-md transition hover:bg-white/60 hover:text-[#FFB5C0]"
              >
                <Download className="h-4 w-4" />
                {platform === "ios"
                  ? "How to install on iOS"
                  : "Install app"}
              </button>

              {showInstallHelp && (
                <p className="mt-3 text-xs font-light text-[#8E7D82]/60">
                  If you don't see an install prompt, open your browser menu and
                  choose Install app (or Add to Home Screen).
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="relative z-10 bg-[#FFF9F9] px-5 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8E7D82]/50">
          Luna, {new Date().getFullYear()}.
        </p>
        <p className="mt-3 text-xs font-light text-[#8E7D82]/40">
          Questions?{" "}
          <a
            href="mailto:akshatsingh14372@outlook.com"
            className="underline decoration-[#FFB5C0]/40 underline-offset-2 transition hover:text-[#FFB5C0] hover:decoration-[#FFB5C0]"
          >
            akshatsingh14372@outlook.com
          </a>
        </p>
      </footer>

      {/* ── Subscription Modal ── */}
      {subModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-[#6D5A60]/20 backdrop-blur-sm cursor-default"
            onClick={closeSubscribeModal}
            aria-label="Close modal"
          />

          {/* Modal */}
          <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/90 px-8 py-10 shadow-[0_40px_80px_rgba(109,90,96,0.15)] backdrop-blur-2xl animate-[modalIn_0.35s_ease-out]">
            {/* Close button */}
            <button
              type="button"
              onClick={closeSubscribeModal}
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full text-[#8E7D82] transition hover:bg-[#FFDDE0]/30 hover:text-[#6D5A60] cursor-pointer"
              aria-label="Close"
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
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {subStatus === "success" ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFDDE0]/30 text-3xl">
                  ✨
                </div>
                <h3 className="font-serif text-2xl font-light text-[#6D5A60] mb-3">
                  You&apos;re on the list!
                </h3>
                <p className="text-sm font-light text-[#8E7D82] leading-relaxed max-w-xs mx-auto">
                  We&apos;ve sent a confirmation to your email. We&apos;ll reach
                  out personally with next steps for {subModal.plan}.
                </p>
                <button
                  type="button"
                  onClick={closeSubscribeModal}
                  className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-[#FFDDE0]/60 px-8 text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] transition hover:bg-[#FFF5F7] cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div className="text-center mb-8">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0] mb-2">
                    {subModal.plan}
                  </p>
                  <h3 className="font-serif text-2xl font-light text-[#6D5A60]">
                    Get early access
                  </h3>
                  <p className="mt-3 text-sm font-light text-[#8E7D82] leading-relaxed">
                    Leave your email and we&apos;ll set up your subscription
                    personally.
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <label
                      htmlFor="sub-email"
                      className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="sub-email"
                      type="email"
                      required
                      value={subForm.email}
                      onChange={(e) =>
                        setSubForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="you@example.com"
                      className="w-full h-12 rounded-2xl border border-[#FFDDE0]/40 bg-[#FFF9F9] px-5 text-sm font-light text-[#6D5A60] placeholder:text-[#8E7D82]/30 outline-none transition focus:border-[#FFB5C0]/50 focus:ring-2 focus:ring-[#FFB5C0]/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sub-name"
                      className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2"
                    >
                      Name{" "}
                      <span className="font-normal normal-case tracking-normal text-[#8E7D82]/40">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="sub-name"
                      type="text"
                      value={subForm.name}
                      onChange={(e) =>
                        setSubForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Your name"
                      className="w-full h-12 rounded-2xl border border-[#FFDDE0]/40 bg-[#FFF9F9] px-5 text-sm font-light text-[#6D5A60] placeholder:text-[#8E7D82]/30 outline-none transition focus:border-[#FFB5C0]/50 focus:ring-2 focus:ring-[#FFB5C0]/20"
                    />
                  </div>

                  {subStatus === "error" && (
                    <p className="text-xs text-red-400 font-light text-center">
                      {subError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={subStatus === "loading"}
                    className="w-full h-12 rounded-full bg-[#6D5A60] text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition hover:bg-[#8E7D82] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {subStatus === "loading"
                      ? "Sending..."
                      : "Request subscription"}
                  </button>
                </form>

                <p className="mt-6 text-center text-[11px] font-light text-[#8E7D82]/40 leading-relaxed">
                  We handle subscriptions personally. You&apos;ll receive a
                  confirmation email and we&apos;ll follow up within 24 hours.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
