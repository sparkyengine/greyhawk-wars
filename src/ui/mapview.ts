/* Interactive map: the painted atlas underneath, a live overlay of tokens and highlights on top. */
import { GW } from "../engine/engine.js";
import type { Army } from "../engine/engine.js";
import { geometry, MAP_W, MAP_H } from "../render/atlas";
import { coin, leadUnit } from "../render/coins";
import { banner, shipSprite, heroMedallion, drawPalisade, nationColor } from "../render/pieces";

export interface Highlight { fill: string; stroke: string; dash?: boolean; label?: string; tone?: "gold" | "red" | "blue" | "green" }
type Token = { x: number; y: number; r: number; kind: "army" | "hero"; id: string };

const TONES = {
  gold: { fill: "rgba(214,167,75,.30)", stroke: "#e9c06a", text: "#f3d48a" },
  red: { fill: "rgba(224,103,91,.32)", stroke: "#f07a6c", text: "#f6b8ae" },
  blue: { fill: "rgba(90,152,234,.28)", stroke: "#7fb2f0", text: "#b9d6fb" },
  green: { fill: "rgba(111,191,138,.28)", stroke: "#84d39f", text: "#bfe9cc" },
};
export function hl(tone: keyof typeof TONES, label?: string, dash = true): Highlight { return { fill: TONES[tone].fill, stroke: TONES[tone].stroke, dash, label, tone }; }

const hctx = document.createElement("canvas").getContext("2d")!;

export class MapView {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  base: HTMLCanvasElement | null = null;
  ox = 0; oy = 0; z = .5; dpr = 1;
  highlights = new Map<number, Highlight>();
  selected: { kind: "army" | "hero"; id: string } | null = null;
  path: number[] | null = null; pathAttack = false;
  hover: number | null = null;
  tokens: Token[] = [];
  onArea: (a: number, ev: PointerEvent) => void = () => {};
  onToken: (kind: "army" | "hero", id: string, ev: PointerEvent) => void = () => {};
  onHover: (a: number | null, x: number, y: number) => void = () => {};
  private veil: Path2D | null = null; private queued = false;
  playerColor: (p: number) => string = () => "#888";
  playerNation: (p: number) => string = () => "furyondy";

  constructor(public host: HTMLElement) {
    this.canvas = document.createElement("canvas"); this.canvas.className = "mapcanvas"; this.canvas.setAttribute("aria-label", "Game map");
    host.appendChild(this.canvas); this.ctx = this.canvas.getContext("2d")!;
    new ResizeObserver(() => this.resize()).observe(host);
    this.bindInput(); this.resize();
  }
  setBase(c: HTMLCanvasElement) { this.base = c; this.invalidate(); }
  resetVeil() { this.veil = null; }
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.host.getBoundingClientRect(); this.canvas.width = Math.max(1, r.width * this.dpr); this.canvas.height = Math.max(1, r.height * this.dpr);
    this.canvas.style.width = r.width + "px"; this.canvas.style.height = r.height + "px"; this.invalidate();
  }
  get w() { return this.canvas.width / this.dpr; } get h() { return this.canvas.height / this.dpr; }
  toMap(sx: number, sy: number) { return [(sx - this.ox) / this.z, (sy - this.oy) / this.z]; }
  toScreen(mx: number, my: number) { return [this.ox + mx * this.z, this.oy + my * this.z]; }
  fit(areas?: number[]) {
    const G = geometry(); let b = [0, 0, MAP_W, MAP_H];
    if (areas && areas.length) { b = [1e9, 1e9, -1e9, -1e9]; areas.forEach(a => { const q = G.bbox[a]; if (!q) return; b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }); }
    const pad = 30; const z = Math.min((this.w - pad * 2) / (b[2] - b[0]), (this.h - pad * 2) / (b[3] - b[1]));
    this.z = Math.max(.2, Math.min(3, z)); this.ox = this.w / 2 - (b[0] + b[2]) / 2 * this.z; this.oy = this.h / 2 - (b[1] + b[3]) / 2 * this.z; this.invalidate();
  }
  centerOn(area: number) { const c = GW.map.center[area]; if (!c) return; this.ox = this.w / 2 - c[0] * this.z; this.oy = this.h / 2 - c[1] * this.z; this.invalidate(); }
  zoomBy(f: number, sx = this.w / 2, sy = this.h / 2) {
    const nz = Math.max(.2, Math.min(3.5, this.z * f)); const [mx, my] = this.toMap(sx, sy);
    this.z = nz; this.ox = sx - mx * nz; this.oy = sy - my * nz; this.invalidate();
  }
  invalidate() { if (this.queued) return; this.queued = true; requestAnimationFrame(() => { this.queued = false; this.draw(); }); }

  areaAt(mx: number, my: number): number | null {
    const G = geometry(); let best: number | null = null, bs = 1e12;
    for (const id of GW.map.ids) {
      const b = G.bbox[id]; if (mx < b[0] || mx > b[2] || my < b[1] || my > b[3]) continue;
      if (hctx.isPointInPath(G.path[id], mx, my, "evenodd")) { const s = (b[2] - b[0]) * (b[3] - b[1]); if (s < bs) { bs = s; best = id; } }
    }
    return best;
  }
  private bindInput() {
    let down = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false; const pts = new Map<number, [number, number]>(); let pinch = 0;
    const c = this.canvas;
    c.addEventListener("pointerdown", e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = true; moved = false; sx = e.clientX; sy = e.clientY; ox = this.ox; oy = this.oy; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect(); const lx = e.clientX - r.left, ly = e.clientY - r.top;
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.zoomBy(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch = d; moved = true; return; }
      if (down) { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 5) moved = true; if (moved) { this.ox = ox + dx; this.oy = oy + dy; this.invalidate(); c.classList.add("drag"); } return; }
      const [mx, my] = this.toMap(lx, ly); const tok = this.tokenAt(lx, ly); const a = tok ? null : this.areaAt(mx, my);
      c.style.cursor = tok ? "pointer" : (a != null && this.highlights.has(a) ? "pointer" : "grab");
      if (a !== this.hover) { this.hover = a; this.invalidate(); }
      this.onHover(a, lx, ly);
    });
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!down) return; down = false; c.classList.remove("drag");
      if (moved) return;
      const r = c.getBoundingClientRect(); const lx = e.clientX - r.left, ly = e.clientY - r.top;
      const tok = this.tokenAt(lx, ly); if (tok) { this.onToken(tok.kind, tok.id, e); return; }
      const [mx, my] = this.toMap(lx, ly); const a = this.areaAt(mx, my); if (a != null) this.onArea(a, e);
    };
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", () => { if (this.hover != null) { this.hover = null; this.invalidate(); } this.onHover(null, 0, 0); });
    c.addEventListener("wheel", e => { e.preventDefault(); const r = c.getBoundingClientRect(); this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  }
  tokenAt(x: number, y: number): Token | null { for (let i = this.tokens.length - 1; i >= 0; i--) { const t = this.tokens[i]; if (Math.hypot(x - t.x, y - t.y) <= t.r) return t; } return null; }
  tokenSize() { return Math.max(26, Math.min(58, 42 * Math.sqrt(this.z))); }

  draw() {
    const ctx = this.ctx, S = GW.state; const z = this.z;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.fillStyle = "#0b1015"; ctx.fillRect(0, 0, this.w, this.h);
    if (!this.base || !S) return;
    ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = "high";
    ctx.drawImage(this.base, this.ox, this.oy, MAP_W * z, MAP_H * z);
    const G = geometry();
    ctx.save(); ctx.translate(this.ox, this.oy); ctx.scale(z, z);
    if (!this.veil) { this.veil = new Path2D(); GW.map.ids.forEach(id => { if (!GW.inPlayArea(id)) this.veil!.addPath(G.path[id]); }); }
    ctx.fillStyle = "rgba(8,11,16,.62)"; ctx.fill(this.veil, "evenodd");
    for (const [a, h] of this.highlights) { const p = G.path[a]; if (!p) continue; ctx.fillStyle = h.fill; ctx.fill(p, "evenodd"); ctx.strokeStyle = h.stroke; ctx.lineWidth = 2.2 / z; ctx.setLineDash(h.dash ? [7 / z, 5 / z] : []); ctx.stroke(p); }
    ctx.setLineDash([]);
    if (this.hover != null && G.path[this.hover]) { ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.fill(G.path[this.hover], "evenodd"); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.6 / z; ctx.stroke(G.path[this.hover]); }
    ctx.restore();
    // path preview
    if (this.path && this.path.length > 1) {
      const pts = this.path.map(a => GW.map.center[a]).filter(Boolean).map(c => this.toScreen(c[0], c[1]));
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = "rgba(20,10,4,.6)"; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = this.pathAttack ? "#f07a6c" : "#f3d48a"; ctx.lineWidth = 4; ctx.setLineDash([2, 9]); ctx.stroke(); ctx.setLineDash([]);
      const a = pts[pts.length - 2], b = pts[pts.length - 1]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.fillStyle = this.pathAttack ? "#f07a6c" : "#f3d48a"; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-12, -9); ctx.lineTo(-8, 0); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // labels for highlights
    for (const [a, h] of this.highlights) { if (!h.label) continue; const c = GW.map.center[a]; if (!c) continue; const [x, y] = this.toScreen(c[0], c[1]); const tone = TONES[h.tone || "gold"];
      ctx.font = '700 12px "Alegreya Sans", sans-serif'; const w = ctx.measureText(h.label).width + 16; const ly = y + this.tokenSize() * .78;
      ctx.fillStyle = "rgba(20,14,8,.9)"; ctx.beginPath(); (ctx as any).roundRect(x - w / 2, ly - 10, w, 20, 10); ctx.fill(); ctx.strokeStyle = h.stroke; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = tone.text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(h.label, x, ly + .5); }
    // forts
    const s = this.tokenSize(); this.tokens = [];
    for (const [a, p] of Object.entries(S.forts)) { const c = GW.map.center[+a]; if (!c) continue; const [x, y] = this.toScreen(c[0], c[1]); drawPalisade(ctx, x - s * .75, y + s * .25, s / 44, this.playerColor(p)); }
    // armies and fleets
    const armies = Object.values(S.armies).sort((a, b) => (GW.map.center[a.area]?.[1] || 0) - (GW.map.center[b.area]?.[1] || 0));
    for (const x of armies) this.drawArmy(x, s);
    // heroes
    const byArea = new Map<number, string[]>(); Object.values(S.heroes).forEach(hh => { if (hh.area != null) { const l = byArea.get(hh.area) || []; l.push(hh.id); byArea.set(hh.area, l); } });
    for (const [a, ids] of byArea) {
      const c = GW.map.center[a]; if (!c) continue; const [x, y] = this.toScreen(c[0], c[1]); const r = s * .3; const hasArmy = !!GW.armyAt(a);
      ids.forEach((id, i) => { const hh = S.heroes[id]; const hx = x + (hasArmy ? s * .62 : 0) + i * r * 1.5 - (hasArmy ? 0 : (ids.length - 1) * r * .75), hy = y - (hasArmy ? s * .55 : 0);
        if (this.selected?.kind === "hero" && this.selected.id === id) { ctx.save(); ctx.shadowColor = "rgba(255,214,110,.95)"; ctx.shadowBlur = 16; ctx.strokeStyle = "#ffd66e"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy, r * 1.25, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        heroMedallion(ctx, hx, hy, r, this.playerColor(hh.owner), hh.act, hh.owner + (+id.split("_")[1] || 0)); this.tokens.push({ x: hx, y: hy, r: r * 1.05, kind: "hero", id }); });
    }
    // labels
    if (z > .62) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (const id of GW.map.ids) {
        if (!GW.inPlayArea(id)) continue; const c = GW.map.center[id]; if (!c) continue;
        const cap = GW.isCapital(id); if (!cap && z < 1.0) continue;
        const [x, y] = this.toScreen(c[0], c[1]); if (x < -50 || y < -20 || x > this.w + 50 || y > this.h + 20) continue;
        const name = GW.areaName(id); const water = GW.isWater(id);
        ctx.font = `${cap ? 15 : 12.5}px ${water ? '"IM Fell English", Georgia, serif' : '"IM Fell English SC", Georgia, serif'}`;
        const ly = y + (GW.armyAt(id) ? s * .74 : s * .1) + (cap ? 4 : 0);
        ctx.strokeStyle = "rgba(240,230,205,.9)"; ctx.lineWidth = 3.5; ctx.strokeText(name, x, ly); ctx.fillStyle = water ? "#21414b" : "#2b1e10"; ctx.fillText(name, x, ly);
      }
    }
    if (this.hover != null) { const c = GW.map.center[this.hover]; if (c) { /* hover label handled by tooltip */ } }
  }
  private drawArmy(x: Army, s: number) {
    const ctx = this.ctx; const c = GW.map.center[x.area]; if (!c) return; const [px, py] = this.toScreen(c[0], c[1]);
    if (px < -80 || py < -80 || px > this.w + 80 || py > this.h + 80) return;
    const sel = this.selected?.kind === "army" && this.selected.id === x.id; const nation = this.playerNation(x.owner);
    ctx.save();
    if (sel) { ctx.save(); ctx.shadowColor = "rgba(255,210,100,.95)"; ctx.shadowBlur = 20; ctx.strokeStyle = "rgba(255,214,110,.95)"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(px, py + s * .1, s * .8, s * .32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = "rgba(20,12,4,.4)"; ctx.beginPath(); ctx.ellipse(px + s * .12, py + s * .14, s * .62, s * .22, 0, 0, Math.PI * 2); ctx.fill();
    if (x.fleet) {
      if (x.act) ctx.filter = "grayscale(.85) brightness(.85)";
      shipSprite(ctx, px, py + s * .2, s / 110, "long", nationColor(nation), "#d9ac58", false);
    } else {
      const img = coin(leadUnit(x.units), false, { plaque: false }); const k = Math.min(x.units.length, 4); const cs = s;
      for (let i = 0; i < k; i++) { ctx.save(); ctx.filter = (x.act ? "grayscale(.85) " : "") + (i < k - 1 ? "brightness(.55)" : (x.act ? "brightness(.85)" : "none")); ctx.drawImage(img, px - cs / 2, py - cs / 2 - i * cs * .07, cs, cs); ctx.restore(); }
      ctx.filter = x.act ? "grayscale(.85) brightness(.85)" : "none";
      banner(ctx, px + cs * .3, py - cs * .32 - k * cs * .07, nation, cs / 62, (x.area % 5) - 2);
    }
    ctx.filter = "none";
    const n = x.units.length + (x.cargo?.length ? x.cargo.length : 0);
    const bx = px - s * .5, by = py + s * .32; ctx.fillStyle = "rgba(28,20,10,.94)"; ctx.beginPath(); (ctx as any).roundRect(bx - 11, by - 10, 22, 20, 6); ctx.fill(); ctx.strokeStyle = this.playerColor(x.owner); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#f6e7bd"; ctx.font = '800 13px "Alegreya Sans", sans-serif'; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n), bx, by + 1);
    if (x.units.some(u => u.hp === 1 && GW.twoStep(u))) { ctx.fillStyle = "#e0a13c"; ctx.beginPath(); ctx.arc(bx + 10, by - 9, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#241a05"; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
    this.tokens.push({ x: px, y: py, r: s * .52, kind: "army", id: x.id });
  }
}
