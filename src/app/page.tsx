"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CalendarDays, HeartPulse, MessageCircleHeart, Moon, Sparkles } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const palette = {
  cream: "#FCFBFB",
  blush: "#F7C4C8",
  rose: "#F4A6A6",
  mauve: "#5A4A4D",
  dusk: "#7A6A6D",
  lavender: "#B4A6C4",
  honey: "#EBCB8B",
};

const phases = [
  {
    label: "Day 01",
    title: "A soft place to start",
    body: "Log your period, symptoms, or a messy feeling in plain language. Luna turns it into gentle structure.",
    icon: HeartPulse,
    color: palette.rose,
  },
  {
    label: "Day 14",
    title: "Predictions that breathe",
    body: "Cycle and ovulation windows adapt as your rhythm changes, with confidence shown calmly instead of pretending certainty.",
    icon: CalendarDays,
    color: palette.blush,
  },
  {
    label: "Anytime",
    title: "A companion with memory",
    body: "Ask questions, revisit patterns, and let Luna remember the small details that make your body feel less random.",
    icon: MessageCircleHeart,
    color: palette.lavender,
  },
];

const moments = [
  "cramps after coffee",
  "energy came back",
  "spotting, mid-cycle",
  "felt tender today",
  "sleep was heavy",
  "ovulation test photo",
];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroPhoneRef = useRef<HTMLDivElement>(null);
  const heroWashRef = useRef<HTMLDivElement>(null);
  const heroBandRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLElement>(null);
  const phaseTextRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ribbonRefs = useRef<Array<HTMLDivElement | null>>([]);
  const quoteRef = useRef<HTMLElement>(null);
  const quoteImageRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left center" });
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
          y: 36,
          filter: "blur(12px)",
          duration: 1.1,
          stagger: 0.16,
          ease: "power4.out",
        });

        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "+=130%",
            scrub: 0.7,
            pin: true,
          },
        });

        heroTl
          .to(heroWashRef.current, { yPercent: 12, scale: 1.14, ease: "none" }, 0)
          .to(heroBandRef.current, { yPercent: -22, rotate: -4, ease: "none" }, 0)
          .to(heroPhoneRef.current, { yPercent: -18, rotate: 2.5, ease: "none" }, 0)
          .to(heroCopyRef.current, { yPercent: -10, opacity: 0.2, filter: "blur(4px)", ease: "none" }, 0.12);

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (canvas && context) {
          const frameCount = 428;
          const frames = { frame: 0 };
          const images: HTMLImageElement[] = [];

          const drawFrame = () => {
            const image = images[Math.round(frames.frame)];
            if (!image?.complete || !image.naturalWidth) return;

            const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
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
              end: "+=320%",
              scrub: 0.45,
              pin: true,
            },
          });

          phaseTl
            .set(phaseTextRefs.current, { opacity: 0, y: 40, filter: "blur(10px)" })
            .set(phaseTextRefs.current[0], { opacity: 1, y: 0, filter: "blur(0px)" });

          phases.forEach((_, index) => {
            const current = phaseTextRefs.current[index];
            const next = phaseTextRefs.current[index + 1];

            if (index > 0) return;

            phaseTl
              .to(current, { opacity: 0, y: -34, filter: "blur(8px)", duration: 0.9 }, "+=0.35")
              .to(next, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, "<0.18");
          });

          phaseTl
            .to(phaseTextRefs.current[1], { opacity: 0, y: -34, filter: "blur(8px)", duration: 0.9 }, "+=0.45")
            .to(phaseTextRefs.current[2], { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, "<0.18");

          gsap.to(frames, {
            frame: frameCount - 1,
            snap: "frame",
            ease: "none",
            scrollTrigger: {
              trigger: phaseRef.current,
              start: "top top",
              end: "+=320%",
              scrub: 0.15,
            },
            onUpdate: drawFrame,
          });
        }

        ribbonRefs.current.forEach((ribbon, index) => {
          gsap.to(ribbon, {
            yPercent: index % 2 === 0 ? -28 : 24,
            xPercent: index % 2 === 0 ? 8 : -8,
            ease: "none",
            scrollTrigger: {
              trigger: ribbon,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          });
        });

        gsap.to(quoteImageRef.current, {
          yPercent: 18,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: quoteRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });

        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 48, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease: "power4.out",
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 74%",
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
      className="min-h-screen overflow-x-hidden bg-[#FCFBFB] font-sans text-[#5A4A4D] selection:bg-[#F7C4C8] selection:text-[#FCFBFB]"
    >
      <div className="fixed left-0 top-0 z-50 h-1 w-full bg-[#F7C4C8]/20">
        <div ref={progressRef} className="h-full w-full bg-[#F4A6A6]" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-5 py-5 md:px-10">
        <Link href="/" className="font-serif text-3xl leading-none text-[#5A4A4D]">
          Luna
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-[#F7C4C8]/70 bg-[#FCFBFB]/90 px-5 py-2.5 text-sm font-bold text-[#5A4A4D] shadow-[0_10px_30px_rgba(247,196,200,0.2)] transition hover:border-[#F4A6A6] hover:text-[#9D6269]"
        >
          Start
        </Link>
      </header>

      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden px-5 pt-24 md:px-12">
        <div
          ref={heroWashRef}
          className="absolute inset-0 bg-[radial-gradient(70%_60%_at_72%_28%,rgba(247,196,200,0.38),transparent_68%),linear-gradient(125deg,#FCFBFB_0%,#FBECEF_44%,#FCFBFB_88%)]"
        />
        <div
          ref={heroBandRef}
          className="absolute left-[-16vw] top-[18vh] h-[32vh] w-[140vw] rotate-[-8deg] bg-[#F7C4C8]/24"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div ref={heroCopyRef} className="max-w-3xl will-change-transform">
            <p className="mb-5 w-fit rounded-full border border-[#F7C4C8]/70 bg-[#FCFBFB]/70 px-4 py-2 text-sm font-bold text-[#9D6269]">
              Cycle tracking, softened
            </p>
            <h1 className="font-serif text-[clamp(5.5rem,18vw,14rem)] leading-[0.78] tracking-normal text-[#5A4A4D]">
              Luna
            </h1>
            <p className="mt-8 max-w-2xl text-[clamp(1.35rem,3vw,2.55rem)] font-medium leading-[1.12] text-[#7A6A6D]">
              A beautiful cycle tracker that learns your rhythm without making your body feel like a dashboard.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              {["private by design", "gentle predictions", "AI memory"].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#F7C4C8]/24 px-4 py-2 text-sm font-bold text-[#765D62]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div ref={heroPhoneRef} className="relative mx-auto flex w-full max-w-[29rem] justify-center will-change-transform">
            <div className="absolute -left-8 top-16 h-40 w-20 rotate-[-14deg] rounded-[999px] bg-[#B4A6C4]/30" />
            <div className="absolute -right-5 bottom-20 h-52 w-24 rotate-[18deg] rounded-[999px] bg-[#EBCB8B]/28" />
            <div className="relative aspect-[9/16] w-[min(78vw,24rem)] overflow-hidden rounded-[2.2rem] border-[10px] border-[#FCFBFB] bg-[#FCFBFB] shadow-[0_32px_90px_rgba(247,196,200,0.45)]">
              <video
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster="/frames/frame_0001.jpg"
              >
                <source src="/video.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#FCFBFB] via-[#FCFBFB]/76 to-transparent px-6 pb-6 pt-24">
                <p className="font-serif text-4xl leading-none text-[#5A4A4D]">Today feels tender.</p>
                <p className="mt-3 text-sm font-bold text-[#7A6A6D]/80">Logged with Luna</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-5 py-28 md:px-12 md:py-40">
        <div
          ref={(element) => {
            ribbonRefs.current[0] = element;
          }}
          className="absolute right-[-22vw] top-12 h-28 w-[70vw] rotate-[-10deg] rounded-full bg-[#F7C4C8]/28"
        />
        <div
          ref={(element) => {
            ribbonRefs.current[1] = element;
          }}
          className="absolute bottom-24 left-[-18vw] h-24 w-[62vw] rotate-[9deg] rounded-full bg-[#B4A6C4]/18"
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 md:grid-cols-[0.75fr_1.25fr]">
          <div className="max-w-md">
            <Moon className="mb-8 h-10 w-10 text-[#B4A6C4]" />
            <h2 className="font-serif text-[clamp(3.4rem,8vw,7rem)] leading-[0.9] text-[#5A4A4D]">
              Softer than a form.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {moments.map((moment, index) => (
              <div
                key={moment}
                className={`min-h-28 rounded-[2rem] border border-[#F7C4C8]/45 px-6 py-5 shadow-[0_18px_60px_rgba(247,196,200,0.12)] ${
                  index % 3 === 0 ? "bg-[#F7C4C8]/18" : index % 3 === 1 ? "bg-[#FCFBFB]" : "bg-[#EBCB8B]/16"
                }`}
              >
                <p className="text-sm font-bold text-[#9D6269]">quick log</p>
                <p className="mt-3 font-serif text-3xl leading-none text-[#5A4A4D]">{moment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={phaseRef}
        className="relative flex min-h-screen items-center overflow-hidden border-y border-[#F7C4C8]/30 bg-[#FBECEF] px-5 py-20 md:px-12"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(252,251,251,0.7),transparent_42%),radial-gradient(65%_55%_at_82%_65%,rgba(180,166,196,0.2),transparent_65%)]" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative order-2 h-[58vh] min-h-[27rem] md:order-1">
            {phases.map((phase, index) => {
              const Icon = phase.icon;

              return (
                <div
                  key={phase.title}
                  ref={(element) => {
                    phaseTextRefs.current[index] = element;
                  }}
                  className="absolute inset-0 flex max-w-xl flex-col justify-center will-change-transform"
                >
                  <Icon className="mb-7 h-11 w-11" style={{ color: phase.color }} />
                  <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-[#9D6269]">{phase.label}</p>
                  <h2 className="font-serif text-[clamp(3.25rem,7vw,6.5rem)] leading-[0.92] text-[#5A4A4D]">
                    {phase.title}
                  </h2>
                  <p className="mt-7 max-w-lg text-xl font-medium leading-relaxed text-[#7A6A6D] md:text-2xl">
                    {phase.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="order-1 mx-auto flex w-full max-w-[28rem] justify-center md:order-2">
            <div className="relative aspect-[9/16] w-[min(72vw,23rem)] overflow-hidden rounded-[2.4rem] border-[10px] border-[#FCFBFB] bg-[#FCFBFB] shadow-[0_34px_90px_rgba(90,74,77,0.16)]">
              <canvas ref={canvasRef} width={1080} height={1920} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#FCFBFB]/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#FCFBFB] via-[#FCFBFB]/84 to-transparent px-6 pb-6 pt-28">
                <div>
                  <p className="text-sm font-bold text-[#9D6269]">window</p>
                  <p className="font-serif text-4xl leading-none text-[#5A4A4D]">calm clarity</p>
                </div>
                <Sparkles className="h-7 w-7 text-[#EBCB8B]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={quoteRef} className="relative min-h-[86vh] overflow-hidden px-5 py-32 md:px-12">
        <div
          ref={quoteImageRef}
          className="absolute inset-[-10%] bg-[linear-gradient(rgba(90,74,77,0.12),rgba(90,74,77,0.18)),url('https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=2576&auto=format&fit=crop')] bg-cover bg-center"
        />
        <div className="absolute inset-0 bg-[#F7C4C8]/42 mix-blend-screen" />
        <div className="relative mx-auto flex min-h-[62vh] max-w-7xl items-end">
          <div className="max-w-4xl">
            <p className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-[#FCFBFB] drop-shadow">
              Less noise, more knowing
            </p>
            <h2 className="font-serif text-[clamp(4rem,10vw,9.5rem)] leading-[0.88] text-[#FCFBFB] drop-shadow-[0_12px_30px_rgba(90,74,77,0.24)]">
              Your body can feel familiar again.
            </h2>
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="relative overflow-hidden bg-[#FCFBFB] px-5 py-32 text-center md:px-12 md:py-44">
        <div className="absolute left-1/2 top-20 h-28 w-[78vw] -translate-x-1/2 rotate-[-5deg] rounded-full bg-[#F7C4C8]/24" />
        <div className="relative mx-auto max-w-4xl">
          <Sparkles className="mx-auto mb-8 h-10 w-10 text-[#EBCB8B]" />
          <h2 className="font-serif text-[clamp(3.8rem,9vw,8rem)] leading-[0.9] text-[#5A4A4D]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-xl font-medium leading-relaxed text-[#7A6A6D] md:text-2xl">
            Start with one log. Luna will learn the rest slowly, privately, and with care.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex h-16 items-center justify-center rounded-full bg-[#F7C4C8] px-12 text-lg font-bold text-[#FCFBFB] shadow-[0_20px_50px_rgba(247,196,200,0.45)] transition hover:-translate-y-0.5 hover:bg-[#F4A6A6]"
          >
            Start Tracking
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#F7C4C8]/25 bg-[#FCFBFB] px-5 py-10 text-center text-sm font-bold text-[#7A6A6D]/55">
        Luna, {new Date().getFullYear()}. Designed with precision and motion.
      </footer>
    </main>
  );
}
