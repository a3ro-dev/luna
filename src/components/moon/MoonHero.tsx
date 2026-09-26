"use client";

import { useRef, useState, useSyncExternalStore, type RefObject } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js only downloads when the 3D moon will actually run.
const MoonScene = dynamic(() => import("./MoonScene"), { ssr: false });

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement("canvas");
      webgl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

/** 3D only with motion allowed, no Save-Data, a capable device and WebGL. */
function canRender3d() {
  if (window.matchMedia(REDUCED).matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) < 2) return false;
  return hasWebGL();
}

/**
 * A still CSS moon: the server render, the loading state, and the permanent
 * version for reduced motion, Save-Data, weak devices and no WebGL.
 */
function StaticMoon() {
  return (
    <div
      className="absolute inset-[9%] rounded-full"
      style={{
        // Same waxing crescent the 3D moon starts on, so the handoff doesn't jump.
        background:
          "radial-gradient(circle at 22% 46%, #E6DDEE 0%, #E6DDEE 58%, #F6ECEF 70%, #FFF4EF 82%)",
        boxShadow: "inset 0.3rem -0.2rem 1rem rgba(255,181,192,0.22)",
      }}
    />
  );
}

/**
 * The landing hero's moon. It fills from a crescent to full as the hero
 * scrolls away. Decorative: hidden from assistive tech, never intercepts input.
 * Position and size come from the caller's className (an absolute, square box).
 */
export default function MoonHero({
  trigger,
  className = "",
}: {
  /** The section whose scroll range drives the phase. */
  trigger: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  // Set by MoonScene once the canvas exists; importing R3F here would pull
  // three.js into the landing page's first load.
  const invalidate = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const use3d = useSyncExternalStore(subscribe, canRender3d, () => false);

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: trigger.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          progress.current = self.progress;
          // Opacity only: the glow brightens as the moon fills.
          if (halo.current) halo.current.style.opacity = String(0.45 + 0.45 * self.progress);
          invalidate.current();
        },
      });

      // Gentle tilt toward a fine pointer, only while the hero is on screen.
      if (!use3d || !window.matchMedia("(pointer: fine)").matches) return;
      const onMove = (e: PointerEvent) => {
        if (st.progress >= 1) return;
        pointer.current = {
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: (e.clientY / window.innerHeight) * 2 - 1,
        };
        invalidate.current();
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: root, dependencies: [use3d], revertOnUpdate: true },
  );

  return (
    <div ref={root} aria-hidden className={`pointer-events-none select-none ${className}`}>
      <div
        ref={halo}
        className="absolute inset-[-12%] rounded-full opacity-45"
        style={{
          background:
            "radial-gradient(circle, rgba(255,221,224,0.9) 0%, rgba(255,221,224,0.35) 38%, rgba(214,203,227,0.18) 55%, transparent 70%)",
        }}
      />
      {/* The still moon stays until the first 3D frame exists, then hands over. */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: use3d && ready ? 0 : 1 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0 }}
      >
        <StaticMoon />
      </motion.div>
      {use3d ? (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", duration: 0.9, bounce: 0.15, delay: 0.15 }}
        >
          <MoonScene
            progress={progress}
            pointer={pointer}
            onReady={(requestFrame) => {
              invalidate.current = requestFrame;
              setReady(true);
            }}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
