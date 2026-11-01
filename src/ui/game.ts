/* The game controller: drives the engine, routes each decision to a person or a bot, and renders the table. */
import { GW } from "../engine/engine.js";
import type { Request, Army, Hero, GameOptions, Save, ReachInfo } from "../engine/engine.js";
import { botAnswer, resetBots } from "../ai/bot";
import { MapView, hl } from "./mapview";
import { BattleScreen } from "./battle";
import { h, clear, sleep } from "./dom";
import { cardEl, countryCard } from "./cards";
import { coinURL } from "../render/coins";
import { NATION, nationColor } from "../render/pieces";
import { Rulebook } from "./rulebook";

export type Controller = "human" | "normal" | "easy";
export interface Seat { name: string; ctl: Controller }
export interface Config { scen: string; seats: Seat[]; opts: GameOptions; solo: boolean; speed: number; seed?: number }
export interface SaveFile { v: 1; cfg: Config; save: Save }

const AL_NAME: Record<string, string> = { G: "Good", E: "Evil", N: "Neutral" };
const TERRAIN_NOTE: Record<string, string> = { clear: "costs 1 move", forest: "costs 2 moves", hills: "costs 2 moves", desert: "costs 2 moves", mountains: "ends the move", swamp: "ends the move", water: "ships only" };

type Plan = { to: number; info: ReachInfo; path: number[] };
interface UI {
  sel: { kind: "army" | "hero"; id: string } | null; plan: Plan | null; mode: "heroMove" | "raise" | "heroPlace" | null;
  take: Set<number>; bring: Set<string>; loadFrom: number | null; unload: number | null; cardPick: Set<string>;
}

export class Game {
  cfg!: Config; map: MapView; battle: BattleScreen; rules: Rulebook;
  viewer: number | null = null; private timer: any = null; private ui: UI = this.freshUI();
  private el: Record<string, HTMLElement> = {};
  private lastKey = ""; private closedOver = false;

  constructor(private root: HTMLElement, atlas: HTMLCanvasElement, private onExit: () => void) {
    clear(root);
    const e = this.el;
    e.top = h("header", { class: "top" });
    e.ribbon = h("div", { class: "ribbon" });
    e.left = h("aside", { class: "left", "aria-label": "Scenario and players" });
    e.mapwrap = h("div", { class: "mapwrap" });
    e.coach = h("aside", { class: "coach", "aria-label": "Turn coach", "aria-live": "polite" });
    e.hand = h("div", { class: "hand", "aria-label": "Your hand" });
    e.tip = h("div", { class: "tip", hidden: true });
    e.toast = h("div", { class: "toast", hidden: true, role: "status" });
    e.modal = h("div", { class: "modal-layer", hidden: true });
    e.curtain = h("div", { class: "curtain", hidden: true });
    root.append(h("div", { class: "game" }, e.top, e.ribbon, h("div", { class: "main" }, e.left, e.mapwrap, e.coach)), e.modal, e.curtain);
    this.map = new MapView(e.mapwrap); this.map.setBase(atlas);
    e.mapwrap.append(
      h("div", { class: "zoom" }, h("button", { class: "btn", "aria-label": "Zoom in", onclick: () => this.map.zoomBy(1.25) }, "+"), h("button", { class: "btn", "aria-label": "Zoom out", onclick: () => this.map.zoomBy(.8) }, "−"), h("button", { class: "btn small", "aria-label": "Fit map", onclick: () => this.fit() }, "fit")),
      e.hand, e.tip, e.toast);
    this.battle = new BattleScreen(e.mapwrap);
    this.rules = new Rulebook(root);
    this.map.onArea = (a, ev) => this.clickArea(a, ev);
    this.map.onToken = (k, id, ev) => this.clickToken(k, id, ev);
    this.map.onHover = (a, x, y) => this.hover(a, x, y);
    this.map.playerColor = p => this.color(p); this.map.playerNation = p => GW.state.players[p]?.nation || "furyondy";
    window.addEventListener("keydown", this.onKey);
  }
  destroy() { window.removeEventListener("keydown", this.onKey); clearTimeout(this.timer); }
  private freshUI(): UI { return { sel: null, plan: null, mode: null, take: new Set(), bring: new Set(), loadFrom: null, unload: null, cardPick: new Set() }; }

  /* ---------- lifecycle ---------- */
  start(cfg: Config, save?: Save) {
    this.cfg = cfg; resetBots(); this.ui = this.freshUI(); this.viewer = null; this.closedOver = false;
    const names = cfg.seats.map(s => s.name);
    if (save) GW.load(save); else GW.start(cfg.scen, names, cfg.opts, cfg.seed);
    this.map.resetVeil(); setTimeout(() => this.fit(), 30);
    this.process();
  }
  fit() { const ids = GW.map.ids.filter(a => GW.inPlayArea(a)); this.map.fit(ids); }
  get req(): Request | null { return GW.req; }
  isBot(p: number | null) { return p != null && this.cfg.seats[p]?.ctl !== "human"; }
  get humans() { return this.cfg.seats.map((s, i) => i).filter(i => this.cfg.seats[i].ctl === "human"); }
  get allBots() { return this.humans.length === 0; }
  name(p: number) { return GW.state.players[p]?.name || "Player " + (p + 1); }
  color(p: number) { return nationColor(GW.state.players[p]?.nation || "furyondy"); }
  /** Can the person at the screen answer the current request? */
  canAnswer(r = this.req) { if (!r) return false; if (r.who == null) return !this.allBots; if (this.isBot(r.who)) return false; return this.cfg.solo || this.humans.length < 2 || this.viewer === r.who; }

  answer(v: any) {
    clearTimeout(this.timer);
    const before = this.req?.kind;
    GW.answer(v);
    try { localStorage.setItem("gw.autosave", JSON.stringify({ v: 1, cfg: this.cfg, save: GW.save } as SaveFile)); } catch { /* storage may be unavailable */ }
    const now = this.req?.kind;
    if (before !== now || (now !== "action" && now !== "final" && now !== "heroes")) this.ui = this.freshUI(); else { this.ui.plan = null; this.ui.mode = null; this.ui.take.clear(); this.ui.bring.clear(); this.ui.loadFrom = null; this.ui.unload = null; if (this.ui.sel?.kind === "army" && !GW.state.armies[this.ui.sel.id]) this.ui.sel = null; }
    this.process();
  }
  undo() {
    if (!GW.save.answers.length) return;
    clearTimeout(this.timer); resetBots(); let guard = 0;
    do { GW.undo(); guard++; } while (guard < 800 && GW.save.answers.length && this.req && (this.req.kind === "info" || this.req.who == null || this.isBot(this.req.who)));
    this.ui = this.freshUI(); this.battle.hide(); this.closeModal(); this.toast("Stepped back to your last decision.");
    this.process();
  }

  private process() {
    const r = this.req; if (!r) return;
    clearTimeout(this.timer);
    const speed = this.cfg.speed || 1;
    if (r.kind === "over") { this.render(); return; }
    if (r.who != null && this.isBot(r.who)) {
      this.render();
      const delay = (r.kind === "info" ? 120 : r.kind === "action" || r.kind === "final" ? 650 : 420) / speed;
      this.timer = setTimeout(() => { if (this.req === r) this.answer(botAnswer(r, this.cfg.seats[r.who as number].ctl as any)); }, delay);
      return;
    }
    if (r.who == null) { this.render(); if (this.allBots && !r.battle) this.timer = setTimeout(() => { if (this.req === r) this.answer(null); }, 900 / speed); return; }
    if (!this.cfg.solo && this.humans.length > 1 && this.viewer !== r.who) { this.render(); this.showCurtain(r.who); return; }
    if (this.viewer !== r.who) this.viewer = r.who;
    this.render();
  }

  /* ---------- privacy curtain ---------- */
  private showCurtain(p: number) {
    const c = this.el.curtain; clear(c); c.hidden = false;
    const r = this.req!;
    const what = r.kind === "info" ? "a private message" : r.kind === "cards" ? "a card choice" : r.kind === "ask" ? "a decision" : r.kind === "heroes" ? "placing heroes" : r.kind === "action" ? "the action phase" : r.kind === "final" ? "the end of the turn" : "a decision";
    const btn = h("button", { class: "btn primary big", onclick: () => { c.hidden = true; this.viewer = p; this.render(); } }, `I'm ${this.name(p)}. Show my turn`);
    c.append(h("div", { class: "curtain-card" },
      h("div", { class: "eyebrow" }, `Turn ${GW.state.turn} · ${what}`),
      h("div", { class: "bigseal", style: { background: this.color(p) } }, this.name(p)[0]),
      h("h1", null, `Pass the device to ${this.name(p)}`),
      h("p", { class: "lead" }, this.viewer != null ? `${this.name(this.viewer)}, please look away. The next screen shows ${this.name(p)}'s hand and private choices.` : `The next screen shows ${this.name(p)}'s hand and private choices.`),
      btn));
    setTimeout(() => btn.focus(), 30);
  }

  /* ---------- rendering ---------- */
  render() {
    const r = this.req; if (!r) return;
    this.renderTop(); this.renderRibbon(); this.renderLeft(); this.renderCoach(); this.renderHand(); this.renderMap(); this.renderModals();
  }
  private renderTop() {
    const S = GW.state, sc = GW.data.SCENARIOS[S.scen];
    clear(this.el.top).append(
      h("div", { class: "brand" }, h("span", { class: "shield" }), "Greyhawk ", h("em", null, "Wars")),
      h("div", { class: "scenname" }, h("b", null, sc.name), h("span", null, `Turn ${S.turn} · ${581 + S.turn} CY`)),
      h("div", { class: "spacer" }),
      h("button", { class: "btn ghost", onclick: () => this.rules.open() }, "Rulebook"),
      h("button", { class: "btn ghost", onclick: () => this.undo(), disabled: !GW.save.answers.length || this.allBots, title: "Step back to your last decision" }, "Undo"),
      h("button", { class: "btn ghost", onclick: () => this.download() }, "Save"),
      this.allBots || this.humans.length === 0 ? h("label", { class: "speed" }, "Speed ", this.speedSelect()) : this.speedSelect(true),
      h("button", { class: "btn ghost", onclick: () => this.confirm("Leave this game?", "The game is saved in this browser. You can continue it from the start screen.", "Leave", () => { this.destroy(); this.onExit(); }) }, "Menu"));
  }
  private speedSelect(compact = false) {
    const s = h("select", { "aria-label": "Bot speed", class: compact ? "compact" : "" }, ...[["0.5", "Slow bots"], ["1", "Normal bots"], ["2.5", "Fast bots"], ["6", "Very fast bots"]].map(([v, l]) => h("option", { value: v, selected: String(this.cfg.speed) === v }, l)));
    s.addEventListener("change", () => { this.cfg.speed = +s.value; });
    return s;
  }
  private renderRibbon() {
    const S = GW.state; const ph = S.phase; const step = (S as any).step;
    const idx = { setup: 0, order: 1, heroes: 2, events: 3, action: 4, over: 5 }[ph] ?? 0;
    const phases = [["1", "Turn order", "order"], ["2", "Place heroes", "heroes"], ["3", "Event card", "events"], ["4", "Action phase", "action"]];
    const subs = [["A", "Act", "A"], ["B", "Heal", "final"], ["C", "Add & raise", "final"], ["D", "New allies", "D"]];
    clear(this.el.ribbon).append(
      h("ol", { class: "phases", "aria-label": "Phases of the turn" }, phases.map((p, i) => h("li", { class: i + 1 < idx ? "done" : i + 1 === idx ? "cur" : "", "aria-current": i + 1 === idx ? "step" : null, title: "Open this rule", onclick: () => this.rules.open(["order", "heroes", "events", "action"][i]) }, h("b", null, p[0]), p[1]))),
      ph === "action" ? h("ol", { class: "subs", "aria-label": "Action phase steps" }, subs.map(s => h("li", { class: (s[2] === step || (s[2] === "final" && step === "final")) ? "cur" : "" }, h("b", null, s[0]), s[1]))) : h("span", { class: "phase-help" }, ph === "order" ? "Everyone rolls a d10. Highest goes first." : ph === "heroes" ? "Move heroes anywhere, one per area." : ph === "events" ? "Each player draws an event." : ""),
      h("div", { class: "order" }, h("span", { class: "eyebrow" }, "Order"), S.order.map((p, i) => h("span", { class: "oc" + (S.cur === p && ph !== "order" ? " on" : "") + (S.players[p].out ? " out" : "") }, h("span", { class: "seal", style: { background: this.color(p) } }, this.name(p)[0]), h("span", null, `${i + 1}. ${this.name(p)}`), this.isBot(p) ? h("small", null, "bot") : null))));
  }
  private victoryRows(): { icon: string; text: string; sub: string; pct?: number }[] {
    const S = GW.state, sc = S.scen; const held = (p: number, c: string) => { const a = GW.capitalOf(c); const x = GW.armyAt(a); return x && x.owner === p; };
    const rows: { icon: string; text: string; sub: string; pct?: number }[] = [];
    if (sc === "frontier") {
      rows.push({ icon: "G", text: `${this.name(0)} wins by holding Dorakaa at the end of a turn.`, sub: held(0, "iuz") ? "Held now." : "Not held." });
      rows.push({ icon: "E", text: `${this.name(1)} wins by holding Chendl at the end of a turn.`, sub: held(1, "furyondy") ? "Held now!" : `Held by ${GW.armyAt(GW.capitalOf("furyondy")) ? this.name(GW.armyAt(GW.capitalOf("furyondy"))!.owner) : "nobody"}.` });
      const li = S.pool.LI ?? 0; rows.push({ icon: "N", text: "Otherwise the game ends when light infantry run out.", sub: `${li} of 45 light infantry left. Losses are permanent.`, pct: li / 45 });
    } else if (sc === "howl") {
      const total = (S.inPlay || []).length, done = (S.inPlay || []).filter(c => S.countries[c].owner != null).length;
      rows.push({ icon: "N", text: "Ends when every country in play is controlled. Most countries wins.", sub: `${done} of ${total} countries controlled.`, pct: done / Math.max(1, total) });
      S.players.forEach(p => rows.push({ icon: p.align, text: p.name, sub: `${GW.cardsHeld(p.i)} countries` }));
    } else if (sc === "northern") {
      S.players.forEach(p => { const need = p.align === "G" ? 17 : 12; rows.push({ icon: p.align, text: `${p.name} needs ${need} countries.`, sub: `${GW.cardsHeld(p.i)} held.`, pct: GW.cardsHeld(p.i) / need }); });
    } else {
      const g = S.players.filter(p => p.align === "G").reduce((s, p) => s + GW.cardsHeld(p.i), 0), e = S.players.filter(p => p.align === "E").reduce((s, p) => s + GW.cardsHeld(p.i), 0);
      const gn = sc === "great5" ? 20 : 30;
      rows.push({ icon: "G", text: `Good alliance: ${gn} countries end the war.`, sub: `${g} held.`, pct: g / gn });
      rows.push({ icon: "E", text: "Evil alliance: 30 countries end the war.", sub: `${e} held.`, pct: e / 30 });
      rows.push({ icon: "N", text: "When the war ends, the player with the most countries wins.", sub: "" });
    }
    return rows;
  }
  private renderLeft() {
    const S = GW.state, sc = GW.data.SCENARIOS[S.scen];
    const vic = h("div", { class: "vic" }, this.victoryRows().map(r => h("div", { class: "row" }, h("span", { class: "al al-" + r.icon }), h("div", null, r.text, h("span", { class: "st" }, r.sub), r.pct != null ? h("div", { class: "bar" }, h("i", { style: { width: Math.min(100, Math.round(r.pct * 100)) + "%" } })) : null))));
    const players = h("div", { class: "plist" }, S.players.map(p => {
      const homes = Object.entries(S.countries).filter(([, c]) => c.owner === p.i).map(([k, c]) => `${GW.data.COUNTRIES[k]?.name.replace(/^(Kingdom|Duchy|County|Land|Hold|Archclericy|Archbarony|Free City|Free State|Prelacy|Theocracy|Principality|Grand Duchy|Earldom|March|Caliphate|Sultanate|See|Concatenated Cantons|Lordship) of (the )?/i, "")}${c.rel === "home" ? "" : c.rel === "allied" ? " (ally)" : " (conquered)"}`);
      const armies = GW.armiesOf(p.i).length, heroes = GW.heroesOf(p.i).length;
      return h("div", { class: "pl" + (S.cur === p.i ? " on" : "") + (p.out ? " out" : "") },
        h("span", { class: "seal", style: { background: this.color(p.i) } }, p.name[0]),
        h("div", null, h("div", { class: "nm" }, p.name, h("span", { class: "al al-" + p.align, title: AL_NAME[p.align] }), this.isBot(p.i) ? h("span", { class: "tag" }, this.cfg.seats[p.i].ctl === "easy" ? "easy bot" : "bot") : null, p.out ? h("span", { class: "tag bad" }, "out") : null),
          h("div", { class: "sub" }, `${GW.cardsHeld(p.i)} countries · ${armies} armies · ${heroes} heroes · ${p.hand.length} cards`),
          h("div", { class: "sub dim" }, homes.slice(0, 6).join(", ") + (homes.length > 6 ? ` and ${homes.length - 6} more` : ""))));
    }));
    const log = h("ul", { class: "log" }, S.log.slice(-60).reverse().map(l => h("li", { class: l.c }, l.m)));
    clear(this.el.left).append(
      h("section", { class: "panel" }, h("div", { class: "eyebrow" }, "Scenario"), h("h3", null, sc.name), vic, h("button", { class: "rule", onclick: () => this.rules.open("scen-" + S.scen) }, "Scenario rules")),
      h("section", { class: "panel" }, h("div", { class: "eyebrow" }, "Players"), players),
      h("section", { class: "panel grow" }, h("div", { class: "eyebrow" }, "Chronicle"), log));
  }

  /* ---------- the coach ---------- */
  private renderCoach() {
    const r = this.req!, c = this.el.coach; clear(c);
    const S = GW.state;
    if (r.kind === "over") { c.append(this.panel("Game over", S.winner != null ? `${this.name(S.winner)} wins: ${S.winWhy}.` : "")); return; }
    if (!this.canAnswer(r)) {
      const who = r.who != null ? this.name(r.who) : "";
      c.append(h("section", { class: "panel" }, h("div", { class: "eyebrow" }, this.phaseLabel()),
        h("h2", null, r.who != null ? (this.isBot(r.who) ? `${who} is thinking…` : `Waiting for ${who}`) : r.title),
        h("p", { class: "lead" }, r.who != null && this.isBot(r.who) ? this.botLine(r) : "Pass the device when asked."),
        h("div", { class: "thinking" }, h("i"), h("i"), h("i"))));
      c.append(this.ruleCard(this.ruleForPhase()));
      return;
    }
    if (r.kind === "heroes") return this.coachHeroes(c);
    if (r.kind === "action") return this.coachAction(c);
    if (r.kind === "final") return this.coachFinal(c);
    if (r.kind === "area") {
      const list = h("div", { class: "choices" }, r.areas.map(a => h("button", { class: "btn", onclick: () => this.answer(a), onmouseenter: () => { this.map.hover = a; this.map.invalidate(); } }, GW.areaName(a))));
      c.append(h("section", { class: "panel focus" }, h("div", { class: "eyebrow" }, "Choose an area"), h("h2", null, r.title), r.text ? h("p", { class: "lead" }, r.text) : null, h("p", { class: "lead" }, "Click a highlighted area on the map, or pick one here."), list,
        r.cancel ? h("button", { class: "btn", onclick: () => this.answer(null) }, "Cancel") : null));
      return;
    }
    c.append(h("section", { class: "panel" }, h("div", { class: "eyebrow" }, this.phaseLabel()), h("h2", null, r.title), h("p", { class: "lead" }, "Answer the open question to continue.")));
  }
  private botLine(r: Request) {
    return r.kind === "action" ? "Moving armies and heroes." : r.kind === "final" ? "Healing, reinforcing and raising armies." : r.kind === "heroes" ? "Placing heroes." : r.kind === "cards" ? "Choosing cards." : "Deciding.";
  }
  private phaseLabel() { const S = GW.state; return `Turn ${S.turn} · ${{ order: "Phase 1, turn order", heroes: "Phase 2, heroes", events: "Phase 3, events", action: (S as any).step === "final" ? "Phase 4, steps B to D" : "Phase 4, step A", setup: "Set-up", over: "Game over" }[S.phase] || S.phase}`; }
  private ruleForPhase() { const S = GW.state; return S.phase === "heroes" ? "heroes" : S.phase === "events" ? "events" : S.phase === "action" ? ((S as any).step === "final" ? "final" : "action") : "turn"; }
  private panel(title: string, text: string) { return h("section", { class: "panel" }, h("h2", null, title), h("p", { class: "lead" }, text)); }
  private ruleCard(id: string) {
    const rs = this.rules.section(id); if (!rs) return h("div");
    return h("section", { class: "panel rulecard" }, h("div", { class: "eyebrow" }, "Rule at hand · " + rs.page), h("div", { class: "quote" }, rs.summary), h("button", { class: "rule", onclick: () => this.rules.open(id) }, `Read "${rs.title}"`));
  }

  private coachHeroes(c: HTMLElement) {
    const p = this.req!.who as number; const heroes = GW.heroesOf(p);
    const sel = this.ui.sel?.kind === "hero" ? GW.state.heroes[this.ui.sel.id] : null;
    c.append(h("section", { class: "panel focus" }, h("div", { class: "eyebrow" }, this.phaseLabel()), h("h2", null, "Place your heroes"),
      h("p", { class: "lead" }, "Pick a hero, then click any highlighted area. Heroes can go anywhere on the map, but not into or out of another player's army, and only one of yours per area."),
      h("div", { class: "rows" }, heroes.map((hh, i) => h("button", { class: "arow" + (sel?.id === hh.id ? " on" : ""), onclick: () => { this.ui.sel = { kind: "hero", id: hh.id }; this.ui.mode = "heroPlace"; this.render(); if (hh.area != null) this.map.centerOn(hh.area); } },
        h("span", { class: "medal", style: { background: this.color(p) } }, String(i + 1)), h("span", null, `Hero ${i + 1}`, h("small", null, hh.area != null ? GW.areaName(hh.area) + this.siteNote(hh.area) : "off the map")), h("span", { class: "s" }, sel?.id === hh.id ? "choose area" : "move")))),
      h("div", { class: "btnrow" }, h("button", { class: "btn primary", onclick: () => this.answer({ c: "done" }) }, "Done placing heroes"))));
    c.append(this.ruleCard("heroes"));
  }
  private siteNote(a: number) {
    const n: string[] = []; const c = GW.countryOf(a);
    if (c && GW.isCapital(a)) n.push(GW.state.countries[c].owner == null ? "unallied capital" : "capital");
    if (GW.MAGIC[a]) n.push("treasure site"); if (GW.MERC[a]) n.push("mercenaries");
    return n.length ? " · " + n.join(", ") : "";
  }

  private coachAction(c: HTMLElement) {
    const p = this.req!.who as number, S = GW.state;
    const armies = GW.armiesOf(p), heroes = GW.heroesOf(p).filter(hh => hh.area != null);
    const done = armies.filter(x => x.act).length;
    const ready = armies.filter(x => !x.act).length + heroes.filter(hh => !hh.act).length;
    const top = h("section", { class: "panel" }, h("div", { class: "eyebrow" }, this.phaseLabel()), h("h2", null, "Your armies and heroes act"),
      h("p", { class: "lead" }, "Pick an army or hero on the map or in this list. Each one finishes everything it does, then flips. You may act with none, some or all."),
      h("div", { class: "rows" },
        armies.map(x => this.armyRow(x)),
        heroes.map(hh => h("button", { class: "arow hero" + (this.ui.sel?.id === hh.id ? " on" : "") + (hh.act && !hh.extra ? " done" : ""), onclick: () => this.select("hero", hh.id) },
          h("span", { class: "medal", style: { background: this.color(p) } }, "H"), h("span", null, "Hero", h("small", null, GW.areaName(hh.area!) + this.siteNote(hh.area!))), h("span", { class: "s" }, hh.act && !hh.extra ? "acted" : "ready")))),
      h("div", { class: "btnrow" }, h("span", { class: "chip" }, `${done} of ${armies.length} armies acted`),
        S.players[p].nation === "scarlet" && S.opts.abilities && !S.flags["used_ab" + p] && !S.flags["noAbility" + p] ? h("button", { class: "btn", onclick: () => this.answer({ c: "assassinate" }) }, "Assassins (ability)") : null,
        h("button", { class: "btn primary", onclick: () => ready ? this.confirm("End your actions?", `${ready} of your armies and heroes have not acted. Armies that did not act can still heal or add units in the next step.`, "End actions", () => this.answer({ c: "end" })) : this.answer({ c: "end" }) }, "End actions")));
    c.append(top);
    const sel = this.ui.sel;
    if (sel?.kind === "army" && S.armies[sel.id]) c.append(this.armyPanel(S.armies[sel.id], p));
    if (sel?.kind === "hero" && S.heroes[sel.id]) c.append(this.heroPanel(S.heroes[sel.id], p));
    if (!sel) c.append(this.ruleCard("action"));
  }
  private armyRow(x: Army) {
    const lead = x.units[0]?.t || "LI";
    const dbl = x.act && GW.state.flags.doubletime === x.owner;
    return h("button", { class: "arow" + (this.ui.sel?.id === x.id ? " on" : "") + (x.act && !dbl ? " done" : ""), onclick: () => this.select("army", x.id) },
      x.fleet ? h("span", { class: "medal ship" }, "⛵") : h("img", { src: coinURL(lead, false, { plaque: false }), alt: "", width: 30, height: 30 }),
      h("span", null, x.fleet ? `Fleet of ${x.units.length}` : `Army of ${x.units.length}`, h("small", null, GW.areaName(x.area))), h("span", { class: "s" }, x.act ? (dbl ? "may move again" : "acted") : "ready"));
  }
  private unitStrip(x: Army) {
    return h("div", { class: "units" }, x.units.map(u => { const d = GW.data.UNITS[u.t]; const w = u.hp === 1 && d.b > 0; return h("img", { src: coinURL(u.t, w), alt: `${d.name}${w ? " (wounded)" : ""}`, title: `${d.name}: strength ${w ? d.b : d.f}${w ? " (wounded)" : ""}, moves ${d.move}`, width: 46, height: 46 }); }),
      (x.cargo || []).map(u => h("img", { src: coinURL(u.t), alt: GW.data.UNITS[u.t].name + " (aboard)", title: GW.data.UNITS[u.t].name + " aboard", width: 34, height: 34, class: "cargo" })));
  }
  private armyPanel(x: Army, p: number) {
    const S = GW.state; const own = x.owner === p; const d = GW.data.UNITS;
    const slowest = x.units.reduce((m, u) => d[u.t].move < d[m].move ? u.t : m, x.units[0]?.t || "LI");
    const panel = h("section", { class: "panel" }, h("div", { class: "eyebrow" }, own ? (x.fleet ? "Your fleet" : "Your army") : `${this.name(x.owner)}'s ${x.fleet ? "fleet" : "army"}`),
      h("h3", null, `${x.fleet ? "Fleet" : "Army"} in ${GW.areaName(x.area)}`), this.unitStrip(x),
      h("dl", { class: "facts" }, h("dt", null, "Moves"), h("dd", null, x.fleet ? "6 sea areas" : `${GW.armyMove(x)} areas (slowest: ${d[slowest]?.name})`), h("dt", null, "Strength"), h("dd", null, `${GW.armyStrength(x)} points in ${x.units.length} counters`),
        S.forts[x.area] != null || GW.PFORT[x.area] ? [h("dt", null, "Fortified"), h("dd", null, "Attackers here are -1")] : null));
    if (!own) return panel;
    const dbl = x.act && S.flags.doubletime === p;
    if (x.act && !dbl) { panel.append(h("p", { class: "note" }, "This army has acted this turn. It is ready again next turn.")); return panel; }
    const fort = GW.fortifyChance(x, p);
    const canFort = !x.fleet && !dbl && S.forts[x.area] == null && !GW.PFORT[x.area];
    panel.append(h("div", { class: "acts" },
      h("div", { class: "act info" }, h("b", null, x.fleet ? "Sail" : "Move or attack"), h("span", null, this.ui.plan ? "Destination chosen below." : "Click a highlighted area on the map.")),
      this.actBtn("Fortify", canFort, canFort ? `${fort * 10}% chance (roll ${fort} or less).` : x.fleet ? "Fleets cannot fortify." : dbl ? "A double-time army can only move." : "This area is already fortified.", () => this.answer({ c: "fortify", id: x.id }), "fortify"),
      this.actBtn("Disband", !dbl, "Counters return to the pool and the marker is freed.", () => this.confirm("Disband this army?", "Its counters go back to the pool. This cannot be undone except with Undo.", "Disband", () => this.answer({ c: "disband", id: x.id })), "disband")));
    if (this.ui.plan) panel.append(this.planPanel(x, p));
    else panel.append(h("p", { class: "note" }, "Gold areas: where the army can go, with the cost. Red: armies it can attack. Click any other area to see why it is out of reach."));
    return panel;
  }
  private actBtn(title: string, ok: boolean, note: string, fn: () => void, rule?: string) {
    const b = h("button", { class: "act", disabled: !ok, onclick: fn }, h("b", null, title), h("span", null, note));
    if (!ok && rule) b.title = "See the rulebook: " + rule;
    return b;
  }
  private planPanel(x: Army, p: number) {
    const pl = this.ui.plan!; const atk = pl.info.attack; const S = GW.state;
    const box = h("div", { class: "plan" + (atk ? " attack" : "") }, h("h3", null, `${atk ? "Attack" : x.fleet ? "Sail to" : "Move to"} ${GW.areaName(pl.to)}`));
    const ul = h("ul");
    if (!x.fleet) ul.append(h("li", null, `Uses ${pl.info.cost ?? "?"} of ${GW.armyMove(x)} moves. Entering ${GW.terr(pl.to)} ${TERRAIN_NOTE[GW.terr(pl.to)]}.`));
    if (atk) {
      const def = GW.armyAt(pl.to)!; const mine = this.ui.take.size ? x.units.filter((_, i) => this.ui.take.has(i)) : x.units;
      const exp = (us: { t: string; hp: number }[], m = 0) => us.reduce((s, u) => s + Math.min(10, Math.max(1, GW.unitStr(u as any) + m)) / 10, 0);
      const fort = S.forts[pl.to] != null || !!GW.PFORT[pl.to];
      ul.append(h("li", null, `Defender: ${def.units.length} units, strength ${GW.armyStrength(def)}${fort ? ", fortified (your units -1)" : ""}.`));
      if (pl.info.edge === "river") ul.append(h("li", null, h("b", null, "River crossing: "), "the defender rolls first in round 1 and you remove your losses before rolling."));
      ul.append(h("li", null, `Expected hits per round: you ${exp(mine, fort ? -1 : 0).toFixed(1)}, them ${exp(def.units).toFixed(1)}.`));
    } else if (!x.fleet && GW.armyAt(pl.to)?.owner === p) ul.append(h("li", null, "Joins your army there. The joined army counts as acted; counters past 5 are removed."));
    box.append(ul);
    if (!x.fleet && x.units.length > 1) {
      const free = GW.freeMarkers(p);
      box.append(h("div", { class: "opt" }, h("div", { class: "eyebrow" }, free > 0 ? "Send only some units (others stay)" : "Send only some units (needs a free marker: none left)"),
        h("div", { class: "pick" }, x.units.map((u, i) => { const on = this.ui.take.size === 0 || this.ui.take.has(i); return h("label", { class: "pickcoin" + (on ? " on" : "") }, h("input", { type: "checkbox", checked: on, disabled: free <= 0 && !GW.armyAt(pl.to), onchange: (e: Event) => { const t = e.target as HTMLInputElement; if (this.ui.take.size === 0) x.units.forEach((_, j) => this.ui.take.add(j)); t.checked ? this.ui.take.add(i) : this.ui.take.delete(i); if (this.ui.take.size === x.units.length) this.ui.take.clear(); this.render(); } }), h("img", { src: coinURL(u.t, u.hp === 1 && GW.twoStep(u)), alt: GW.data.UNITS[u.t].name, width: 34, height: 34 })); }))));
    }
    const heroes = GW.heroesAt(x.area).filter(hh => hh.owner === p && !hh.act);
    if (!x.fleet && heroes.length) box.append(h("div", { class: "opt" }, h("div", { class: "eyebrow" }, "Heroes who lead the army"), heroes.map(hh => h("label", { class: "tog" }, h("input", { type: "checkbox", checked: this.ui.bring.has(hh.id), onchange: (e: Event) => { (e.target as HTMLInputElement).checked ? this.ui.bring.add(hh.id) : this.ui.bring.delete(hh.id); } }), "Hero leads: +1 to a unit and a 4th round; the hero then counts as acted."))));
    if (x.fleet) {
      const cap = GW.cargoCap(x) - (x.cargo?.length || 0);
      const loaders = GW.armiesOf(p).filter(a => !a.fleet && !a.act && GW.PORT[a.area] && (GW.ADJ[a.area] || []).includes(x.area));
      if (loaders.length && cap > 0) box.append(h("div", { class: "opt" }, h("div", { class: "eyebrow" }, `Load troops first (room for ${cap})`), h("select", { "aria-label": "Load from", onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; this.ui.loadFrom = v ? +v : null; } }, h("option", { value: "" }, "Load nothing"), loaders.map(a => h("option", { value: a.area, selected: this.ui.loadFrom === a.area }, `${a.units.length} units from ${GW.areaName(a.area)}`)))));
      const coast = (GW.ADJ[pl.to] || []).filter(a => !GW.isWater(a) && GW.inPlayArea(a));
      if (coast.length && ((x.cargo?.length || 0) > 0 || this.ui.loadFrom != null)) box.append(h("div", { class: "opt" }, h("div", { class: "eyebrow" }, "Unload troops after sailing"), h("select", { "aria-label": "Unload to", onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; this.ui.unload = v ? +v : null; } }, h("option", { value: "" }, "Keep them aboard"), coast.map(a => h("option", { value: a, selected: this.ui.unload === a }, `${GW.areaName(a)}${GW.armyAt(a) && GW.armyAt(a)!.owner !== p ? " (attack: landing)" : ""}`)))));
    }
    box.append(h("div", { class: "btnrow" },
      h("button", { class: "btn primary", onclick: () => this.confirmMove(x) }, atk ? "Declare attack" : x.fleet ? "Set sail" : "Confirm move"),
      h("button", { class: "btn", onclick: () => { this.ui.plan = null; this.ui.take.clear(); this.render(); } }, "Cancel")));
    return box;
  }
  private confirmMove(x: Army) {
    const pl = this.ui.plan!; const cmd: any = { c: "move", id: x.id, to: pl.to };
    if (this.ui.take.size && this.ui.take.size < x.units.length) cmd.take = [...this.ui.take];
    if (this.ui.bring.size) cmd.heroes = [...this.ui.bring];
    if (x.fleet && this.ui.loadFrom != null) { const la = GW.armyAt(this.ui.loadFrom); if (la) cmd.load = { from: la.area, units: la.units.map((_, i) => i) }; }
    if (x.fleet && this.ui.unload != null) cmd.unload = this.ui.unload;
    this.answer(cmd);
  }
  private heroPanel(hh: Hero, p: number) {
    const S = GW.state; const a = hh.area!; const own = hh.owner === p;
    const panel = h("section", { class: "panel" }, h("div", { class: "eyebrow" }, own ? "Your hero" : `${this.name(hh.owner)}'s hero`), h("h3", null, `Hero in ${GW.areaName(a)}`), h("p", { class: "note" }, this.areaSummary(a)));
    if (!own) return panel;
    const can = !hh.act || (hh.extra || 0) > 0;
    if (!can) { panel.append(h("p", { class: "note" }, "This hero has acted this turn.")); return panel; }
    const free = GW.heroCanAct(hh);
    const dip = GW.canDiplomacy(p, hh);
    const c = GW.countryOf(a);
    const dipWhy = dip ? (() => { const t = GW.diploTarget(p, dip); return `Need ${t.base + t.mod} or less on a d10${t.notes.length ? " (" + t.notes.join(", ") + ")" : ""}. Treasure gifts add +1 each.`; })()
      : !c || !GW.isCapital(a) ? "Only in the capital of an unallied country." : S.countries[c].owner != null ? `${GW.data.COUNTRIES[c].name} is already controlled.` : S.inPlay && !S.inPlay.includes(c) ? "That country is not part of this scenario." : GW.armyAt(a) && GW.armyAt(a)!.owner !== p ? "Another player's army holds the capital." : S.scen === "howl" ? "Howl From the North limits diplomacy (see scenario rules)." : "Not possible here.";
    const searchOk = !!GW.MAGIC[a] && free && !(S.flags.fiend && S.flags.fiend[a]);
    const recruitOk = !!GW.MERC[a] && free;
    panel.append(h("div", { class: "acts" },
      this.actBtn("Diplomacy", !!dip, dipWhy, () => this.answer({ c: "diplomacy", id: hh.id }), "diplomacy"),
      this.actBtn("Search for treasure", searchOk, searchOk ? "Roll higher than the guardian to win its treasure." : !GW.MAGIC[a] ? "Only on a treasure site (ruin icon)." : !free ? "Another player's army is here." : "A fiend guards this site this turn.", () => this.answer({ c: "search", id: hh.id }), "search"),
      this.actBtn("Recruit mercenaries", recruitOk, recruitOk ? "Draw a Mercenary card; keep it if it fits your side." : !GW.MERC[a] ? "Only on a mercenary site (tent icon)." : "Another player's army is here.", () => this.answer({ c: "recruit", id: hh.id }), "recruit"),
      this.actBtn("Move", true, this.ui.mode === "heroMove" ? "Click a highlighted area (up to 6 areas)." : "Up to 6 areas. Terrain costs apply.", () => { this.ui.mode = "heroMove"; this.render(); }, "heromove")));
    if (GW.armyAt(a)?.owner === p && free) panel.append(h("p", { class: "note" }, "To lead the army here into battle, select the army and tick this hero when you choose its destination."));
    return panel;
  }

  private coachFinal(c: HTMLElement) {
    const p = this.req!.who as number, S = GW.state;
    const armies = GW.armiesOf(p).filter(x => !x.fleet);
    const revolt = !!S.flags["revolt" + p];
    const rows = h("div", { class: "rows" }, armies.map(x => {
      const dmg = x.units.some(u => u.hp === 1 && GW.twoStep(u)); const types = GW.addTypes(p, x);
      const addNote = x.act ? "Acted this turn." : revolt ? "Peasants revolt: no new units this turn." : !types ? "Not in a home, allied or conquered country." : x.units.length >= 5 ? "Already 5 counters." : `Adds ${[...new Set(types)].map(t => GW.data.UNITS[t].name).slice(0, 4).join(", ")}${types.length > 4 ? "…" : ""}.`;
      const furyOk = S.players[p].nation === "furyondy" && S.opts.abilities && !S.flags["used_fh" + p] && !S.flags["noAbility" + p] && dmg;
      const keoOk = S.players[p].nation === "keoland" && S.opts.abilities && !S.flags["used_kd" + p] && !S.flags["noAbility" + p] && x.units.length < 5;
      return h("div", { class: "frow" + (x.act ? " done" : "") },
        h("div", { class: "fhead", onclick: () => { this.select("army", x.id); } }, h("img", { src: coinURL(x.units[0]?.t || "LI", false, { plaque: false }), alt: "", width: 28, height: 28 }), h("span", null, `Army of ${x.units.length}`, h("small", null, GW.areaName(x.area)))),
        h("div", { class: "fbtns" },
          h("button", { class: "btn small", disabled: x.act || !dmg, title: x.act ? "Acted this turn" : !dmg ? "No wounded units" : "Heal every wounded unit", onclick: () => this.answer({ c: "heal", id: x.id }) }, "Heal"),
          h("button", { class: "btn small", disabled: x.act || revolt || !types || x.units.length >= 5, title: addNote, onclick: () => this.answer({ c: "add", id: x.id }) }, "Add units"),
          furyOk ? h("button", { class: "btn small", title: "Furyondy's ability: heal even if this army acted", onclick: () => this.answer({ c: "furyheal", id: x.id }) }, "Royal healing") : null,
          keoOk ? h("select", { class: "small", "aria-label": "Keoland recruits a demihuman", onchange: (e: Event) => { const t = (e.target as HTMLSelectElement).value; if (t) this.answer({ c: "keodemi", id: x.id, t }); } }, h("option", { value: "" }, "Recruit demihuman…"), ["Dwarf", "Elf", "Gnome", "Halfling"].filter(t => (S.pool[t] || 0) > 0).map(t => h("option", { value: t }, GW.data.UNITS[t].name))) : null),
        h("div", { class: "fnote" }, addNote));
    }));
    const ra = GW.raiseAreas(p); const raised = !!S.flags["raised" + p]; const markers = GW.freeMarkers(p);
    const raiseOk = !raised && !revolt && markers > 0 && ra.length > 0;
    c.append(h("section", { class: "panel" }, h("div", { class: "eyebrow" }, this.phaseLabel()), h("h2", null, "Heal, reinforce, raise"),
      h("p", { class: "lead" }, "Armies that did not act may heal all wounded units, or add new units if they stand in a home, allied or conquered country. You may also raise one new army."),
      rows,
      h("div", { class: "raise" }, h("button", { class: "btn" + (this.ui.mode === "raise" ? " on" : ""), disabled: !raiseOk, onclick: () => { this.ui.mode = this.ui.mode === "raise" ? null : "raise"; this.render(); } }, this.ui.mode === "raise" ? "Pick a green area…" : "Raise a new army"),
        h("small", null, raised ? "Already raised one this turn." : revolt ? "Peasants revolt: no raising this turn." : markers <= 0 ? "No free army marker." : !ra.length ? "No empty area in a home or allied country." : `${ra.length} possible areas.`)),
      h("div", { class: "btnrow" }, h("button", { class: "btn primary", onclick: () => this.answer({ c: "endturn" }) }, "End my turn"))));
    c.append(this.ruleCard(this.ui.mode === "raise" ? "raise" : "add"));
  }

  /* ---------- hand ---------- */
  private renderHand() {
    const el = this.el.hand; clear(el);
    const r = this.req!; const S = GW.state;
    const p = this.cfg.solo ? (r.who ?? S.cur) : this.viewer;
    if (p == null || this.isBot(p) || !this.el.curtain.hidden) { el.hidden = true; return; }
    const hand = S.players[p].hand; el.hidden = false;
    const canPlay = (r.kind === "action" || r.kind === "final") && r.who === p && this.canAnswer();
    el.append(h("div", { class: "handlabel" }, `${this.name(p)}'s hand · ${hand.length} of 5`));
    const fan = h("div", { class: "fan" });
    hand.forEach((id, i) => {
      const playable = canPlay && GW.turnPlayable(p, id);
      const rot = (i - (hand.length - 1) / 2) * 5;
      const card = cardEl(id, { small: true, action: playable ? h("button", { class: "btn small primary", onclick: (e: Event) => { e.stopPropagation(); this.answer({ c: "play", card: id }); } }, "Play now") : null });
      card.style.setProperty("--r", rot + "deg"); fan.append(card);
    });
    if (!hand.length) fan.append(h("div", { class: "emptyhand" }, "No cards in hand."));
    el.append(fan);
  }

  /* ---------- map interaction ---------- */
  private renderMap() {
    const m = this.map, r = this.req!; m.highlights.clear(); m.path = null; m.selected = this.ui.sel;
    const p = r.who as number; const S = GW.state;
    if (!this.canAnswer(r)) { m.invalidate(); return; }
    if (r.kind === "area") r.areas.forEach(a => m.highlights.set(a, hl("gold", "Choose")));
    if (r.kind === "heroes" && this.ui.sel?.kind === "hero") { const hh = S.heroes[this.ui.sel.id]; GW.map.ids.forEach(a => { if (GW.canPlaceHero(p, hh, a) && a !== hh.area) m.highlights.set(a, hl("blue", undefined)); }); }
    if (r.kind === "action" && this.ui.sel) {
      if (this.ui.sel.kind === "army") { const x = S.armies[this.ui.sel.id]; if (x && x.owner === p) { const rm = this.reachOf(x); for (const [k, v] of Object.entries(rm)) { const a = +k; if (v.attack && !GW.canAttack(p, a)) continue; m.highlights.set(a, v.attack ? hl("red", "Attack") : hl("gold", x.fleet ? "Sail" : GW.armyAt(a)?.owner === p ? "Join" : this.costLabel(a, v))); } } }
      if (this.ui.sel.kind === "hero" && this.ui.mode === "heroMove") { const hh = S.heroes[this.ui.sel.id]; if (hh?.area != null) { const rm = GW.reach(p, hh.area, 6, { hero: true }); Object.keys(rm).forEach(k => m.highlights.set(+k, hl("blue"))); } }
    }
    if (r.kind === "final" && this.ui.mode === "raise") GW.raiseAreas(p).forEach(a => m.highlights.set(a, hl("green", "Raise")));
    if (this.ui.plan) { m.path = this.ui.plan.path; m.pathAttack = this.ui.plan.info.attack; m.highlights.set(this.ui.plan.to, { ...(m.highlights.get(this.ui.plan.to) || hl("gold")), dash: false }); }
    m.invalidate();
  }
  private costLabel(a: number, v: ReachInfo) { const t = GW.terr(a); return t === "mountains" || t === "swamp" ? "Stops" : `${v.cost ?? 1} move${(v.cost ?? 1) === 1 ? "" : "s"}`; }
  private reachOf(x: Army): Record<number, ReachInfo> {
    const S = GW.state; const p = x.owner;
    if (x.fleet) return x.ice ? {} : GW.fleetReach(p, x.area);
    const rm = GW.reach(p, x.area, GW.armyMove(x), { shepherd: S.flags.shepherd === p, rhenee: S.flags.rhenee === p });
    if (x.act && S.flags.doubletime === p) { for (const k of Object.keys(rm)) if (rm[+k].attack) delete rm[+k]; }
    if (x.act && S.flags.doubletime !== p) return {};
    return rm;
  }
  private select(kind: "army" | "hero", id: string) {
    const S = GW.state; const r = this.req!;
    this.ui.sel = { kind, id }; this.ui.plan = null; this.ui.mode = r.kind === "heroes" && kind === "hero" ? "heroPlace" : null; this.ui.take.clear(); this.ui.bring.clear(); this.ui.loadFrom = null; this.ui.unload = null;
    const a = kind === "army" ? S.armies[id]?.area : S.heroes[id]?.area;
    if (a != null) { if (r.kind === "action" && this.map.z < 1.05) this.map.z = 1.15; this.map.centerOn(a); }
    this.render();
  }
  private clickToken(kind: "army" | "hero", id: string, ev: PointerEvent) {
    const r = this.req; if (!r) return; const S = GW.state;
    const area = kind === "army" ? S.armies[id]?.area : S.heroes[id]?.area;
    // a token sitting on a highlighted destination counts as clicking that area
    if (area != null && this.map.highlights.has(area) && (this.ui.plan == null || this.ui.plan.to !== area) && !(kind === "army" && S.armies[id]?.owner === r.who && r.kind !== "area")) { this.clickArea(area, ev); return; }
    if (r.kind === "area" && area != null && r.areas.includes(area) && this.canAnswer()) { this.answer(area); return; }
    if (r.kind === "heroes" && kind === "hero" && S.heroes[id]?.owner === r.who) { this.select("hero", id); return; }
    this.ui.sel = { kind, id }; this.ui.plan = null; this.ui.mode = null; this.render();
  }
  private clickArea(a: number, ev: PointerEvent) {
    const r = this.req; if (!r || !this.canAnswer(r)) { this.showAreaInfo(a, ev); return; }
    const p = r.who as number, S = GW.state;
    if (r.kind === "area") { if (r.areas.includes(a)) this.answer(a); else this.toastAt(ev, "Not one of the choices", "Pick one of the highlighted areas."); return; }
    if (r.kind === "heroes") {
      if (this.ui.sel?.kind === "hero") { const hh = S.heroes[this.ui.sel.id]; if (GW.canPlaceHero(p, hh, a)) { this.answer({ c: "placeHero", id: hh.id, to: a }); return; } this.toastAt(ev, "Hero cannot go there", GW.isWater(a) ? "Heroes cannot stand in sea areas." : !GW.inPlayArea(a) ? "That area is not in play in this scenario." : GW.armyAt(a) && GW.armyAt(a)!.owner !== p ? "Another player's army holds that area." : GW.heroesAt(a).some(o => o.owner === p) ? "You already have a hero there." : "A hero standing with another player's army cannot leave.", "heroes"); return; }
      const mine = GW.heroesAt(a).find(o => o.owner === p); if (mine) this.select("hero", mine.id); else this.showAreaInfo(a, ev); return;
    }
    if (r.kind === "final" && this.ui.mode === "raise") { if (GW.raiseAreas(p).includes(a)) this.answer({ c: "raise", area: a }); else this.toastAt(ev, "Cannot raise an army there", "New armies go in an empty area of a home or allied country.", "raise"); return; }
    if (r.kind === "action" && this.ui.sel) {
      if (this.ui.sel.kind === "army") {
        const x = S.armies[this.ui.sel.id];
        if (x && x.owner === p) {
          const rm = this.reachOf(x); const info = rm[a];
          if (info && (!info.attack || GW.canAttack(p, a))) { this.ui.plan = { to: a, info, path: GW.pathTo(rm, x.area, a) }; this.render(); return; }
          if (a === x.area && x.fleet) { this.ui.plan = { to: a, info: { from: null, attack: false, cost: 0 }, path: [a] }; this.render(); return; }
          const own = GW.armyAt(a); if (own && own.owner === p && own.id !== x.id) { this.select("army", own.id); return; }
          const why = this.whyNot(x, a, p); this.toastAt(ev, why[0], why[1], why[2]); return;
        }
      }
      if (this.ui.sel.kind === "hero" && this.ui.mode === "heroMove") {
        const hh = S.heroes[this.ui.sel.id]; const rm = GW.reach(p, hh.area!, 6, { hero: true });
        if (rm[a]) { this.answer({ c: "heroMove", id: hh.id, to: a }); return; }
        this.toastAt(ev, "Too far for the hero", "Heroes move up to 6 areas. Forest, hills and desert cost 2; mountains and swamps end the move; sea needs a ship.", "heromove"); return;
      }
    }
    const own = GW.armyAt(a); if (r.kind === "action" && own && own.owner === p) { this.select("army", own.id); return; }
    const hero = GW.heroesAt(a).find(o => o.owner === p); if (r.kind === "action" && hero) { this.select("hero", hero.id); return; }
    this.showAreaInfo(a, ev);
  }
  private whyNot(x: Army, a: number, p: number): [string, string, string] {
    const S = GW.state;
    if (x.act && S.flags.doubletime !== p) return ["This army has acted", "Each army acts once per turn. It is ready again next turn.", "action"];
    if (!GW.inPlayArea(a)) return ["Not in this scenario", "That area is closed in this scenario. No unit may enter it.", "scen-" + S.scen];
    if (x.fleet) return GW.isWater(a) ? ["Too far to sail", "Fleets move up to 6 sea areas and cannot pass another player's fleet.", "fleet"] : ["Ships stay at sea", "Fleets cannot enter land. Use Unload to land troops on a coast.", "fleet"];
    if (GW.isWater(a)) return ["Ships only", "Land troops need a ship (or a ferry) to cross sea and lake areas.", "terrain"];
    const y = GW.armyAt(a);
    if (y && y.owner !== p && GW.state.players[y.owner].align === GW.state.players[p].align) return ["An ally holds that area", "You may pass through an ally's army, but not end your move there.", "others"];
    if (y && y.owner !== p && !GW.canAttack(p, a)) return ["Attack not allowed yet", "In Furyondy Frontier, Furyondy may not attack until Iuz has attacked.", "scen-frontier"];
    if ((GW.ADJ[x.area] || []).includes(a) && GW.EDGE[x.area + "_" + a] === "spine") return ["Mountain spine", "The dark ridge between these areas cannot be crossed by armies.", "terrain"];
    if (GW.armyAt(a)?.owner === p) return ["Your own army", "Select that army to give it orders.", "split"];
    return ["Out of reach this turn", `This army moves ${GW.armyMove(x)} areas, set by its slowest unit. Forest, hills and desert cost 2; mountains and swamps end the move; other players' armies block the way.`, "terrain"];
  }
  private areaSummary(a: number) {
    const S = GW.state; const t = GW.terr(a); const c = GW.countryOf(a); const parts: string[] = [];
    parts.push(`${t[0].toUpperCase() + t.slice(1)} (${TERRAIN_NOTE[t]})`);
    if (c) { const cs = S.countries[c]; parts.push(`${GW.data.COUNTRIES[c]?.name || c}${GW.isCapital(a) ? ", capital" : ""}: ${cs.owner == null ? "unallied" : this.name(cs.owner) + (cs.rel === "home" ? " (home)" : cs.rel === "allied" ? " (ally)" : " (conquered)")}`); }
    const x = GW.armyAt(a); if (x) parts.push(`${this.name(x.owner)}'s ${x.fleet ? "fleet" : "army"}: ${x.units.length} units, strength ${GW.armyStrength(x)}`);
    const hs = GW.heroesAt(a); if (hs.length) parts.push(hs.map(hh => this.name(hh.owner) + "'s hero").join(", "));
    if (S.forts[a] != null) parts.push(`fortified by ${this.name(S.forts[a])}`); if (GW.PFORT[a]) parts.push("permanent fortification");
    if (GW.MAGIC[a]) parts.push("treasure site"); if (GW.MERC[a]) parts.push("mercenary site"); if (GW.PORT[a]) parts.push("port");
    if (!GW.inPlayArea(a)) parts.push("not in play in this scenario");
    return parts.join(". ") + ".";
  }
  private showAreaInfo(a: number, ev: PointerEvent) { this.toastAt(ev, GW.areaName(a), this.areaSummary(a)); }
  private hover(a: number | null, x: number, y: number) {
    const t = this.el.tip; if (a == null) { t.hidden = true; return; }
    clear(t).append(h("b", null, GW.areaName(a)), h("span", null, this.areaSummary(a)));
    t.hidden = false; const w = this.el.mapwrap.clientWidth; t.style.left = Math.min(w - 280, x + 16) + "px"; t.style.top = (y + 18) + "px";
  }
  private toastAt(ev: PointerEvent | null, title: string, text: string, rule?: string) {
    const t = this.el.toast; clear(t);
    t.append(h("b", null, title), h("span", null, text), h("div", { class: "trow" }, rule ? h("button", { class: "rule", onclick: () => { t.hidden = true; this.rules.open(rule); } }, "Show the rule") : null, h("button", { class: "rule", onclick: () => { t.hidden = true; } }, "Dismiss")));
    t.hidden = false;
    if (ev) { const r = this.el.mapwrap.getBoundingClientRect(); t.style.left = Math.max(8, Math.min(r.width - 320, ev.clientX - r.left + 12)) + "px"; t.style.top = Math.max(8, Math.min(r.height - 180, ev.clientY - r.top + 12)) + "px"; }
    else { t.style.left = "50%"; t.style.top = "16px"; }
    clearTimeout((t as any)._h); (t as any)._h = setTimeout(() => { t.hidden = true; }, 7000);
  }
  toast(text: string) { this.toastAt(null, text, ""); }
  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { if (!this.rules.isOpen && (this.ui.sel || this.ui.plan || this.ui.mode)) { this.ui = this.freshUI(); this.render(); } }
  };

  /* ---------- modals ---------- */
  private renderModals() {
    const r = this.req!;
    if (r.battle) {
      this.closeModal();
      this.battle.show(r, { name: p => this.name(p), color: p => this.color(p), canAnswer: this.canAnswer(r), answer: v => this.answer(v), speed: this.cfg.speed || 1, auto: this.allBots, openRule: id => this.rules.open(id) });
      return;
    }
    if (this.battle.open) this.battle.hide();
    if (!this.canAnswer(r) && r.kind !== "over") { this.closeModal(); return; }
    if (r.kind === "info") return this.infoModal(r);
    if (r.kind === "ask") return this.openModal(h("div", { class: "dlg" }, h("h2", null, r.title), r.text ? h("p", { class: "pre" }, r.text) : null, h("div", { class: "choices col" }, r.options.map((o, i) => h("button", { class: "btn" + (i === 0 ? " primary" : ""), onclick: () => this.answer(o.id) }, o.label)))));
    if (r.kind === "cards") return this.cardsModal(r);
    if (r.kind === "over") { if (!this.closedOver) this.overModal(); return; }
    this.closeModal();
  }
  private infoModal(r: Request) {
    const key = GW.save.answers.length + "|" + r.title; if (key === this.lastKey && !this.el.modal.hidden) return; this.lastKey = key;
    const cont = h("button", { class: "btn primary", onclick: () => this.answer(null) }, "Continue");
    let body: HTMLElement;
    if (r.diplo) {
      const d = r.diplo; const line = h("div", { class: "line10" }, Array.from({ length: 10 }, (_, i) => h("div", { class: (i + 1 <= d.target ? "yes" : "") + (i + 1 === d.roll ? " hit" : "") }, String(i + 1))));
      body = h("div", { class: "dlg diplo" }, h("div", { class: "eyebrow" }, "Diplomacy"), h("h2", null, r.title), countryCard(d.country),
        h("p", null, `Rating ${d.base}${d.mods.length ? ", " + d.mods.join(", ") : ""}${d.gifts ? `, ${d.gifts} gift${d.gifts > 1 ? "s" : ""}` : ""}: roll ${d.target} or less.`), line,
        h("p", { class: "result " + (d.ok ? "win" : "lose") }, d.ok ? `Rolled ${d.roll}. ${d.name} joins the alliance. Its army arrives at the end of the turn.` : `Rolled ${d.roll}. ${d.name} refuses.`), cont);
    } else if (r.search) {
      const s = r.search;
      body = h("div", { class: "dlg" }, h("div", { class: "eyebrow" }, "Treasure search"), h("h2", null, r.title),
        h("div", { class: "versus" }, h("div", null, h("small", null, "Guardian"), h("b", null, s.guardian), h("span", { class: "big" }, String(s.str))), h("div", null, h("small", null, "You rolled"), h("span", { class: "big " + (s.won ? "ok" : "bad") }, String(s.roll + s.bonus)))),
        h("p", null, s.won ? `You beat the ${s.guardian} and win: ${s.got.join(", ") || "nothing (the deck is empty)"}.` : `The ${s.guardian} keeps its hoard. You needed more than ${s.str}.`),
        s.won ? h("div", { class: "cardrow" }, GW.state.players[r.who as number].hand.slice(-s.got.length).map(id => cardEl(id, { small: true }))) : null, cont);
    } else if (/^Phase 3: event/.test(r.title) && (r as any).card) {
      body = h("div", { class: "dlg" }, h("div", { class: "eyebrow" }, "Phase 3 · event card"), h("h2", null, r.title), h("div", { class: "cardrow" }, cardEl((r as any).card)), h("p", { class: "pre" }, r.text || ""), cont);
    } else body = h("div", { class: "dlg" }, h("h2", null, r.title), r.text ? h("p", { class: "pre" }, r.text) : null, cont);
    this.openModal(body); setTimeout(() => cont.focus(), 30);
  }
  private cardsModal(r: Extract<Request, { kind: "cards" }>) {
    const pick = this.ui.cardPick; const exact = r.exact; const min = r.min ?? 0, max = r.max ?? r.cards.length;
    const status = h("span", { class: "muted" });
    const ok = h("button", { class: "btn primary", onclick: () => { const v = r.cards.filter(c => pick.has(c)); pick.clear(); this.answer(v); } }, "Confirm");
    const tray = h("div", { class: "cardrow wrap" });
    const draw = () => {
      clear(tray); r.cards.forEach(id => tray.append(cardEl(id, { selected: pick.has(id), onClick: () => { if (pick.has(id)) pick.delete(id); else if (pick.size < (exact ?? max)) pick.add(id); draw(); } })));
      const n = pick.size; const good = exact != null ? n === exact : n >= min && n <= max; (ok as HTMLButtonElement).disabled = !good;
      status.textContent = exact != null ? `Choose exactly ${exact}. Selected ${n}.` : `Selected ${n}${max ? ` of up to ${max}` : ""}.`;
    };
    draw();
    this.openModal(h("div", { class: "dlg wide" }, h("h2", null, r.title), r.text ? h("p", { class: "pre" }, r.text) : null, tray, h("div", { class: "btnrow" }, status, ok)));
  }
  private overModal() {
    const S = GW.state; const w = S.winner;
    this.openModal(h("div", { class: "dlg over" }, h("div", { class: "eyebrow" }, "The war is decided"), w != null ? h("div", { class: "bigseal", style: { background: this.color(w) } }, this.name(w)[0]) : null,
      h("h1", null, w != null ? `${this.name(w)} wins` : "Game over"), h("p", { class: "lead" }, w != null ? `${this.name(w)} ${S.winWhy}.` : ""),
      h("div", { class: "btnrow" }, h("button", { class: "btn", onclick: () => { this.closedOver = true; this.closeModal(); } }, "Look at the map"), h("button", { class: "btn primary", onclick: () => { try { localStorage.removeItem("gw.autosave"); } catch { } this.destroy(); this.onExit(); } }, "New game"))));
  }
  openModal(content: HTMLElement) { const m = this.el.modal; clear(m); m.append(h("div", { class: "modal", role: "dialog", "aria-modal": "true" }, content)); m.hidden = false; }
  closeModal() { this.el.modal.hidden = true; clear(this.el.modal); this.lastKey = ""; }
  confirm(title: string, text: string, label: string, fn: () => void) {
    this.openModal(h("div", { class: "dlg" }, h("h2", null, title), h("p", null, text), h("div", { class: "btnrow" }, h("button", { class: "btn", onclick: () => { this.closeModal(); this.render(); } }, "Cancel"), h("button", { class: "btn primary", onclick: () => { this.closeModal(); fn(); } }, label))));
  }
  download() {
    const blob = new Blob([JSON.stringify({ v: 1, cfg: this.cfg, save: GW.save } as SaveFile)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `greyhawk-wars-${GW.state.scen}-turn${GW.state.turn}.json` }); document.body.append(a); a.click(); a.remove();
    this.toast("Game saved to a file. Load it from the start screen.");
  }
}

export function nationOf(key: string) { return NATION[key]; }
