import { describe, it, expect } from "vitest";
import { GW } from "../src/engine/engine.js";
import { botAnswer, resetBots, type BotLevel } from "../src/ai/bot";

const OPTS = { favored: true, pursuit: true, counterDiplomacy: true, abilities: true };
const PLAYERS: Record<string, number> = { frontier: 2, howl: 2, northern: 3, great5: 5, great6: 6 };

function rngFrom(seed: number) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }

function play(scen: string, seed: number, level: BotLevel, maxSteps: number) {
  resetBots();
  const rng = rngFrom(seed);
  const names = Array.from({ length: PLAYERS[scen] }, (_, i) => "P" + i);
  let req: any = GW.start(scen, names, OPTS, seed);
  let steps = 0;
  while (req && req.kind !== "over" && steps < maxSteps) { req = GW.answer(botAnswer(req, level, rng)); steps++; }
  return { steps, over: GW.state.over };
}

function counterLeaks(): string[] {
  const S = GW.state, c: Record<string, number> = { ...S.pool };
  for (const a of Object.values(S.armies)) for (const u of a.units.concat(a.cargo || [])) c[u.t] = (c[u.t] || 0) + 1;
  const bad: string[] = [];
  for (const [t, def] of Object.entries(GW.data.UNITS)) {
    const expected = S.opts.permanentLosses ? null : def.n;
    if (expected != null && c[t] !== expected) bad.push(`${t}: ${c[t]}/${expected}`);
  }
  return bad;
}

describe("scenarios run to completion with bots", () => {
  for (const scen of Object.keys(PLAYERS)) {
    for (const level of ["normal", "easy"] as BotLevel[]) {
      it(`${scen} (${level} bots) plays without errors and keeps every counter`, () => {
        const r = play(scen, 1000 + scen.length, level, 6000);
        expect(r.over || r.steps > 50).toBe(true);
        expect(counterLeaks()).toEqual([]);
      });
    }
  }
  it("the normal bot finishes the two-player scenarios", () => {
    expect(play("frontier", 7, "normal", 20000).over).toBe(true);
    expect(play("howl", 8, "normal", 20000).over).toBe(true);
  });
});

describe("saves", () => {
  it("replaying the answer log reproduces the same state", () => {
    play("northern", 99, "normal", 900);
    const before = JSON.stringify(GW.state.armies) + JSON.stringify(GW.state.countries) + GW.state.turn;
    GW.load(JSON.parse(JSON.stringify(GW.save)));
    const after = JSON.stringify(GW.state.armies) + JSON.stringify(GW.state.countries) + GW.state.turn;
    expect(after).toBe(before);
  });
  it("undo steps back exactly one answer", () => {
    play("frontier", 5, "normal", 300);
    const n = GW.save.answers.length;
    GW.undo();
    expect(GW.save.answers.length).toBe(n - 1);
  });
});

describe("battle payloads", () => {
  it("battles report every die with its target", () => {
    resetBots(); const rng = rngFrom(3);
    let req: any = GW.start("frontier", ["A", "B"], OPTS, 3); let seen = 0, steps = 0;
    while (req && req.kind !== "over" && steps < 20000) {
      if (req.kind === "info" && req.battle?.stage === "round") {
        seen++;
        const ids = new Set([...req.battle.before!.att, ...req.battle.before!.def].map(u => u.bid));
        for (const e of req.battle.events!) { expect(ids.has(e.bid)).toBe(true); expect(e.hit).toBe(e.r <= e.s); }
      }
      req = GW.answer(botAnswer(req, "normal", rng)); steps++;
    }
    expect(seen).toBeGreaterThan(0);
  });
});
