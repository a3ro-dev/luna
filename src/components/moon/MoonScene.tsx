"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The hero moon. Everything is procedural (no textures to download): craters,
 * maria and grain come from noise evaluated on the sphere, and the phase is
 * just the direction of the light. Scroll progress and pointer position arrive
 * through refs, so scrolling never re-renders React; a spring in useFrame eases
 * toward them and keeps requesting frames only until it settles
 * (frameloop="demand"), so an idle page draws nothing.
 */

export interface MoonInputs {
  /** 0 at the top of the hero, 1 once it has scrolled away. */
  progress: RefObject<number>;
  /** Pointer position in [-1, 1], (0, 0) when unknown or coarse pointer. */
  pointer: RefObject<{ x: number; y: number }>;
}

// Phase is the sun's angle around the moon: 0 = new, PI/2 = first quarter
// (lit on the right), PI = full. The hero starts as a waxing crescent and
// fills to full as it scrolls away.
const PHASE_INTRO = 0.12 * Math.PI;
const PHASE_START = 0.36 * Math.PI;
const PHASE_END = 0.98 * Math.PI;

const vertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldN;
  void main() {
    vObj = position;
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSun;
  uniform mat3 uRot;
  uniform vec3 uLit;
  uniform vec3 uMare;
  uniform vec3 uShadow;
  uniform vec3 uRim;
  varying vec3 vObj;
  varying vec3 vWorldN;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }
  float hash(vec3 p) { return hash3(p).x; }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  // Sparse craters on a 3D cell grid: a bowl with a raised rim. Adds the
  // surface slope to 'tilt' (object space) so lighting picks up the relief.
  float craters(vec3 p, float scale, inout vec3 tilt) {
    vec3 q = p * scale;
    vec3 i = floor(q);
    vec3 f = fract(q);
    float h = 0.0;
    for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = hash3(i + g);
      if (o.y > 0.5) continue;
      float r = 0.16 + 0.28 * o.x;
      vec3 d = g + o - f;
      float dist = length(d);
      float t = dist / r;
      if (t < 1.5) {
        float inside = step(t, 1.0);
        float rim = exp(-pow((t - 1.0) * 4.5, 2.0)) * 0.4;
        h += ((t * t - 1.0) * inside + rim) * r;
        float slope = 2.0 * t * inside + rim * (-2.0 * (t - 1.0) * 20.25);
        tilt -= slope * (d / max(dist, 1e-4)) * 0.3;
      }
    }
    return h;
  }

  void main() {
    vec3 p = normalize(vObj);
    float mare = smoothstep(0.5, 0.68, fbm(p * 1.7 + 3.1));
    vec3 tilt = vec3(0.0);
    float h = craters(p, 4.5, tilt) + 0.5 * craters(p + 7.3, 10.0, tilt);
    vec3 n = normalize(vWorldN + uRot * tilt * 0.22);

    float lambert = dot(n, uSun);
    float light = smoothstep(-0.06, 0.32, lambert);
    float grain = fbm(p * 22.0);
    vec3 albedo = mix(uLit, uMare, mare * 0.6) * (0.93 + 0.1 * grain) * (1.0 + h * 0.22);
    // Earthshine: the dark side stays soft and still shows faint maria and grain.
    vec3 dark = uShadow * (0.95 + 0.07 * grain) * (1.0 - mare * 0.06);
    vec3 col = mix(dark, albedo, light);

    // Soft blush rim, stronger on the lit side.
    float fres = pow(1.0 - clamp(normalize(vWorldN).z, 0.0, 1.0), 2.5);
    col += uRim * fres * (0.18 + 0.45 * light);

    gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
  }
`;

function Moon({ progress, pointer }: MoonInputs) {
  const mesh = useRef<THREE.Mesh>(null);
  // One spring for the phase, one per tilt axis. Slightly under-damped so the
  // moon settles with a hint of weight instead of stopping dead.
  const phase = useRef({ x: PHASE_INTRO, v: 0 });
  const tilt = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const sun = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uSun: { value: new THREE.Vector3(0, 0, 1) },
      uRot: { value: new THREE.Matrix3() },
      uLit: { value: new THREE.Color("#FFF6F1") },
      uMare: { value: new THREE.Color("#E7CFD4") },
      uShadow: { value: new THREE.Color("#E6DDEE") },
      uRim: { value: new THREE.Color("#FFB5C0") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 30);
    const p = progress.current ?? 0;

    // Phase spring toward the scroll target.
    const K = 42;
    const C = 2 * Math.sqrt(K) * 0.82;
    const target = PHASE_START + (PHASE_END - PHASE_START) * p;
    const s = phase.current;
    s.v += (-K * (s.x - target) - C * s.v) * dt;
    s.x += s.v * dt;

    // Tilt spring toward the pointer (desktop only; pointer stays 0 otherwise).
    const t = tilt.current;
    const ptr = pointer.current ?? { x: 0, y: 0 };
    const KT = 30;
    const CT = 2 * Math.sqrt(KT) * 0.9;
    t.vx += (-KT * (t.x - ptr.y * 0.14) - CT * t.vx) * dt;
    t.vy += (-KT * (t.y - ptr.x * 0.2) - CT * t.vy) * dt;
    t.x += t.vx * dt;
    t.y += t.vy * dt;

    sun.set(Math.sin(s.x), 0.14, -Math.cos(s.x)).normalize();
    uniforms.uSun.value.copy(sun);

    // The moon turns a little with scroll and sinks slightly (parallax depth).
    m.rotation.set(0.18 + t.x, -0.6 + p * 0.9 + t.y, 0.08);
    m.position.y = -p * 0.35;
    m.updateMatrixWorld();
    uniforms.uRot.value.setFromMatrix4(m.matrixWorld);

    const moving =
      Math.abs(s.x - target) > 1e-4 || Math.abs(s.v) > 1e-4 ||
      Math.abs(t.vx) > 1e-4 || Math.abs(t.vy) > 1e-4 ||
      Math.abs(t.x - ptr.y * 0.14) > 1e-4 || Math.abs(t.y - ptr.x * 0.2) > 1e-4;
    if (moving) state.invalidate();
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}

export default function MoonScene({
  progress,
  pointer,
  onReady,
}: MoonInputs & { onReady: (requestFrame: () => void) => void }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 30, position: [0, 0, 4.4] }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={(state) => {
        state.invalidate();
        onReady(() => state.invalidate());
      }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Moon progress={progress} pointer={pointer} />
    </Canvas>
  );
}
