"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useCan3d } from "./capability";
import { spring } from "@/lib/motion";
import { useResolvedTheme } from "@/lib/theme/mode";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js only downloads when the 3D scene will actually run.
const CycleScene = dynamic(() => import("./CycleScene"), { ssr: false });

// Must match CycleScene: days and the example phase split.
const DAYS = 28;
const PHASE_LABEL = (day: number) =>
  day <= 5 ? "Period" : day <= 12 ? "Follicular" : day <= 16 ? "Ovulation window" : "Luteal";

// Chapter windows as fractions of the pin (CycleScene starts the walk at 0.16).
const CHAPTERS = [0.16, 0.36, 0.56, 0.76] as const;
const CYCLE_START = 0.16;
const CYCLE_END = 0.96;

interface Chapter {
  label: string;
  title: string;
  body: string;
  proof: ReactNode;
}

const proofCard =
  "mt-5 rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-surface)]/80 p-4 text-sm text-[var(--landing-ink)] shadow-[var(--landing-shadow-card)] backdrop-blur-md";

const CHAPTER_CONTENT: Chapter[] = [
  {
    label: "Log",
    title: "Say it the way you'd say it.",
    body: "Tell Luna “my period started today” and it's logged. Or tap once on your dashboard.",
    proof: (
      <div className={proofCard}>
        <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-[var(--landing-ink)] px-3.5 py-2 text-[var(--landing-surface)]">my period started today</p>
        <p className="mt-2 w-fit rounded-2xl rounded-bl-md bg-[var(--landing-bubble)] px-3.5 py-2">Logged for today. Your next window is updating.</p>
      </div>
    ),
  },
  {
    label: "Look ahead",
    title: "A likely window, honestly drawn.",
    body: "Luna shows a range and what it's based on, so you can tell when to lean on it and when it's still learning.",
    proof: (
      <div className={proofCard}>
        <p className="text-[13px] font-medium text-[var(--landing-secondary)]">Next period, example</p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.022em] tabular-nums text-[var(--landing-ink)]">Most likely Oct 21 to 26</p>
        <p className="mt-1 text-xs text-[var(--landing-secondary)]">Based on 5 of your cycles</p>
      </div>
    ),
  },
  {
    label: "Notice",
    title: "Patterns, without the alarm.",
    body: "A quiet check of your last six months against clinical reference ranges. A summary, never a diagnosis.",
    proof: (
      <ul className={`${proofCard} space-y-2`}>
        {[
          ["Cycle length", "typical", "bg-[var(--landing-sage)]"],
          ["Period length", "typical", "bg-[var(--landing-sage)]"],
          ["Regularity", "needs 1 more cycle", "bg-[var(--landing-lavender)]"],
        ].map(([k, v, dot]) => (
          <li key={k} className="flex items-center gap-2.5">
            <span aria-hidden className={`size-2.5 rounded-full ${dot}`} />
            <span className="font-medium">{k}</span>
            <span className="text-[var(--landing-secondary)]">{v}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    label: "Talk",
    title: "Questions at 2am get a warm answer.",
    body: "Ask about cramps, a late period or what your numbers mean. Luna answers from your own logs.",
    proof: null,
  },
];

function StaticMoon({ phase = "crescent" }: { phase?: "crescent" | "full" | "waning" }) {
  const background =
    phase === "full"
      ? "radial-gradient(circle at 45% 40%, var(--landing-moon-full))"
      : `radial-gradient(circle at ${phase === "waning" ? 78 : 22}% 46%, var(--landing-moon-phase))`;
  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{ background, boxShadow: "var(--landing-moon-rim)" }}
    />
  );
}

function ChapterText({ c, i }: { c: Chapter; i: number }) {
  return (
    <>
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--landing-accent)]">
        <span className="sr-only">Step {i + 1}: </span>
        {c.label}
      </p>
      <h2 className="mt-2 font-display text-[clamp(1.9rem,4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--landing-ink)]">
        {c.title}
      </h2>
      <p className="mt-3 max-w-[34ch] text-[17px] leading-[1.47] tracking-[-0.01em] text-[var(--landing-secondary)]">{c.body}</p>
    </>
  );
}

/**
 * The landing hero: the intro (wordmark and call to action) followed by four
 * chapters. With 3D available the section pins and the chapters play over the
 * moon scene as you scroll; otherwise it is an ordinary, fully readable page.
 */
export default function CycleHero({ intro, finale }: { intro: ReactNode; finale: ReactNode }) {
  const can3d = useCan3d();
  return can3d ? <PinnedHero intro={intro} finale={finale} /> : <StaticHero intro={intro} finale={finale} />;
}

function StaticHero({ intro, finale }: { intro: ReactNode; finale: ReactNode }) {
  return (
    <>
      <section className="relative flex min-h-dvh items-center overflow-hidden px-5 [background:var(--landing-sky)] pb-16 pt-[calc(5rem+env(safe-area-inset-top))] md:px-12 wide:pb-24 wide:pt-32">
        {/* Normal flow: moon above the text on phones, beside it (left) when wide. Never on top of it. */}
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 wide:flex-row wide:justify-between wide:gap-12">
          <div aria-hidden className="relative aspect-square w-[min(56vw,15rem)] shrink-0 wide:w-[min(38vw,30rem)]">
            <StaticMoon />
          </div>
          <div className="relative z-10 min-w-0">{intro}</div>
        </div>
      </section>
      <section aria-label="How Luna works" className="relative bg-[var(--landing-bg)] px-5 py-16 md:px-12 md:py-28">
        <ol className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2 md:gap-x-16 md:gap-y-20">
          {CHAPTER_CONTENT.map((c, i) => (
            <li key={c.label} className="relative min-w-0">
              <div aria-hidden className="relative mb-5 size-12">
                <StaticMoon phase={i === 0 ? "crescent" : i === 3 ? "waning" : "full"} />
              </div>
              <ChapterText c={c} i={i} />
              {c.proof ?? <div className="mt-6">{finale}</div>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function PinnedHero({ intro, finale }: { intro: ReactNode; finale: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const dayNum = useRef<HTMLSpanElement>(null);
  const dayPhase = useRef<HTMLSpanElement>(null);
  const dayReadout = useRef<HTMLParagraphElement>(null);
  const chapters = useRef<Array<HTMLLIElement | null>>([]);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const invalidate = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const theme = useResolvedTheme();

  useGSAP(
    () => {
      // Mobile browsers resize the viewport as the address bar hides; don't re-pin for that.
      ScrollTrigger.config({ ignoreMobileResize: true });

      const items = chapters.current.filter((el): el is HTMLLIElement => Boolean(el));
      const tl = gsap.timeline({ defaults: { ease: "power1.inOut" } });
      tl.to(introRef.current, { opacity: 0, y: -28, duration: 0.07 }, 0.04);
      items.forEach((el, i) => {
        const start = CHAPTERS[i];
        tl.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.05 }, start);
        if (i < items.length - 1) tl.to(el, { opacity: 0, y: -18, duration: 0.04 }, CHAPTERS[i + 1] - 0.04);
      });
      tl.fromTo(dayReadout.current, { opacity: 0 }, { opacity: 1, duration: 0.05 }, CYCLE_START);
      tl.set({}, {}, 1); // timeline length = 1, so positions are fractions of the pin

      let active = -1;
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "+=320%",
        pin: true,
        scrub: 0.4,
        animation: tl,
        onUpdate: (self) => {
          const pr = self.progress;
          progress.current = pr;
          invalidate.current();
          if (halo.current) halo.current.style.opacity = String(0.5 + 0.35 * Math.sin(Math.PI * Math.min(1, pr * 1.2)));

          const q = Math.min(1, Math.max(0, (pr - CYCLE_START) / (CYCLE_END - CYCLE_START)));
          const day = Math.min(DAYS, Math.max(1, Math.round(1 + (DAYS - 1) * q)));
          if (dayNum.current) dayNum.current.textContent = String(day);
          if (dayPhase.current) dayPhase.current.textContent = PHASE_LABEL(day);

          // Only the visible chapter takes pointer input (its links stay clickable).
          const idx = pr < CHAPTERS[0] ? -1 : CHAPTERS.findLastIndex((c) => pr >= c);
          if (idx !== active) {
            active = idx;
            items.forEach((el, i) => el.toggleAttribute("data-active", i === idx));
            introRef.current?.toggleAttribute("inert", idx !== -1);
          }
        },
      });

      // Keyboard users: focusing into a chapter scrolls the pin to it, so focus is never on invisible text.
      const onFocus = items.map((el, i) => {
        const handler = () => {
          const target = st.start + (st.end - st.start) * (CHAPTERS[i] + 0.06);
          if (Math.abs(window.scrollY - target) > 4) window.scrollTo({ top: target });
        };
        el.addEventListener("focusin", handler);
        return () => el.removeEventListener("focusin", handler);
      });

      if (!window.matchMedia("(pointer: fine)").matches) return () => onFocus.forEach((off) => off());
      const onMove = (e: PointerEvent) => {
        if (!st.isActive) return;
        pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
        invalidate.current();
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => {
        window.removeEventListener("pointermove", onMove);
        onFocus.forEach((off) => off());
      };
    },
    { scope: section },
  );

  return (
    <section ref={section} aria-label="Luna, and how it works" className="relative h-svh overflow-hidden [background:var(--landing-sky)]">
      {/* 3D layer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          ref={halo}
          className="absolute left-1/2 top-[24%] aspect-square w-[min(120vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 wide:left-1/4 wide:top-[52%]"
          style={{ background: "var(--landing-halo)" }}
        />
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
          transition={{ ...spring.smooth, delay: 0.1 }}
        >
          <CycleScene
            progress={progress}
            pointer={pointer}
            theme={theme}
            onReady={(requestFrame) => {
              invalidate.current = requestFrame;
              setReady(true);
            }}
          />
        </motion.div>
      </div>

      {/* Intro: text below the moon on phones, on the right when wide (the scene keeps the moon left) */}
      <div
        ref={introRef}
        className="absolute inset-0 z-10 flex items-end px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] md:px-12 wide:items-center wide:pb-24 wide:pt-32"
      >
        <div className="mx-auto w-full max-w-5xl wide:flex wide:justify-end">{intro}</div>
      </div>

      {/* Readability scrim for chapters on phones, where text sits over the scene */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[55%] bg-gradient-to-t from-[var(--landing-bg)] via-[var(--landing-bg)]/85 to-transparent wide:hidden" />

      <p
        ref={dayReadout}
        aria-hidden
        className="absolute left-1/2 top-[calc(4.75rem+env(safe-area-inset-top))] z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--landing-surface)]/70 bg-[var(--landing-surface)]/70 px-3.5 py-1.5 text-xs font-medium tabular-nums text-[var(--landing-ink)] opacity-0 backdrop-blur-md wide:left-1/4 wide:top-auto wide:bottom-10"
      >
        Day <span ref={dayNum}>1</span> · <span ref={dayPhase}>Period</span>
        <span className="text-[var(--landing-tertiary)]"> · example cycle</span>
      </p>

      <ol className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[calc(2.25rem+env(safe-area-inset-bottom))] wide:bottom-auto wide:left-auto wide:right-[max(1.5rem,calc(50%-34rem))] wide:top-1/2 wide:w-[min(26rem,calc(50%-2rem))] wide:-translate-y-1/2 wide:px-0 wide:pb-0">
        {CHAPTER_CONTENT.map((c, i) => (
          <li
            key={c.label}
            ref={(el) => {
              chapters.current[i] = el;
            }}
            className="pointer-events-none absolute inset-x-5 bottom-[calc(2.25rem+env(safe-area-inset-bottom))] opacity-0 data-[active]:pointer-events-auto wide:inset-x-0 wide:bottom-auto wide:top-1/2 wide:-translate-y-1/2"
          >
            <ChapterText c={c} i={i} />
            {/* Short landscape screens (a phone on its side): the pin can't fit the proof card. */}
            {c.proof ? <div className="[@media(max-height:30rem)]:hidden">{c.proof}</div> : <div className="mt-6">{finale}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
