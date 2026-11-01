/* Painted pieces shared by the map and the panels: banners, ships, castles, site icons, hero medallions. */
const TAU = Math.PI * 2;
type C = CanvasRenderingContext2D;

export const NATION: Record<string, { n: string; c: string; dark?: boolean }> = {
  furyondy: { n: "Furyondy", c: "#2e5ea8" }, iuz: { n: "Iuz", c: "#7a1622" }, nyrond: { n: "Nyrond", c: "#e9e1cc", dark: true },
  keoland: { n: "Keoland", c: "#1f7a55" }, greatkingdom: { n: "Great Kingdom", c: "#c8961e" }, scarlet: { n: "Scarlet Brotherhood", c: "#c43a2a" },
};
export const nationColor = (k: string) => (NATION[k] || NATION.furyondy).c;

export function device(ctx: C, key: string, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const N = NATION[key] || NATION.furyondy; const fg = N.dark ? "#2b1e10" : "#f6e7bd";
  ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (key === "furyondy") { ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -2); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-9, 0, -10, -10); ctx.moveTo(0, 2); ctx.quadraticCurveTo(9, 0, 10, -10); ctx.moveTo(-5, -3); ctx.lineTo(-11, -4); ctx.moveTo(5, -3); ctx.lineTo(11, -4); ctx.moveTo(-8, -6); ctx.lineTo(-13, -10); ctx.moveTo(8, -6); ctx.lineTo(13, -10); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1, 2.2, 0, TAU); ctx.fill(); }
  else if (key === "iuz") { ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI, 0); ctx.lineTo(8, 3); ctx.lineTo(4, 6); ctx.lineTo(4, 10); ctx.lineTo(-4, 10); ctx.lineTo(-4, 6); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.fillStyle = N.c; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-1, 0); ctx.lineTo(-5, 3); ctx.closePath(); ctx.moveTo(6, -2); ctx.lineTo(1, 0); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill(); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-6, -7); ctx.quadraticCurveTo(-14, -9, -14, -16); ctx.quadraticCurveTo(-9, -12, -4, -9); ctx.moveTo(6, -7); ctx.quadraticCurveTo(14, -9, 14, -16); ctx.quadraticCurveTo(9, -12, 4, -9); ctx.fill(); }
  else if (key === "nyrond") { ctx.fillRect(-9, -6, 18, 16); for (let i = 0; i < 4; i++) ctx.fillRect(-9 + i * 5, -10, 3, 4); ctx.fillStyle = N.c; ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(-3, 3); ctx.quadraticCurveTo(0, -1, 3, 3); ctx.lineTo(3, 10); ctx.fill(); }
  else if (key === "keoland") { ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(0, -3); ctx.lineTo(11, 8); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? 2 : 5; ctx.lineTo(Math.cos(a) * rr, -10 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  else if (key === "greatkingdom") { ctx.fillStyle = "#2b1e10"; ctx.strokeStyle = "#2b1e10"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); ctx.lineWidth = 1.8; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); } }
  else if (key === "scarlet") { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(9, -9); ctx.moveTo(9, 9); ctx.lineTo(-9, -9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6, -10); ctx.quadraticCurveTo(0, -17, 6, -10); ctx.quadraticCurveTo(0, -13, -6, -10); ctx.fill(); }
  ctx.restore();
}

export function banner(ctx: C, x: number, y: number, key: string, s: number, wave = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const N = NATION[key] || NATION.furyondy;
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
  const fg = ctx.createRadialGradient(-2, -74, 1, 0, -72, 5); fg.addColorStop(0, "#fff3c4"); fg.addColorStop(1, "#a8762b"); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, -72, 4, 0, TAU); ctx.fill(); ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1; ctx.stroke();
  const p = new Path2D(`M1.5 -66C16 ${-72 + wave} 30 ${-60 - wave} 46 -66L38 -50L48 -34C32 ${-28 + wave} 18 ${-40 - wave} 1.5 -34Z`);
  ctx.fillStyle = N.c; ctx.fill(p);
  ctx.save(); ctx.clip(p); const sh = ctx.createLinearGradient(0, 0, 48, 0); sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(.45, "rgba(0,0,0,0)"); sh.addColorStop(.7, "rgba(0,0,0,.22)"); sh.addColorStop(1, "rgba(255,255,255,.08)"); ctx.fillStyle = sh; ctx.fillRect(0, -80, 60, 60); ctx.restore();
  ctx.strokeStyle = "#d9ac58"; ctx.lineWidth = 1.6; ctx.stroke(p); ctx.strokeStyle = "rgba(40,20,5,.8)"; ctx.lineWidth = .7; ctx.stroke(p);
  device(ctx, key, 18, -50, .95);
  ctx.restore();
}

export function shipSprite(ctx: C, x: number, y: number, s: number, type: "long" | "cog" | "galley", sail: string, accent: string, wake = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const ink = "#24160a";
  ctx.fillStyle = "rgba(20,40,50,.3)"; ctx.beginPath(); ctx.ellipse(4, 10, 66, 10, 0, 0, TAU); ctx.fill();
  if (wake) { ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; [[-70, 4, -110, -4], [-70, 10, -118, 16], [-86, 6, -130, 4]].forEach(w => { ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.quadraticCurveTo((w[0] + w[2]) / 2, (w[1] + w[3]) / 2 + 3, w[2], w[3]); ctx.stroke(); }); }
  const wood = (y0: number, y1: number) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#a8743d"); g.addColorStop(.5, "#7a4d23"); g.addColorStop(1, "#3f250f"); return g; };
  const cloth = (x0: number, x1: number) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#fbf3dc"); g.addColorStop(.6, "#e8dcbc"); g.addColorStop(1, "#bfae88"); return g; };
  ctx.lineJoin = "round"; ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
  if (type === "long") {
    ctx.fillStyle = "#4a2e13"; ctx.fillRect(-2, -84, 4, 82); ctx.strokeRect(-2, -84, 4, 82);
    const sp = new Path2D("M-30 -76Q0 -82 30 -76Q36 -50 29 -22Q0 -16 -29 -22Q-36 -50 -30 -76Z");
    ctx.fillStyle = cloth(-30, 30); ctx.fill(sp); ctx.save(); ctx.clip(sp); for (let i = -30; i < 32; i += 12) { ctx.fillStyle = sail; ctx.globalAlpha = .92; ctx.fillRect(i, -90, 6, 80); } ctx.globalAlpha = 1; const sh = ctx.createLinearGradient(-30, 0, 30, 0); sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(1, "rgba(0,0,0,.25)"); ctx.fillStyle = sh; ctx.fillRect(-40, -90, 80, 80); ctx.restore(); ctx.stroke(sp);
    ctx.beginPath(); ctx.moveTo(-34, -78); ctx.lineTo(34, -78); ctx.lineWidth = 2.4; ctx.stroke(); ctx.lineWidth = 1.4;
    const hull = new Path2D("M-62 -8Q0 20 62 -8L52 8Q0 30 -52 8Z"); ctx.fillStyle = wood(-8, 26); ctx.fill(hull); ctx.stroke(hull);
    const prow = new Path2D("M-62 -8Q-76 -30 -62 -42Q-56 -40 -60 -34Q-66 -24 -54 -6Z"); ctx.fillStyle = wood(-42, 0); ctx.fill(prow); ctx.stroke(prow);
    const stern = new Path2D("M62 -8Q76 -28 66 -40Q62 -38 64 -32Q68 -22 54 -6Z"); ctx.fillStyle = wood(-40, 0); ctx.fill(stern); ctx.stroke(stern);
    for (let i = 0; i < 7; i++) { const sx = -42 + i * 14, sy = -1 + Math.abs(sx) * -.08 + 6; ctx.beginPath(); ctx.arc(sx, sy, 5.4, 0, TAU); ctx.fillStyle = i % 2 ? accent : sail; ctx.fill(); ctx.stroke(); }
  } else if (type === "cog") {
    ctx.fillStyle = "#4a2e13"; ctx.fillRect(-2, -96, 4, 88); ctx.strokeRect(-2, -96, 4, 88);
    const sp = new Path2D("M-34 -90Q0 -95 34 -90Q38 -60 33 -28Q0 -22 -33 -28Q-38 -60 -34 -90Z"); ctx.fillStyle = cloth(-34, 34); ctx.fill(sp);
    ctx.save(); ctx.clip(sp); ctx.fillStyle = accent; ctx.fillRect(-6, -100, 12, 80); ctx.fillRect(-40, -66, 80, 12); ctx.restore(); ctx.stroke(sp);
    const hull = new Path2D("M-56 -16L56 -16L44 12Q0 26 -44 12Z"); ctx.fillStyle = wood(-16, 24); ctx.fill(hull); ctx.stroke(hull);
    ctx.fillStyle = wood(-38, -16); ctx.fillRect(30, -38, 28, 22); ctx.strokeRect(30, -38, 28, 22);
    ctx.fillStyle = wood(-30, -16); ctx.fillRect(-58, -28, 20, 12); ctx.strokeRect(-58, -28, 20, 12);
  } else {
    for (let i = 0; i < 11; i++) { ctx.strokeStyle = "#4a2e13"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-50 + i * 10, 4); ctx.lineTo(-58 + i * 10, 22); ctx.stroke(); }
    ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
    ([[-14, -80, "M-14 -80L-14 -10L-56 -14Z"], [22, -70, "M22 -70L22 -10L56 -14Z"]] as [number, number, string][]).forEach(m => { ctx.fillStyle = "#4a2e13"; ctx.fillRect(m[0] - 1.6, m[1], 3.2, 72); const sp = new Path2D(m[2]); ctx.fillStyle = cloth(-56, 56); ctx.fill(sp); ctx.save(); ctx.clip(sp); ctx.fillStyle = accent; ctx.globalAlpha = .9; ctx.fillRect(-60, -48, 130, 9); ctx.globalAlpha = 1; ctx.restore(); ctx.stroke(sp); });
    const hull = new Path2D("M-70 0Q0 12 70 0L62 9Q0 21 -62 9Z"); ctx.fillStyle = wood(0, 20); ctx.fill(hull); ctx.stroke(hull);
  }
  ctx.restore();
}

export function drawCastle(ctx: C, x: number, y: number, s: number, flag: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(40,25,10,.3)"; ctx.beginPath(); ctx.ellipse(6, 4, 40, 9, 0, 0, TAU); ctx.fill();
  const stoneL = "#efe5cc", stoneD = "#c4b493", ink = "#2b1e10", roofL = "#a5503a", roofD = "#6e2e22";
  const tower = (tx: number, ty: number, tw: number, th: number) => {
    ctx.fillStyle = stoneL; ctx.fillRect(tx, ty, tw, th); ctx.fillStyle = stoneD; ctx.fillRect(tx + tw * .55, ty, tw * .45, th); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.strokeRect(tx, ty, tw, th);
    ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx + tw / 2, ty - tw * 1.1); ctx.lineTo(tx + tw / 2, ty); ctx.closePath(); ctx.fillStyle = roofL; ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, ty - tw * 1.1); ctx.lineTo(tx + tw + 2, ty); ctx.lineTo(tx + tw / 2, ty); ctx.closePath(); ctx.fillStyle = roofD; ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx + tw / 2, ty - tw * 1.1); ctx.lineTo(tx + tw + 2, ty); ctx.stroke();
  };
  ctx.fillStyle = stoneL; ctx.fillRect(-28, -16, 56, 20); ctx.fillStyle = stoneD; ctx.fillRect(4, -16, 24, 20);
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i > 3 ? stoneD : stoneL; ctx.fillRect(-28 + i * 8, -21, 5, 5); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(-28 + i * 8, -21, 5, 5); }
  ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.strokeRect(-28, -16, 56, 20);
  tower(-34, -30, 12, 34); tower(22, -30, 12, 34);
  ctx.fillStyle = stoneL; ctx.fillRect(-9, -46, 18, 30); ctx.fillStyle = stoneD; ctx.fillRect(1, -46, 8, 30); ctx.strokeStyle = ink; ctx.strokeRect(-9, -46, 18, 30);
  ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-6, -6); ctx.quadraticCurveTo(0, -13, 6, -6); ctx.lineTo(6, 4); ctx.closePath(); ctx.fillStyle = "#3a2716"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -62); ctx.quadraticCurveTo(8, -64, 15, -59); ctx.lineTo(9, -56); ctx.lineTo(15, -52); ctx.quadraticCurveTo(8, -55, 0, -53); ctx.closePath(); ctx.fillStyle = flag; ctx.fill(); ctx.stroke();
  ctx.restore();
}
export function drawStoneFort(ctx: C, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const ink = "#2b1e10";
  ctx.fillStyle = "rgba(40,25,10,.3)"; ctx.beginPath(); ctx.ellipse(4, 4, 30, 7, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-26, 2); ctx.lineTo(-26, -22); ctx.lineTo(-14, -18); ctx.lineTo(-6, -26); ctx.lineTo(6, -26); ctx.lineTo(14, -18); ctx.lineTo(26, -22); ctx.lineTo(26, 2); ctx.closePath();
  ctx.fillStyle = "#d6cbb0"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#3a2716"; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-5, -8); ctx.quadraticCurveTo(0, -14, 5, -8); ctx.lineTo(5, 2); ctx.fill();
  ctx.restore();
}
export function drawPalisade(ctx: C, x: number, y: number, s: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const ink = "#2b1e10";
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 2, 4); ctx.lineTo(i * 5 - 2, -12 - (i % 2 ? 2 : 0)); ctx.lineTo(i * 5, -16 - (i % 2 ? 2 : 0)); ctx.lineTo(i * 5 + 2, -12 - (i % 2 ? 2 : 0)); ctx.lineTo(i * 5 + 2, 4); ctx.closePath(); ctx.fillStyle = "#9a6a35"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -32); ctx.lineTo(10, -28); ctx.lineTo(0, -24); ctx.fill(); ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -32); ctx.stroke();
  ctx.restore();
}
export function drawAnchor(ctx: C, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = "#2b1e10"; ctx.lineCap = "round";
  ctx.fillStyle = "rgba(240,232,210,.92)"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, -7, 2.4, 0, TAU); ctx.moveTo(0, -4.6); ctx.lineTo(0, 8); ctx.moveTo(-4.6, -2.5); ctx.lineTo(4.6, -2.5); ctx.moveTo(-7.4, 3); ctx.quadraticCurveTo(-5.5, 9, 0, 9); ctx.quadraticCurveTo(5.5, 9, 7.4, 3); ctx.stroke(); ctx.restore();
}
export function drawRuin(ctx: C, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const ink = "#2b1e10";
  ctx.fillStyle = "rgba(40,25,10,.28)"; ctx.beginPath(); ctx.ellipse(4, 3, 20, 5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-12, -24); ctx.lineTo(-8, -28); ctx.lineTo(-4, -22); ctx.lineTo(0, -30); ctx.lineTo(4, -24); ctx.lineTo(10, -26); ctx.lineTo(12, 2); ctx.closePath(); ctx.fillStyle = "#d9cdb0"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-5, -8); ctx.quadraticCurveTo(0, -14, 5, -8); ctx.lineTo(5, 2); ctx.fillStyle = "#2a1c0f"; ctx.fill();
  ctx.translate(14, -30); ctx.fillStyle = "#ffd65a"; ctx.strokeStyle = "#7a5512"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 3 : 10; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
export function drawTent(ctx: C, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const ink = "#2b1e10";
  ctx.fillStyle = "rgba(40,25,10,.28)"; ctx.beginPath(); ctx.ellipse(4, 3, 22, 5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(0, -22); ctx.lineTo(18, 2); ctx.closePath(); ctx.fillStyle = "#e8d6a8"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(18, 2); ctx.lineTo(4, 2); ctx.closePath(); ctx.fillStyle = "#bfa66e"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(0, -22); ctx.lineTo(18, 2); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(0, -10); ctx.lineTo(3, 2); ctx.fillStyle = "#3a2716"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-24, 4); ctx.lineTo(-10, -30); ctx.moveTo(24, 4); ctx.lineTo(10, -30); ctx.stroke();
  ctx.fillStyle = "#b23a2e"; ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(-2, -27); ctx.lineTo(-11, -23); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#2e5ea8"; ctx.beginPath(); ctx.moveTo(10, -30); ctx.lineTo(2, -27); ctx.lineTo(11, -23); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** A hero medallion: brass ring, nation-colored field, helmed bust. */
export function heroMedallion(ctx: C, x: number, y: number, r: number, color: string, acted: boolean, kind = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 40, r / 40);
  if (acted) ctx.filter = "grayscale(.9) brightness(.8)";
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  const ring = ctx.createLinearGradient(-40, -40, 40, 40); ring.addColorStop(0, "#fff1bf"); ring.addColorStop(.45, "#d9a84e"); ring.addColorStop(1, "#6c4512");
  ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fillStyle = ring; ctx.fill(); ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#3a2508"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2; ctx.stroke();
  const col = "#f6e7bd"; ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-20, 30); ctx.quadraticCurveTo(-18, 12, 0, 10); ctx.quadraticCurveTo(18, 12, 20, 30); ctx.closePath(); ctx.fill();
  if (kind % 3 === 0) { ctx.beginPath(); ctx.moveTo(-13, -10); ctx.quadraticCurveTo(-13, -26, 0, -26); ctx.quadraticCurveTo(13, -26, 13, -10); ctx.lineTo(13, 4); ctx.quadraticCurveTo(13, 12, 0, 14); ctx.quadraticCurveTo(-13, 12, -13, 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#2b1e10"; ctx.fillRect(-10, -9, 20, 4); ctx.fillRect(-1.2, -5, 2.4, 14); }
  else if (kind % 3 === 1) { ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.fillStyle = "#2b1e10"; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(4, -32); ctx.lineTo(12, -4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -4, 16, 4, 0, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, -2, 10, 0, TAU); ctx.fill(); ctx.fillStyle = "#2b1e10"; ctx.beginPath(); ctx.moveTo(-12, 6); ctx.quadraticCurveTo(-16, -22, 0, -22); ctx.quadraticCurveTo(16, -22, 12, 6); ctx.quadraticCurveTo(8, -10, 0, -10); ctx.quadraticCurveTo(-8, -10, -12, 6); ctx.fill(); }
  ctx.restore();
}
