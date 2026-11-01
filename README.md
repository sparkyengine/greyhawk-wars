# Greyhawk Wars

A digital edition of TSR's *Greyhawk Wars* (1991) for 2 to 6 players at one computer. Everything runs in the browser: the rules engine, the bots and the painted map. There is no server.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). To build a static copy you can open from any web server:

```bash
npm run build
```

The built game is in `dist/`. Fonts load from Google Fonts; without an internet connection the game falls back to system fonts.

## Playing

- **Scenarios:** Furyondy Frontier, Howl From the North, Great Northern War, and the Great War of the Flanaess for 5 or 6 players.
- **Seats:** each side is played by a person at the screen, a bot, or an easy bot.
- **Solo test mode:** you play every side yourself, with no privacy screens and every hand visible.
- **Watch the bots:** bots play every side; set the speed in the top bar.
- **Pass the device:** with two or more people, a privacy screen appears whenever the next decision belongs to someone else.
- **Turn coach:** the right panel shows the current phase and step, what you can do, and why a button is disabled. Clicking an area your army cannot reach explains why and links to the rule.
- **Rulebook:** the whole rulebook rewritten in plain words, with scenario pages and references for every unit, card and country. Open it from the top bar or any "Show the rule" link.
- **Undo** steps back to your last decision. **Save** downloads the game to a file; the start screen loads it again. The game also autosaves in the browser.

## How it is built

- TypeScript with Vite. No UI framework: small DOM helpers and canvas rendering.
- `src/engine/` holds the rules engine: one generator that yields every decision as a request. A save is the scenario, the seed and the list of answers, so loading and undo replay the game exactly. Battle, diplomacy and search requests carry the actual dice so the UI can animate them.
- `src/ai/bot.ts` holds the bots. The normal bot attacks only with good odds, marches on capitals and unclaimed countries, keeps a garrison at home, and sends heroes to do diplomacy, treasure hunting and recruiting. The easy bot moves at random.
- `src/render/` holds the art, all drawn in code: the watercolor atlas painted from the traced area outlines, struck-coin unit tokens for all 25 unit types, banners, ships, castles and site icons.
- `src/ui/` holds the table: map view with pan and zoom, turn coach, battle screen, dialogs, rulebook, setup screen and privacy curtain.

## Tests

```bash
npm test
```

This plays every scenario with both bot levels and checks that no troop counter is lost or duplicated. It also checks that replaying a save reproduces the same game, that undo steps back one answer, and that battle reports match their dice.

```bash
npm run e2e
```

This browser smoke test watches the bots play, then plays several turns through the real UI. It needs Playwright with Chromium installed.

## Known limits

- Phone hands (showing your cards on your own phone) are not built yet. They are planned as an optional extra.
- The map was traced automatically from scans. Area shapes are approximate, a few areas overlap, and some adjacencies may be wrong.
- Some rules are simplified. The game picks which enemy each attacker targets. Players on the same side may always pass through each other. Only one ferry exists. Battle cards are chosen once, before round 1. Only the active player can play cards from their hand.
- The rules engine is JavaScript with a typed TypeScript interface (`engine.d.ts`). Converting its internals to TypeScript is a follow-up.
- Six-player bot games are slow to watch, and painting the map takes a few seconds at start-up.

## Credits

Greyhawk Wars was designed by David "Zeb" Cook and published by TSR in 1991. Greyhawk is a trademark of Wizards of the Coast. This is a fan project for private play. It contains no scanned art; the rules text is rewritten, and every image is drawn by the game's own code.
