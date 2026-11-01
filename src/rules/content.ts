/* The rulebook, rewritten in plain words. Page numbers refer to the 1991 rulebook so players can check the original.
   Each section has an id so the game can link straight to it. */
export interface RuleSection { id: string; group: string; title: string; page: string; summary: string; body: string; tips?: string[] }

export const RULES: RuleSection[] = [
  { id: "overview", group: "Basics", title: "How the game works", page: "p.1", summary: "Two to six players lead the great kingdoms of the Flanaess in a war of Good against Evil. Each turn is one year of the war.",
    body: `<p>Each player commands one or more home countries. You send <b>heroes</b> to win allies, find treasure and hire mercenaries, and march <b>armies</b> to conquer land. The scenario you pick decides how you win.</p>
<p>The map is divided into <b>areas</b>. Land areas hold one kind of terrain. Sea and lake areas hold water. All areas of one nation share a colored border: blue for Good nations, red for Evil, grey for Neutral.</p>
<p>Troop counters come from one shared pool. Lost units go back to the pool, except in scenarios that say losses are permanent.</p>` },
  { id: "pieces", group: "Basics", title: "Cards and pieces", page: "p.1-2", summary: "Country, Event, Mercenary and Treasure cards; troop coins; army and hero markers; fortifications.",
    body: `<ul><li><b>Country cards</b> show two diplomacy ratings (Good on the left, Evil on the right), a diplomacy modifier, and the troops the country raises.</li>
<li><b>Event cards</b> are drawn once per turn. Some take effect at once, others go to your hand.</li>
<li><b>Mercenary cards</b> name troops for hire. Play them at the start of a battle round.</li>
<li><b>Treasure cards</b> name a guardian monster and a magic item. Items help in battle, in diplomacy (as gifts) or during your turn.</li>
<li><b>Troop coins</b> show a unit and its strength. Units with two red gems take two hits: the first hit flips them to their weaker side.</li>
<li><b>Army markers</b> (banners) mark a stack of 1 to 5 troops as one army. <b>Hero markers</b> are bands of adventurers. Heroes are never removed from play.</li>
<li><b>Fortifications</b> protect an area. Built ones can be destroyed; the permanent forts printed at Irongate, Idee and Greyhawk cannot.</li></ul>
<p>You can hold at most 5 cards. Draw past that and you must play or discard down to 5.</p>` },
  { id: "setup", group: "Basics", title: "Set-up", page: "p.2", summary: "Place the troops from each home country's card inside that country, then place your heroes.",
    body: `<p>Each player takes the Country cards the scenario gives them and places the listed troops inside those countries, in stacks of up to 5, each under an army marker or hero. Then each player places their heroes in countries they control. Only one hero and one army of a player may start in each area. The game does this for you.</p>` },
  { id: "turn", group: "The turn", title: "The turn at a glance", page: "p.3", summary: "1 Turn order, 2 Place heroes, 3 Draw events, 4 Action phase (A act, B heal, C add units and raise armies, D place new allies).",
    body: `<ol><li><b>Set turn order.</b> Everyone rolls a d10. Highest goes first; ties reroll. A 0 counts as 10.</li>
<li><b>Place heroes.</b> In turn order, move any heroes to any area not held by another player's army.</li>
<li><b>Draw events.</b> In turn order, each player draws one Event card and follows it.</li>
<li><b>Action phase.</b> Each player in turn order does all of these before the next player starts:
<ol type="A"><li>Activate armies and heroes: move, attack, fortify, disband, diplomacy, search, recruit.</li><li>Heal armies that have not acted.</li><li>Add new troops and raise one new army.</li><li>Place the armies of countries that joined you this turn.</li></ol></li></ol>
<p>Each army or hero acts once per turn and is then flipped to show it has acted. You never have to act.</p>` },
  { id: "order", group: "The turn", title: "Phase 1: turn order", page: "p.3", summary: "Everyone rolls a d10; highest goes first. Ties reroll.", body: `<p>Every player rolls one die. The highest roll goes first, then the next highest. Players who tie roll again among themselves. Some scenarios give one side the first move.</p>` },
  { id: "heroes", group: "The turn", title: "Phase 2: placing heroes", page: "p.3", summary: "Move your heroes anywhere on the map, one per area, avoiding other players' armies.",
    body: `<p>In turn order, each player may move any of their heroes to any area on the map, whatever the distance. A hero cannot leave or enter an area holding another player's army. You may have only one of your heroes in each area.</p>
<p>Good places for heroes: the capital of an unallied country (for diplomacy), a treasure site, a mercenary site, or alongside an army that will attack.</p>` },
  { id: "events", group: "The turn", title: "Phase 3: events", page: "p.3", summary: "Each player draws an Event card; play it now or keep it, as the card says.",
    body: `<p>In turn order, each player draws one Event card. Cards marked as immediate happen at once; the rest go to your hand to be played when they apply. If an event needs counters that are not in the pool, place what you can. Events for areas outside the scenario are discarded and redrawn.</p>` },
  { id: "action", group: "The turn", title: "Phase 4: the action phase", page: "p.3", summary: "Activate your armies and heroes one at a time, then heal, reinforce and raise armies.",
    body: `<p>Each army or hero finishes everything it does, movement and combat included, before you start the next one. When it is done it is flipped to its acted side.</p>
<table><tr><th>Armies can</th><th>Heroes can</th></tr><tr><td>Move<br>Attack<br>Fortify<br>Disband</td><td>Diplomacy<br>Search for treasure<br>Recruit mercenaries<br>Move</td></tr></table>
<p>A hero standing with one of your armies may lead it; the hero then acts too.</p>` },

  { id: "move", group: "Armies", title: "Army movement", page: "p.3-4", summary: "Infantry and monsters move 3 areas, cavalry 4. An army moves at the pace of its slowest unit.",
    body: `<p>Armies move from one area to the next and cannot skip areas.</p>
<ul><li><b>Infantry and monsters</b> move up to 3 areas. <b>Cavalry</b> moves up to 4. <b>Fleets</b> move up to 6.</li>
<li>An army moves only as fast as its slowest unit.</li></ul>` , tips: ["Mixing cavalry with infantry slows the cavalry down to 3."] },
  { id: "terrain", group: "Armies", title: "Terrain and movement", page: "p.3-4", summary: "Forest, hills and desert cost 2. Mountains and swamps end the move. Spines cannot be crossed.",
    body: `<ul><li><b>Forest, hills and desert</b> cost 2 areas of movement. With only 1 left you cannot enter.</li>
<li><b>Mountains and swamps</b> stop the army for the rest of the turn. Next turn it moves normally, though entering another mountain or swamp stops it again.</li>
<li><b>Mountain spines</b> (the dark ridges) cannot be crossed by armies.</li>
<li><b>Sea and lake areas</b> can only be entered by ships. A ship may carry troops across.</li>
<li><b>Island areas</b> count as one land area for armies.</li>
<li><b>Ferries</b> (dotted lines) let land armies cross water without a ship.</li></ul>` },
  { id: "others", group: "Armies", title: "Other players' armies", page: "p.4", summary: "You cannot pass through another army without permission. Entering an enemy army's area is an attack.",
    body: `<p>Armies cannot move through an area containing another player's army unless that player allows it. In this edition, players on the same side always let each other through. Heroes never block movement. No two armies, friendly or not, may end a turn in the same area: if two of your own armies end together, they combine and anything over 5 counters is removed.</p>` },
  { id: "fleet", group: "Armies", title: "Fleets and transport", page: "p.4", summary: "Ships move 6 sea areas. A full-strength ship carries 2 land counters, a damaged one carries 1.",
    body: `<p>Ships never enter land. A fleet is up to 5 ships under one marker. To carry troops, the troops must be unactivated and stand in a port next to the fleet's sea area; loading costs the fleet one move. The fleet can unload into any coastal area, also for one move. Troops left aboard a ship that sinks are lost unless another ship of the fleet can take them.</p>
<p>Ships can only fight ships, except marines, who can attack ships from land.</p>` },
  { id: "split", group: "Armies", title: "Splitting and combining", page: "p.4", summary: "You may drop troops off on the way if you have a spare army marker; your armies that end together combine.",
    body: `<p>While moving, an army may leave troops behind, marked by a free army marker or hero. Those troops stay unacted. Troops dropped into an area with your own army join it, and that army counts as acted. At the end of your actions, your armies in the same area combine; extra counters past 5 are removed.</p>` },

  { id: "combat", group: "Battle", title: "Combat", page: "p.4-5", summary: "Move into an enemy army's area to attack. Lines face off and fight up to 3 rounds (4 with a hero).",
    body: `<p>An army attacks by entering an area held by another player's army. Every enemy unit there defends. Land units can only attack land units (except marines); ships can only attack ships. Each army may attack once per turn, but an army may be attacked any number of times.</p>
<ol><li>Both sides form <b>battle lines</b>: the counters face each other in two rows.</li>
<li>Each side may play cards from hand, attacker first, face down. They are revealed together.</li>
<li>The battle lasts up to <b>3 rounds</b>, or <b>4</b> if a hero is present and wants the extra round.</li>
<li>After each round the attacker may retreat to the area it came from. If the attacker stays, the defender may retreat to an empty or friendly area.</li>
<li>If defenders remain after the last round, the attacker returns to where it came from.</li></ol>` },
  { id: "hits", group: "Battle", title: "Rolling for hits", page: "p.5", summary: "Each unit rolls a d10. A roll equal to or under its strength scores a hit.",
    body: `<p>Normally both sides roll at the same time and hits are applied together. The attacker lines each unit up against an enemy; every enemy unit must be attacked once if possible, and extra attackers can double up. In this edition the game assigns targets in line order.</p>
<p>Roll a d10 for each attacking unit. If the roll is <b>equal to or less than</b> the unit's modified strength, the target is hit. Strength is never lowered below 1.</p>
<p>Units with two gems flip to their weaker side on the first hit and are removed on the second. Units with one gem are removed on the first hit.</p>` },
  { id: "modifiers", group: "Battle", title: "Terrain and other modifiers", page: "p.5", summary: "Rivers and sea landings let the defender strike first. Fortifications give attackers -1.",
    body: `<ul><li><b>Rivers:</b> attacking across a river border, the defender rolls first in round 1 and the attacker removes its losses before rolling.</li>
<li><b>Fortifications:</b> every attacking unit is -1.</li>
<li><b>Ferries and sea landings:</b> the defender rolls first in round 1 and attackers are -1.</li>
<li><b>Favored terrain (optional):</b> some races get +1 at home: elves, bugbears and treants in woods; dwarves in mountains and hills; orcs in mountains and hills; gnomes in hills; halflings in hills and woods; trolls and bullywugs in swamps.</li>
<li><b>Scouts</b> fire before everyone else, and their victims are removed before the rest of the round.</li>
<li>All modifiers add together.</li></ul>` },
  { id: "battleheroes", group: "Battle", title: "Heroes in battle", page: "p.6", summary: "A hero adds one round, +1 to one unit, and is never harmed.",
    body: `<ul><li><b>Longer combat:</b> a hero may lead a fourth round.</li><li><b>Greater strength:</b> the hero stands with one unit and adds +1 to it.</li><li><b>Immune:</b> heroes are never hurt. If all troops die, the hero stays in the area.</li></ul>` },
  { id: "retreat", group: "Battle", title: "Retreat and pursuit", page: "p.6", summary: "Attackers fall back where they came from; defenders may retreat to empty or friendly areas.",
    body: `<p>A retreating attacker returns to the area it attacked from; if another player's army now stands there, the attacker cannot retreat. A defender may retreat to any empty or friendly area except the one the attack came from. An army that must retreat but has nowhere to go is destroyed.</p>
<p><b>Pursuit (optional):</b> cavalry may chase a retreating army. Pursuing and screening cavalry pair off; each extra pursuer gets one free attack on a retreating foot unit.</p>` },
  { id: "fortify", group: "Armies", title: "Fortify", page: "p.6", summary: "Roll a d10 equal to or under your infantry count (plus bonuses) to build a fortification.",
    body: `<p>An unactivated army may try to fortify its area. Count its infantry (up to 5), add 1 if a dwarf, gnome or giant is present and 1 if one of your heroes there helps. Roll a d10: equal to or less builds a fortification. It gives attackers -1 and stays even if the army leaves, until another player takes the area.</p>` },
  { id: "disband", group: "Armies", title: "Disband", page: "p.6", summary: "Return an unactivated army to the pool to free its marker.", body: `<p>Any unactivated army can be disbanded. Its counters return to the pool and its marker is free again.</p>` },

  { id: "diplomacy", group: "Heroes", title: "Diplomacy", page: "p.6-7", summary: "A hero in an unallied capital rolls a d10 at or under the country's rating to win it as an ally.",
    body: `<p>The hero must stand in the capital of a country nobody controls, with no other player's army there. Look up the country's rating for your side (Good or Evil), add its printed modifier, and add +1 for every Treasure card you discard as a gift. Roll a d10: equal to or less and the country allies with you. Its army is placed at the end of your turn.</p>
<p><b>Counter-diplomacy (optional):</b> other players' unactivated heroes in the same capital may declare for (+1) or against (-1) the attempt. They flip when they do.</p>` },
  { id: "search", group: "Heroes", title: "Search for treasure", page: "p.7", summary: "At a treasure site, draw a Treasure card and roll over the guardian's strength to win cards.",
    body: `<p>The hero must stand on a treasure site. Draw the top Treasure card: its top number is the guardian's strength, the bottom number how many cards you win. Roll a d10. If you roll <b>higher</b> than the guardian's strength, draw that many Treasure cards. The guardian's card is discarded either way.</p>` },
  { id: "recruit", group: "Heroes", title: "Recruit mercenaries", page: "p.7", summary: "At a mercenary site, draw a Mercenary card; keep it if it serves your side or is Neutral.",
    body: `<p>The hero must stand on a mercenary site (a military crossroads). Draw a Mercenary card. If it is Neutral or your alignment, it goes to your hand; otherwise it is discarded. Play mercenaries at the start of a battle round. After the battle, trim the army back to 5 counters.</p>` },
  { id: "heromove", group: "Heroes", title: "Hero movement", page: "p.7", summary: "A hero moves up to 6 areas, with normal terrain costs.",
    body: `<p>A hero may move up to 6 areas through friendly or unallied land. Terrain costs apply as for armies. Another player's army may let the hero pass or stop it. A hero standing with another player's army can only move.</p>` },

  { id: "final", group: "End of your turn", title: "Final actions", page: "p.7", summary: "Heal, add units and raise one new army, using only armies that have not acted.",
    body: `<p>After all your armies and heroes have acted, you may still use the ones that did not.</p>` },
  { id: "heal", group: "End of your turn", title: "Healing", page: "p.7", summary: "An unactivated army flips all its damaged units back to full strength.", body: `<p>An army or hero that has not acted this turn can heal every damaged counter under it. The army then counts as acted.</p>` },
  { id: "add", group: "End of your turn", title: "Adding new units", page: "p.7", summary: "An unactivated army in a home or allied country adds one of each unit on the card; in a conquered one, one of the first type.",
    body: `<ul><li>In a <b>home or allied</b> country: add one counter of each type listed on the country's card, up to 5 in the stack.</li><li>In a <b>conquered</b> country: add one counter of the first type listed.</li></ul>
<p>If the pool has none of the units, add one light infantry instead. The army counts as acted.</p>` },
  { id: "raise", group: "End of your turn", title: "Raising new armies", page: "p.7-8", summary: "Once per turn, raise a new army in an empty area of a home or allied country.",
    body: `<p>With a free army marker you may raise one new army in an empty area of a home or allied country: draw one counter of each type on the country's card, up to 5. Not allowed in conquered countries. Ships are built by unactivated fleets beside a home or allied port.</p>` },

  { id: "coop", group: "Countries", title: "Cooperation", page: "p.8", summary: "Allies may pass through each other's armies and trade cards 1 for 1 when heroes meet.",
    body: `<p>A player can let another player's army move through one of their own. Players may trade cards one for one when their heroes share an area. Troops and countries cannot be traded.</p>` },
  { id: "control", group: "Countries", title: "Allies and conquest", page: "p.8", summary: "Countries join by diplomacy or events, or are conquered by holding all their areas at the end of your turn.",
    body: `<p><b>Allied</b> countries sit beside your home card: you raise and add troops there as at home.</p>
<p><b>Occupying:</b> your army in a non-allied area makes it friendly to you while the army stays. An army in a capital blocks diplomacy there.</p>
<p><b>Conquest:</b> if your armies hold every area of a country at the end of your turn, you may take its card as conquered. You may then add units there (first type only) but not raise armies. If your home country is conquered and you have no armies left, you are out.</p>` },
  { id: "liberation", group: "Countries", title: "Liberation", page: "p.8", summary: "Reconquering a country of your alignment from the other side frees it as your ally.",
    body: `<p>When a country conquered by one side is conquered by a player of the country's own alignment, it is liberated: the liberator takes it as an ally, not a conquest.</p>` },
  { id: "abilities", group: "Countries", title: "Home country abilities (optional)", page: "p.8", summary: "Each great nation has one special power it can use once per turn.",
    body: `<ul><li><b>Great Kingdom:</b> draws a Mercenary card at the start of its Action Phase.</li><li><b>Nyrond:</b> its heroes give +2 instead of +1 in battle.</li><li><b>Iuz:</b> searches for treasure for free at the start of its Action Phase.</li><li><b>Furyondy:</b> heals one army in the heal step even if it acted.</li><li><b>Keoland:</b> recruits one demihuman counter (dwarf, elf, gnome or halfling) of its choice when adding units.</li><li><b>Scarlet Brotherhood:</b> once per turn, tries to assassinate a hero: a roll of 6 or less flips it.</li></ul>` },
  { id: "victory", group: "Countries", title: "Victory", page: "p.8", summary: "Each scenario sets its own victory conditions.", body: `<p>The scenario you chose decides when the game ends and who wins. The left panel tracks your progress during play.</p>` },
];

export const SCENARIO_NOTES: Record<string, string> = {
  frontier: "Furyondy and the Shield Lands against Iuz and the Horned Society, west map only. Furyondy may not attack until Iuz has attacked. Losses are permanent. Good wins by holding Dorakaa at the end of a turn; Evil wins by holding Chendl. If light infantry run out, whoever holds more enemy areas wins.",
  howl: "Stonefist and the barbarian kingdoms against a defender who starts with nothing, east map only. When Stonefist invades a country nobody has touched, the defender rolls: on 1-4 the country joins them, otherwise they take its troops in the capital. Barbarian kings may desert. When every country is controlled, most countries wins.",
  northern: "Furyondy, Nyrond and Iuz on both maps. Iuz moves first in turn 1. A Good player with 17 countries, or Iuz with 12, wins at the end of a turn.",
  great5: "The full war for five. The game ends when Good holds 20 countries or Evil holds 30 as a group; the player with the most countries wins.",
  great6: "The full war for six, with Keoland. The game ends when either side holds 30 countries as a group; the player with the most countries wins.",
};
