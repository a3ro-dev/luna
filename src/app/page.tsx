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
              end: "bottom bottom",
              scrub: 0.8,
            },
          });

          phases.forEach((_, index) => {
            const current = phaseTextRefs.current[index];
            if (!current) return;
            gsap.set(current, { xPercent: -50, yPercent: -50, opacity: 0, y: 80, scale: 0.95, filter: "blur(16px)" });
          });

          phaseTl.to(phaseTextRefs.current[0], {
            opacity: 1, y: 0, scale: 1, filter: "blur(0px)", pointerEvents: "auto", duration: 0.8, ease: "power2.out"
          }, 0.1);
          
          phaseTl.to(phaseTextRefs.current[0], {
            opacity: 0, y: -80, scale: 1.05, filter: "blur(16px)", pointerEvents: "none", duration: 0.8, ease: "power2.in"
          }, "+=1.5");

          phaseTl.to(phaseTextRefs.current[1], {
            opacity: 1, y: 0, scale: 1, filter: "blur(0px)", pointerEvents: "auto", duration: 0.8, ease: "power2.out"
          }, "<0.4");
          
          phaseTl.to(phaseTextRefs.current[1], {
            opacity: 0, y: -80, scale: 1.05, filter: "blur(16px)", pointerEvents: "none", duration: 0.8, ease: "power2.in"
          }, "+=1.5");

          phaseTl.to(phaseTextRefs.current[2], {
            opacity: 1, y: 0, scale: 1, filter: "blur(0px)", pointerEvents: "auto", duration: 0.8, ease: "power2.out"
          }, "<0.4");

          gsap.to(frames, {
            frame: frameCount - 1,
            snap: "frame",
            ease: "none",
            scrollTrigger: {
              trigger: phaseRef.current,
              start: "top top",
              end: "bottom bottom",
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
          }
        );
      });

      return () => mm.revert();
    },
    { scope: rootRef }
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
        <Link href="/" className="font-serif text-3xl font-light leading-none text-[#6D5A60]">
          Luna
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-white/60 bg-white/40 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#6D5A60] shadow-[0_10px_30px_rgba(255,181,192,0.15)] backdrop-blur-md transition hover:bg-white/60 hover:text-[#FFB5C0]"
        >
          Start
        </Link>
      </header>

      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-20 pt-32">
        <div ref={heroWashRef} className="absolute inset-0 z-0">
          <div className="absolute left-[10%] top-[10%] h-[60vw] w-[60vw] rounded-full bg-[#FFDDE0]/30 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] h-[50vw] w-[50vw] rounded-full bg-[#D6CBE3]/25 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div ref={heroCopyRef} className="flex flex-col items-center will-change-transform">
            <div className="mb-6 rounded-full border border-white/60 bg-white/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#FFB5C0] shadow-sm backdrop-blur-md">
              Cycle tracking, softened
            </div>
            <h1 className="font-serif text-[clamp(4.5rem,14vw,9.5rem)] font-light leading-[0.95] tracking-tight text-[#6D5A60]">
              Luna
            </h1>
            <p className="mt-8 max-w-2xl text-[clamp(1.2rem,2.5vw,1.6rem)] font-light leading-relaxed text-[#8E7D82]">
              A beautiful cycle tracker that learns your rhythm without making your body feel like a dashboard.
            </p>
          </div>

          <div ref={heroPhoneRef} className="mt-16 w-full max-w-[20rem] will-change-transform">
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
                  <p className="font-serif text-3xl font-light text-[#6D5A60]">Today feels tender.</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82]">Logged with Luna</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#FFF9F9] px-5 py-32 md:px-12 md:py-48 z-10">
        <div className="relative mx-auto max-w-5xl text-center">
          <Moon className="mx-auto mb-10 h-10 w-10 text-[#D6CBE3] opacity-80" strokeWidth={1} />
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
                <p className="relative text-[10px] font-semibold uppercase tracking-widest text-[#FFB5C0]">quick log</p>
                <p className="relative mt-5 font-serif text-2xl font-light leading-snug text-[#6D5A60]">{moment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={phaseRef} className="relative h-[400vh] w-full bg-[#FFF9F9]">
        <div className="sticky left-0 top-0 h-screen w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#FFF9F9_100%)] opacity-70 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFF9F9] via-transparent to-[#FFF9F9] pointer-events-none" />

          <div className="absolute inset-0 pointer-events-none">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <div
                  key={phase.title}
                  ref={(el) => {
                    phaseTextRefs.current[index] = el;
                  }}
                  className="absolute left-1/2 top-1/2 flex w-[calc(100%-40px)] max-w-xl flex-col items-center rounded-[3.5rem] border border-white/60 bg-white/50 px-8 py-14 text-center shadow-[0_40px_80px_rgba(255,181,192,0.15)] backdrop-blur-2xl will-change-transform md:px-14 md:py-16"
                  style={{ opacity: 0, pointerEvents: "none" }}
                >
                  <Icon className="mb-8 h-12 w-12" strokeWidth={1} style={{ color: phase.color }} />
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFB5C0]">
                    {phase.label}
                  </p>
                  <h2 className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-light leading-tight text-[#6D5A60]">
                    {phase.title}
                  </h2>
                  <p className="mt-6 text-lg font-light leading-relaxed text-[#8E7D82]">
                    {phase.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={quoteRef} className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#FFF9F9] px-5 py-32 md:px-12">
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

      <section ref={ctaRef} className="relative overflow-hidden bg-[#FFF9F9] px-5 pb-40 pt-20 text-center md:px-12 z-10">
        <div className="relative mx-auto max-w-3xl">
          <Sparkles className="mx-auto mb-10 h-10 w-10 text-[#FFB5C0] opacity-80" strokeWidth={1} />
          <h2 className="font-serif text-[clamp(3rem,7vw,5.5rem)] font-light leading-tight text-[#6D5A60]">
            Meet Luna gently.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-xl font-light leading-relaxed text-[#8E7D82]">
            Start with one log. Luna will learn the rest slowly, privately, and with care.
          </p>
          <Link
            href="/login"
            className="mt-14 inline-flex h-14 items-center justify-center rounded-full bg-[#6D5A60] px-10 text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_20px_40px_rgba(109,90,96,0.25)] transition duration-300 hover:-translate-y-1 hover:bg-[#8E7D82] hover:shadow-[0_30px_60px_rgba(109,90,96,0.35)]"
          >
            Start Tracking
          </Link>
        </div>
      </section>

      <footer className="relative z-10 bg-[#FFF9F9] px-5 py-12 text-center text-xs font-semibold uppercase tracking-widest text-[#8E7D82]/50">
        Luna, {new Date().getFullYear()}.
      </footer>
    </main>
  );
}
