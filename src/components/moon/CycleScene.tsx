"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createMoonUniforms,
  moonFragmentShader,
  moonVertexShader,
  springStep,
  sunForPhase,
} from "./moonMaterial";

/**
 * "A cycle, told by the moon": the landing hero's pinned 3D scene.
 *
 * One spring-smoothed scroll progress drives everything, so the pieces never
 * drift apart: the moon glides from behind the wordmark to centre stage, a ring
 * of 28 day-beads (coloured by cycle phase) fades in around it, a glowing marker
 * walks the ring, and the moon runs its own phases in step. Rendering is on
 * demand: frames are drawn only while the springs are moving.
 */

export interface CycleInputs {
  /** 0 at the top of the pinned hero, 1 at the end of the pin. */
  progress: RefObject<number>;
  /** Pointer in [-1, 1]; stays (0, 0) on touch devices. */
  pointer: RefObject<{ x: number; y: number }>;
}

export const DAYS = 28;
/** Day (1-based) -> phase colour. An example 28-day cycle, not anyone's data. */
export function phaseOfDay(day: number): "period" | "follicular" | "ovulation" | "luteal" {
  if (day <= 5) return "period";
  if (day <= 12) return "follicular";
  if (day <= 16) return "ovulation";
  return "luteal";
}
const PHASE_COLOR = {
  period: "#EE8FA3",
  follicular: "#B9A6DD",
  ovulation: "#EBC46E",
  luteal: "#F4B8C4",
} as const;

// Scroll choreography (fractions of the pin).
const GLIDE_END = 0.14;
const RING_START = 0.08;
const RING_END = 0.2;
const CYCLE_START = 0.16;
const CYCLE_END = 0.96;

const PHASE_START = 0.36 * Math.PI; // waxing crescent, lit on the right
const PHASE_SPAN = 1.36 * Math.PI; // ... through full ... to a waning crescent

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where one day sits on the ring, in ring-local space. */
function ringPoint(day: number, radius: number, out: THREE.Vector3) {
  const a = -Math.PI / 2 + ((day - 1) / DAYS) * Math.PI * 2;
  return out.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
}

function glowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,236,214,0.85)");
  grad.addColorStop(1, "rgba(255,214,222,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Scene({ progress, pointer }: CycleInputs) {
  const viewport = useThree((s) => s.viewport);
  const group = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Group>(null);
  const beads = useRef<THREE.InstancedMesh>(null);
  const track = useRef<THREE.Mesh>(null);
  const marker = useRef<THREE.Sprite>(null);

  const p = useRef({ x: 0, v: 0 });
  // Entrance: the crescent grows in on load. It also keeps frames coming while
  // the canvas settles into its final size (frameloop is on demand).
  const entrance = useRef({ x: 0, v: 0 });
  const tiltX = useRef({ x: 0, v: 0 });
  const tiltY = useRef({ x: 0, v: 0 });

  const uniforms = useMemo(() => createMoonUniforms(), []);
  const glow = useMemo(() => glowTexture(), []);
  const scratch = useMemo(
    () => ({
      v: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      c: new THREE.Color(),
      dim: new THREE.Color("#EDE6F2"),
    }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    const m = moon.current;
    if (!g || !m || !beads.current || !ring.current || !marker.current || !track.current) return;
    const dt = Math.min(delta, 1 / 30);

    let moving = springStep(p.current, progress.current ?? 0, dt, 70, 0.9);
    moving = springStep(entrance.current, 1, dt, 18, 1) || moving;
    const introT = Math.min(1, Math.max(0, entrance.current.x));
    const ptr = pointer.current ?? { x: 0, y: 0 };
    moving = springStep(tiltX.current, ptr.y * 0.12, dt, 30, 0.9) || moving;
    moving = springStep(tiltY.current, ptr.x * 0.18, dt, 30, 0.9) || moving;
    const pr = Math.min(1, Math.max(0, p.current.x));

    // Layout in world units, so the composition adapts to any aspect ratio.
    const w = viewport.width;
    const h = viewport.height;
    const narrow = w / h < 0.85;
    const intro = narrow
      ? { x: 0, y: h * 0.19, s: Math.min(1.25, w * 0.62) }
      : { x: -w * 0.27, y: h * 0.1, s: Math.min(1.35, h * 0.34) };
    const stage = narrow
      ? { x: 0, y: h * 0.16, s: Math.min(0.9, w * 0.25) }
      : { x: w * 0.235, y: -h * 0.02, s: Math.min(0.85, h * 0.2) };

    const glide = smooth(0, GLIDE_END, pr);
    g.position.set(lerp(intro.x, stage.x, glide), lerp(intro.y, stage.y, glide), 0);
    g.scale.setScalar(lerp(intro.s, stage.s, glide) * (0.94 + 0.06 * introT));

    // Moon: phase follows the walk around the ring; it turns a little as it goes.
    const q = smooth(CYCLE_START, CYCLE_END, pr);
    sunForPhase(PHASE_START - 0.2 * Math.PI * (1 - introT) + PHASE_SPAN * q, uniforms.uSun.value);
    m.rotation.set(0.18 + tiltX.current.x, -0.6 + q * 1.1 + tiltY.current.x, 0.08);
    m.updateMatrixWorld();
    uniforms.uRot.value.setFromMatrix4(m.matrixWorld);

    // Ring: arrives, then the marker walks day 1 -> 28.
    const arrive = smooth(RING_START, RING_END, pr);
    ring.current.visible = arrive > 0.001;
    ring.current.scale.setScalar(lerp(0.82, 1, arrive));
    ring.current.rotation.set(1.02 + tiltX.current.x * 0.5, 0, -0.22 + tiltY.current.x * 0.3);
    (track.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * arrive;
    (beads.current.material as THREE.MeshBasicMaterial).opacity = arrive;

    const current = 1 + (DAYS - 1) * q;
    for (let d = 1; d <= DAYS; d++) {
      const dist = Math.abs(d - current);
      const lit = d <= current + 0.5;
      const size = (lit ? 1 : 0.72) * (1 + 0.9 * Math.max(0, 1 - dist));
      ringPoint(d, 1.75, scratch.v);
      scratch.s.setScalar(size);
      scratch.m.compose(scratch.v, scratch.q, scratch.s);
      beads.current.setMatrixAt(d - 1, scratch.m);
      scratch.c.set(PHASE_COLOR[phaseOfDay(d)]);
      if (!lit) scratch.c.lerp(scratch.dim, 0.55);
      beads.current.setColorAt(d - 1, scratch.c);
    }
    beads.current.instanceMatrix.needsUpdate = true;
    if (beads.current.instanceColor) beads.current.instanceColor.needsUpdate = true;

    ringPoint(current, 1.75, marker.current.position);
    marker.current.material.opacity = arrive * 0.95;
    marker.current.scale.setScalar(0.55);

    if (moving) state.invalidate();
  });

  return (
    <group ref={group}>
      <mesh ref={moon}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial vertexShader={moonVertexShader} fragmentShader={moonFragmentShader} uniforms={uniforms} />
      </mesh>
      <group ref={ring} visible={false}>
        <mesh ref={track} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.75, 0.006, 8, 160]} />
          <meshBasicMaterial color="#C9B8E3" transparent opacity={0} toneMapped={false} />
        </mesh>
        <instancedMesh ref={beads} args={[undefined, undefined, DAYS]}>
          <sphereGeometry args={[0.052, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} toneMapped={false} />
        </instancedMesh>
        <sprite ref={marker}>
          <spriteMaterial map={glow} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
    </group>
  );
}

export default function CycleScene({
  progress,
  pointer,
  onReady,
}: CycleInputs & { onReady: (requestFrame: () => void) => void }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 30, position: [0, 0, 7] }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={(state) => {
        state.invalidate();
        onReady(() => state.invalidate());
      }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Scene progress={progress} pointer={pointer} />
    </Canvas>
  );
}
