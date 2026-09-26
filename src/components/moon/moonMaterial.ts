import * as THREE from "three";
import type { ResolvedTheme } from "@/lib/theme/mode";

/**
 * The procedural moon surface shared by the landing scenes. Nothing is loaded
 * from the network: craters, maria and grain come from noise evaluated on the
 * sphere, and the phase is only the direction of uSun.
 */

export const moonVertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldN;
  void main() {
    vObj = position;
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const moonFragmentShader = /* glsl */ `
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

/**
 * Day: a pale blush moon on a light page. Night: a brighter pearly lit side, a
 * deep indigo shadow side that still lifts off the night sky, and a lavender rim.
 */
const MOON_PALETTE = {
  light: { lit: "#FFF6F1", mare: "#E7CFD4", shadow: "#E6DDEE", rim: "#FFB5C0" },
  dark: { lit: "#FFFBF8", mare: "#DCCAE0", shadow: "#211E40", rim: "#9F8BEA" },
} as const;

export function createMoonUniforms() {
  return {
    uSun: { value: new THREE.Vector3(0, 0, 1) },
    uRot: { value: new THREE.Matrix3() },
    uLit: { value: new THREE.Color(MOON_PALETTE.light.lit) },
    uMare: { value: new THREE.Color(MOON_PALETTE.light.mare) },
    uShadow: { value: new THREE.Color(MOON_PALETTE.light.shadow) },
    uRim: { value: new THREE.Color(MOON_PALETTE.light.rim) },
  };
}

export function setMoonPalette(u: ReturnType<typeof createMoonUniforms>, theme: ResolvedTheme) {
  const p = MOON_PALETTE[theme];
  u.uLit.value.set(p.lit);
  u.uMare.value.set(p.mare);
  u.uShadow.value.set(p.shadow);
  u.uRim.value.set(p.rim);
}

/** Sun direction for a phase angle: 0 = new, PI/2 = first quarter (lit right), PI = full. */
export function sunForPhase(phase: number, out: THREE.Vector3) {
  return out.set(Math.sin(phase), 0.14, -Math.cos(phase)).normalize();
}

/**
 * Semi-implicit spring step (x toward target). Returns true while still moving.
 * damping < 1 is slightly under-damped, which reads as weight rather than a stop.
 */
export function springStep(
  s: { x: number; v: number },
  target: number,
  dt: number,
  stiffness: number,
  damping = 0.85,
) {
  const c = 2 * Math.sqrt(stiffness) * damping;
  s.v += (-stiffness * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
  return Math.abs(s.x - target) > 1e-4 || Math.abs(s.v) > 1e-4;
}
