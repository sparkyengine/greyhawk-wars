/* The battle screen: two facing lines of coins, dice and arrows replayed from the engine's battle events. */
import { GW } from "../engine/engine.js";
import type { Request, BattleView, BattleUnit } from "../engine/engine.js";
import { h, clear, sleep } from "./dom";
import { coinURL } from "../render/coins";
import { cardEl } from "./cards";

export interface BattleCtx {
  name(p: number): string; color(p: number): string;
  canAnswer: boolean; answer(v: any): void; speed: number; auto: boolean; openRule(id: string): void;
}

const RESULT_TITLE: Record<string, string> = { attacker: "Attacker wins", defender: "Defender holds", defretreat: "Defender retreats", attretreat: "Attacker falls back" };

export class BattleScreen {
  root: HTMLElement; private key = ""; private seq = 0; private picked = new Set<string>();
  private els = new Map<number, HTMLElement>();
  constructor(host: HTMLElement) {
    this.root = h("div", { class: "battle-layer", role: "dialog", "aria-modal": "true", "aria-label": "Battle", hidden: true });
    host.appendChild(this.root);
  }
  hide() { this.root.hidden = true; this.key = ""; }
  get open() { return !this.root.hidden; }

  async show(req: Request, ctx: BattleCtx) {
    const b = req.battle!; const key = `${b.area}-${b.att}-${b.def}`; const fresh = key !== this.key; this.key = key; const my = ++this.seq;
    this.root.hidden = false;
    if (fresh) this.picked.clear();
    const terr = b.terrain;
    const chips = [
      b.maxRounds ? `Up to ${b.maxRounds} rounds` : "Up to 3 rounds (4 with a hero)",
      b.river ? "River: defender strikes first" : null, b.landing ? "Landing: defender first, attackers -1" : null,
      b.fort ? "Fortified: attackers -1" : null, b.sea ? "Sea battle: ships only" : null, `Terrain: ${terr}`,
      b.attHeroes ? "Attacking hero: +1, extra round" : null, b.defHeroes ? "Defending hero: +1, extra round" : null,
    ].filter(Boolean) as string[];
    clear(this.root);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "barrows");
    const defRow = h("div", { class: "brow def" }), attRow = h("div", { class: "brow att" });
    const msg = h("div", { class: "bmsg" }); const acts = h("div", { class: "bacts" }); const notes = h("ul", { class: "bnotes" });
    const stageLabel = b.stage === "round" ? `Round ${b.round}${b.defFirst ? " · defender strikes first" : ""}` : b.stage === "cards" ? "Battle cards" : b.stage === "reveal" ? "Cards revealed" : b.stage === "ask" ? `After round ${b.round}` : "Result";
    this.root.append(h("div", { class: "bpanel" },
      h("header", { class: "bhead" },
        h("div", null, h("div", { class: "eyebrow" }, `${ctx.name(b.att)} attacks from ${b.originName}`), h("h2", null, `Battle of ${b.areaName}`)),
        h("div", { class: "bstage" }, stageLabel)),
      h("div", { class: "bchips" }, chips.map(c => h("span", { class: "chip" }, c)), h("button", { class: "rule", onclick: () => ctx.openRule("combat") }, "How battles work")),
      h("div", { class: "barena" + (b.river ? " river" : "") },
        h("div", { class: "bside" }, h("span", { class: "seal", style: { background: ctx.color(b.def) } }, ctx.name(b.def)[0]), `Defender: ${ctx.name(b.def)}`),
        defRow, h("div", { class: "bmid" }, b.river ? h("span", null, "river") : null), attRow,
        h("div", { class: "bside" }, h("span", { class: "seal", style: { background: ctx.color(b.att) } }, ctx.name(b.att)[0]), `Attacker: ${ctx.name(b.att)}`), svg),
      h("div", { class: "bfoot" }, h("div", { class: "bleft" }, msg, notes), acts)));
    const units = b.stage === "round" && b.before ? b.before : b.units;
    this.renderRows(units, defRow, attRow, b.stage === "round" ? b.units : null);
    if (b.stage === "reveal" && b.reveal) b.reveal.forEach(r => notes.append(h("li", null, r)));
    if (b.stage === "round") {
      msg.textContent = "Rolling…";
      await this.animate(b, svg, ctx, my);
      if (my !== this.seq) return;
      this.renderRows(b.units, defRow, attRow, null, b.before);
      (b.notes || []).forEach(n => notes.append(h("li", { class: /hit/.test(n) ? "hit" : "" }, n)));
      const la = b.units.att.length, ld = b.units.def.length;
      msg.textContent = `After round ${b.round}: attacker has ${la} unit${la === 1 ? "" : "s"}, defender has ${ld}.`;
    }
    if (b.stage === "result") { msg.append(h("strong", { class: "bresult" }, RESULT_TITLE[b.result || ""] || "Result"), " ", b.resultText || ""); }
    if (b.stage === "cards") msg.textContent = req.who != null ? `${ctx.name(req.who)} may play battle cards face down. Both sides' cards are revealed together.` : "";
    if (b.stage === "ask") msg.textContent = req.title + ". " + (req.text || "");
    this.renderActions(req, acts, ctx);
    if (ctx.auto && (req.kind === "info")) { await sleep(900 / ctx.speed); if (my === this.seq) ctx.answer(null); }
  }

  private renderRows(u: { att: BattleUnit[]; def: BattleUnit[] }, defRow: HTMLElement, attRow: HTMLElement, _after: any, before?: { att: BattleUnit[]; def: BattleUnit[] }) {
    this.els.clear(); clear(defRow); clear(attRow);
    const build = (list: BattleUnit[], ghosts: BattleUnit[], row: HTMLElement) => {
      const all = before ? before : null;
      const order = all ? (row === defRow ? all.def : all.att) : list;
      order.forEach(bu => {
        const now = list.find(x => x.bid === bu.bid); const dead = !now; const cur = now || bu; const d = GW.data.UNITS[cur.t];
        const wounded = cur.hp === 1 && d.b > 0;
        const el = h("div", { class: "bunit" + (dead ? " dead" : "") + (wounded ? " hurt" : "") },
          h("img", { src: coinURL(cur.t, wounded), alt: "", width: 84, height: 84 }), h("b", null, d.name), h("small", null, dead ? "removed" : wounded ? `wounded, ${d.b}` : `strength ${d.f}`));
        row.append(el); this.els.set(bu.bid, el);
      });
      void ghosts;
    };
    build(u.def, [], defRow); build(u.att, [], attRow);
  }

  private async animate(b: BattleView, svg: SVGSVGElement, ctx: BattleCtx, my: number) {
    const evs = b.events || []; const step = Math.max(70, 360 / ctx.speed);
    const box = (svg.parentElement as HTMLElement).getBoundingClientRect(); svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    for (const e of evs) {
      if (my !== this.seq) return;
      const from = this.els.get(e.bid), to = this.els.get(e.tbid); if (!from) continue;
      const die = h("span", { class: "die rolling" }, "?"); from.append(die);
      for (let i = 0; i < 5; i++) { die.textContent = String(1 + Math.floor(Math.random() * 10)); await sleep(step / 6); }
      die.textContent = String(e.r); die.className = "die " + (e.hit ? "hit" : "miss"); die.title = `Needed ${e.s} or less`;
      die.append(h("small", null, `≤${e.s}`));
      if (to) {
        const a = from.getBoundingClientRect(), c = to.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - box.left, y1 = (e.side === "att" ? a.top : a.bottom) - box.top, x2 = c.left + c.width / 2 - box.left, y2 = (e.side === "att" ? c.bottom : c.top) - box.top;
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", String(x1)); ln.setAttribute("y1", String(y1)); ln.setAttribute("x2", String(x2)); ln.setAttribute("y2", String(y2));
        ln.setAttribute("class", (e.side === "att" ? "att" : "def") + (e.hit ? " hit" : " miss")); svg.append(ln);
        if (e.hit) { to.classList.remove("struck"); void to.offsetWidth; to.classList.add("struck"); }
      }
      await sleep(step);
    }
    await sleep(step * 1.5);
  }

  private renderActions(req: Request, acts: HTMLElement, ctx: BattleCtx) {
    clear(acts);
    if (!ctx.canAnswer) { acts.append(h("span", { class: "muted" }, req.who != null ? `Waiting for ${ctx.name(req.who)}…` : "")); return; }
    if (req.kind === "info") { const b = h("button", { class: "btn primary", onclick: () => ctx.answer(null) }, req.battle?.stage === "result" ? "Close the battle" : "Continue"); acts.append(b); setTimeout(() => b.focus(), 30); }
    else if (req.kind === "ask") req.options.forEach((o, i) => acts.append(h("button", { class: "btn" + (i === 0 ? " primary" : ""), onclick: () => ctx.answer(o.id) }, o.label)));
    else if (req.kind === "cards") {
      const tray = h("div", { class: "btray" });
      const draw = () => { clear(tray); req.cards.forEach(id => tray.append(cardEl(id, { small: true, selected: this.picked.has(id), onClick: () => { this.picked.has(id) ? this.picked.delete(id) : this.picked.add(id); draw(); } }))); };
      draw();
      acts.append(tray, h("div", { class: "brow-btns" },
        h("button", { class: "btn", onclick: () => { this.picked.clear(); ctx.answer([]); } }, "Play no cards"),
        h("button", { class: "btn primary", onclick: () => { const v = req.cards.filter(c => this.picked.has(c)); this.picked.clear(); ctx.answer(v); } }, "Play selected cards")));
    }
  }
}
