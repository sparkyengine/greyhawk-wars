import "./ui/styles.css";
import { paintAtlas } from "./render/atlas";
import { setupScreen } from "./ui/setup";
import { Game } from "./ui/game";
import { GW } from "./engine/engine.js";

const app = document.getElementById("app")!;
const progress = { f: 0, label: "Unrolling the vellum" };

async function fonts() {
  try {
    await Promise.race([
      Promise.all(['20px "IM Fell English SC"', 'italic 20px "IM Fell English"', '800 20px "Alegreya Sans"', '400 20px "Alegreya Sans"'].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  } catch { /* fall back to system fonts */ }
}
const atlasReady: Promise<HTMLCanvasElement> = fonts().then(() => paintAtlas(2, (f, label) => { progress.f = f; progress.label = label; }));

let game: Game | null = null;
function home() {
  game = null;
  setupScreen(app, atlasReady, progress, async (cfg, save) => {
    const atlas = await atlasReady;
    game = new Game(app, atlas, home);
    game.start(cfg, save);
    (window as any).__game = game; (window as any).__gwmap = GW.map; // handles for the browser tests
  });
}
fonts().then(home);
