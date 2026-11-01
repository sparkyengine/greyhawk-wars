/* Paints the whole Flanaess as an ink-and-watercolor atlas from the traced area polygons.
   Rivers and mountain spines are found where two areas' outlines run together. */
import { GW } from "../engine/engine.js";
import { mk } from "./coins";
import { drawCastle, drawAnchor, drawRuin, drawTent, drawStoneFort } from "./pieces";

const TAU = Math.PI * 2;
export const MAP_W = 1818, MAP_H = 1350;
type Pt = [number, number];
type C = CanvasRenderingContext2D;

function mulberry(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function chaikin(ring: Pt[], it: number): Pt[] {
  let r = ring;
  for (let k = 0; k < it; k++) {
    const o: Pt[] = [];
    for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; o.push([p[0] * .75 + q[0] * .25, p[1] * .75 + q[1] * .25], [p[0] * .25 + q[0] * .75, p[1] * .25 + q[1] * .75]); }
    r = o;
  }
  return r;
}

export interface Geo { raw: Record<number, Pt[][]>; rawPath: Record<number, Path2D>; rings: Record<number, Pt[][]>; path: Record<number, Path2D>; bbox: Record<number, [number, number, number, number]>; land: Path2D; water: Path2D; landOutline: Path2D }
let GEO: Geo | null = null;
export function geometry(): Geo {
  if (GEO) return GEO;
  const M = GW.map; const rings: Geo["rings"] = {}, path: Geo["path"] = {}, bbox: Geo["bbox"] = {}, raw: Geo["raw"] = {}, rawPath: Geo["rawPath"] = {};
  const land = new Path2D(), water = new Path2D(), landOutline = new Path2D();
  for (const id of M.ids) {
    raw[id] = (M.poly[id] || []) as Pt[][]; const rp = new Path2D(); raw[id].forEach(r => { r.forEach((pt, i) => i ? rp.lineTo(pt[0], pt[1]) : rp.moveTo(pt[0], pt[1])); rp.closePath(); }); rawPath[id] = rp;
    const rs = (M.poly[id] || []).map(r => chaikin(r as Pt[], 2)); rings[id] = rs;
    const p = new Path2D(); let b: [number, number, number, number] = [1e9, 1e9, -1e9, -1e9];
    rs.forEach(r => { r.forEach((pt, i) => { i ? p.lineTo(pt[0], pt[1]) : p.moveTo(pt[0], pt[1]); b = [Math.min(b[0], pt[0]), Math.min(b[1], pt[1]), Math.max(b[2], pt[0]), Math.max(b[3], pt[1])]; }); p.closePath(); });
    path[id] = p; bbox[id] = b;
    if (M.kind[id] === "W") water.addPath(p); else { land.addPath(p); landOutline.addPath(p); }
  }
  GEO = { raw, rawPath, rings, path, bbox, land, water, landOutline };
  return GEO;
}

const hctx = mk(4, 4).getContext("2d")!;
/** Runs of area a's outline that lie along area b's outline. */
function sharedRuns(a: number, b: number, tol = 6): Pt[][] {
  const G = geometry(); const pb = G.rawPath[b], bb = G.bbox[b]; hctx.lineWidth = tol; const runs: Pt[][] = [];
  for (const r of G.raw[a]) {
    let cur: Pt[] = [];
    const flush = () => { if (cur.length > 1) runs.push(chaikin2(cur)); cur = []; };
    for (let i = 0; i < r.length; i++) { const p = r[i];
      const near = p[0] > bb[0] - tol && p[0] < bb[2] + tol && p[1] > bb[1] - tol && p[1] < bb[3] + tol && hctx.isPointInStroke(pb, p[0], p[1]);
      if (near) cur.push(p); else flush(); }
    flush();
  }
  return runs;
}
function chaikin2(line: Pt[]): Pt[] { let r = line; for (let k = 0; k < 2; k++) { const o: Pt[] = [r[0]]; for (let i = 0; i < r.length - 1; i++) { const p = r[i], q = r[i + 1]; o.push([p[0] * .75 + q[0] * .25, p[1] * .75 + q[1] * .25], [p[0] * .25 + q[0] * .75, p[1] * .25 + q[1] * .75]); } o.push(r[r.length - 1]); r = o; } return r; }

function paperTexture(): HTMLCanvasElement {
  const s = 512, c = mk(s, s), x = c.getContext("2d")!, img = x.createImageData(s, s), r = mulberry(5);
  const G = 64, grid = new Float32Array((G + 1) * (G + 1)).map(() => r());
  const sm = (t: number) => t * t * (3 - 2 * t);
  const vn = (u: number, v: number, f: number) => { u *= f; v *= f; const i = Math.floor(u) % G, j = Math.floor(v) % G, fu = u - Math.floor(u), fv = v - Math.floor(v); const a = grid[j * (G + 1) + i], b = grid[j * (G + 1) + i + 1], cc = grid[(j + 1) * (G + 1) + i], d = grid[(j + 1) * (G + 1) + i + 1]; return lerp(lerp(a, b, sm(fu)), lerp(cc, d, sm(fu)), sm(fv)); };
  for (let y = 0; y < s; y++) for (let xx = 0; xx < s; xx++) { const u = xx / s * G, v = y / s * G; const n = vn(u, v, .12) * .5 + vn(u, v, .5) * .3 + vn(u, v, 1) * .2; const val = 225 + (n - .5) * 40 + (r() - .5) * 6; const o = (y * s + xx) * 4; img.data[o] = val; img.data[o + 1] = val * .95; img.data[o + 2] = val * .84; img.data[o + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}
let PAPER: HTMLCanvasElement | null = null;
export function paper() { return PAPER || (PAPER = paperTexture()); }

/* ---------- terrain motifs ---------- */
function mountain(ctx: C, x: number, y: number, w: number, h: number, r: () => number) {
  const px = x + (r() - .5) * w * .18, py = y - h, rb: Pt = [x + w * (.04 + r() * .1), y], L: Pt = [x - w / 2, y], R: Pt = [x + w / 2, y];
  ctx.fillStyle = "rgba(60,40,20,.18)"; ctx.beginPath(); ctx.ellipse(x + w * .12, y + 1.5, w * .55, w * .09, 0, 0, TAU); ctx.fill();
  const lg = ctx.createLinearGradient(L[0], py, rb[0], y); lg.addColorStop(0, "#efe2bf"); lg.addColorStop(1, "#d8c49a");
  ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(px, py); ctx.lineTo(rb[0], rb[1]); ctx.closePath(); ctx.fillStyle = lg; ctx.fill();
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(R[0], R[1]); ctx.lineTo(rb[0], rb[1]); ctx.closePath(); ctx.fillStyle = "#98805d"; ctx.fill();
  ctx.strokeStyle = "rgba(43,30,15,.55)"; ctx.lineWidth = .6;
  for (let t = .16; t < .97; t += .1) { const p = [lerp(px, rb[0], t), lerp(py, rb[1], t)], q = [lerp(px, R[0], t), lerp(py, R[1], t)]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(lerp(p[0], q[0], .72), lerp(p[1], q[1], .72)); ctx.stroke(); }
  ctx.fillStyle = "#fbf8ee"; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - w * .15, py + h * .24); ctx.lineTo(px - w * .06, py + h * .18); ctx.lineTo(px + .01 * w, py + h * .27); ctx.lineTo(px + w * .08, py + h * .17); ctx.lineTo(px + w * .11, py + h * .2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2b1e10"; ctx.lineWidth = 1.05; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(px, py); ctx.lineTo(R[0], R[1]); ctx.stroke();
  ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(rb[0], rb[1]); ctx.stroke();
}
function hill(ctx: C, x: number, y: number, w: number, r: () => number) {
  const h = w * (.32 + r() * .1);
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w * .3, y - h, x + w * .3, y - h, x + w / 2, y); ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, "#efdcab"); g.addColorStop(.55, "#d9bb7a"); g.addColorStop(1, "#b8955a"); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(43,30,15,.5)"; ctx.lineWidth = .6;
  for (let i = 0; i < 3; i++) { const t = .6 + i * .11; const sx = x - w / 2 + w * t; ctx.beginPath(); ctx.moveTo(sx, y - h * .6 * (1 - Math.abs(t - .5) * 1.6)); ctx.lineTo(sx + 2, y - 1.5); ctx.stroke(); }
  ctx.strokeStyle = "#2b1e10"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w * .3, y - h, x + w * .3, y - h, x + w / 2, y); ctx.stroke();
}
function tree(ctx: C, x: number, y: number, rad: number, dark: boolean) {
  ctx.fillStyle = "rgba(35,45,18,.26)"; ctx.beginPath(); ctx.ellipse(x + rad * .55, y + rad * .15, rad * 1.05, rad * .45, 0, 0, TAU); ctx.fill();
  const cy = y - rad * .9;
  const g = ctx.createRadialGradient(x - rad * .4, cy - rad * .45, rad * .1, x, cy, rad * 1.1);
  if (dark) { g.addColorStop(0, "#8fae66"); g.addColorStop(.55, "#4f7238"); g.addColorStop(1, "#2f4a22"); } else { g.addColorStop(0, "#b7cd84"); g.addColorStop(.55, "#6f9149"); g.addColorStop(1, "#3f5e2c"); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, rad, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(25,35,10,.8)"; ctx.lineWidth = .7; ctx.stroke();
  ctx.strokeStyle = "rgba(20,28,8,.85)"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, cy, rad * .95, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  ctx.fillStyle = "rgba(235,245,200,.4)"; ctx.beginPath(); ctx.arc(x - rad * .35, cy - rad * .35, rad * .28, 0, TAU); ctx.fill();
}
function pine(ctx: C, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(35,45,18,.24)"; ctx.beginPath(); ctx.ellipse(x + s * .5, y + 1, s * .9, s * .3, 0, 0, TAU); ctx.fill();
  [[0, 1], [-.55, .82], [-1.05, .62]].forEach(t => { const ty = y + t[0] * s, w = s * t[1]; ctx.beginPath(); ctx.moveTo(x, ty - s * .95); ctx.lineTo(x + w, ty); ctx.lineTo(x - w, ty); ctx.closePath(); const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, "#86a560"); g.addColorStop(.5, "#557a3b"); g.addColorStop(1, "#2f4a22"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(20,28,8,.8)"; ctx.lineWidth = .7; ctx.stroke(); });
}
function reeds(ctx: C, x: number, y: number, r: () => number) {
  ctx.strokeStyle = "rgba(70,110,110,.55)"; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(x - 9, y + 2); ctx.lineTo(x + 9, y + 2); ctx.moveTo(x - 4, y + 5); ctx.lineTo(x + 7, y + 5); ctx.stroke();
  ctx.strokeStyle = "#4f6a32"; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2, y + 1.5); ctx.quadraticCurveTo(x + i * 2.6, y - 4, x + i * 3.4 + (r() - .5) * 2, y - 9 - r() * 3); ctx.stroke(); }
}
function dune(ctx: C, x: number, y: number, w: number, r: () => number) {
  ctx.strokeStyle = "rgba(120,85,35,.75)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * .1, y - w * .32, x + w * .15, y - w * .12); ctx.quadraticCurveTo(x + w * .3, y - w * .05, x + w / 2, y); ctx.stroke();
  ctx.fillStyle = "rgba(120,85,35,.35)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (r() - .3) * w * .7, y - r() * w * .12, .7, 0, TAU); ctx.fill(); }
}
function grass(ctx: C, x: number, y: number) { ctx.strokeStyle = "rgba(80,95,40,.5)"; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x - 2.4, y); ctx.lineTo(x - 3, y - 4); ctx.moveTo(x, y); ctx.lineTo(x, y - 5.5); ctx.moveTo(x + 2.4, y); ctx.lineTo(x + 3, y - 4); ctx.stroke(); }

const WASH: Record<string, string> = { clear: "#c9cf8f", forest: "#7fa35f", hills: "#d6b46a", mountains: "#b19c7c", swamp: "#8fb09a", desert: "#e2c47e" };
const ALC: Record<string, string> = { G: "#2e5ea8", E: "#9a2a2a", N: "#6f6a5c" };

function spaced(ctx: C, text: string, x: number, y: number, sp: number) {
  const ch = [...text]; const ws = ch.map(c => ctx.measureText(c).width); const tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let cx = x - tot / 2; ctx.textAlign = "left"; ch.forEach((c, i) => { ctx.strokeText(c, cx, y); ctx.fillText(c, cx, y); cx += ws[i] + sp; }); ctx.textAlign = "center";
}

const tick = () => new Promise<void>(r => setTimeout(r, 0));

/** Paint the base atlas. scale is pixels per map unit. */
export async function paintAtlas(scale: number, progress?: (f: number, label: string) => void): Promise<HTMLCanvasElement> {
  const M = GW.map, D = GW.data, G = geometry();
  const cv = mk(Math.round(MAP_W * scale), Math.round(MAP_H * scale)); const ctx = cv.getContext("2d")!; ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const R = mulberry(1234); const W = MAP_W, H = MAP_H;
  progress?.(.05, "Laying down the vellum");
  ctx.fillStyle = "#e8dcbf"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .55; ctx.fillStyle = ctx.createPattern(paper(), "repeat")!; ctx.fillRect(0, 0, W, H); ctx.restore();
  for (let i = 0; i < 60; i++) { const x = R() * W, y = R() * H, r = 60 + R() * 260; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(150,105,50,${.03 + R() * .05})`); g.addColorStop(1, "rgba(150,105,50,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  await tick();
  progress?.(.15, "Washing in the lands");
  const landIds = M.ids.filter(id => M.kind[id] !== "W");
  ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.globalAlpha = .55;
  for (const id of landIds) { ctx.strokeStyle = WASH[M.terrain[id] || "clear"] || WASH.clear; ctx.stroke(G.path[id]); }
  ctx.restore();
  for (const id of landIds) {
    const t = M.terrain[id] || "clear"; const p = G.path[id];
    ctx.save(); ctx.clip(p, "evenodd"); ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate((R() - .5) * 4, (R() - .5) * 4); ctx.globalAlpha = .32; ctx.fillStyle = WASH[t] || WASH.clear; ctx.fill(p, "evenodd"); ctx.restore(); }
    ctx.filter = "blur(4px)"; ctx.globalAlpha = .5; ctx.strokeStyle = WASH[t] || WASH.clear; ctx.lineWidth = 12; ctx.stroke(p); ctx.filter = "none";
    ctx.restore();
  }
  await tick();
  // country borders: colored band inside, dash-dot ink line along borders with other countries
  progress?.(.7, "Marking the realms");
  const byCountry: Record<string, number[]> = {};
  landIds.forEach(id => { const c = M.country[id]; if (c) (byCountry[c] = byCountry[c] || []).push(id); });
  for (const [c, ids] of Object.entries(byCountry)) {
    const color = ALC[D.COUNTRIES[c]?.align || "N"]; const member = new Set(ids);
    const clip = new Path2D(); ids.forEach(i => clip.addPath(G.path[i]));
    const others = new Path2D(); const seen = new Set<number>();
    ids.forEach(i => (GW.ADJ[i] || []).forEach(o => { if (!member.has(o) && !seen.has(o)) { seen.add(o); others.addPath(G.path[o]); } }));
    ctx.save(); ctx.clip(clip, "evenodd"); ctx.globalAlpha = .32; ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.lineJoin = "round"; ctx.stroke(others); ctx.restore();
  }
  // terrain features
  progress?.(.3, "Inking mountains and forests");
  const feats: { t: string; x: number; y: number; id: number; r: () => number }[] = [];
  for (const id of landIds) {
    const t = M.terrain[id] || "clear"; const b = G.bbox[id]; const p = G.path[id];
    const sp = ({ mountains: 22, forest: 9, hills: 22, swamp: 20, desert: 26, clear: 34 } as any)[t] || 34;
    const mg = ({ mountains: 11, forest: 5, hills: 10, swamp: 7, desert: 10, clear: 10 } as any)[t] || 8;
    const r = mulberry(id * 7919 + 13); const ctr = M.center[id];
    for (let y = b[1]; y < b[3]; y += sp * .8) for (let x = b[0]; x < b[2]; x += sp) {
      const px = x + (r() - .5) * sp * .9, py = y + (r() - .5) * sp * .7;
      if (!hctx.isPointInPath(p, px, py, "evenodd")) continue;
      hctx.lineWidth = mg * 2; if (hctx.isPointInStroke(p, px, py)) continue;
      if (ctr && Math.hypot(px - ctr[0], py - ctr[1]) < (t === "forest" ? 10 : 16)) continue;
      feats.push({ t, x: px, y: py, id, r: mulberry(id * 131 + Math.round(px * 7 + py * 13)) });
    }
  }
  feats.sort((a, b) => a.y - b.y);
  let n = 0;
  for (const f of feats) {
    const r = f.r;
    if (f.t === "mountains") mountain(ctx, f.x, f.y, 20 + r() * 16, (20 + r() * 16) * .85, r);
    else if (f.t === "forest") { (f.id % 3 === 0 && r() < .5) ? pine(ctx, f.x, f.y, 5.4 + r() * 1.6) : tree(ctx, f.x, f.y, 4.6 + r() * 1.8, f.id % 2 === 0 && r() < .5); }
    else if (f.t === "hills") hill(ctx, f.x, f.y, 18 + r() * 12, r);
    else if (f.t === "swamp") reeds(ctx, f.x, f.y, r);
    else if (f.t === "desert") dune(ctx, f.x, f.y, 18 + r() * 10, r);
    else if (r() < .55) grass(ctx, f.x, f.y);
    if (++n % 1500 === 0) await tick();
  }
  progress?.(.6, "Drawing rivers and borders");
  // area borders
  ctx.save(); ctx.strokeStyle = "rgba(43,30,15,.45)"; ctx.lineWidth = .8; ctx.lineJoin = "round"; ctx.stroke(G.landOutline); ctx.restore();
  // rivers and spines
  const riverRuns: Pt[][] = [], spineRuns: Pt[][] = [];
  M.adj.forEach(([a, b, rv]) => { if (rv && M.kind[a] !== "W" && M.kind[b] !== "W") riverRuns.push(...sharedRuns(a, b)); });
  M.spine.forEach(([a, b]) => spineRuns.push(...sharedRuns(a, b, 8)));
  const line = (run: Pt[]) => { ctx.beginPath(); run.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  riverRuns.forEach(run => { line(run); ctx.strokeStyle = "#3f5f68"; ctx.lineWidth = 4.2; ctx.stroke(); });
  riverRuns.forEach(run => { line(run); ctx.strokeStyle = "#8fb6bf"; ctx.lineWidth = 2.4; ctx.stroke(); });
  spineRuns.forEach(run => { line(run); ctx.strokeStyle = "#3b2a19"; ctx.lineWidth = 6; ctx.stroke(); line(run); ctx.strokeStyle = "#6b513a"; ctx.lineWidth = 2.6; ctx.stroke();
    for (let i = 2; i < run.length - 2; i += 6) { const p = run[i]; ctx.fillStyle = "#2b1e10"; ctx.beginPath(); ctx.moveTo(p[0] - 3.5, p[1] + 1.5); ctx.lineTo(p[0], p[1] - 6); ctx.lineTo(p[0] + 3.5, p[1] + 1.5); ctx.closePath(); ctx.fill(); } });
  ctx.restore();
  await tick();
  await tick();
  // water
  progress?.(.8, "Filling the seas");
  ctx.save(); ctx.clip(G.water, "evenodd");
  const wg = ctx.createLinearGradient(0, 0, W, H); wg.addColorStop(0, "#8fb0b3"); wg.addColorStop(1, "#6f97a1"); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .35; ctx.fillStyle = ctx.createPattern(paper(), "repeat")!; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.filter = "blur(10px)"; [90, 54, 26].forEach((w, i) => { ctx.strokeStyle = `rgba(200,222,214,${.18 + i * .1})`; ctx.lineWidth = w; ctx.stroke(G.landOutline); }); ctx.filter = "none";
  const lay = mk(cv.width, cv.height), lx = lay.getContext("2d")!; lx.setTransform(scale, 0, 0, scale, 0, 0); lx.lineJoin = "round"; lx.lineCap = "round";
  [48, 36, 25, 15].forEach((d, i) => { lx.globalCompositeOperation = "source-over"; lx.strokeStyle = `rgba(40,70,80,${.16 + i * .07})`; lx.lineWidth = d; lx.stroke(G.landOutline); lx.globalCompositeOperation = "destination-out"; lx.lineWidth = d - 1.2; lx.stroke(G.landOutline); });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lay, 0, 0); ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const wr = mulberry(9); ctx.strokeStyle = "rgba(40,70,80,.33)"; ctx.lineWidth = .9; ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) { const x = wr() * W, y = wr() * H; if (!hctx.isPointInPath(G.water, x, y, "evenodd")) continue; hctx.lineWidth = 60; if (hctx.isPointInStroke(G.landOutline, x, y)) continue; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x - 3, y - 3, x, y); ctx.quadraticCurveTo(x + 3, y + 3, x + 6, y); ctx.stroke(); }
  ctx.strokeStyle = "#2d3f44"; ctx.lineWidth = 2.6; ctx.stroke(G.landOutline);
  ctx.restore();
  ctx.save(); ctx.clip(G.land, "evenodd"); ctx.filter = "blur(2px)"; ctx.strokeStyle = "rgba(60,45,20,.18)"; ctx.lineWidth = 5; ctx.stroke(G.water); ctx.restore();
  await tick();
  // sites
  progress?.(.88, "Raising castles");
  const capitals = new Set(Object.values(M.capital));
  for (const [c, a] of Object.entries(M.capital)) { const p = M.center[a]; if (!p) continue; const al = D.COUNTRIES[c]?.align || "N"; drawCastle(ctx, p[0], p[1] - 4, .42, ALC[al]); }
  M.fort.forEach(a => { const p = M.center[a]; if (p && !capitals.has(a)) drawStoneFort(ctx, p[0], p[1] - 2, .5); });
  M.port.forEach(a => { const p = M.center[a]; if (p) drawAnchor(ctx, p[0] + (capitals.has(a) ? 20 : 0), p[1] + 12, .5); });
  M.magic.forEach(a => { const p = M.center[a]; if (p) drawRuin(ctx, p[0] - 14, p[1] + 10, .5); });
  M.merc.forEach(a => { const p = M.center[a]; if (p) drawTent(ctx, p[0] + 14, p[1] + 12, .5); });
  // ferries
  M.ferry.forEach(([a, b]) => { const p = M.center[a], q = M.center[b]; if (!p || !q) return; ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = "#2b1e10"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore(); });
  // country names
  progress?.(.94, "Lettering");
  ctx.textAlign = "center"; ctx.lineJoin = "round";
  for (const [c, ids] of Object.entries(byCountry)) {
    const pts = ids.map(i => M.center[i]).filter(Boolean); if (!pts.length) continue;
    const x = pts.reduce((s, p) => s + p[0], 0) / pts.length, y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const name = (M.countryName[c] || D.COUNTRIES[c]?.name || c).toUpperCase(); const size = Math.min(22, 11 + ids.length * 1.4);
    ctx.font = `${size}px "IM Fell English SC", Georgia, serif`; ctx.fillStyle = ALC[D.COUNTRIES[c]?.align || "N"]; ctx.globalAlpha = .55; ctx.strokeStyle = "rgba(236,224,196,.55)"; ctx.lineWidth = 3;
    spaced(ctx, name, x, y + 26, size * .3); ctx.globalAlpha = 1;
  }
  // big water names
  ctx.font = 'italic 17px "IM Fell English", Georgia, serif'; ctx.fillStyle = "#2f5560"; ctx.strokeStyle = "rgba(180,205,205,.6)"; ctx.lineWidth = 2.5;
  M.ids.filter(id => M.kind[id] === "W" && M.name[id] && !/\d/.test(M.name[id])).forEach(id => { const p = M.center[id]; if (p) spaced(ctx, M.name[id], p[0], p[1] - 14, 3); });
  // vignette and neatline
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .7); vg.addColorStop(0, "rgba(80,50,20,0)"); vg.addColorStop(1, "rgba(80,50,20,.34)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#2b1e10"; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12); ctx.lineWidth = .8; ctx.strokeRect(12, 12, W - 24, H - 24);
  for (let x = 12, i = 0; x < W - 12; x += 30, i++) { ctx.fillStyle = i % 2 ? "#efe3c4" : "#2b1e10"; ctx.fillRect(x, 6, Math.min(30, W - 12 - x), 6); ctx.fillRect(x, H - 12, Math.min(30, W - 12 - x), 6); }
  for (let y = 12, i = 0; y < H - 12; y += 30, i++) { ctx.fillStyle = i % 2 ? "#efe3c4" : "#2b1e10"; ctx.fillRect(6, y, 6, Math.min(30, H - 12 - y)); ctx.fillRect(W - 12, y, 6, Math.min(30, H - 12 - y)); }
  progress?.(1, "Done");
  return cv;
}
