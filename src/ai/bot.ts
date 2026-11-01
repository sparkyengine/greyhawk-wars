/* Bot players. "normal" plays with simple heuristics; "easy" picks legal moves at random.
   Bots only produce answers, which go into the save log, so games with bots replay exactly. */
import { GW } from "../engine/engine.js";
import type { Request, Army, Hero, BattleView } from "../engine/engine.js";

export type BotLevel = "easy" | "normal";
type Rng = () => number;

const tried = new Map<string, Set<string>>();
function fresh(p: number, cmd: any): boolean {
  const key = GW.state.turn + "_" + p + "_" + GW.state.phase + "_" + (GW.state as any).step;
  let s = tried.get(key);
  if (!s) { s = new Set(); tried.set(key, s); if (tried.size > 40) tried.delete(tried.keys().next().value as string); }
  const k = JSON.stringify(cmd);
  if (s.has(k)) return false;
  s.add(k); return true;
}
export function resetBots() { tried.clear(); }

const U = () => GW.data.UNITS;
const str = (units: { t: string; hp: number }[]) => units.reduce((s, u) => s + ((u.hp === 2 || U()[u.t].b === 0) ? U()[u.t].f : U()[u.t].b), 0);
const enemy = (p: number, q: number) => GW.state.players[p].align !== GW.state.players[q].align;

/* distance (in areas) from every land area to the nearest goal area */
function distanceField(goals: number[]): Map<number, number> {
  const d = new Map<number, number>(); const q: number[] = [];
  goals.forEach(g => { d.set(g, 0); q.push(g); });
  while (q.length) {
    const a = q.shift()!; const da = d.get(a)!;
    for (const b of GW.ADJ[a] || []) {
      if (d.has(b) || GW.isWater(b) || !GW.inPlayArea(b)) continue;
      if (GW.EDGE[a + "_" + b] === "spine") continue;
      d.set(b, da + 1); q.push(b);
    }
  }
  return d;
}

function goalsFor(p: number): number[] {
  const S = GW.state; const out: number[] = [];
  for (const id of GW.map.ids) {
    if (!GW.inPlayArea(id) || GW.isWater(id)) continue;
    const x = GW.armyAt(id);
    if (x && x.owner !== p && enemy(p, x.owner)) { out.push(id); continue; }
    const c = GW.countryOf(id); if (!c) continue;
    const cs = S.countries[c]; if (cs.owner === p) continue;
    if (cs.owner != null && !enemy(p, cs.owner)) continue;
    if (!x) out.push(id);
  }
  return out;
}

function armyStr(x: Army) { return str(x.units); }
function defenseStr(area: number) {
  const x = GW.armyAt(area); if (!x) return 0;
  let s = armyStr(x); if (GW.state.forts[area] != null || GW.PFORT[area]) s *= 1.3;
  return s;
}

function botAction(p: number, rng: Rng, level: BotLevel): any {
  const S = GW.state;
  const heroes = GW.heroesOf(p).filter(h => h.area != null && (!h.act || (h.extra || 0) > 0));
  for (const h of heroes) {
    if (GW.canDiplomacy(p, h)) { const c = { c: "diplomacy", id: h.id }; if (fresh(p, c)) return c; }
    if (GW.MAGIC[h.area!] && GW.heroCanAct(h) && !(S.flags.fiend && S.flags.fiend[h.area!])) { const c = { c: "search", id: h.id }; if (fresh(p, c)) return c; }
    if (GW.MERC[h.area!] && GW.heroCanAct(h) && S.players[p].hand.length < 5) { const c = { c: "recruit", id: h.id }; if (fresh(p, c)) return c; }
  }
  const armies = GW.armiesOf(p).filter(x => !x.act && !x.fleet && x.units.length);
  const goals = goalsFor(p); const field = distanceField(goals);
  for (const x of armies) {
    const rm = GW.reach(p, x.area, GW.armyMove(x), {});
    const keys = Object.keys(rm).map(Number);
    const my = armyStr(x);
    if (level === "easy") {
      const ok = keys.filter(k => !rm[k].attack || GW.canAttack(p, k));
      const atk = ok.filter(k => rm[k].attack);
      const pick = atk.length && rng() < 0.6 ? atk[0] : ok[Math.floor(rng() * ok.length)];
      if (pick != null) { const c = { c: "move", id: x.id, to: pick }; if (fresh(p, c)) return c; }
      continue;
    }
    // attacks with good odds, preferring capitals
    let best: { to: number; score: number } | null = null;
    for (const k of keys) {
      if (!rm[k].attack || !GW.canAttack(p, k)) continue;
      const ds = defenseStr(k) * (rm[k].edge === "river" ? 1.25 : 1);
      const ratio = my / Math.max(1, ds);
      if (ratio < 1.25) continue;
      const score = ratio + (GW.isCapital(k) ? 2 : 0);
      if (!best || score > best.score) best = { to: k, score };
    }
    if (best) { const c = { c: "move", id: x.id, to: best.to }; if (fresh(p, c)) return c; }
    // keep one garrison in each home capital
    const c0 = GW.countryOf(x.area);
    if (c0 && GW.isCapital(x.area) && S.countries[c0].owner === p && S.countries[c0].rel === "home") {
      const threat = (GW.ADJ[x.area] || []).some(b => { const y = GW.armyAt(b); return y && enemy(p, y.owner); });
      if (true) {
        if (threat && GW.fortifyChance(x, p) >= 3 && S.forts[x.area] == null && !GW.PFORT[x.area]) { const c = { c: "fortify", id: x.id }; if (fresh(p, c)) return c; }
        continue;
      }
    }
    // march toward the nearest goal without walking into a stronger army
    const here = field.get(x.area) ?? 99;
    let mv: { to: number; d: number } | null = null;
    for (const k of keys) {
      if (rm[k].attack) continue;
      const dk = field.get(k) ?? 99; if (dk >= here) continue;
      const danger = (GW.ADJ[k] || []).reduce((s, b) => { const y = GW.armyAt(b); return s + (y && enemy(p, y.owner) ? armyStr(y) : 0); }, 0);
      if (danger > my * 1.6) continue;
      if (!mv || dk < mv.d) mv = { to: k, d: dk };
    }
    if (mv) { const c = { c: "move", id: x.id, to: mv.to }; if (fresh(p, c)) return c; }
  }
  // heroes travel toward unallied capitals, treasure and mercenary sites
  for (const h of heroes) {
    if (h.act) continue;
    const rm = GW.reach(p, h.area!, 6, { hero: true }); const keys = Object.keys(rm).map(Number).filter(k => !rm[k].stop);
    const want = (k: number) => {
      const c = GW.countryOf(k);
      if (c && GW.isCapital(k) && S.countries[c].owner == null && (!S.inPlay || S.inPlay.includes(c))) return 3;
      if (GW.MAGIC[k]) return 2;
      if (GW.MERC[k] && S.players[p].hand.length < 4) return 1;
      return 0;
    };
    const ranked = keys.filter(k => want(k) > 0 && !GW.heroesAt(k).some(o => o.owner === p)).sort((a, b) => want(b) - want(a));
    const to = ranked.length ? ranked[0] : (level === "easy" && keys.length ? keys[Math.floor(rng() * keys.length)] : null);
    if (to != null) { const c = { c: "heroMove", id: h.id, to }; if (fresh(p, c)) return c; }
  }
  return { c: "end" };
}

function botFinal(p: number): any {
  const S = GW.state;
  for (const x of GW.armiesOf(p).filter(a => !a.act && !a.fleet)) {
    if (x.units.some(u => u.hp === 1 && GW.twoStep(u))) { const c = { c: "heal", id: x.id }; if (fresh(p, c)) return c; }
    if (GW.addTypes(p, x) && x.units.length < 5 && !S.flags["revolt" + p]) { const c = { c: "add", id: x.id }; if (fresh(p, c)) return c; }
  }
  const ra = GW.raiseAreas(p);
  if (ra.length && GW.freeMarkers(p) > 0 && !S.flags["raised" + p] && !S.flags["revolt" + p]) {
    const caps = ra.filter(a => GW.isCapital(a)); const c = { c: "raise", area: (caps[0] ?? ra[0]) };
    if (fresh(p, c)) return c;
  }
  return { c: "endturn" };
}

function botHeroes(p: number): any {
  const S = GW.state;
  for (const h of GW.heroesOf(p)) {
    const wantHere = (k: number) => { const c = GW.countryOf(k); return !!(c && GW.isCapital(k) && S.countries[c].owner == null && (!S.inPlay || S.inPlay.includes(c))); };
    if (h.area != null && (wantHere(h.area) || GW.MAGIC[h.area])) continue;
    const cands = GW.map.ids.filter(k => GW.inPlayArea(k) && !GW.isWater(k) && (wantHere(k) || GW.MAGIC[k]) && GW.canPlaceHero(p, h, k));
    if (cands.length) { const c = { c: "placeHero", id: h.id, to: cands[0] }; if (fresh(p, c)) return c; }
  }
  return { c: "done" };
}

function battleSide(b: BattleView, p: number) { return b.att === p ? "att" : "def"; }

export function botAnswer(req: Request, level: BotLevel, rng: Rng = Math.random): any {
  const p = req.who as number;
  switch (req.kind) {
    case "info": case "over": return null;
    case "ask": {
      const t = req.title;
      if (level === "normal") {
        if (t.startsWith("Conquest")) return 1;
        if (req.battle) {
          const me = battleSide(req.battle, p); const mine = str(req.battle.units[me]); const theirs = str(req.battle.units[me === "att" ? "def" : "att"]);
          if (t.startsWith("Fourth round")) return mine >= theirs ? 1 : 0;
          if (t.startsWith("Attacker")) return mine < theirs * 0.7 ? 1 : 0;
          if (t.startsWith("Defender")) return mine < theirs * 0.45 ? 1 : 0;
        }
        if (t.startsWith("Counter-diplomacy")) {
          const actor = GW.state.cur; return actor != null && enemy(p, actor) ? -1 : 1;
        }
        if (t.startsWith("Ambassador blackmails")) return 1;
        return req.options[0].id;
      }
      return req.options[Math.floor(rng() * req.options.length)].id;
    }
    case "area": return req.areas[Math.floor(rng() * req.areas.length)];
    case "cards": {
      if (req.exact != null) return req.cards.slice(0, req.exact);
      if (level === "normal") {
        if (req.title.startsWith("Diplomacy")) { const m = /Target (\d+)/.exec(req.text || ""); const tgt = m ? +m[1] : 5; return tgt >= 9 ? [] : req.cards.slice(0, Math.min(req.cards.length, 10 - tgt)); }
        if (req.battle) return req.cards.slice(0, req.max ?? req.cards.length);
      }
      return req.cards.slice(0, req.min || 0);
    }
    case "heroes": return level === "normal" ? botHeroes(p) : { c: "done" };
    case "action": { const c = botAction(p, rng, level); return c; }
    case "final": return botFinal(p);
  }
  return null;
}
