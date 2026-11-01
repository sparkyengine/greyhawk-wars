/* Typed contract for the rules engine (engine.js). The engine is a single generator:
   every decision is a yielded Request, answered with GW.answer(value). */

export type Align = "G" | "E" | "N";
export type Terrain = "clear" | "forest" | "hills" | "mountains" | "swamp" | "desert" | "water";

export interface Unit { t: string; hp: number; bid?: number }
export interface Army { id: string; owner: number; area: number; units: Unit[]; act: boolean; fleet: boolean; cargo: Unit[]; ice: boolean }
export interface Hero { id: string; owner: number; area: number | null; act: boolean; leader: boolean; offboard: boolean; extra?: number; byCard?: boolean }
export interface Player { i: number; name: string; nation: string; align: Align; color: string; leader: string; heroes: number; markers: number; hand: string[]; out: boolean; label: string | null }
export interface CountryState { owner: number | null; rel: "home" | "allied" | "conquered" | null; touched: boolean }
export interface LogLine { t: number; m: string; c: string }

export interface GameOptions { favored: boolean; pursuit: boolean; counterDiplomacy: boolean; abilities: boolean; permanentLosses?: boolean }

export interface State {
  scen: string; seed: number; turn: number; phase: string; step?: string;
  players: Player[]; countries: Record<string, CountryState>; pool: Record<string, number>;
  armies: Record<string, Army>; heroes: Record<string, Hero>; forts: Record<number, number>;
  decks: Record<string, string[]>; discard: Record<string, string[]>; log: LogLine[]; flags: Record<string, any>;
  opts: GameOptions; inPlay: string[] | null; mapSide: "W" | "E" | "both"; blocked: Record<number, number>;
  order: number[]; over: boolean; winner: number | null; winWhy?: string; cur: number | null;
}

export interface BattleUnit { t: string; hp: number; bid: number }
export interface BattleEvent { side: "att" | "def"; bid: number; t: string; s: number; r: number; hit: boolean; tbid: number; tt: string }
export interface BattleView {
  stage: "cards" | "reveal" | "round" | "ask" | "result";
  area: number; areaName: string; att: number; def: number; attHeroes: number; defHeroes: number;
  river: boolean; landing: boolean; fort: boolean; sea: boolean; terrain: Terrain; origin: number; originName: string;
  maxRounds?: number; heroA?: boolean; heroD?: boolean;
  units: { att: BattleUnit[]; def: BattleUnit[] };
  round?: number; before?: { att: BattleUnit[]; def: BattleUnit[] }; events?: BattleEvent[]; defFirst?: boolean; notes?: string[];
  reveal?: string[]; result?: "attacker" | "defender" | "defretreat" | "attretreat"; resultText?: string;
}
export interface DiploView { country: string; name: string; base: number; mods: string[]; gifts: number; target: number; roll: number; ok: boolean }
export interface SearchView { guardian: string; str: number; roll: number; bonus: number; won: boolean; got: string[] }

interface ReqBase { who: number | null; title: string; text?: string; battle?: BattleView; diplo?: DiploView; search?: SearchView }
export interface InfoReq extends ReqBase { kind: "info" }
export interface AskReq extends ReqBase { kind: "ask"; options: { id: any; label: string }[] }
export interface AreaReq extends ReqBase { kind: "area"; areas: number[]; cancel: boolean }
export interface CardsReq extends ReqBase { kind: "cards"; cards: string[]; exact?: number; min?: number; max?: number }
export interface HeroesReq extends ReqBase { kind: "heroes" }
export interface ActionReq extends ReqBase { kind: "action" }
export interface FinalReq extends ReqBase { kind: "final" }
export interface OverReq extends ReqBase { kind: "over" }
export type Request = InfoReq | AskReq | AreaReq | CardsReq | HeroesReq | ActionReq | FinalReq | OverReq;

export type Command =
  | { c: "move"; id: string; to: number; take?: number[]; heroes?: string[]; load?: { from: number; units: number[] }; unload?: number }
  | { c: "fortify" | "disband"; id: string }
  | { c: "heroMove" | "diplomacy" | "search" | "recruit"; id: string; to?: number }
  | { c: "play"; card: string; by?: number }
  | { c: "assassinate" } | { c: "end" } | { c: "done" }
  | { c: "placeHero"; id: string; to: number }
  | { c: "heal" | "add" | "furyheal"; id: string } | { c: "raise"; area: number } | { c: "keodemi"; id: string; t: string } | { c: "endturn" };

export interface Save { scen: string; names: string[]; opts: GameOptions; seed: number; answers: any[] }
export interface ReachInfo { from: number | null; attack: boolean; left?: number; cost?: number; edge?: string; stop?: boolean }

export interface UnitDef { key: string; name: string; f: number; b: number; n: number; side: Align; move: number; flags: string[]; fav: string[] }
export interface CountryDef { id: string; name: string; align: Align; g: number; e: number; mods: [number, string][]; roster: [number, string][] }
export interface TreasureDef { id: string; guardian: string; str: number; won: number; item: string; fx: string; text: string; when: string }
export interface EventDef { id: string; title: string; key: string; text: string; timing: "I" | "H" }
export interface MercDef { id: string; align: Align; troops: [number, string][] }
export interface ScenarioDef { name: string; players: number; map: "W" | "E" | "both"; heroes: number; sides: { nation: string; home: string[]; align: Align; label?: string; heroes?: number }[]; inPlay: string[] | null; setupOrder: number[] | null; blurb: string }
export interface GameData {
  UNITS: Record<string, UnitDef>; COUNTRIES: Record<string, CountryDef>; GROUPS: Record<string, string[]>;
  TREASURES: TreasureDef[]; EVENTS: EventDef[]; MERCS: MercDef[];
  NATIONS: Record<string, { leader: string; align: Align; color: string }>; SCENARIOS: Record<string, ScenarioDef>;
}
export interface MapData {
  ids: number[]; kind: Record<string, "L" | "W">; terrain: Record<string, Terrain>; country: Record<string, string>;
  adj: [number, number, boolean][]; spine: [number, number][]; ferry: [number, number][];
  poly: Record<string, [number, number][][]>; center: Record<string, [number, number]>; name: Record<string, string>;
  capital: Record<string, number>; port: number[]; magic: number[]; merc: number[]; fort: number[]; sheet: Record<string, "W" | "E">;
  countryName: Record<string, string>; capName: Record<string, string>; loc: Record<string, number[]>;
}

export interface GWApi {
  start(scen: string, names: string[], opts: GameOptions, seed?: number): Request;
  answer(a: any): Request | null;
  load(save: Save): Request | null;
  undo(): Request | null;
  readonly state: State; readonly req: Request | null; readonly save: Save;
  reach(p: number, area: number, mp: number, o?: { hero?: boolean; shepherd?: boolean; rhenee?: boolean }): Record<number, ReachInfo>;
  fleetReach(p: number, area: number): Record<number, ReachInfo>;
  armyMove(x: Army): number; armyAt(a: number): Army | null; heroesAt(a: number): Hero[]; armiesOf(p: number): Army[]; heroesOf(p: number): Hero[];
  freeMarkers(p: number): number; unitStr(u: Unit): number; twoStep(u: Unit): boolean; countryOf(a: number): string | null; areaName(a: number): string;
  controller(a: number): number | null; cardsHeld(p: number): number;
  canDiplomacy(p: number, h: Hero): string | null; diploTarget(p: number, c: string): { base: number; mod: number; notes: string[] };
  canPlaceHero(p: number, h: Hero, to: number): boolean; heroCanAct(h: Hero): boolean;
  fortifyChance(x: Army, p: number): number; addTypes(p: number, x: Army): string[] | null; raiseAreas(p: number): number[];
  inPlayArea(a: number): boolean; isWater(a: number): boolean; terr(a: number): Terrain;
  cardById(id: string): any; cardType(id: string): "event" | "treasure" | "merc"; turnPlayable(p: number, id: string): boolean;
  canAttack(p: number, area: number): boolean; armyStrength(x: Army): number;
  pathTo(rm: Record<number, ReachInfo>, start: number, dest: number): number[];
  data: GameData; map: MapData;
  PORT: Record<number, 1>; MAGIC: Record<number, 1>; MERC: Record<number, 1>; PFORT: Record<number, 1>;
  ADJ: Record<number, number[]>; EDGE: Record<string, "normal" | "river" | "spine" | "ferry">;
  COUNTRY_AREAS: Record<string, number[]>; capitalOf(c: string): number; isCapital(a: number): boolean; cargoCap(f: Army): number;
}

export declare const GW: GWApi;
