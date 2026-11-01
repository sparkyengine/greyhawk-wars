/* The in-game rulebook: rules in plain words, scenario pages, and generated references for units, cards and countries. */
import { GW } from "../engine/engine.js";
import { RULES, SCENARIO_NOTES, type RuleSection } from "../rules/content";
import { h, clear } from "./dom";
import { coinURL } from "../render/coins";
import { cardEl, countryCard } from "./cards";

export class Rulebook {
  root: HTMLElement; private toc: HTMLElement; private page: HTMLElement; private search: HTMLInputElement; private current = "overview";
  private sections: RuleSection[];
  constructor(host: HTMLElement) {
    const scen = Object.entries(GW.data.SCENARIOS).map(([k, s]) => ({ id: "scen-" + k, group: "Scenarios", title: s.name, page: "Adventurer's Book p.30-32", summary: SCENARIO_NOTES[k] || s.blurb, body: "" }));
    const refs: RuleSection[] = [
      { id: "ref-units", group: "Reference", title: "Units", page: "Rulebook p.2, 5", summary: "Every troop type with its strength, movement and special rules.", body: "" },
      { id: "ref-events", group: "Reference", title: "Event cards", page: "Card sheets", summary: "All 39 Event cards.", body: "" },
      { id: "ref-treasure", group: "Reference", title: "Treasure cards", page: "Card sheets", summary: "All 29 Treasure cards and their guardians.", body: "" },
      { id: "ref-mercs", group: "Reference", title: "Mercenary cards", page: "Card sheets", summary: "All 39 Mercenary cards.", body: "" },
      { id: "ref-countries", group: "Reference", title: "Countries", page: "Card sheets", summary: "Diplomacy ratings, modifiers and troops for all 46 countries.", body: "" },
    ];
    this.sections = [...RULES, ...scen, ...refs];
    this.search = h("input", { class: "search", type: "search", placeholder: "Search the rules", "aria-label": "Search the rules" });
    this.toc = h("nav", { class: "rtoc", "aria-label": "Rulebook contents" });
    this.page = h("article", { class: "rpage" });
    this.root = h("div", { class: "rulebook", hidden: true, role: "dialog", "aria-modal": "true", "aria-label": "Rulebook" },
      h("div", { class: "rbox" }, h("header", null, h("div", { class: "brand" }, "The Rulebook"), this.search, h("button", { class: "btn", onclick: () => this.close() }, "Close")),
        h("div", { class: "rbody" }, this.toc, this.page)));
    this.root.addEventListener("click", e => { if (e.target === this.root) this.close(); });
    this.search.addEventListener("input", () => this.renderToc());
    window.addEventListener("keydown", e => { if (e.key === "Escape" && this.isOpen) this.close(); });
    host.appendChild(this.root);
  }
  get isOpen() { return !this.root.hidden; }
  section(id: string) { return this.sections.find(s => s.id === id); }
  open(id?: string) { if (id && this.section(id)) this.current = id; this.root.hidden = false; this.renderToc(); this.renderPage(); setTimeout(() => this.search.focus(), 30); }
  close() { this.root.hidden = true; }
  private renderToc() {
    const q = this.search.value.trim().toLowerCase(); clear(this.toc);
    const groups = [...new Set(this.sections.map(s => s.group))];
    for (const g of groups) {
      const list = this.sections.filter(s => s.group === g && (!q || (s.title + " " + s.summary + " " + s.body).toLowerCase().includes(q)));
      if (!list.length) continue;
      this.toc.append(h("h4", null, g), ...list.map(s => h("button", { class: s.id === this.current ? "on" : "", onclick: () => { this.current = s.id; this.renderToc(); this.renderPage(); } }, h("span", null, s.title), h("small", null, s.page.replace("Rulebook ", "")))));
    }
  }
  private renderPage() {
    const s = this.section(this.current)!; clear(this.page);
    this.page.append(h("div", { class: "crumb" }, `${s.group} · ${s.page}`), h("h1", null, s.title), h("p", { class: "lead" }, s.summary));
    if (s.body) this.page.append(h("div", { class: "prose", html: s.body }));
    if (s.tips) this.page.append(h("div", { class: "callout" }, s.tips.join(" ")));
    if (s.id === "move" || s.id === "terrain") this.page.append(this.sandbox());
    if (s.id.startsWith("scen-")) this.page.append(this.scenarioPage(s.id.slice(5)));
    if (s.id === "ref-units") this.page.append(this.units());
    if (s.id === "ref-events") this.page.append(h("div", { class: "cardrow wrap" }, uniq(GW.data.EVENTS.map(e => e.id), id => GW.cardById(id).title).map(id => cardEl(id, { small: true }))));
    if (s.id === "ref-treasure") this.page.append(h("div", { class: "cardrow wrap" }, GW.data.TREASURES.map(t => cardEl(t.id, { small: true }))));
    if (s.id === "ref-mercs") this.page.append(h("div", { class: "cardrow wrap" }, GW.data.MERCS.map(m => cardEl(m.id, { small: true }))));
    if (s.id === "ref-countries") this.page.append(h("div", { class: "cardrow wrap" }, Object.keys(GW.data.COUNTRIES).map(c => countryCard(c))));
    const related = this.sections.filter(o => o.group === s.group && o.id !== s.id).slice(0, 5);
    if (related.length) this.page.append(h("div", { class: "related" }, h("div", { class: "eyebrow" }, "Related"), related.map(o => h("button", { class: "btn small", onclick: () => { this.current = o.id; this.renderToc(); this.renderPage(); } }, o.title))));
    this.page.scrollTop = 0;
  }
  private scenarioPage(k: string) {
    const sc = GW.data.SCENARIOS[k];
    return h("div", null, h("h3", null, "Sides"), h("ul", null, sc.sides.map(sd => h("li", null, h("b", null, sd.label || GW.data.COUNTRIES[sd.home[0]]?.name || sd.nation), `: ${sd.align === "G" ? "Good" : "Evil"}, starts with ${sd.home.length ? sd.home.map(c => GW.data.COUNTRIES[c].name).join(", ") : "no countries"}${sd.heroes ? `, ${sd.heroes} heroes` : sc.heroes ? `, ${sc.heroes} heroes` : ""}.`))),
      sc.inPlay ? [h("h3", null, "Countries in play"), h("p", null, sc.inPlay.map(c => GW.data.COUNTRIES[c]?.name).join(", ") + ".")] : h("p", null, "Every country on both maps is in play."),
      h("p", null, `Map: ${sc.map === "both" ? "both sheets" : sc.map === "W" ? "west sheet only" : "east sheet only"}.`));
  }
  private units() {
    const U = GW.data.UNITS;
    return h("div", { class: "unitgrid" }, Object.values(U).map(u => h("div", { class: "uref" },
      h("img", { src: coinURL(u.key), alt: "", width: 72, height: 72 }), u.b ? h("img", { src: coinURL(u.key, true), alt: "", width: 52, height: 52, class: "back" }) : null,
      h("b", null, u.name), h("small", null, `Strength ${u.f}${u.b ? ` / ${u.b} wounded` : ", one hit removes"} · moves ${u.move} · ${u.n} in the box`),
      h("small", null, [u.side === "G" ? "Good" : u.side === "E" ? "Evil" : "Any side", u.fav.length ? "+1 in " + u.fav.join(" and ") : "", u.flags.includes("scout") ? "fires first" : "", u.flags.includes("marine") ? "fights ships" : "", u.flags.includes("fortify") ? "helps fortify" : ""].filter(Boolean).join(" · ")))));
  }
  private sandbox() {
    const chain: [string, string][] = [["Start", "clear"], ["Meadow", "clear"], ["Greenwood", "forest"], ["Meadow", "clear"], ["Stonewold", "hills"], ["Mirefen", "swamp"], ["Meadow", "clear"]];
    const box = h("div", { class: "sandbox" }); const row = h("div", { class: "chain" }); let mp = 3;
    const draw = () => { clear(row); let left = mp, stop = false;
      chain.forEach((c, i) => { let ok = i === 0, note = "start";
        if (i > 0 && !stop) { const t = c[1]; if ((t === "forest" || t === "hills") && left < 2) { stop = true; note = "needs 2"; } else if (left < 1) { stop = true; note = "out of reach"; } else { const cost = t === "forest" || t === "hills" ? 2 : t === "swamp" ? left : 1; left -= cost; ok = true; note = t === "swamp" ? "stops here" : cost === 2 ? "2 moves" : "1 move"; if (t === "swamp") stop = true; } }
        else if (i > 0) note = "out of reach";
        row.append(h("div", { class: "tile " + c[1] + (ok ? " ok" : "") }, h("b", null, c[0]), h("small", null, c[1]), h("div", { class: "pips" }, ok ? Array.from({ length: mp }, (_, j) => h("i", { class: j < left ? "" : "o" })) : null), h("small", null, note))); }); };
    const b3 = h("button", { class: "btn small on", onclick: () => { mp = 3; b3.classList.add("on"); b4.classList.remove("on"); draw(); } }, "Infantry (3)");
    const b4 = h("button", { class: "btn small", onclick: () => { mp = 4; b4.classList.add("on"); b3.classList.remove("on"); draw(); } }, "Cavalry (4)");
    draw(); box.append(h("div", { class: "eyebrow" }, "Try it: how far can this army go?"), h("div", { class: "btnrow" }, b3, b4, h("small", null, "Pips show moves left on arrival.")), row); return box;
  }
}
function uniq(ids: string[], key: (id: string) => string) { const seen = new Set<string>(); return ids.filter(id => { const k = key(id); if (seen.has(k)) return false; seen.add(k); return true; }); }
