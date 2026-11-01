/* Struck-coin troop tokens: gold rim, enamel field by alignment, embossed emblem, strength plaque, hit gems.
   Emblems are vector paths in a 100x100 box. Everything is drawn on canvas and cached. */
import { GW } from "../engine/engine.js";

const TAU = Math.PI * 2;
export const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const PD = (s: string) => new Path2D(s);
function circP(x: number, y: number, r: number) { const p = new Path2D(); p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); return p; }
function ell(x: number, y: number, rx: number, ry: number) { const p = new Path2D(); p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, 0, 0, TAU); return p; }
function join(...ps: Path2D[]) { const p = new Path2D(); for (const q of ps) p.addPath(q); return p; }
function shaft(x0: number, y0: number, x1: number, y1: number, w: number) { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2; return PD(`M${x0 + nx} ${y0 + ny}L${x1 + nx} ${y1 + ny}L${x1 - nx} ${y1 - ny}L${x0 - nx} ${y0 - ny}Z`); }
function head(x1: number, y1: number, dx: number, dy: number, len: number, w: number) { const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux; const tx = x1 + ux * len, ty = y1 + uy * len, mx = x1 + ux * len * .38, my = y1 + uy * len * .38; return PD(`M${x1} ${y1}L${mx + nx * w} ${my + ny * w}L${tx} ${ty}L${mx - nx * w} ${my - ny * w}Z`); }

const HS = "M30 94L33 68Q28 58 31 45Q34 30 45 22L47 8L54 19Q58 17 63 19Q75 25 83 39L89 49Q91 56 85 58L77 56Q73 60 67 58Q61 56 57 60Q55 74 63 94Z";
const HE = ["M45 23Q36 31 35 45Q34 57 36 67", "M41 29L36 27M38 37L33 36M36 47L31 47M36 57L31 58", "M83 50Q85 52 84 54", "M77 56L84 55", "M67 58Q66 48 60 44"];
const horse = () => join(PD(HS), ell(63, 31, 3, 2.2));
const PLATE = "M52 21Q66 23 80 38L86 48L80 52Q70 41 58 34Z";

type Emblem = { f: Path2D[]; e: string[] };
let EMB: Record<string, Emblem> | null = null;
function emblems(): Record<string, Emblem> {
  if (EMB) return EMB;
  EMB = {
    LI: { f: [shaft(20, 86, 76, 22, 4.6), shaft(80, 86, 24, 22, 4.6), head(76, 22, 56, -64, 17, 5.5), head(24, 22, -56, -64, 17, 5.5), circP(50, 60, 19)], e: ["M50 46A14 14 0 1 1 49.9 46", "M55 60A5 5 0 1 1 54.9 60", "M50 41V43M50 77V79M31 60H33M67 60H69"] },
    MI: { f: [PD("M47 14H53V66L50 72L47 66Z"), PD("M33 18H67V23.5H33Z"), PD("M48 6H52V18H48Z"), circP(50, 5, 3.6), PD("M27 30Q50 23 73 30L71 52Q67 74 50 94Q33 74 29 52Z")], e: ["M31.5 34Q50 28 68.5 34L66.8 52Q63 70 50 88Q37 70 33.2 52Z", "M50 36V84M35 50H65"] },
    HI: { f: [join(PD("M30 24Q30 10 50 10Q70 10 70 24L72 70Q64 82 50 86Q36 82 28 70Z"), PD("M33 37H67V43H33Z"), circP(40, 56, 2.1), circP(40, 63, 2.1), circP(44, 59.5, 2.1), circP(60, 56, 2.1), circP(60, 63, 2.1), circP(56, 59.5, 2.1)), PD("M50 11Q47 0 36 2Q45 5 46 11Z")], e: ["M50 12V37M50 43V84", "M30.5 30Q50 26 69.5 30", "M29 50Q50 46 71 50"] },
    LC: { f: [horse()], e: HE },
    MC: { f: [horse(), PD("M52 19Q47 3 36 6Q45 9 48 18Z")], e: [...HE, PLATE] },
    HC: { f: [shaft(20, 36, 96, 82, 3.6), head(20, 36, -76, -46, 13, 4.2), PD("M28 41L12 50L24 51L17 59L34 45Z"), horse(), PD("M50 20L53 3L57 19Z")], e: [...HE, PLATE, "M34 70Q46 66 58 68M33 78Q46 74 60 78M33 86Q46 82 61 88"] },
    ElfCav: { f: [horse(), PD("M50 18Q56 2 66 8Q62 18 50 18Z")], e: [...HE, "M51 17Q58 10 64 9"] },
    Scout: { f: [PD("M38 8Q82 50 38 92L44 92Q66 50 44 8Z"), PD("M39.2 10H40.8V90H39.2Z"), PD("M14 48.8H84V51.4H14Z"), PD("M83 43.5L97 50.1L83 56.7Z"), PD("M16 49L6 41H12L22 49Z"), PD("M16 51.2L6 59.2H12L22 51.2Z")], e: [] },
    Marine: { f: [join(circP(50, 14, 8.5), circP(50, 14, 4.4)), PD("M47 21H53V84H47Z"), PD("M31 27H69V32.5H31Z"), PD("M14 62Q22 88 50 92Q78 88 86 62L79 61Q74 81 50 85Q26 81 21 61Z"), PD("M11 67L9 52L24 60Z"), PD("M89 67L91 52L76 60Z")], e: ["M47 40H53M47 48H53"] },
    Ship: { f: [PD("M8 60Q50 80 92 60L85 72Q50 90 15 72Z"), PD("M8 60Q2 46 11 40Q10 50 15 56Z"), PD("M92 60Q98 46 89 40Q90 50 85 56Z"), PD("M48.5 10H51.5V66H48.5Z"), PD("M25 17Q50 12 75 17Q78 36 74 54Q50 49 26 54Q22 36 25 17Z")], e: ["M37 15.5V52M50 13.5V50.5M63 15.5V52", "M14 67Q50 84 86 67"] },
    Giant: { f: [PD("M18 86L28 94L72 30Q80 16 70 8Q58 6 54 20Z"), join(circP(72, 72, 17), PD("M66 62L72 70L66 78L64 70Z"))], e: ["M60 22L66 26M56 34L62 38M48 46L54 50", "M62 66Q70 60 80 64"] },
    Dragon: { f: [join(PD("M18 92Q20 70 30 60Q22 54 22 44Q24 30 38 26L34 10L46 22L50 8L56 24Q70 26 82 36L94 42Q96 48 90 50L80 50L88 56Q84 62 74 60L64 58Q58 66 50 70Q42 76 40 92Z"), PD("M58 33Q63 30 67 34Q63 37 58 33Z"), circP(88, 44.5, 1.6))], e: ["M64 53L80 51", "M66 54L68 58L70 54L72 58L74 54", "M30 64Q36 68 42 64M28 74Q34 78 40 74M26 84Q32 88 38 84", "M44 29Q54 26 62 30"] },
    Elf: { f: [shaft(12, 90, 84, 16, 3), head(84, 16, 72, -74, 13, 4.4), PD("M50 8Q84 34 71 66Q63 84 50 94Q37 84 29 66Q16 34 50 8Z")], e: ["M50 16V90", "M50 34L63 25M50 46L67 37M50 58L68 50M50 70L63 64M50 34L37 25M50 46L33 37M50 58L32 50M50 70L37 64"] },
    Dwarf: { f: [PD("M47.5 10H52.5V95H47.5Z"), PD("M47 22Q30 14 14 22Q8 36 14 50Q30 58 47 50Z"), PD("M53 22Q70 14 86 22Q92 36 86 50Q70 58 53 50Z"), PD("M50 1L55 11H45Z")], e: ["M19 26Q14 36 19 46M81 26Q86 36 81 46", "M47.5 64H52.5M47.5 71H52.5M47.5 78H52.5", "M47 36H53"] },
    Gnome: { f: [PD("M50 4L72 42H28Z"), join(circP(50, 54, 15), circP(44, 50, 2.4), circP(56, 50, 2.4)), circP(50, 57, 5.5), PD("M35 60Q50 98 65 60Q58 70 50 70Q42 70 35 60Z")], e: ["M30 42H70", "M42 78L44 84M50 80V88M58 78L56 84"] },
    Halfling: { f: [PD("M14 18Q36 28 48 62L52 62Q40 24 18 14Z"), PD("M86 18Q64 28 52 62L48 62Q60 24 82 14Z"), PD("M38 58Q50 52 62 58Q64 72 50 78Q36 72 38 58Z"), circP(50, 88, 7)], e: ["M44 62Q50 66 56 62"] },
    Treant: { f: [circP(50, 30, 21), circP(30, 40, 16), circP(70, 40, 16), circP(39, 21, 14), circP(61, 21, 14), join(PD("M43 50H57L61 82Q70 87 78 93H22Q30 87 39 82Z"), circP(46, 62, 2.2), circP(54, 62, 2.2), PD("M45 70Q50 74 55 70Q50 77 45 70Z"))], e: ["M36 31Q43 26 50 31M53 22Q60 17 67 22M27 44Q34 39 41 44M59 41Q66 36 73 41", "M50 50V56"] },
    Orc: { f: [PD("M25 36L9 29L22 50Z"), PD("M75 36L91 29L78 50Z"), join(PD("M24 30Q24 12 50 12Q76 12 76 30L78 54Q76 76 50 86Q24 76 22 54Z"), PD("M31 40L45 46L33 50Z"), PD("M69 40L55 46L67 50Z"), PD("M33 64Q50 71 67 64L64 76Q50 82 36 76Z"), circP(46, 57, 2), circP(54, 57, 2)), PD("M39 75L41.5 66L45 73.5Z"), PD("M61 75L58.5 66L55 73.5Z")], e: ["M28 35Q38 31 46 38M72 35Q62 31 54 38", "M50 18V30"] },
    Goblin: { f: [PD("M35 33L3 17L31 52Z"), PD("M65 33L97 17L69 52Z"), join(PD("M32 30Q32 17 50 17Q68 17 68 30V52Q68 70 50 77Q32 70 32 52Z"), circP(42, 40, 4.2), circP(58, 40, 4.2), PD("M37 55Q50 67 63 55Q57 63 50 63Q43 63 37 55Z"))], e: ["M50 45V51", "M37 34L46 36M63 34L54 36"] },
    Hobgoblin: { f: [join(PD("M28 30Q28 12 50 12Q72 12 72 30V62Q72 80 50 88Q28 80 28 62Z"), PD("M35 40L46 44L36 48Z"), PD("M65 40L54 44L64 48Z"), PD("M40 66H60V72H40Z")), PD("M44 12Q50 -2 56 12Z"), PD("M22 34L28 30V58L20 54Z"), PD("M78 34L72 30V58L80 54Z")], e: ["M28 30Q50 26 72 30", "M50 14V36"] },
    Ogre: { f: [join(PD("M42 94H58L62 36Q64 12 50 8Q36 12 38 36Z")), PD("M60 26L72 20L64 32Z"), PD("M40 26L28 20L36 32Z"), PD("M62 46L76 44L63 54Z"), PD("M38 46L24 44L37 54Z"), PD("M50 8L54 0L46 0Z")], e: ["M42 70H58M42 78H58M42 86H58"] },
    Bugbear: { f: [PD("M47 46H53V96H47Z"), circP(50, 28, 16), PD("M50 4L54 13H46Z"), PD("M74 28L65 32V24Z"), PD("M26 28L35 24V32Z"), PD("M67 11L64 21L58 15Z"), PD("M33 11L42 15L36 21Z"), PD("M67 45L58 41L64 35Z"), PD("M33 45L36 35L42 41Z")], e: ["M40 22Q50 16 60 22", "M47 82H53M47 88H53"] },
    Gnoll: { f: [circP(28, 22, 10), circP(72, 22, 10), join(PD("M26 34Q30 16 50 16Q70 16 74 34L70 56Q64 64 60 80Q50 92 40 80Q36 64 30 56Z"), PD("M35 38L45 42L36 46Z"), PD("M65 38L55 42L64 46Z"), ell(50, 70, 6, 4))], e: ["M28 22A4 4 0 1 1 27.9 22M72 22A4 4 0 1 1 71.9 22", "M50 74V82M44 82Q50 86 56 82", "M38 26L40 30M50 22V27M62 26L60 30"] },
    Troll: { f: [PD("M20 12Q42 46 30 92L37 92Q51 46 29 12Z"), PD("M42 6Q63 44 50 94L57 94Q71 44 51 6Z"), PD("M63 12Q84 48 71 90L78 90Q92 48 72 12Z")], e: [] },
    Bullywug: { f: [join(PD("M10 56Q10 36 50 36Q90 36 90 56Q90 80 50 82Q10 80 10 56Z")), join(circP(28, 32, 13), circP(28, 32, 5.5)), join(circP(72, 32, 13), circP(72, 32, 5.5))], e: ["M18 60Q50 76 82 60", "M44 48L46 50M56 48L54 50"] },
  };
  return EMB;
}

const ENAMEL: Record<string, [string, string, string]> = { G: ["#4f82d0", "#25508f", "#0f2550"], E: ["#c24a44", "#7c1d22", "#360a0e"], N: ["#8c918b", "#5a5f5a", "#262927"] };
function tint(src: HTMLCanvasElement, color: string) { const c = mk(src.width, src.height), x = c.getContext("2d")!; x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }

const CACHE = new Map<string, HTMLCanvasElement>();
/** A 256x256 coin for a unit type. `wounded` shows the back side; `plaque` hides the number when false. */
export function coin(key: string, wounded = false, opts: { plaque?: boolean; bonus?: number } = {}): HTMLCanvasElement {
  const def = GW.data.UNITS[key]; const al = def.side; const two = def.b > 0; const w = wounded && two;
  const value = (w ? def.b : def.f) + (opts.bonus || 0);
  const ck = [key, w, opts.plaque !== false, value].join("|");
  const hit = CACHE.get(ck); if (hit) return hit;
  const S = 256, c = mk(S, S), x = c.getContext("2d")!, cx = 128, cy = 124, R = 112;
  x.save(); x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 16; x.shadowOffsetY = 7; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fillStyle = "#5b3d14"; x.fill(); x.restore();
  const cg = (x as any).createConicGradient ? (x as any).createConicGradient(-Math.PI * .75, cx, cy) : x.createLinearGradient(0, 0, S, S);
  [[0, "#fff1bf"], [.1, "#d9a84e"], [.24, "#7d5418"], [.38, "#e7c06a"], [.5, "#fbe6a8"], [.62, "#a8762b"], [.76, "#6c4512"], [.88, "#d9ac58"], [1, "#fff1bf"]].forEach(s => cg.addColorStop(s[0] as number, s[1] as string));
  x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fillStyle = cg; x.fill(); x.strokeStyle = "#3a2508"; x.lineWidth = 3; x.stroke();
  x.strokeStyle = "rgba(70,42,8,.55)"; x.lineWidth = 1.3;
  for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2)); x.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); x.stroke(); }
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * TAU; const bx = cx + Math.cos(a) * (R - 12.5), by = cy + Math.sin(a) * (R - 12.5);
    x.fillStyle = "rgba(60,35,5,.55)"; x.beginPath(); x.arc(bx + .8, by + 1, 2.6, 0, TAU); x.fill();
    const bg = x.createRadialGradient(bx - .8, by - .8, .2, bx, by, 2.8); bg.addColorStop(0, "#fff6d2"); bg.addColorStop(1, "#b8862f"); x.fillStyle = bg; x.beginPath(); x.arc(bx, by, 2.4, 0, TAU); x.fill();
  }
  const fr = R - 21;
  x.beginPath(); x.arc(cx, cy, fr + 3, 0, TAU); x.strokeStyle = "rgba(40,24,4,.85)"; x.lineWidth = 4; x.stroke();
  x.beginPath(); x.arc(cx, cy, fr + 5.5, 0, TAU); x.strokeStyle = "rgba(255,240,200,.55)"; x.lineWidth = 1.2; x.stroke();
  const E = ENAMEL[al]; const fg = x.createRadialGradient(cx - 30, cy - 36, 8, cx, cy, fr); fg.addColorStop(0, E[0]); fg.addColorStop(.6, E[1]); fg.addColorStop(1, E[2]);
  x.save(); x.beginPath(); x.arc(cx, cy, fr, 0, TAU); x.clip(); x.fillStyle = fg; x.fillRect(0, 0, S, S);
  x.strokeStyle = "rgba(255,255,255,.06)"; x.lineWidth = .8;
  for (let rr = 6; rr < fr; rr += 5) { x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.stroke(); }
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * fr, cy + Math.sin(a) * fr); x.stroke(); }
  const ig = x.createRadialGradient(cx, cy, fr * .55, cx, cy, fr); ig.addColorStop(0, "rgba(0,0,0,0)"); ig.addColorStop(1, "rgba(0,0,0,.5)"); x.fillStyle = ig; x.fillRect(0, 0, S, S);
  x.restore();
  const em = emblems()[key] || emblems().LI, box = fr * 1.5, sc = box / 100, ox = cx - box / 2, oy = cy - box / 2;
  const mask = mk(S, S), mx = mask.getContext("2d")!; mx.setTransform(sc, 0, 0, sc, ox, oy); mx.fillStyle = "#000"; em.f.forEach(p => mx.fill(p, "evenodd"));
  const gold = mk(S, S), gx = gold.getContext("2d")!; gx.drawImage(mask, 0, 0); gx.globalCompositeOperation = "source-in";
  const gg = gx.createLinearGradient(ox, oy, ox + box, oy + box); gg.addColorStop(0, "#fff3c4"); gg.addColorStop(.35, "#ecc66e"); gg.addColorStop(.7, "#b98432"); gg.addColorStop(1, "#7a5214"); gx.fillStyle = gg; gx.fillRect(0, 0, S, S);
  gx.globalCompositeOperation = "source-atop"; gx.setTransform(sc, 0, 0, sc, ox, oy); gx.lineCap = "round"; gx.lineJoin = "round";
  em.e.forEach(d => { const p = PD(d); gx.strokeStyle = "rgba(255,246,210,.75)"; gx.lineWidth = 2.7 / sc; gx.save(); gx.translate(1 / sc, 1.2 / sc); gx.stroke(p); gx.restore(); gx.strokeStyle = "rgba(70,44,8,.95)"; gx.lineWidth = 2.56 / sc; gx.stroke(p); });
  gx.setTransform(1, 0, 0, 1, 0, 0); const sh = gx.createLinearGradient(0, oy, 0, oy + box); sh.addColorStop(0, "rgba(255,255,255,.15)"); sh.addColorStop(1, "rgba(60,30,0,.25)"); gx.fillStyle = sh; gx.fillRect(0, 0, S, S);
  const dk = tint(mask, "rgba(10,6,2,.85)"), lt = tint(mask, "rgba(255,240,200,.55)");
  x.save(); x.beginPath(); x.arc(cx, cy, fr, 0, TAU); x.clip();
  x.globalAlpha = .55; x.drawImage(dk, 3, 4); x.globalAlpha = 1;
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => x.drawImage(dk, d[0] * 1.2, d[1] * 1.2));
  x.drawImage(lt, -1.2, -1.2); x.drawImage(gold, 0, 0);
  const gl = x.createRadialGradient(cx - 42, cy - 50, 4, cx - 30, cy - 36, fr * 1.1); gl.addColorStop(0, "rgba(255,255,255,.32)"); gl.addColorStop(.5, "rgba(255,255,255,.06)"); gl.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gl; x.fillRect(0, 0, S, S);
  if (w) {
    x.fillStyle = "rgba(70,70,60,.32)"; x.globalCompositeOperation = "multiply"; x.fillRect(0, 0, S, S); x.globalCompositeOperation = "source-over";
    const cr = [[cx - 20, cy - fr], [cx - 6, cy - 48], [cx - 22, cy - 18], [cx + 4, cy + 6], [cx - 6, cy + 30], [cx + 14, cy + fr]];
    x.strokeStyle = "rgba(15,8,2,.9)"; x.lineWidth = 3.4; x.lineJoin = "round"; x.beginPath(); cr.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
    x.strokeStyle = "rgba(255,235,190,.5)"; x.lineWidth = 1; x.beginPath(); cr.forEach((p, i) => i ? x.lineTo(p[0] + 2, p[1] + 1) : x.moveTo(p[0] + 2, p[1] + 1)); x.stroke();
  }
  x.restore();
  const gxp = cx, gyp = cy - R + 12; x.beginPath(); x.arc(gxp, gyp, 11, 0, TAU); x.fillStyle = E[1]; x.fill(); x.strokeStyle = "#3a2508"; x.lineWidth = 2; x.stroke();
  x.fillStyle = "#ffe7a0"; x.strokeStyle = "#ffe7a0"; x.lineWidth = 1.6;
  if (al === "G") { x.beginPath(); x.arc(gxp, gyp, 3.4, 0, TAU); x.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.beginPath(); x.moveTo(gxp + Math.cos(a) * 5.2, gyp + Math.sin(a) * 5.2); x.lineTo(gxp + Math.cos(a) * 8, gyp + Math.sin(a) * 8); x.stroke(); } }
  else if (al === "E") { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? 2.6 : 8; x.lineTo(gxp + Math.cos(a) * rr, gyp + Math.sin(a) * rr); } x.closePath(); x.fill(); }
  else { x.beginPath(); x.arc(gxp, gyp, 5.5, 0, TAU); x.lineWidth = 2.4; x.stroke(); }
  const gems = two ? 2 : 1, left = w ? 1 : gems;
  for (let i = 0; i < gems; i++) {
    const a = Math.PI * (.72 + i * .09); const g2x = cx + Math.cos(a) * (R - 12), g2y = cy + Math.sin(a) * (R - 12);
    x.beginPath(); x.arc(g2x, g2y, 7, 0, TAU); x.fillStyle = "#2a1a05"; x.fill();
    if (i < left) { const rg = x.createRadialGradient(g2x - 2, g2y - 2, .5, g2x, g2y, 7); rg.addColorStop(0, "#ffd0c8"); rg.addColorStop(.4, "#e0453a"); rg.addColorStop(1, "#6d0f0c"); x.fillStyle = rg; x.beginPath(); x.arc(g2x, g2y, 5.6, 0, TAU); x.fill(); }
    else { x.strokeStyle = "rgba(255,230,180,.35)"; x.lineWidth = 1; x.beginPath(); x.arc(g2x, g2y, 4.6, 0, TAU); x.stroke(); }
  }
  if (opts.plaque !== false) {
    const px = cx + 80, py = cy + 80, pr = 31;
    x.save(); x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 8; x.shadowOffsetY = 3; x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fillStyle = "#6b4a14"; x.fill(); x.restore();
    const pg = x.createRadialGradient(px - 10, py - 12, 3, px, py, pr); pg.addColorStop(0, opts.bonus ? "#fffbe6" : "#fff4c8"); pg.addColorStop(.5, opts.bonus ? "#f2c75c" : "#dcae55"); pg.addColorStop(1, "#80561a"); x.fillStyle = pg; x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
    x.strokeStyle = "#3a2508"; x.lineWidth = 2.6; x.stroke(); x.strokeStyle = "rgba(60,36,6,.6)"; x.lineWidth = 1.2; x.beginPath(); x.arc(px, py, pr - 5, 0, TAU); x.stroke();
    x.font = '800 36px "Alegreya Sans", sans-serif'; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(255,246,214,.75)"; x.fillText(String(value), px + 1, py + 3); x.fillStyle = opts.bonus ? "#7a1b0b" : "#3a2306"; x.fillText(String(value), px, py + 1.5);
  }
  CACHE.set(ck, c); return c;
}

/** The strongest unit in a stack decides which emblem leads the stack. */
export function leadUnit(units: { t: string; hp: number }[]): string {
  let best = units[0]?.t ?? "LI", bv = -1;
  for (const u of units) { const d = GW.data.UNITS[u.t]; const v = (u.hp === 2 || d.b === 0 ? d.f : d.b) + (d.flags.includes("monster") ? .5 : 0); if (v > bv) { bv = v; best = u.t; } }
  return best;
}

export function coinURL(key: string, wounded = false, opts: { plaque?: boolean; bonus?: number } = {}) {
  const k = "url|" + key + wounded + JSON.stringify(opts);
  const c = CACHE.get(k); if (c) return (c as any).__url as string;
  const src = coin(key, wounded, opts); const url = src.toDataURL(); (src as any).__url = url; CACHE.set(k, src); return url;
}
