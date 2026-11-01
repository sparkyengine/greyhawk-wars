# Greyhawk Wars: project guide

Browser edition of the 1991 board game for 2 to 6 players at one computer. TypeScript + Vite, no UI framework, no server.

## Commands

- `npm run dev`: dev server.
- `npm run build`: typecheck and build to `dist/`.
- `npm test`: Vitest. Plays every scenario with both bot levels; checks counter conservation, replay and undo, and battle payloads. Run it after any engine or bot change.
- `npm run e2e`: Playwright smoke test through the real UI (`tests/e2e.mjs`).

## Layout

```
src/engine/engine.js    rules engine (one generator); engine.d.ts is the typed contract the UI codes against
src/engine/data.js      units, cards, countries, scenarios (facts from the 1991 game)
src/engine/map.json     traced map: area polygons, adjacency, rivers, spines, ferries, sites
src/ai/bot.ts           bots ("normal" heuristic, "easy" random)
src/render/atlas.ts     paints the watercolor atlas from the area polygons (about 6 s at scale 2)
src/render/coins.ts     struck-coin unit tokens; emblems are vector paths in a 100x100 box
src/render/pieces.ts    banners, ships, castles, site icons, hero medallions
src/ui/game.ts          game controller: routes requests to people or bots, renders all panels
src/ui/mapview.ts       canvas map view: pan/zoom, overlay tokens, highlights, hit-testing
src/ui/battle.ts        battle screen replaying the engine's battle events
src/ui/rulebook.ts      rulebook overlay; content in src/rules/content.ts (paraphrased, with page refs)
src/ui/setup.ts         start screen
tools/atlas-preview.html  paints the atlas alone, for working on the art
docs/mockups/           design mockups (UI, art direction)
```

## Engine rules of the road

- Every decision is a yielded request: `info`, `ask`, `area`, `cards`, `heroes`, `action`, `final`, `over`. Answer with `GW.answer(value)`.
- `who` is a player index, or null for public messages.
- Randomness comes only from the seeded RNG. Never call `Math.random` or read the clock inside the engine. A save is `{scen, names, opts, seed, answers}`; load and undo replay the answers.
- Requests may carry display payloads (`battle`, `diplo`, `search`, `card`). They never enter the answer log, so adding fields is safe.
- The engine logs with classes `head`, `battle`, `good`, `bad`. Don't give UI elements those class names.
- Commands for `action`: `move` (optional `take`, `heroes`, `load`, `unload`), `fortify`, `disband`, `heroMove`, `diplomacy`, `search`, `recruit`, `play`, `assassinate`, `end`. For `final`: `heal`, `add`, `raise`, `furyheal`, `keodemi`, `play`, `endturn`. For `heroes`: `placeHero`, `done`.

## UI notes

- `Game.canAnswer()` decides whether the person at the screen may answer. The privacy curtain appears when a human seat other than the current viewer must decide, unless solo mode is on.
- Bots answer after a delay scaled by the speed setting. Undo steps back past bot answers and info messages to the last human decision.
- The map draws the cached atlas, then a veil over areas outside the scenario, highlights, path preview, forts, armies (coin stack + banner), heroes and labels (shown when zoomed in).
- Disabled actions always say why. Unreachable map clicks open a toast with the reason and a link to the rule.

## Known gaps

Phone hands (optional, later); engine internals still JavaScript; the traced map has approximate borders and some overlapping polygons; the rule simplifications listed in README.md.

Do not commit scans of the original game: the TSR material stays out of the repository.
