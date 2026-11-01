/* The start screen: pick a scenario, decide who plays each side, set options, or continue a saved game. */
import { GW } from "../engine/engine.js";
import { h, clear } from "./dom";
import { NATION, nationColor } from "../render/pieces";
import { Rulebook } from "./rulebook";
import type { Config, Controller, SaveFile } from "./game";

const ORDER = ["frontier", "howl", "northern", "great5", "great6"];
const LEN: Record<string, string> = { frontier: "About 1 hour", howl: "About 1 to 2 hours", northern: "2 to 3 hours", great5: "An evening or more", great6: "An evening or more" };

export function setupScreen(root: HTMLElement, atlasReady: Promise<HTMLCanvasElement>, progress: { f: number; label: string }, start: (cfg: Config, save?: SaveFile["save"]) => void) {
  clear(root);
  let scen = "frontier"; let solo = false; let watch = false;
  const seats: Record<string, { name: string; ctl: Controller }[]> = {};
  const opts = { favored: true, pursuit: true, counterDiplomacy: true, abilities: true };
  let speed = 1;
  const rules = new Rulebook(root);
  const bg = h("div", { class: "setup-bg" });
  atlasReady.then(c => { const img = h("img", { src: c.toDataURL("image/jpeg", .7), alt: "" }); bg.append(img); });
  const bar = h("div", { class: "paintbar" }, h("i"), h("span", null, "Painting the map"));
  const tick = setInterval(() => { (bar.firstChild as HTMLElement).style.width = Math.round(progress.f * 100) + "%"; (bar.lastChild as HTMLElement).textContent = progress.f >= 1 ? "Map ready" : progress.label + "…"; if (progress.f >= 1) { clearInterval(tick); bar.classList.add("done"); } }, 150);

  const seatsFor = (k: string) => {
    if (!seats[k]) seats[k] = GW.data.SCENARIOS[k].sides.map((sd, i) => ({ name: sd.label || (NATION[sd.nation]?.n ?? sd.nation), ctl: (i === 0 ? "human" : "normal") as Controller }));
    return seats[k];
  };
  const scenList = h("div", { class: "scenlist", role: "radiogroup", "aria-label": "Scenario" });
  const seatBox = h("div", { class: "seats" });
  const startBtn = h("button", { class: "btn primary big" }, "Start the war");

  const drawScen = () => {
    clear(scenList).append(...ORDER.map(k => { const s = GW.data.SCENARIOS[k];
      return h("button", { class: "scen" + (k === scen ? " on" : ""), role: "radio", "aria-checked": String(k === scen), onclick: () => { scen = k; drawScen(); drawSeats(); } },
        h("b", null, s.name), h("small", null, `${s.players} players · ${s.map === "both" ? "both maps" : s.map === "W" ? "west map" : "east map"} · ${LEN[k]}`), h("span", null, s.blurb)); }));
  };
  const drawSeats = () => {
    const sc = GW.data.SCENARIOS[scen]; const list = seatsFor(scen);
    if (watch) list.forEach(s => { if (s.ctl === "human") s.ctl = "normal"; });
    if (solo) list.forEach(s => { s.ctl = "human"; });
    clear(seatBox).append(...sc.sides.map((sd, i) => {
      const s = list[i]; const homes = sd.home.length ? sd.home.map(c => GW.data.COUNTRIES[c].name).join(", ") : "no countries at the start";
      const name = h("input", { value: s.name, "aria-label": `Name for side ${i + 1}`, id: `seat-name-${i}`, maxlength: 18 }); name.addEventListener("input", () => { s.name = name.value || `Player ${i + 1}`; });
      const sel = h("select", { "aria-label": `Who plays side ${i + 1}`, id: `seat-ctl-${i}`, disabled: solo || watch },
        h("option", { value: "human", selected: s.ctl === "human" }, "A person at this screen"), h("option", { value: "normal", selected: s.ctl === "normal" }, "Bot"), h("option", { value: "easy", selected: s.ctl === "easy" }, "Easy bot (plays at random)"),
        h("option", { value: "phone", disabled: true }, "A person on a phone (later)"));
      sel.addEventListener("change", () => { s.ctl = sel.value as Controller; });
      return h("div", { class: "seat" }, h("span", { class: "seal", style: { background: nationColor(sd.nation) } }, (s.name || "?")[0]),
        h("div", null, name, h("small", null, `${sd.align === "G" ? "Good" : "Evil"} · ${homes}`)), sel);
    }));
  };
  const toggle = (label: string, sub: string, get: () => boolean, set: (v: boolean) => void, id: string) => {
    const box = h("input", { type: "checkbox", id, checked: get() }); box.addEventListener("change", () => { set(box.checked); drawSeats(); });
    return h("label", { class: "tog", for: id }, box, h("span", null, h("b", null, label), h("small", null, sub)));
  };
  const optTog = (k: keyof typeof opts, label: string, sub: string) => toggle(label, sub, () => opts[k], v => { opts[k] = v; }, "opt-" + k);
  const speedSel = h("select", { id: "setup-speed", "aria-label": "Bot speed" }, ...[["0.5", "Slow"], ["1", "Normal"], ["2.5", "Fast"], ["6", "Very fast"]].map(([v, l]) => h("option", { value: v, selected: v === "1" }, l)));
  speedSel.addEventListener("change", () => { speed = +speedSel.value; });
  const seed = h("input", { id: "setup-seed", inputmode: "numeric", placeholder: "random", "aria-label": "Dice seed" });

  startBtn.addEventListener("click", async () => {
    startBtn.setAttribute("disabled", ""); startBtn.textContent = progress.f >= 1 ? "Starting…" : "Finishing the map…";
    await atlasReady; clearInterval(tick);
    const list = seatsFor(scen).map(s => ({ ...s }));
    start({ scen, seats: list, opts: { ...opts }, solo, speed, seed: seed.value ? +seed.value : undefined });
  });

  // saved game
  let saved: SaveFile | null = null; try { const t = localStorage.getItem("gw.autosave"); if (t) saved = JSON.parse(t); } catch { saved = null; }
  const file = h("input", { type: "file", accept: "application/json,.json", id: "loadfile", class: "visually-hidden" });
  file.addEventListener("change", async () => { const f = file.files?.[0]; if (!f) return; try { const sv = JSON.parse(await f.text()) as SaveFile; if (!sv.cfg || !sv.save) throw new Error("bad"); await atlasReady; start(sv.cfg, sv.save); } catch { alertBox.textContent = "That file is not a Greyhawk Wars save."; } });
  const alertBox = h("p", { class: "warn", role: "alert" });
  const continueCard = saved ? h("section", { class: "panel cont" }, h("div", { class: "eyebrow" }, "Saved in this browser"),
    h("h3", null, GW.data.SCENARIOS[saved.cfg.scen]?.name || "A game in progress"), h("p", null, `${saved.cfg.seats.map(s => s.name + (s.ctl !== "human" ? " (bot)" : "")).join(", ")} · ${saved.save.answers.length} decisions made`),
    h("div", { class: "btnrow" }, h("button", { class: "btn primary", onclick: async () => { await atlasReady; start(saved!.cfg, saved!.save); } }, "Continue"), h("button", { class: "btn", onclick: (e: Event) => { try { localStorage.removeItem("gw.autosave"); } catch { } (e.target as HTMLElement).closest(".cont")?.remove(); } }, "Discard"))) : null;

  root.append(bg, h("div", { class: "setup" },
    h("header", { class: "setup-head" }, h("div", null, h("div", { class: "eyebrow" }, "A war for the Flanaess · 2 to 6 players at one table"), h("h1", null, "Greyhawk ", h("em", null, "Wars"))),
      h("div", { class: "btnrow" }, h("button", { class: "btn ghost", onclick: () => rules.open("overview") }, "Read the rules"), h("label", { class: "btn ghost", for: "loadfile" }, "Load a saved file"), file)),
    bar, alertBox, continueCard,
    h("div", { class: "setup-grid" },
      h("section", { class: "panel" }, h("div", { class: "eyebrow" }, "1 · Scenario"), scenList),
      h("section", { class: "panel" }, h("div", { class: "eyebrow" }, "2 · Who plays each side"), seatBox,
        toggle("Solo test mode", "You play every side yourself. No privacy screens, every hand visible. Good for learning and testing.", () => solo, v => { solo = v; if (v) watch = false; syncTogs(); }, "mode-solo"),
        toggle("Watch the bots", "Bots play every side while you watch.", () => watch, v => { watch = v; if (v) solo = false; syncTogs(); }, "mode-watch"),
        h("label", { class: "inline", for: "setup-speed" }, "Bot speed ", speedSel)),
      h("section", { class: "panel" }, h("div", { class: "eyebrow" }, "3 · Optional rules"),
        optTog("favored", "Favored terrain", "Races fight at +1 in their home terrain."), optTog("pursuit", "Cavalry pursuit", "Cavalry strike at armies that retreat."),
        optTog("counterDiplomacy", "Counter-diplomacy", "Heroes in the same capital can help or hinder diplomacy."), optTog("abilities", "Nation abilities", "Each great nation has a special power."),
        h("label", { class: "inline", for: "setup-seed" }, "Dice seed ", seed), h("small", { class: "muted" }, "Same seed and same choices give the same game."))),
    h("div", { class: "setup-foot" }, startBtn)));
  const syncTogs = () => { (document.getElementById("mode-solo") as HTMLInputElement).checked = solo; (document.getElementById("mode-watch") as HTMLInputElement).checked = watch; if (!solo && !watch) { /* keep user choices */ } };
  drawScen(); drawSeats();
}
