/* Card faces for Event, Treasure, Mercenary and Country cards. */
import { GW } from "../engine/engine.js";
import { h } from "./dom";
import { coinURL } from "../render/coins";

const AL: Record<string, string> = { G: "Good", E: "Evil", N: "Neutral" };
export function cardInfo(id: string) {
  const t = GW.cardType(id), c = GW.cardById(id);
  if (t === "event") return { type: t, title: c.title as string, text: c.text as string, tag: c.timing === "I" ? "Plays at once" : "Keep in hand" };
  if (t === "treasure") return { type: t, title: c.item as string, text: c.text as string, tag: `Guardian: ${c.guardian}, strength ${c.str}, wins ${c.won}` };
  const troops = (c.troops as [number, string][]).map(([n, k]) => `${n} ${GW.data.UNITS[k].name}`).join(", ");
  return { type: t, title: troops, text: `${AL[c.align]} mercenaries. Play at the start of a battle round.`, tag: AL[c.align] };
}

export function cardEl(id: string, opts: { small?: boolean; selected?: boolean; onClick?: () => void; action?: HTMLElement | null } = {}) {
  const t = GW.cardType(id), c = GW.cardById(id), info = cardInfo(id);
  const art = h("div", { class: "cart" });
  if (t === "merc") (c.troops as [number, string][]).forEach(([n, k]) => { for (let i = 0; i < n; i++) art.append(h("img", { src: coinURL(k), alt: GW.data.UNITS[k].name, width: 38, height: 38 })); });
  else art.append(h("div", { class: "cglyph " + t }));
  const el = h("div", { class: `gcard ${t}${opts.small ? " small" : ""}${opts.selected ? " sel" : ""}`, role: opts.onClick ? "button" : null, tabindex: opts.onClick ? 0 : null, "aria-pressed": opts.onClick ? String(!!opts.selected) : null },
    h("div", { class: "ck" }, t === "merc" ? "Mercenary" : t === "event" ? "Event" : "Treasure"),
    t === "treasure" ? h("div", { class: "crt" }, h("span", { title: "Guardian strength" }, c.str), h("span", { title: "Cards won" }, c.won)) : null,
    h("div", { class: "ct" }, info.title), art, h("div", { class: "cx" }, info.text),
    h("div", { class: "cf" }, t === "treasure" ? c.guardian : info.tag), opts.action || null);
  if (opts.onClick) { el.addEventListener("click", opts.onClick); el.addEventListener("keydown", e => { if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") { e.preventDefault(); opts.onClick!(); } }); }
  return el;
}

export function countryCard(cid: string, extra?: HTMLElement) {
  const c = GW.data.COUNTRIES[cid]; if (!c) return h("div");
  const mods = c.mods.map(([d, tgt]) => `${d > 0 ? "+" : ""}${d} if you control ${tgt === "@iron" ? "an Iron League land" : tgt === "@ulek" ? "any Ulek" : GW.data.COUNTRIES[tgt]?.name || tgt}`);
  const roster = h("div", { class: "ro" }); c.roster.forEach(([n, k]) => { for (let i = 0; i < n; i++) roster.append(h("img", { src: coinURL(k), alt: GW.data.UNITS[k].name, title: GW.data.UNITS[k].name, width: 40, height: 40 })); });
  return h("article", { class: "ccard al-" + c.align },
    h("div", { class: "rt g", title: "Rating for Good players" }, c.g, h("small", null, "Good")), h("div", { class: "rt e", title: "Rating for Evil players" }, c.e, h("small", null, "Evil")),
    h("h3", null, c.name), h("p", { class: "mod" }, mods.length ? mods.join(". ") : "No diplomacy modifier"), roster, extra || null);
}
