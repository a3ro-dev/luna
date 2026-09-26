/**
 * Builds autoresearch/to_human/report.html from experiment results and notes.
 *
 *   node autoresearch/src/report.mjs
 *
 * Reads experiments/*\/results/eval.json (aggregate block from eval.mts),
 * findings.md and research-log.md. Self-contained HTML, no dependencies.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "v2-bayes";

const rows = [];
let baseline = null;
for (const dir of readdirSync(join(root, "experiments")).sort()) {
  const p = join(root, "experiments", dir, "results", "eval.json");
  if (!existsSync(p)) continue;
  const agg = JSON.parse(readFileSync(p, "utf8")).aggregate;
  for (const [model, m] of Object.entries(agg)) {
    if (model === BASE) baseline ??= m;
    else rows.push({ hyp: dir.split("-")[0], dir, model, ...m });
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n = (x, d = 3) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(d) : "–");

// Locked improvement rule (see eval.mts)
const wins = (r) =>
  r.coverageOk && (r.macroMae - baseline.macroMae <= -0.05 || (r.is80 <= baseline.is80 * 0.98 && r.macroMae - baseline.macroMae <= 0.02));

function md(text) {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      if (/^#{1,3} /.test(block)) {
        const level = block.match(/^#+/)[0].length + 1;
        return `<h${level}>${esc(block.replace(/^#+ /, ""))}</h${level}>`;
      }
      if (/^- /m.test(block)) {
        const items = block.split(/\n(?=- )/).map((li) => `<li>${esc(li.replace(/^- /, "").replace(/\n\s*/g, " "))}</li>`);
        return `<ul>${items.join("")}</ul>`;
      }
      return `<p>${esc(block.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
}

/** Dot plot: change in macro MAE vs baseline, one row per variant. */
function dotPlot() {
  if (!baseline || rows.length === 0) return "<p>No experiment results yet.</p>";
  const W = 760, rowH = 22, left = 190, right = 30, top = 34;
  const H = top + rows.length * rowH + 40;
  const deltas = rows.map((r) => r.macroMae - baseline.macroMae);
  const lo = Math.min(-0.08, ...deltas) - 0.01, hi = Math.max(0.06, ...deltas) + 0.01;
  const x = (v) => left + ((v - lo) / (hi - lo)) * (W - left - right);
  const ticks = [];
  for (let t = Math.ceil(lo * 50) / 50; t <= hi + 1e-9; t += 0.02) ticks.push(+t.toFixed(2));
  const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="dp-title dp-desc" class="chart">`,
    `<title id="dp-title">Change in macro MAE versus baseline, per variant</title>`,
    `<desc id="dp-desc">Negative is better. The dashed line at -0.05 days is the locked improvement threshold.</desc>`];
  for (const t of ticks) {
    out.push(`<line x1="${x(t)}" x2="${x(t)}" y1="${top - 8}" y2="${H - 34}" class="grid"/>`);
    out.push(`<text x="${x(t)}" y="${H - 18}" class="tick" text-anchor="middle">${t > 0 ? "+" : ""}${t.toFixed(2)}</text>`);
  }
  out.push(`<line x1="${x(0)}" x2="${x(0)}" y1="${top - 12}" y2="${H - 34}" class="zero"/>`);
  out.push(`<text x="${x(0) + 4}" y="${top - 16}" class="note">baseline</text>`);
  out.push(`<line x1="${x(-0.05)}" x2="${x(-0.05)}" y1="${top - 12}" y2="${H - 34}" class="threshold"/>`);
  out.push(`<text x="${x(-0.05) - 4}" y="${top - 16}" class="note" text-anchor="end">improvement bar (−0.05 d)</text>`);
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2;
    const d = r.macroMae - baseline.macroMae;
    const win = wins(r);
    out.push(`<text x="${left - 10}" y="${y + 4}" class="label" text-anchor="end">${esc(r.model)}</text>`);
    out.push(`<g class="dot${win ? " win" : ""}${r.coverageOk ? "" : " fail"}"><title>${esc(r.model)}: ${d >= 0 ? "+" : ""}${d.toFixed(3)} d macro MAE, IS80 ${n(r.is80, 2)}, calibration ${n(r.calibErr)}${r.coverageOk ? "" : " (fails coverage)"}</title>` +
      `<rect x="${left}" y="${y - rowH / 2}" width="${W - left - right}" height="${rowH}" class="hit"/>` +
      `<circle cx="${x(d)}" cy="${y}" r="5"/></g>`);
  });
  out.push(`<text x="${(left + W - right) / 2}" y="${H - 2}" class="axis" text-anchor="middle">change in cycle macro MAE, days (lower is better)</text>`);
  out.push("</svg>");
  return out.join("\n");
}

/** Scatter: calibration error vs interval score. */
function scatter() {
  if (!baseline || rows.length === 0) return "";
  const W = 760, H = 360, left = 64, right = 24, top = 20, bottom = 48;
  const pts = [...rows, { model: BASE, ...baseline, isBase: true }];
  const xs = pts.map((p) => p.calibErr), ys = pts.map((p) => p.is80);
  const x0 = Math.min(...xs) * 0.9, x1 = Math.max(...xs) * 1.05, y0 = Math.min(...ys) * 0.995, y1 = Math.max(...ys) * 1.005;
  const sx = (v) => left + ((v - x0) / (x1 - x0)) * (W - left - right);
  const sy = (v) => H - bottom - ((v - y0) / (y1 - y0)) * (H - top - bottom);
  const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="sc-title sc-desc" class="chart">`,
    `<title id="sc-title">Calibration error versus 80% interval score</title>`,
    `<desc id="sc-desc">Lower-left is better on both. The orange ring is the production baseline.</desc>`];
  for (let i = 0; i <= 4; i++) {
    const vy = y0 + ((y1 - y0) * i) / 4, vx = x0 + ((x1 - x0) * i) / 4;
    out.push(`<line x1="${left}" x2="${W - right}" y1="${sy(vy)}" y2="${sy(vy)}" class="grid"/><text x="${left - 8}" y="${sy(vy) + 4}" class="tick" text-anchor="end">${vy.toFixed(1)}</text>`);
    out.push(`<text x="${sx(vx)}" y="${H - bottom + 18}" class="tick" text-anchor="middle">${vx.toFixed(3)}</text>`);
  }
  for (const p of pts) {
    const tip = `${esc(p.model)}: calibration ${n(p.calibErr)}, IS80 ${n(p.is80, 2)}, macro MAE ${n(p.macroMae)}`;
    out.push(p.isBase
      ? `<g class="base"><title>${tip}</title><circle cx="${sx(p.calibErr)}" cy="${sy(p.is80)}" r="12" class="hit"/><circle cx="${sx(p.calibErr)}" cy="${sy(p.is80)}" r="6"/><text x="${sx(p.calibErr) + 10}" y="${sy(p.is80) - 8}" class="label">baseline</text></g>`
      : `<g class="dot${wins(p) ? " win" : ""}${p.coverageOk ? "" : " fail"}"><title>${tip}</title><circle cx="${sx(p.calibErr)}" cy="${sy(p.is80)}" r="12" class="hit"/><circle cx="${sx(p.calibErr)}" cy="${sy(p.is80)}" r="5"/></g>`);
  }
  out.push(`<text x="${(left + W - right) / 2}" y="${H - 8}" class="axis" text-anchor="middle">calibration error, mean |coverage − 0.80| (lower is better)</text>`);
  out.push(`<text transform="translate(16 ${(top + H - bottom) / 2}) rotate(-90)" class="axis" text-anchor="middle">IS80 (lower is better)</text>`);
  out.push("</svg>");
  return out.join("\n");
}

function table() {
  if (!baseline) return "";
  const head = ["variant", "macro MAE", "Δ", "IS80", "calib", "within 3 d", "cold", "established", "period", "coverage ok", "meets rule"];
  const all = [{ model: `${BASE} (baseline)`, ...baseline }, ...rows];
  const body = all.map((r) => {
    const d = r.macroMae - baseline.macroMae;
    return `<tr><th scope="row">${esc(r.model)}</th><td>${n(r.macroMae)}</td><td>${r === all[0] ? "–" : (d >= 0 ? "+" : "") + d.toFixed(3)}</td><td>${n(r.is80, 2)}</td><td>${n(r.calibErr)}</td><td>${n(r.within3)}</td><td>${n(r.coldMacroMae)}</td><td>${n(r.estMacroMae)}</td><td>${n(r.periodMacroMae)}</td><td>${r.coverageOk ? "yes" : "no"}</td><td>${r === all[0] ? "–" : wins(r) ? "yes" : "no"}</td></tr>`;
  });
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`;
}

const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Luna forecast autoresearch -- progress</title>
<style>
.viz-root{color-scheme:light;--surface-1:#fcfcfb;--text-primary:#0b0b0b;--text-secondary:#52514e;--grid:#e4e3df;--series-1:#2a78d6;--series-2:#eb6834}
@media (prefers-color-scheme: dark){.viz-root{color-scheme:dark;--surface-1:#1a1a19;--text-primary:#fff;--text-secondary:#c3c2b7;--grid:#383835;--series-1:#3987e5;--series-2:#d95926}}
body{margin:0;background:var(--surface-1);color:var(--text-primary);font:15px/1.6 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:1.6rem;margin:0 0 4px}h2{margin-top:2.2em;font-size:1.2rem}h3,h4{font-size:1rem}
.sub,.note,.tick,.axis{color:var(--text-secondary);fill:var(--text-secondary)}
.chart{width:100%;height:auto;margin:12px 0}
.grid{stroke:var(--grid);stroke-width:1}.zero{stroke:var(--text-secondary);stroke-width:1.5}.threshold{stroke:var(--text-secondary);stroke-dasharray:4 4}
.tick,.note{font-size:11px}.axis{font-size:12px}.label{font-size:12px;fill:var(--text-primary)}
.hit{fill:transparent}
.base .label{paint-order:stroke;stroke:var(--surface-1);stroke-width:4px;stroke-linejoin:round;font-weight:600}
.dot circle:not(.hit){fill:var(--surface-1);stroke:var(--series-1);stroke-width:2}
.dot.win circle:not(.hit){fill:var(--series-1)}
.dot.fail circle:not(.hit){stroke-dasharray:2 2}
.dot:hover circle:not(.hit){stroke-width:3}
.base circle:not(.hit){fill:none;stroke:var(--series-2);stroke-width:3}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--text-secondary)}
.legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;border:2px solid var(--series-1)}
.legend .l-win::before{background:var(--series-1)}.legend .l-base::before{border-color:var(--series-2)}.legend .l-fail::before{border-style:dashed}
.table-wrap{overflow-x:auto}table{border-collapse:collapse;font-size:13px;min-width:720px}th,td{padding:6px 8px;border-bottom:1px solid var(--grid);text-align:right}th[scope=row],thead th:first-child{text-align:left}
</style></head>
<body class="viz-root"><main>
<h1>Luna forecast autoresearch</h1>
<p class="sub">Generated from autoresearch/experiments/*/results. Synthetic evaluation across 7 simulator runs; synthetic results are necessary, not sufficient.</p>
<h2>Where each variant landed</h2>
<div class="legend"><span class="l-win">meets the locked rule</span><span>does not</span><span class="l-fail">fails coverage</span><span class="l-base">baseline</span></div>
${dotPlot()}
${scatter()}
<h2>Results table</h2>
${table()}
<h2>Findings</h2>
${md(read("findings.md"))}
<h2>Research log</h2>
${md(read("research-log.md"))}
</main></body></html>`;

writeFileSync(join(root, "to_human", "report.html"), html);
console.log(`wrote to_human/report.html (${rows.length} variants)`);
