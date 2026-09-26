import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast of the plan palettes in src/app/globals.css, light and dark.
 * Reads the real CSS, applies the cascade for a `.tier-app` element (rules
 * sorted by specificity, then source order) and evaluates the oklch() and
 * color-mix(in oklch, ...) expressions the tokens are written in.
 */

const css = readFileSync(fileURLToPath(new URL("../../../app/globals.css", import.meta.url)), "utf8");

type Oklch = [l: number, c: number, h: number];

// Top-level rules only; the palette blocks are never nested in @media.
function rules(source: string) {
  const out: { selectors: string[]; decls: Map<string, string> }[] = [];
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let start = 0;
  let head = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) {
        head = text.slice(start, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        if (!head.startsWith("@")) {
          const decls = new Map<string, string>();
          for (const d of text.slice(start, i).split(";")) {
            const m = d.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
            if (m) decls.set(m[1], m[2]);
          }
          out.push({ selectors: head.split(",").map((s) => s.trim()), decls });
        }
        start = i + 1;
      }
    }
  }
  return out;
}

const RULES = rules(css);

function tokensFor(plan: "free" | "premium" | "premium+", dark: boolean) {
  const matching = new Set([".tier-app"]);
  if (plan !== "free") matching.add(`.tier-app[data-plan="${plan}"]`);
  if (dark) {
    matching.add(".dark .tier-app");
    if (plan !== "free") matching.add(`.dark .tier-app[data-plan="${plan}"]`);
  }
  const specificity = (s: string) => (s.match(/[.[]/g) ?? []).length;
  const tokens = new Map<string, string>();
  RULES.map((r, index) => ({ ...r, index, spec: Math.max(-1, ...r.selectors.filter((s) => matching.has(s)).map(specificity)) }))
    .filter((r) => r.spec >= 0)
    .sort((a, b) => a.spec - b.spec || a.index - b.index)
    .forEach((r) => r.decls.forEach((v, k) => tokens.set(k, v)));
  return tokens;
}

function evaluate(expr: string, tokens: Map<string, string>): Oklch {
  const e = expr.trim();
  const v = e.match(/^var\((--[\w-]+)\)$/);
  if (v) {
    const ref = tokens.get(v[1]);
    if (!ref) throw new Error(`undefined token ${v[1]}`);
    return evaluate(ref, tokens);
  }
  const o = e.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (o) return [Number(o[1]), Number(o[2]), Number(o[3])];
  const mix = e.match(/^color-mix\(\s*in oklch\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+)\)$/);
  if (mix) {
    const a = evaluate(mix[1], tokens);
    const b = evaluate(mix[3], tokens);
    const p = Number(mix[2]) / 100;
    let dh = b[2] - a[2];
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    return [a[0] * p + b[0] * (1 - p), a[1] * p + b[1] * (1 - p), (a[2] + dh * (1 - p) + 360) % 360];
  }
  throw new Error(`cannot evaluate opaque colour: ${e}`);
}

function luminance([l, c, h]: Oklch) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S);
  const g = clamp(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S);
  const bl = clamp(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(x: Oklch, y: Oklch) {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const textCases: [fg: string, bg: string, min: number][] = [];
for (const fg of ["--tier-ink", "--label-secondary", "--label-tertiary", "--tint"]) {
  for (const bg of ["--tier-bg", "--tier-surface", "--tier-tint"]) textCases.push([fg, bg, 4.5]);
}
// Segmented thumb label.
textCases.push(["--tier-ink", "--surface-elevated", 4.5]);
// The focus ring is --tint (>= 4.5:1 above, so past the 3:1 non-text minimum).
// Light accents are pastel decoration at 2.2-2.8:1; night accents also draw rings and arcs.
const accentCase: [fg: string, bg: string, min: number] = ["--tier-accent", "--tier-surface", 3];

describe.each([
  ["free", false],
  ["premium", false],
  ["premium+", false],
  ["free", true],
  ["premium", true],
  ["premium+", true],
] as const)("%s plan, dark=%s", (plan, dark) => {
  const tokens = tokensFor(plan, dark);
  it.each(dark ? [...textCases, accentCase] : textCases)("%s on %s >= %d", (fg, bg, min) => {
    const ratio = contrast(evaluate(`var(${fg})`, tokens), evaluate(`var(${bg})`, tokens));
    expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });

  it("dark backgrounds are soft night tones, never black", () => {
    const [l] = evaluate("var(--tier-bg)", tokens);
    if (dark) {
      expect(l).toBeGreaterThanOrEqual(0.17);
      expect(l).toBeLessThanOrEqual(0.22);
    } else expect(l).toBeGreaterThan(0.9);
  });
});
