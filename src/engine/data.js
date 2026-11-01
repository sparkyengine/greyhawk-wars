/* Greyhawk Wars: units, cards and scenarios. Facts from the 1991 rules and card sheets. */
/* Greyhawk Wars: units, cards and scenarios. Facts from the 1991 rules and card sheets. */

var U = {
 /* key: [name, front, back, count, pool side, move, flags, favored terrain list] */
 LI:["Light Infantry",3,0,45,"N",3,"inf",[]],
 MI:["Medium Infantry",4,3,43,"N",3,"inf",[]],
 HI:["Heavy Infantry",5,4,12,"N",3,"inf",[]],
 LC:["Light Cavalry",2,0,24,"N",4,"cav",[]],
 MC:["Medium Cavalry",3,2,24,"N",4,"cav",[]],
 HC:["Heavy Cavalry",4,3,16,"N",4,"cav",[]],
 Scout:["Scout",3,2,12,"N",3,"scout",[]],
 Marine:["Marine",4,2,12,"N",3,"inf marine",[]],
 Ship:["Ship",4,3,24,"N",6,"ship",[]],
 Giant:["Giant",7,0,4,"N",3,"monster fortify",[]],
 Dragon:["Dragon",8,0,3,"N",3,"monster",[]],
 Elf:["Elf",5,3,12,"G",3,"inf demi",["forest"]],
 ElfCav:["Elf Cavalry",3,0,4,"G",4,"cav demi",["forest"]],
 Dwarf:["Dwarf",5,3,12,"G",3,"inf demi fortify",["mountains","hills"]],
 Gnome:["Gnome",3,0,8,"G",3,"inf demi fortify",["hills"]],
 Halfling:["Halfling",2,0,4,"G",3,"inf demi",["hills","forest"]],
 Treant:["Treant",6,4,2,"G",3,"monster",["forest"]],
 Orc:["Orc",4,2,16,"E",3,"inf",["mountains","hills"]],
 Goblin:["Goblin",2,0,12,"E",3,"inf",[]],
 Hobgoblin:["Hobgoblin",5,3,10,"E",3,"inf",[]],
 Ogre:["Ogre",5,4,5,"E",3,"monster",[]],
 Bugbear:["Bugbear",5,4,2,"E",3,"inf",["forest"]],
 Gnoll:["Gnoll",5,4,2,"E",3,"inf",[]],
 Troll:["Troll",5,5,2,"E",3,"monster",["swamp"]],
 Bullywug:["Bullywug",4,2,2,"E",3,"inf",["swamp"]]
};
var UNITS={};
Object.keys(U).forEach(function(k){var u=U[k];UNITS[k]={key:k,name:u[0],f:u[1],b:u[2],n:u[3],side:u[4],move:u[5],flags:u[6].split(" "),fav:u[7]};});

/* Country cards: id, name, alignment, Good rating, Evil rating, modifiers [[delta, target-id or group]], roster [[n,type]] */
var C=[
 ["furyondy","Kingdom of Furyondy","G",5,3,[[1,"veluna"]],[[1,"MC"],[2,"HC"],[2,"LI"],[1,"MI"],[1,"HI"]]],
 ["nyrond","Kingdom of Nyrond","G",5,3,[],[[2,"MI"],[2,"LI"],[2,"HI"],[2,"MC"],[1,"HC"],[1,"Ship"]]],
 ["keoland","Kingdom of Keoland","G",5,3,[],[[2,"LC"],[1,"HC"],[3,"MI"],[1,"Gnome"],[1,"Ship"]]],
 ["greatkingdom","The Great Kingdom","E",3,5,[],[[5,"MI"],[1,"LI"],[1,"LC"],[2,"MC"],[1,"HC"]]],
 ["iuz","Land of Iuz","E",3,5,[[-1,"furyondy"]],[[3,"Goblin"],[2,"Orc"],[1,"Hobgoblin"],[1,"LI"],[1,"MI"]]],
 ["scarlet","Scarlet Brotherhood","E",3,5,[],[[1,"LI"],[2,"Orc"],[1,"Goblin"],[1,"Hobgoblin"]]],
 ["veluna","Archclericy of Veluna","G",5,3,[[1,"furyondy"]],[[1,"LC"],[1,"MC"],[1,"HC"],[1,"MI"],[1,"Gnome"]]],
 ["celene","Kingdom of Celene","G",5,3,[[1,"@ulek"]],[[1,"Scout"],[2,"Elf"],[1,"ElfCav"]]],
 ["shield","Shield Lands","G",5,3,[[1,"furyondy"]],[[2,"MI"],[2,"HC"]]],
 ["bissel","March of Bissel","G",5,3,[[1,"furyondy"]],[[1,"MC"],[1,"MI"],[1,"LI"],[1,"Scout"]]],
 ["gran","Gran March","G",5,3,[[1,"keoland"]],[[1,"LC"],[3,"MC"],[1,"HC"]]],
 ["sterich","Earldom of Sterich","G",5,3,[[1,"keoland"]],[[2,"LI"],[1,"MI"],[1,"LC"]]],
 ["yeomanry","The Yeomanry","G",5,3,[[-1,"seaprinces"]],[[2,"LI"],[1,"HI"],[1,"Dwarf"],[1,"Elf"]]],
 ["ulekduchy","Duchy of Ulek","G",5,3,[[1,"celene"]],[[1,"Elf"],[1,"ElfCav"]]],
 ["ulekcounty","County of Ulek","G",5,3,[[1,"keoland"]],[[1,"MC"],[1,"HI"],[1,"Gnome"],[1,"Halfling"]]],
 ["tenh","Duchy of Tenh","G",5,3,[],[[1,"MI"],[2,"LI"],[2,"MC"]]],
 ["pale","Theocracy of the Pale","G",5,3,[],[[1,"LC"],[1,"MC"],[2,"MI"]]],
 ["urnstcounty","County of Urnst","G",5,3,[[1,"urnstduchy"]],[[2,"MI"],[1,"MC"]]],
 ["urnstduchy","Duchy of Urnst","G",5,3,[[-1,"nyrond"]],[[2,"LC"],[2,"Scout"],[1,"MC"]]],
 ["almor","Prelacy of Almor","G",5,3,[[1,"nyrond"]],[[1,"LI"],[1,"MI"],[1,"LC"],[1,"MC"]]],
 ["onnwal","Free State of Onnwal","G",5,3,[[1,"@iron"],[-1,"ahlissa"]],[[2,"Marine"],[1,"MI"],[3,"Ship"]]],
 ["idee","County of Idee","G",5,3,[[1,"@iron"],[-1,"greatkingdom"]],[[2,"LI"],[2,"MI"],[1,"Ship"]]],
 ["irongate","Free City of Irongate","G",5,3,[[1,"@iron"],[-1,"ahlissa"]],[[2,"MI"],[1,"Dwarf"],[2,"Ship"]]],
 ["sunndi","County of Sunndi","G",5,3,[[1,"@iron"],[-1,"medegia"]],[[2,"LI"],[1,"Scout"],[1,"Elf"],[1,"Dwarf"]]],
 ["medegia","See of Medegia","E",3,4,[],[[2,"LI"],[1,"MI"],[1,"MC"]]],
 ["seabarons","Sea Barons","E",3,5,[[1,"greatkingdom"],[-1,"isles"]],[[3,"Ship"],[2,"Marine"]]],
 ["northprov","North Province","E",3,5,[],[[1,"MI"],[2,"LI"],[2,"LC"],[1,"MC"],[1,"Orc"]]],
 ["ahlissa","Ahlissa, the South Province","E",3,5,[[-1,"@iron"]],[[3,"LI"],[1,"MI"],[1,"HC"]]],
 ["bonemarch","Bone March","E",3,5,[[-1,"ratik"]],[[2,"Goblin"],[3,"Orc"]]],
 ["horned","Horned Society","E",3,5,[[1,"iuz"]],[[2,"Orc"],[3,"Hobgoblin"],[1,"Goblin"]]],
 ["stonefist","Hold of Stonefist","E",3,5,[],[[4,"LI"],[1,"MI"],[1,"LC"]]],
 ["blackmoor","Blackmoor","E",3,5,[],[[1,"LI"],[1,"MI"]]],
 ["seaprinces","Hold of the Sea Princes","E",3,5,[[-1,"keoland"]],[[1,"Marine"],[1,"LI"],[2,"MI"],[2,"Ship"]]],
 ["ket","Ket","E",3,5,[],[[2,"LC"],[1,"MC"],[1,"LI"],[1,"MI"]]],
 ["tusmit","Tusmit","E",3,5,[],[[3,"LC"],[1,"HC"],[1,"HI"]]],
 ["zeif","Sultanate of Zeif","E",3,5,[],[[3,"LC"],[2,"MC"],[1,"HI"]]],
 ["greyhawk","Free City of Greyhawk","N",4,4,[],[[2,"MI"]]],
 ["ulekprin","Principality of Ulek","N",4,4,[[1,"ulekcounty"]],[[1,"MC"],[2,"Dwarf"],[1,"Gnome"],[1,"Ship"]]],
 ["geoff","Grand Duchy of Geoff","N",4,4,[[1,"keoland"]],[[1,"LI"],[1,"MI"],[1,"MC"],[1,"Elf"]]],
 ["perrenland","Concatenated Cantons of Perrenland","N",4,4,[],[[2,"MI"],[3,"LI"],[1,"Elf"],[1,"MC"]]],
 ["ekbir","Caliphate of Ekbir","N",4,4,[],[[3,"LC"],[1,"HC"],[1,"HI"]]],
 ["ratik","Archbarony of Ratik","N",4,4,[[-1,"bonemarch"],[-1,"greatkingdom"]],[[2,"MI"],[1,"LC"],[1,"Dwarf"],[1,"Gnome"]]],
 ["fruztii","Kingdom of Fruztii","N",4,4,[[-1,"bonemarch"],[1,"ratik"]],[[1,"Marine"],[1,"LI"],[2,"Ship"]]],
 ["schnai","Kingdom of Schnai","N",4,4,[[1,"cruski"],[1,"fruztii"]],[[2,"LI"],[1,"MI"],[3,"Ship"]]],
 ["cruski","Kingdom of Cruski","N",4,4,[[1,"schnai"],[1,"fruztii"],[-1,"seabarons"]],[[3,"LI"],[1,"Marine"],[2,"Ship"]]],
 ["isles","Lordship of the Isles","N",4,4,[[1,"@iron"],[-1,"seabarons"]],[[1,"Marine"],[1,"LI"],[2,"Ship"]]]
];
var COUNTRIES={};
C.forEach(function(c){COUNTRIES[c[0]]={id:c[0],name:c[1],align:c[2],g:c[3],e:c[4],mods:c[5],roster:c[6]};});
var GROUPS={iron:["onnwal","idee","irongate","sunndi","isles"],ulek:["ulekduchy","ulekcounty","ulekprin"]};

/* Treasure cards: guardian, strength, cards won, item, effect key, text, timing */
var T=[
 ["Fiend",8,4,"Spade of Colossal Excavation","fort","Place a fortification marker on one of your armies.","battle-or-turn"],
 ["Lich",8,4,"Rary's Bull's-Eye Bow","autohit","1 automatic hit on an enemy unit in round 1.","battle"],
 ["Red Dragon",8,4,"Potions of Healing","heal1","One of your units regains 1 hit.","anytime"],
 ["Beholder",7,3,"Sword of Kas","plus1","+1 to one of your units for the battle.","battle"],
 ["Fire Giant",7,3,"Ring of Wishes","ringwish","Shut down another player's nation ability for this turn.","anytime"],
 ["Rakshasa",7,3,"Gloves of the Paladin","heal1","Heal 1 hit on one of your units.","anytime"],
 ["Chimera",6,2,"Mighty Servant of Leuk-O","fort","Place a fortification marker on one of your armies.","battle-or-turn"],
 ["Hydra",6,2,"Scroll of Slowness","noretreat","The enemy army cannot retreat early from this battle.","battle"],
 ["Catoblepas",6,2,"Rod of Negation","negate","Cancel 1 Treasure card the enemy plays in this battle.","battle"],
 ["Ogre Mage",6,2,"Rod of Resurrection","unflip","Unflip one of your heroes that a card activated.","anytime"],
 ["Neo-Otyugh",6,2,"Scepter of Might","plus2","+2 to one of your units for the battle.","battle"],
 ["Mind Flayer",6,2,"Invulnerable Coat of Arnd","ignore1","Ignore 1 hit on one of your units.","battle"],
 ["Ghost",6,2,"Crystal of the Ebon Flame","flipenemyhero","Flip 1 enemy hero to its activated side.","anytime"],
 ["Medusa",6,2,"Wand of Fear","minus1","-1 to one enemy unit for the battle.","battle"],
 ["Yuan-Ti",5,2,"Wand of Paralyzation","paralyze","One enemy counter cannot attack in round 1.","battle"],
 ["Werewolf",5,2,"Bowl of Storms","plus2sea","+2 to one of your units in a sea battle.","battle"],
 ["Ettin",5,2,"Rod of Rulership","rulership","Recruit 2 extra units of an allowed type when adding units.","turn"],
 ["Salamander",5,2,"Orb of Dragonkind","dragon","Add 1 dragon to your army in this battle.","battle"],
 ["Wight",5,2,"Iron Flask of Tuerny the Merciless","flask","Add 1 counter of any alignment to your army in this battle.","battle"],
 ["Basilisk",5,2,"Earthquake Scroll","quake","Remove the enemy fortification in this battle.","battle"],
 ["Umber Hulk",5,2,"Dura's Deadly Poison","flipenemyhero","Flip 1 enemy hero to its activated side.","anytime"],
 ["Mad Wizard",5,2,"Recorder of Ye'Lind","twoactions","One of your heroes takes 2 actions this turn.","turn"],
 ["Drow",4,1,"Bigby's Bottled Breath","bigby","Before the battle, a free strength-3 attack on every enemy unit.","battle"],
 ["Giant Snake",4,1,"Hand of Vecna","vecna","Return 1 eliminated counter to one of your armies at full strength.","turn"],
 ["Ogre",3,1,"Edge of Corusk","plus1","+1 to one of your units for the battle.","battle"],
 ["Jackalwere",3,1,"Potion of Treasure-Finding","findtreasure","+2 to one of your heroes' search roll.","search"],
 ["Ghoul",3,1,"Drawmij's Dagger","autohit","1 automatic hit on an enemy unit in round 1.","battle"],
 ["Gargoyle",3,1,"Scroll of Protection from Magic","negate","Cancel 1 Treasure card the enemy plays in this battle.","battle"],
 ["Skeleton",3,1,"Potion of Vitality","twoactions","One of your heroes takes 2 actions this turn.","turn"]
];
var TREASURES=T.map(function(t,i){return {id:"T"+i,guardian:t[0],str:t[1],won:t[2],item:t[3],fx:t[4],text:t[5],when:t[6]};});

/* Events: title, copies, key, text, timing (I=immediate, H=hold) */
var E=[
 ["Ambassador triumphs!",1,"amb_triumph","One non-allied country of your choice joins your side.","I"],
 ["Ambassador blackmails!",1,"amb_black","+3 to one diplomacy roll.","H"],
 ["Ambassador blunders!",2,"amb_blunder","One random ally of a player you name leaves that player. Armies already placed stay.","H"],
 ["Dragon summoned!",2,"dragon","Add 1 dragon to any of your armies.","I"],
 ["Giants offer aid!",2,"giant","Add 1 giant to your army before a battle.","H"],
 ["Marines join force!",1,"marine","Add 1 marine to your army at the start of a battle.","H"],
 ["Marines join!",1,"marine","Add 1 marine to your army at the start of a battle.","H"],
 ["Knights of the Hart arise!",1,"hart","One Good player you choose adds 2 heavy cavalry to his armies.","I"],
 ["Peasant hero rises!",1,"peasanthero","One army fights one battle as though a hero were present.","H"],
 ["Abandoned castle discovered!",1,"castle","Place a fortification marker on one of your armies (before a battle or on your turn).","H"],
 ["Army does double-time!",2,"doubletime","A previously activated army may move again, but cannot attack.","H"],
 ["Shepherd shows pass through mountains!",2,"shepherd","One army crosses a mountain spine once, as if it were clear terrain.","H"],
 ["Rhenee ships give aid!",1,"rhenee","One army may cross lake areas with normal movement this action.","H"],
 ["Wild Coast ships hire on!",1,"wildcoast","Place 2 ships and 1 marine in Woolly Bay under your army marker.","H"],
 ["Assassin strikes!",2,"assassin","Flip any hero to its activated side.","H"],
 ["Enemy hero captured!",1,"captured","An enemy hero in the same area as one of your armies flips to activated.","H"],
 ["Hero falls ill!",1,"ill","Flip any hero to its activated side.","I"],
 ["Troops rebel!",1,"rebel","One of your own army markers flips to its activated side.","I"],
 ["Peasants revolt!",2,"revolt","You cannot add new units this turn. Healing and newly allied armies are unaffected.","I"],
 ["Fiend rampages!",1,"fiend","Choose 1 magic site; no searches there for the rest of the turn.","I"],
 ["Rains flood rivers!",1,"flood","No unit may cross any river for the rest of the turn.","I"],
 ["Sea monster attacks!",1,"seamonster","One ship of your choice is attacked: d10 1-6 is one hit, 7-10 two hits.","I"],
 ["Buccaneers attack!",2,"buccaneers","Free strength-3 attack on any one ship.","I"],
 ["Passage opens to Icy Sea!",1,"passage","Ships can move between the eastmost Solnor Ocean area and the Icy Sea in 1 move until the end of next turn. Releases icebound ships.","I"],
 ["Bullywugs raid!",1,"bullywugs","You must add 1 bullywug to an Evil army of your choice.","I"],
 ["Trolls raid from the Troll Fens!",1,"trolls","You must add 1 troll to an Evil army of your choice.","I"],
 ["Crystalmist giants raid!",1,"cgiants","You must add 1 giant to an Evil army of your choice.","I"],
 ["Bandit Kingdoms raid!",1,"bandits","You must place 1 medium cavalry, 1 medium infantry and 1 ogre in a Bandit Kingdoms area as an Evil army of your choice.","I"],
 ["Grandwood revolts!",1,"grandwood","You must place 1 elf, 1 halfling and 1 treant in the Grandwood as a Good army of your choice.","I"],
 ["Scouts revolt!",1,"scouts","You must place 1 scout in the Lone Heath or Bramblewood Forest as a Good army of your choice.","I"],
 ["Wardogs rebel!",1,"wardogs","You must place 2 medium infantry in the Barrens as a Good army of your choice.","I"]
];
var EVENTS=[];E.forEach(function(e,i){for(var c=0;c<e[1];c++)EVENTS.push({id:"E"+i+"_"+c,title:e[0],key:e[2],text:e[3],timing:e[4]});});

/* Mercenaries: alignment, [[n,type]] */
var MR=[["G",[[1,"Treant"]]],["G",[[1,"Treant"]]],["G",[[1,"Treant"]]],["G",[[1,"Gnome"]]],["G",[[2,"Gnome"]]],["G",[[1,"Elf"]]],["G",[[2,"Elf"]]],["G",[[2,"ElfCav"]]],["G",[[1,"Halfling"]]],["G",[[2,"Halfling"]]],["G",[[1,"Dwarf"]]],["G",[[1,"Dwarf"]]],["G",[[2,"Dwarf"]]],
 ["E",[[2,"Orc"]]],["E",[[3,"Orc"]]],["E",[[2,"Goblin"]]],["E",[[3,"Goblin"]]],["E",[[1,"Hobgoblin"]]],["E",[[1,"Hobgoblin"]]],["E",[[2,"Hobgoblin"]]],["E",[[1,"Gnoll"]]],["E",[[2,"Gnoll"]]],["E",[[1,"Bugbear"]]],["E",[[1,"Bugbear"]]],["E",[[2,"Bugbear"]]],["E",[[1,"Ogre"]]],["E",[[2,"Ogre"]]],
 ["N",[[2,"LI"]]],["N",[[1,"MI"]]],["N",[[2,"MI"]]],["N",[[1,"LC"]]],["N",[[2,"LC"]]],["N",[[3,"LC"]]],["N",[[1,"MC"]]],["N",[[2,"MC"]]],["N",[[2,"MC"]]],["N",[[1,"Scout"]]],["N",[[2,"Scout"]]],["N",[[3,"Scout"]]]];
var MERCS=MR.map(function(m,i){return {id:"M"+i,align:m[0],troops:m[1]};});

/* Nation markers: leader name, shield colors */
var NATIONS={
 furyondy:{leader:"Belvor",align:"G",color:"#2f6fd0"},
 nyrond:{leader:"Archbold",align:"G",color:"#e8e2d0"},
 keoland:{leader:"Skotti",align:"G",color:"#1f9a6a"},
 greatkingdom:{leader:"Ivid",align:"E",color:"#e0b020"},
 iuz:{leader:"Iuz",align:"E",color:"#9b2335"},
 scarlet:{leader:"Father",align:"E",color:"#e0533a"}
};

var SCENARIOS={
 frontier:{name:"Furyondy Frontier",players:2,map:"W",heroes:3,
   sides:[{nation:"furyondy",home:["furyondy","shield"],align:"G"},{nation:"iuz",home:["iuz","horned"],align:"E"}],
   inPlay:["bissel","ekbir","furyondy","horned","iuz","ket","perrenland","shield","tusmit","veluna"],
   setupOrder:[0,1],
   blurb:"Furyondy and the Shield Lands against Iuz and the Horned Society, west map only. Good wins by holding Dorakaa; Evil wins by holding Chendl. Otherwise the game ends when light infantry runs out; most enemy areas held wins."},
 howl:{name:"Howl From the North",players:2,map:"E",heroes:3,
   sides:[{nation:"iuz",home:["stonefist","cruski","fruztii","schnai"],align:"E",label:"Stonefist"},{nation:"nyrond",home:[],align:"G",label:"Defenders"}],
   inPlay:["almor","bonemarch","urnstcounty","cruski","tenh","fruztii","greatkingdom","northprov","nyrond","ratik","schnai","stonefist","pale"],
   setupOrder:[0,1],
   blurb:"Stonefist and the barbarian kingdoms against a Good player with no starting countries, east map only. Invading an untouched country gives it to the Good player on a roll. Most countries when all are controlled wins."},
 northern:{name:"Great Northern War",players:3,map:"both",heroes:3,
   sides:[{nation:"furyondy",home:["furyondy","shield"],align:"G",heroes:3},{nation:"nyrond",home:["nyrond"],align:"G",heroes:3},{nation:"iuz",home:["iuz","horned","stonefist"],align:"E",heroes:5}],
   inPlay:null,setupOrder:[0,1,2],
   blurb:"Furyondy, Nyrond and Iuz on both maps. Either Good player alone with 17 countries, or Iuz with 12, wins at the end of a turn."},
 great5:{name:"Great War of the Flanaess (5 players)",players:5,map:"both",heroes:5,
   sides:[{nation:"furyondy",home:["furyondy","shield"],align:"G"},{nation:"nyrond",home:["nyrond","almor"],align:"G"},{nation:"iuz",home:["iuz","horned","stonefist"],align:"E"},{nation:"greatkingdom",home:["greatkingdom","seabarons"],align:"E"},{nation:"scarlet",home:["scarlet","seaprinces"],align:"E"}],
   inPlay:null,setupOrder:null,
   blurb:"The full war. The Good players as a group need 20 countries, the Evil players 30; then the player with the most countries wins."},
 great6:{name:"Great War of the Flanaess (6 players)",players:6,map:"both",heroes:5,
   sides:[{nation:"furyondy",home:["furyondy","shield"],align:"G"},{nation:"nyrond",home:["nyrond","almor"],align:"G"},{nation:"keoland",home:["keoland"],align:"G"},{nation:"iuz",home:["iuz","horned","stonefist"],align:"E"},{nation:"greatkingdom",home:["greatkingdom","seabarons"],align:"E"},{nation:"scarlet",home:["scarlet","seaprinces"],align:"E"}],
   inPlay:null,setupOrder:null,
   blurb:"The full war with Keoland. Either side as a group needs 30 countries; then the player with the most countries wins."}
};

export const GWDATA={UNITS:UNITS,COUNTRIES:COUNTRIES,GROUPS:GROUPS,TREASURES:TREASURES,EVENTS:EVENTS,MERCS:MERCS,NATIONS:NATIONS,SCENARIOS:SCENARIOS};
