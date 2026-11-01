/* Greyhawk Wars rules engine. The whole game is one generator; every decision is a yielded request.
   Saves are the scenario, seed and the list of answers, so undo and reload replay the game exactly. */
import { GWDATA } from "./data.js";
import MAPDATA from "./map.json";
var D=GWDATA, MAP=MAPDATA;
var UNITS=D.UNITS, CTRY=D.COUNTRIES;

/* ---------- map helpers ---------- */
var ADJ={}, EDGE={};
MAP.ids.forEach(function(i){ADJ[i]=[];});
function link(a,b,type){ if(ADJ[a].indexOf(b)<0){ADJ[a].push(b);ADJ[b].push(a);} EDGE[a+"_"+b]=EDGE[b+"_"+a]=type; }
MAP.adj.forEach(function(e){link(e[0],e[1],e[2]?"river":"normal");});
MAP.spine.forEach(function(e){ if(!EDGE[e[0]+"_"+e[1]]) link(e[0],e[1],"spine");});
MAP.ferry.forEach(function(e){ if(e[0]&&e[1]&&e[0]!==e[1]) { if(!EDGE[e[0]+"_"+e[1]]) link(e[0],e[1],"ferry"); }});
function kind(a){return MAP.kind[a];}
function isWater(a){return MAP.kind[a]==="W";}
function terr(a){return MAP.terrain[a];}
function countryOf(a){return MAP.country[a]||null;}
function areaName(a){return MAP.name[a]||("Area "+a);}
var COUNTRY_AREAS={};
MAP.ids.forEach(function(i){var c=MAP.country[i]; if(c){(COUNTRY_AREAS[c]=COUNTRY_AREAS[c]||[]).push(i);}});
var PORT={},MAGIC={},MERC={},PFORT={};
MAP.port.forEach(function(r){PORT[r]=1;}); MAP.magic.forEach(function(r){MAGIC[r]=1;}); MAP.merc.forEach(function(r){MERC[r]=1;}); MAP.fort.forEach(function(r){PFORT[r]=1;});
function capitalOf(c){return MAP.capital[c];}
function isCapital(a){var c=countryOf(a);return c&&MAP.capital[c]===a;}
var LAKES={}; (MAP.loc.lakes||[]).forEach(function(r){LAKES[r]=1;});

/* ---------- RNG ---------- */
function rngFrom(seed){var a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
var S=null, R=null;
function d10(){return 1+Math.floor(R()*10);}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(R()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* ---------- state ---------- */
function log(msg,cls){S.log.push({t:S.turn,m:msg,c:cls||""}); if(S.log.length>600)S.log.shift();}
function P(i){return S.players[i];}
function pname(i){return S.players[i].name;}
function alignOf(i){return S.players[i].align;}
function enemyOf(i,j){return alignOf(i)!==alignOf(j);}
function unitStr(u){var t=UNITS[u.t];return (u.hp===2||t.b===0)?t.f:t.b;}
function twoStep(u){return UNITS[u.t].b>0;}
function newUnit(t){return {t:t,hp:UNITS[t].b>0?2:1};}
function takeFromPool(t){ if(S.pool[t]>0){S.pool[t]--;return newUnit(t);} return null; }
function returnUnit(u){ if(S.opts.permanentLosses) return; S.pool[u.t]=(S.pool[u.t]||0)+1; }
function armyAt(a){for(var k in S.armies){var x=S.armies[k];if(x.area===a)return x;}return null;}
function armiesOf(p){var r=[];for(var k in S.armies){if(S.armies[k].owner===p)r.push(S.armies[k]);}return r;}
function heroesAt(a){var r=[];for(var k in S.heroes){if(S.heroes[k].area===a)r.push(S.heroes[k]);}return r;}
function heroesOf(p){var r=[];for(var k in S.heroes){if(S.heroes[k].owner===p)r.push(S.heroes[k]);}return r;}
function freeMarkers(p){return S.players[p].markers-armiesOf(p).length;}
function armyStrength(x){return x.units.reduce(function(s,u){return s+unitStr(u);},0)+(x.cargo||[]).reduce(function(s,u){return s+unitStr(u);},0);}
function newArmy(p,area,units,fleet){var id="A"+(S.nextId++);S.armies[id]={id:id,owner:p,area:area,units:units,act:false,fleet:!!fleet,cargo:[],ice:false};return S.armies[id];}
function removeArmy(x,toPool){ if(toPool!==false){x.units.forEach(returnUnit);(x.cargo||[]).forEach(returnUnit);} delete S.armies[x.id]; }
function inPlayArea(a){
  if(S.mapSide!=="both" && MAP.sheet[a]!==S.mapSide) return false;
  var c=countryOf(a); if(c && S.inPlay && S.inPlay.indexOf(c)<0) return false;
  if(S.blocked && S.blocked[a]) return false;
  return true;
}
function countryInPlay(c){return !S.inPlay||S.inPlay.indexOf(c)>=0;}
function cardsHeld(p){var n=0;for(var c in S.countries){if(S.countries[c].owner===p)n++;}return n;}
function relation(p,c){var s=S.countries[c];return s&&s.owner===p?s.rel:null;}
function friendlyCountry(p,c){var r=relation(p,c);return r==="home"||r==="allied";}
function controller(a){var x=armyAt(a); if(x)return x.owner; var c=countryOf(a); if(c){var s=S.countries[c]; if(s&&s.owner!=null&&(s.rel==="home"||s.rel==="allied"))return s.owner;} return null;}
function isLake(a){return !!LAKES[a];}

/* ---------- requests ---------- */
function ask(who,title,text,options,extra){var r={kind:"ask",who:who,title:title,text:text||"",options:options};if(extra)for(var k in extra)r[k]=extra[k];return r;}
function pickArea(who,title,areas,cancel){return {kind:"area",who:who,title:title,areas:areas,cancel:!!cancel};}
function info(who,title,text,extra){var r={kind:"info",who:who,title:title,text:text};if(extra)for(var k in extra)r[k]=extra[k];return r;}

/* ---------- movement ---------- */
function enterCost(a,left,unitKind){
  var t=terr(a);
  if(t==="forest"||t==="hills"||t==="desert") return left>=2?2:null;
  if(t==="mountains"||t==="swamp") return left>=1?left:null; /* ends movement */
  return 1;
}
function armyMove(x){ if(x.fleet)return 6; var m=99; x.units.forEach(function(u){m=Math.min(m,UNITS[u.t].move);}); return m===99?3:m; }
/* reachable areas for a land army or hero. returns {area:{cost,from,attack}} */
function reach(p,start,mp,opts){
  opts=opts||{};
  var best={}; best[start]={left:mp,from:null};
  var q=[start]; var out={};
  while(q.length){
    q.sort(function(a,b){return best[b].left-best[a].left;});
    var a=q.shift(); var left=best[a].left;
    if(left<=0) continue;
    if(a!==start){ var t=terr(a); if((t==="mountains"||t==="swamp")&&!opts.ignoreTerrain){} }
    ADJ[a].forEach(function(b){
      if(!inPlayArea(b)) return;
      var e=EDGE[a+"_"+b];
      if(e==="spine" && !opts.hero && !opts.shepherd) return;
      if(e==="river" && S.flags.flood && !opts.hero) return;
      var water=isWater(b);
      if(water && !(opts.rhenee&&isLake(b))) return;
      if(e!=="ferry" && isWater(a) && !(opts.rhenee&&isLake(a))) return;
      var c=(e==="spine"&&opts.shepherd&&!opts.hero)?1:(water?1:enterCost(b,left));
      if(c==null) return;
      var nl=left-c;
      var ax=armyAt(b);
      if(ax && ax.owner!==p){
        if(opts.hero){ if(!out[b]) out[b]={from:a,attack:false,stop:true,cost:mp-nl}; return; }
        if(!enemyOf(p,ax.owner)) return;
        if(!out[b]||out[b].left<nl) out[b]={from:a,attack:true,left:nl,cost:mp-nl,edge:e};
        return;
      }
      if(water && !(opts.rhenee&&isLake(b))) return;
      if(!best[b]||best[b].left<nl){
        best[b]={left:nl,from:a}; if(!water||opts.rhenee) out[b]={from:a,attack:false,left:nl,cost:mp-nl,edge:e};
        var tb=terr(b); var stops=(tb==="mountains"||tb==="swamp");
        if(!stops && nl>0 && !(ax&&ax.owner===p&&opts.stopOnOwn)) q.push(b);
      }
    });
  }
  delete out[start];
  return out;
}
function fleetReach(p,start){
  var best={}; best[start]=6; var q=[start]; var out={};
  while(q.length){ var a=q.shift(); var left=best[a]; if(left<=0)continue;
    ADJ[a].forEach(function(b){ if(!isWater(b)||!inPlayArea(b))return;
      var ax=armyAt(b);
      if(ax&&ax.owner!==p){ if(enemyOf(p,ax.owner)&&(!out[b]||out[b].left<left-1)) out[b]={attack:true,left:left-1,from:a}; return; }
      if(best[b]==null||best[b]<left-1){best[b]=left-1;out[b]={attack:false,left:left-1,from:a};q.push(b);} });
    if(S.flags.passage){ var ic=MAP.loc.icysea[0], so=MAP.loc.solnoreast[0]; var other=a===ic?so:(a===so?ic:null);
      if(other&&inPlayArea(other)&&(best[other]==null||best[other]<left-1)){best[other]=left-1;out[other]={attack:false,left:left-1,from:a};q.push(other);} }
  }
  delete out[start]; return out;
}
function pathTo(reachMap,start,dest){var path=[dest];var cur=dest;var guard=0;while(cur!==start&&guard++<200){var f=reachMap[cur]?reachMap[cur].from:null;if(f==null)break;path.unshift(f);cur=f;}return path;}

/* ---------- setup ---------- */
function newState(scenKey,names,opts,seed){
  var sc=D.SCENARIOS[scenKey];
  S={v:1,scen:scenKey,seed:seed,turn:1,phase:"setup",players:[],countries:{},pool:{},armies:{},heroes:{},forts:{},nextId:1,
     decks:{},discard:{event:[],treasure:[],merc:[]},log:[],flags:{},opts:opts,inPlay:sc.inPlay?sc.inPlay.slice():null,mapSide:sc.map,
     blocked:{},order:[],over:false,winner:null,cur:null,activated:{},stats:{attacks:{}},cardsPlayed:0};
  R=rngFrom(seed);
  for(var k in UNITS) S.pool[k]=UNITS[k].n;
  for(var c in CTRY) S.countries[c]={owner:null,rel:null,touched:false};
  if(scenKey==="frontier"){ (MAP.loc.lortmil||[]).forEach(function(r){S.blocked[r]=1;}); S.opts.permanentLosses=true; }
  sc.sides.forEach(function(sd,i){
    var nat=D.NATIONS[sd.nation];
    S.players.push({i:i,name:names[i]||sd.label||CTRY[sd.home[0]||sd.nation].name,nation:sd.nation,align:sd.align,color:nat.color,leader:nat.leader,
      heroes:sd.heroes||sc.heroes,markers:10,hand:[],out:false,label:sd.label||null});
    sd.home.forEach(function(c){S.countries[c]={owner:i,rel:"home",touched:true};});
  });
  S.decks.event=shuffle(D.EVENTS.map(function(e){return e.id;}));
  S.decks.treasure=shuffle(D.TREASURES.map(function(e){return e.id;}));
  S.decks.merc=shuffle(D.MERCS.map(function(e){return e.id;}));
  return S;
}
function cardById(id){var t=id.charAt(0);var L=t==="E"?D.EVENTS:t==="T"?D.TREASURES:D.MERCS;for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function cardType(id){return id.charAt(0)==="E"?"event":id.charAt(0)==="T"?"treasure":"merc";}
function draw(deck){ if(!S.decks[deck].length){ if(!S.discard[deck].length) return null; S.decks[deck]=shuffle(S.discard[deck]); S.discard[deck]=[]; log("The "+deck+" deck is reshuffled."); } return S.decks[deck].shift(); }
function discard(id){S.discard[cardType(id)].push(id);}
function rosterUnits(c,firstOnly){var out=[];CTRY[c].roster.forEach(function(r,i){ if(firstOnly&&i>0)return; for(var k=0;k<(firstOnly?1:r[0]);k++)out.push(r[1]);});return out;}
function portSea(area){ var w=ADJ[area].filter(function(b){return isWater(b)&&inPlayArea(b);}); return w; }
/* place a list of unit types into a country as new armies; returns placed count */
function placeCountryArmy(p,c,types,areaPref){
  var land=types.filter(function(t){return t!=="Ship";}), ships=types.filter(function(t){return t==="Ship";});
  var areas=(COUNTRY_AREAS[c]||[]).filter(inPlayArea);
  var order=areas.slice().sort(function(a,b){return (b===capitalOf(c))-(a===capitalOf(c));});
  if(areaPref!=null){order=[areaPref].concat(order.filter(function(a){return a!==areaPref;}));}
  var placed=0;
  while(land.length){
    var spot=null;
    for(var i=0;i<order.length;i++){var ax=armyAt(order[i]); if(!ax){spot=order[i];break;} if(ax.owner===p&&ax.units.length<5&&!ax.fleet){spot=order[i];break;}}
    if(spot==null) break;
    var x=armyAt(spot);
    if(!x){ if(freeMarkers(p)<=0) break; x=newArmy(p,spot,[]); }
    while(land.length&&x.units.length<5){var u=takeFromPool(land.shift()); if(u){x.units.push(u);placed++;}}
  }
  if(ships.length){
    var ports=order.filter(function(a){return PORT[a];}); var sea=null;
    ports.concat(order).some(function(a){var w=portSea(a).filter(function(s){var ax=armyAt(s);return !ax||ax.owner===p;}); if(w.length){sea=w[0];return true;} return false;});
    if(sea!=null){ var f=armyAt(sea); if(!f){ if(freeMarkers(p)>0) f=newArmy(p,sea,[],true); }
      if(f){ ships.forEach(function(t){ if(f.units.length<5){var u=takeFromPool(t); if(u){f.units.push(u);placed++;}} }); if(c==="cruski") f.ice=true; } }
  }
  return placed;
}
function* setupGame(){
  var sc=D.SCENARIOS[S.scen];
  log("Scenario: "+sc.name+".","head");
  var order=sc.setupOrder||shuffle(S.players.map(function(p){return p.i;}));
  for(var oi=0;oi<order.length;oi++){
    var p=order[oi];
    var homes=[];for(var c in S.countries){if(S.countries[c].owner===p)homes.push(c);}
    homes.forEach(function(c){placeCountryArmy(p,c,rosterUnits(c));});
    // heroes: one per controlled area, capitals first
    var areas=[];homes.forEach(function(c){var ar=(COUNTRY_AREAS[c]||[]).filter(inPlayArea);ar.sort(function(a,b){return (b===capitalOf(c))-(a===capitalOf(c));});areas=areas.concat(ar);});
    for(var h=0;h<P(p).heroes;h++){
      var id="H"+p+"_"+h; var area=areas.length?areas[h%areas.length]:null;
      S.heroes[id]={id:id,owner:p,area:area,act:false,leader:h===0,offboard:area==null};
    }
    log(pname(p)+" sets up "+(homes.length?homes.map(function(c){return CTRY[c].name;}).join(", "):"no countries")+".");
  }
  yield info(null,"Set-up complete","Armies are placed in each home country, heroes in home areas. You can reposition heroes in Phase 2.");
}

/* ---------- turn phases ---------- */
function* phaseOrder(){
  S.phase="order";
  var sc=S.scen, ids=S.players.filter(function(p){return !p.out;}).map(function(p){return p.i;});
  var rolls={}, txt=[];
  var first=null;
  if(sc==="howl"&&!S.flags.howlGoodActivated) first=0;
  if(sc==="northern"&&S.turn===1) first=2;
  var rest=ids.filter(function(i){return i!==first;});
  function rollGroup(g){ var r={}; g.forEach(function(i){r[i]=d10();}); var out=g.slice().sort(function(a,b){return r[b]-r[a];});
    var res=[];var i=0; while(i<out.length){var j=i;while(j+1<out.length&&r[out[j+1]]===r[out[i]])j++; var tie=out.slice(i,j+1); if(tie.length>1){res=res.concat(rollGroup(tie));} else res.push(out[i]); i=j+1;}
    g.forEach(function(k){rolls[k]=rolls[k]||[];rolls[k].push(r[k]);}); return res; }
  var ordered=rollGroup(rest);
  if(first!=null) ordered.unshift(first);
  S.order=ordered;
  ordered.forEach(function(i,k){txt.push((k+1)+". "+pname(i)+(rolls[i]?" (rolled "+rolls[i].join(", ")+")":" (initiative)"));});
  log("Turn "+S.turn+" order: "+ordered.map(pname).join(", ")+".","head");
  yield info(null,"Turn "+S.turn+": Phase 1, turn order","Each player rolled a d10; highest goes first, ties reroll, 0 counts as 10.\n"+txt.join("\n"));
}
function* phaseHeroes(){
  S.phase="heroes";
  for(var k=0;k<S.order.length;k++){
    var p=S.order[k]; S.cur=p;
    while(true){
      var cmd=yield {kind:"heroes",who:p,title:"Phase 2: place heroes",text:"Move any of your heroes to any area on the map. A hero cannot leave or enter an area with another player's army. One of your heroes per area."};
      if(!cmd||cmd.c==="done") break;
      if(cmd.c==="placeHero"){ var h=S.heroes[cmd.id]; if(!h||h.owner!==p) continue; if(!canPlaceHero(p,h,cmd.to)) continue; h.area=cmd.to; h.offboard=false; }
    }
  }
}
function canPlaceHero(p,h,to){
  if(!inPlayArea(to)||isWater(to)) return false;
  if(h.area!=null){var ax=armyAt(h.area); if(ax&&ax.owner!==p) return false;}
  var bx=armyAt(to); if(bx&&bx.owner!==p) return false;
  if(heroesAt(to).some(function(o){return o.owner===p&&o.id!==h.id;})) return false;
  return true;
}
function handLimitReq(p){ if(P(p).hand.length<=5) return null; return {kind:"cards",who:p,title:"Hand limit",text:"You hold "+P(p).hand.length+" cards. Choose "+(P(p).hand.length-5)+" to discard.",cards:P(p).hand.slice(),exact:P(p).hand.length-5}; }
function* enforceHand(p){ var r=handLimitReq(p); if(!r)return; var pick=yield r; (pick||[]).forEach(function(id){var i=P(p).hand.indexOf(id);if(i>=0){P(p).hand.splice(i,1);discard(id);}}); while(P(p).hand.length>5){discard(P(p).hand.pop());} }
function eventRelevant(ev){
  var L=MAP.loc;
  var need={wildcoast:L.woollybay,bandits:L.bandit,grandwood:L.grandwood,scouts:(L.loneheath||[]).concat(L.bramblewood||[]),wardogs:L.barrens,trolls:L.trollfens,passage:(L.icysea||[]).concat(L.solnoreast||[])}[ev.key];
  if(!need) return true;
  return need.some(inPlayArea);
}
function* phaseEvents(){
  S.phase="events";
  for(var k=0;k<S.order.length;k++){
    var p=S.order[k]; S.cur=p;
    var id=draw("event"), guard=0;
    if(!id){ log("The event deck is empty: "+pname(p)+" draws nothing."); continue; }
    var ev=cardById(id);
    while(!eventRelevant(ev)&&guard++<10){ discard(id); id=draw("event"); if(!id) break; ev=cardById(id); }
    if(!id){ log("No event applies."); continue; }
    log(pname(p)+" draws event: "+ev.title);
    if(ev.timing==="I"){
      yield info(p,"Phase 3: event for "+pname(p),ev.title+"\n"+ev.text+"\nThis card is played immediately.",{card:id});
      yield* resolveEvent(p,ev,id);
      discard(id);
    } else {
      P(p).hand.push(id);
      yield info(p,"Phase 3: event for "+pname(p),ev.title+"\n"+ev.text+"\nThe card goes to your hand. Play it when it applies.",{card:id});
      yield* enforceHand(p);
    }
  }
}
function ownArmies(p,filter){return armiesOf(p).filter(function(x){return !x.fleet&&(!filter||filter(x));});}
function* chooseArmy(p,title,list,cancel){
  if(!list.length) return null;
  var areas=list.map(function(x){return x.area;});
  var a=yield pickArea(p,title,areas,cancel);
  if(a==null) return null;
  return armyAt(a);
}
function* addUnitToArmy(p,owner,type,title){
  var list=ownArmies(owner);
  if(!list.length){ log("No army to receive the "+UNITS[type].name+"."); return; }
  if(S.pool[type]<=0){ log("No "+UNITS[type].name+" counters left in the pool."); return; }
  var x=yield* chooseArmy(p,title,list,false); if(!x) return;
  var u=takeFromPool(type); if(u){ x.units.push(u); log(UNITS[type].name+" joins "+pname(owner)+"'s army in "+areaName(x.area)+(x.units.length>5?" (over 5: the extra is removed at the end of the turn).":".")); }
}
function playersOf(al){return S.players.filter(function(q){return !q.out&&q.align===al;}).map(function(q){return q.i;});}
function* choosePlayer(p,title,list){ if(!list.length)return null; if(list.length===1)return list[0]; var c=yield ask(p,title,"",list.map(function(i){return {id:i,label:pname(i)};})); return c; }
function* placeEventArmy(p,al,types,areas,title){
  var cands=playersOf(al); if(!cands.length){log("No "+(al==="G"?"Good":"Evil")+" player can take this army.");return;}
  var who=yield* choosePlayer(p,"Which "+(al==="G"?"Good":"Evil")+" player gets this army?",cands);
  var free=areas.filter(function(a){return inPlayArea(a)&&(!armyAt(a)||armyAt(a).owner===who);});
  if(!free.length){log("No free area for the event army.");return;}
  var area=free.length===1?free[0]:yield pickArea(p,title,free,false);
  var x=armyAt(area);
  if(!x){ if(freeMarkers(who)<=0){log(pname(who)+" has no free army marker; the event army is not placed.");return;} x=newArmy(who,area,[]); }
  types.forEach(function(t){var u=takeFromPool(t); if(u)x.units.push(u);});
  log(pname(who)+" gains an army in "+areaName(area)+": "+types.map(function(t){return UNITS[t].name;}).join(", ")+".");
}
function allHeroes(){var r=[];for(var k in S.heroes){if(S.heroes[k].area!=null)r.push(S.heroes[k]);}return r;}
function* flipHero(p,list,title){
  list=list.filter(function(h){return !h.act;});
  if(!list.length){log("No hero can be flipped.");return null;}
  var c=yield ask(p,title,"",list.map(function(h){return {id:h.id,label:pname(h.owner)+" hero in "+areaName(h.area)};}));
  var h=S.heroes[c]; if(h){h.act=true;h.byCard=true;log(pname(h.owner)+"'s hero in "+areaName(h.area)+" is flipped to activated.");} return h;
}
function* shipAttack(p,str,label){
  var ships=[];for(var k in S.armies){var x=S.armies[k];if(x.fleet&&x.units.length)ships.push(x);}
  if(!ships.length){log("There are no ships on the map.");return;}
  var area=yield pickArea(p,label+": choose a fleet",ships.map(function(x){return x.area;}),false);
  var f=armyAt(area); if(!f)return;
  var opts=f.units.map(function(u,i){return {id:i,label:UNITS[u.t].name+" ("+unitStr(u)+")"};});
  var idx=opts.length===1?0:yield ask(p,"Which ship?","",opts);
  var hits=str==="monster"?(d10()<=6?1:2):(d10()<=3?1:0);
  applyHits(f,idx,hits);
  log(label+": "+hits+" hit(s) on "+pname(f.owner)+"'s fleet in "+areaName(f.area)+".");
  cleanupFleet(f);
}
function applyHits(x,idx,n){ var u=x.units[idx]; if(!u)return; while(n-->0&&u.hp>0){ if(u.hp===2)u.hp=1; else u.hp=0; } if(u.hp===0){ x.units.splice(idx,1); returnUnit(u); } }
function cleanupFleet(f){ if(!f.units.length){ (f.cargo||[]).forEach(returnUnit); f.cargo=[]; removeArmy(f,false); log("The fleet sinks."); } else trimCargo(f); }
function cargoCap(f){return f.units.reduce(function(s,u){return s+(u.hp===2||UNITS[u.t].b===0?2:1);},0);}
function trimCargo(f){ while(f.cargo&&f.cargo.length>cargoCap(f)){ returnUnit(f.cargo.pop()); log("Cargo lost with damaged ships."); } }
function* resolveEvent(p,ev,id){
  var k=ev.key;
  if(k==="amb_triumph"){
    var opts=[];for(var c in S.countries){if(S.countries[c].owner==null&&countryInPlay(c)&&(COUNTRY_AREAS[c]||[]).some(inPlayArea))opts.push({id:c,label:CTRY[c].name});}
    if(!opts.length){log("No country is available.");return;}
    var c2=yield ask(p,"Ambassador triumphs: choose a country","It joins your side as an ally.",opts);
    yield* allyCountry(p,c2,"by event");
  } else if(k==="dragon"){ yield* addUnitToArmy(p,p,"Dragon","Dragon summoned: choose one of your armies");
  } else if(k==="hart"){ var who=yield* choosePlayer(p,"Knights of the Hart: which Good player?",playersOf("G")); if(who!=null){ for(var i=0;i<2;i++) yield* addUnitToArmy(who,who,"HC","Knights of the Hart: choose an army for heavy cavalry "+(i+1)); }
  } else if(k==="ill"){ yield* flipHero(p,allHeroes(),"Hero falls ill: choose a hero");
  } else if(k==="rebel"){ var l=armiesOf(p).filter(function(x){return !x.act;}); if(l.length){ var x=yield* chooseArmy(p,"Troops rebel: one of your armies is activated",l,false); if(x){x.act=true;log(pname(p)+"'s army in "+areaName(x.area)+" is activated by rebellion.");} }
  } else if(k==="revolt"){ S.flags["revolt"+p]=true; log(pname(p)+" cannot add new units this turn.");
  } else if(k==="fiend"){ var ms=MAP.magic.filter(inPlayArea); if(ms.length){ var a=yield pickArea(p,"Fiend rampages: choose a magic site",ms,false); S.flags.fiend=S.flags.fiend||{}; S.flags.fiend[a]=1; log("No searches in "+areaName(a)+" this turn."); }
  } else if(k==="flood"){ S.flags.flood=true; log("Rivers flood: no unit may cross a river this turn.");
  } else if(k==="seamonster"){ yield* shipAttack(p,"monster","Sea monster");
  } else if(k==="buccaneers"){ yield* shipAttack(p,"buc","Buccaneers");
  } else if(k==="passage"){ S.flags.passage=S.turn+1; for(var q in S.armies){S.armies[q].ice=false;} log("The passage to the Icy Sea opens until the end of next turn; icebound ships are released.");
  } else if(k==="bullywugs"){ var w=yield* choosePlayer(p,"Bullywugs raid: which Evil player?",playersOf("E")); if(w!=null) yield* addUnitToArmy(p,w,"Bullywug","Bullywugs raid: choose an Evil army");
  } else if(k==="trolls"){ var w2=yield* choosePlayer(p,"Trolls raid: which Evil player?",playersOf("E")); if(w2!=null) yield* addUnitToArmy(p,w2,"Troll","Trolls raid: choose an Evil army");
  } else if(k==="cgiants"){ var w3=yield* choosePlayer(p,"Crystalmist giants: which Evil player?",playersOf("E")); if(w3!=null) yield* addUnitToArmy(p,w3,"Giant","Crystalmist giants: choose an Evil army");
  } else if(k==="bandits"){ yield* placeEventArmy(p,"E",["MC","MI","Ogre"],MAP.loc.bandit,"Bandit Kingdoms raid: choose the area");
  } else if(k==="grandwood"){ yield* placeEventArmy(p,"G",["Elf","Halfling","Treant"],MAP.loc.grandwood,"Grandwood revolts: choose the area");
  } else if(k==="scouts"){ yield* placeEventArmy(p,"G",["Scout"],MAP.loc.loneheath.concat(MAP.loc.bramblewood),"Scouts revolt: choose the area");
  } else if(k==="wardogs"){ yield* placeEventArmy(p,"G",["MI","MI"],MAP.loc.barrens,"Wardogs rebel: choose the area");
  }
}
/* hold-cards used during your own turn */
function* playTurnCard(p,id,arg){
  var c=cardById(id); var key=c.key||c.fx; var ok=true;
  if(key==="castle"||key==="fort"){
    var l=ownArmies(p,function(x){return !S.forts[x.area]&&!PFORT[x.area];});
    var x=yield* chooseArmy(p,c.title||c.item,l,true); if(!x)return false; S.forts[x.area]=p; log(pname(p)+" places a fortification in "+areaName(x.area)+".");
  } else if(key==="assassin"){ var h=yield* flipHero(p,allHeroes(),"Assassin strikes: choose a hero"); if(!h)return false;
  } else if(key==="captured"){ var mine={};armiesOf(p).forEach(function(x){mine[x.area]=1;}); var hs=allHeroes().filter(function(h){return h.owner!==p&&enemyOf(p,h.owner)&&mine[h.area];}); if(!hs.length){return false;} yield* flipHero(p,hs,"Enemy hero captured");
  } else if(key==="flipenemyhero"){ var hs2=allHeroes().filter(function(h){return h.owner!==p;}); if(!hs2.length) return false; var h2=yield* flipHero(p,hs2,c.item); if(!h2)return false;
  } else if(key==="unflip"){ var hs3=heroesOf(p).filter(function(h){return h.act&&h.byCard;}); if(!hs3.length)return false; var ch=yield ask(p,"Rod of Resurrection","",hs3.map(function(h){return {id:h.id,label:"Hero in "+areaName(h.area)};})); S.heroes[ch].act=false; S.heroes[ch].byCard=false; log(pname(p)+" unflips a hero.");
  } else if(key==="ringwish"){ var o=S.players.filter(function(q){return q.i!==p&&!q.out;}); var w=yield* choosePlayer(p,"Ring of Wishes: whose nation ability?",o.map(function(q){return q.i;})); S.flags["noAbility"+w]=true; log(pname(w)+"'s nation ability is shut down this turn.");
  } else if(key==="heal1"){ var dam=armiesOf(p).filter(function(x){return x.units.some(function(u){return u.hp===1&&twoStep(u);});}); if(!dam.length)return false; var x2=yield* chooseArmy(p,c.item+": choose an army",dam,true); if(!x2)return false; var u=x2.units.filter(function(u){return u.hp===1&&twoStep(u);})[0]; u.hp=2; log(pname(p)+" heals a "+UNITS[u.t].name+".");
  } else if(key==="twoactions"){ var hs4=heroesOf(p).filter(function(h){return h.area!=null;}); var ch2=yield ask(p,c.item+": which hero?","That hero may take a second action this turn.",hs4.map(function(h){return {id:h.id,label:"Hero in "+areaName(h.area)+(h.act?" (activated)":"")};})); S.heroes[ch2].extra=(S.heroes[ch2].extra||0)+1; if(S.heroes[ch2].act){S.heroes[ch2].act=false;S.heroes[ch2].extra--;} log(pname(p)+"'s hero gains an extra action.");
  } else if(key==="vecna"){ var l2=ownArmies(p,function(x){return x.units.length<5;}); var x3=yield* chooseArmy(p,"Hand of Vecna: choose an army",l2,true); if(!x3)return false; var types=Object.keys(S.pool).filter(function(t){return S.pool[t]>0&&t!=="Ship";}); var t=yield ask(p,"Hand of Vecna: which counter returns?","",types.map(function(t){return {id:t,label:UNITS[t].name};})); x3.units.push(takeFromPool(t)); log(pname(p)+" returns a "+UNITS[t].name+" to play.");
  } else if(key==="doubletime"){ S.flags.doubletime=p; log(pname(p)+": one activated army may move again (no attack).");
  } else if(key==="shepherd"){ S.flags.shepherd=p; log(pname(p)+": the next army moved may cross a mountain spine once.");
  } else if(key==="rhenee"){ S.flags.rhenee=p; log(pname(p)+": the next army moved may cross lakes.");
  } else if(key==="wildcoast"){ var wb=MAP.loc.woollybay[0]; var ex=armyAt(wb); if(ex&&ex.owner!==p){log("Woolly Bay is occupied.");return false;} if(!ex){ if(freeMarkers(p)<=0){log("No free army marker.");return false;} ex=newArmy(p,wb,[],true);} ["Ship","Ship"].forEach(function(t){var u=takeFromPool(t);if(u&&ex.units.length<5)ex.units.push(u);}); var m=takeFromPool("Marine"); if(m)ex.cargo.push(m); log(pname(p)+" gains ships and a marine in Woolly Bay.");
  } else if(key==="amb_blunder"){ var o2=S.players.filter(function(q){return q.i!==p&&!q.out;}).map(function(q){return q.i;}); var w2=yield* choosePlayer(p,"Ambassador blunders: which player?",o2); var al=[];for(var cc in S.countries){if(S.countries[cc].owner===w2&&S.countries[cc].rel==="allied")al.push(cc);} if(!al.length){log(pname(w2)+" has no allies.");} else {var lost=al[Math.floor(R()*al.length)]; S.countries[lost]={owner:null,rel:null,touched:true}; log(CTRY[lost].name+" leaves "+pname(w2)+"'s alliance.");}
  } else if(key==="amb_black"){ S.flags.blackmail=p; log(pname(p)+" will add +3 to the next diplomacy roll.");
  } else if(key==="rulership"){ S.flags.rulership=p; log(pname(p)+": the next Add Units step gains 2 extra units.");
  } else if(key==="findtreasure"){ S.flags.findtreasure=p; log(pname(p)+": +2 to the next treasure search.");
  } else ok=false;
  if(ok){ var i=P(p).hand.indexOf(id); if(i>=0)P(p).hand.splice(i,1); discard(id); S.cardsPlayed++; }
  return ok;
}
function turnPlayable(p,id){
  var c=cardById(id); var k=c.key||c.fx;
  return ["castle","fort","assassin","captured","flipenemyhero","unflip","ringwish","heal1","twoactions","vecna","doubletime","shepherd","rhenee","wildcoast","amb_blunder","amb_black","rulership","findtreasure"].indexOf(k)>=0;
}

/* ---------- diplomacy ---------- */
function modApplies(p,target){
  if(target.charAt(0)==="@"){ var g=D.GROUPS[target.slice(1)]; return g.some(function(c){return friendlyCountry(p,c);}); }
  return friendlyCountry(p,target);
}
function diploTarget(p,c){
  var card=CTRY[c]; var base=alignOf(p)==="G"?card.g:card.e; var mod=0, notes=[];
  card.mods.forEach(function(m){ if(modApplies(p,m[1])){mod+=m[0];notes.push((m[0]>0?"+":"")+m[0]+" "+(m[1].charAt(0)==="@"?(m[1]==="@iron"?"Iron League":"any Ulek"):CTRY[m[1]].name));} });
  return {base:base,mod:mod,notes:notes};
}
function canDiplomacy(p,h){
  var a=h.area; var c=countryOf(a); if(!c||!isCapital(a)) return null;
  if(S.countries[c].owner!=null) return null;
  if(!countryInPlay(c)) return null;
  var ax=armyAt(a); if(ax&&ax.owner!==p) return null;
  if(S.scen==="howl"){
    if(p===0&&!S.flags.howlInvaded) return null;
    if(p===1){ var adjOK=(COUNTRY_AREAS[c]||[]).some(function(r){return ADJ[r].some(function(b){var cb=countryOf(b);return cb&&S.countries[cb].owner===0;});}); if(!adjOK) return null; }
  }
  return c;
}
function* doDiplomacy(p,h){
  var c=canDiplomacy(p,h); if(!c) return;
  var dt=diploTarget(p,c); var target=dt.base+dt.mod;
  var gifts=P(p).hand.filter(function(id){return cardType(id)==="treasure";});
  var giftPick=[];
  if(gifts.length){ giftPick=yield {kind:"cards",who:p,title:"Diplomacy with "+CTRY[c].name,text:"Target "+target+" ("+dt.base+" base"+(dt.notes.length?", "+dt.notes.join(", "):"")+"). Discard Treasure cards as gifts for +1 each, or choose none.",cards:gifts,min:0,max:gifts.length}; giftPick=giftPick||[]; }
  giftPick.forEach(function(id){var i=P(p).hand.indexOf(id);P(p).hand.splice(i,1);discard(id);});
  target+=giftPick.length;
  if(S.flags.blackmail===p){ var useB=yield ask(p,"Ambassador blackmails","Use your +3 on this roll?",[{id:1,label:"Use it (+3)"},{id:0,label:"Keep it for later"}]); if(useB){target+=3;S.flags.blackmail=null;} }
  if(S.opts.counterDiplomacy){
    var others=heroesAt(h.area).filter(function(o){return o.owner!==p&&!o.act;});
    for(var i=0;i<others.length;i++){ var o=others[i];
      var ch=yield ask(o.owner,"Counter-diplomacy at "+areaName(h.area),pname(p)+" is attempting diplomacy with "+CTRY[c].name+". Your unactivated hero may declare (and becomes activated).",[{id:0,label:"Stay out"},{id:1,label:"Support (+1)"},{id:-1,label:"Oppose (-1)"}]);
      if(ch){ target+=ch; o.act=true; log(pname(o.owner)+"'s hero "+(ch>0?"supports":"opposes")+" the attempt."); }
    }
  }
  var roll=d10();
  log(pname(p)+" attempts diplomacy with "+CTRY[c].name+": needs "+target+" or less, rolls "+roll+".");
  var dview={diplo:{country:c,name:CTRY[c].name,base:dt.base,mods:dt.notes,gifts:giftPick.length,target:target,roll:roll,ok:roll<=target}};
  if(roll<=target){ yield* allyCountry(p,c,"by diplomacy"); yield info(null,"Diplomacy succeeds",CTRY[c].name+" joins "+pname(p)+". Rolled "+roll+" against "+target+".",dview); }
  else yield info(null,"Diplomacy fails",pname(p)+" fails to win over "+CTRY[c].name+". Rolled "+roll+" against "+target+".",dview);
}
function* allyCountry(p,c,how){
  S.countries[c]={owner:p,rel:"allied",touched:true};
  log(CTRY[c].name+" allies with "+pname(p)+" "+how+".","good");
  S.pendingAllies=S.pendingAllies||[]; S.pendingAllies.push({p:p,c:c});
  if(S.scen==="howl"&&p===1) S.flags.howlGoodActivated=true;
}
function* placeNewAllies(p){
  var list=(S.pendingAllies||[]).filter(function(x){return x.p===p;});
  S.pendingAllies=(S.pendingAllies||[]).filter(function(x){return x.p!==p;});
  for(var i=0;i<list.length;i++){
    var c=list[i].c; var free=(COUNTRY_AREAS[c]||[]).filter(function(a){return inPlayArea(a)&&!armyAt(a);});
    if(!free.length){log("No free area in "+CTRY[c].name+" for its army.");continue;}
    var area=free.length===1?free[0]:yield pickArea(p,"Place the army of "+CTRY[c].name,free,false);
    var n=placeCountryArmy(p,c,rosterUnits(c),area);
    log(CTRY[c].name+"'s army ("+n+" counters) is placed for "+pname(p)+".");
  }
}

/* ---------- search & recruit ---------- */
function* doSearch(p,h,free){
  var id=draw("treasure"); if(!id){ log("The treasure deck is empty: every treasure is in someone's hand."); yield info(p,"No treasure left","Every Treasure card is already in a player's hand. Nothing can be found until some are played or discarded."); return; }
  var t=cardById(id), roll=d10(), bonus=0;
  if(S.flags.findtreasure===p){bonus=2;S.flags.findtreasure=null;}
  var win=roll+bonus>t.str;
  log(pname(p)+(free?" (nation ability)":"")+" searches: "+t.guardian+" (strength "+t.str+"), rolls "+roll+(bonus?"+2":"")+(win?": victory.":": the guardian holds its hoard."));
  discard(id);
  var got=[];
  if(win){ for(var i=0;i<t.won;i++){var n=draw("treasure"); if(!n) break; P(p).hand.push(n); got.push(cardById(n).item);} }
  yield info(p,win?"Treasure found":"Search fails",t.guardian+" guards the hoard (strength "+t.str+"). You rolled "+roll+(bonus?" +2":"")+"."+(win?"\nYou draw: "+got.join(", ")+".":""),{search:{guardian:t.guardian,str:t.str,roll:roll,bonus:bonus,won:win,got:got}});
  yield* enforceHand(p);
}
function* doRecruit(p,h,free){
  var id=draw("merc"); if(!id){ log("The mercenary deck is empty."); yield info(p,"No mercenaries left","Every Mercenary card is already in a player's hand."); return; }
  var m=cardById(id), keep=m.align==="N"||m.align===alignOf(p);
  var desc=m.troops.map(function(t){return t[0]+" "+UNITS[t[1]].name;}).join(", ");
  log(pname(p)+(free?" (nation ability)":"")+" draws a mercenary card: "+desc+" ("+({G:"Good",E:"Evil",N:"Neutral"})[m.align]+")"+(keep?", kept.":", discarded."));
  if(keep) P(p).hand.push(id); else discard(id);
  yield info(p,keep?"Mercenaries hired":"Mercenaries refuse",desc+" ("+({G:"Good",E:"Evil",N:"Neutral"})[m.align]+")."+(keep?" Play the card at the start of a battle round.":""));
  yield* enforceHand(p);
}

/* ---------- combat ---------- */
function bestIdx(units,fn){var b=-1,bv=-1e9;units.forEach(function(u,i){var v=fn(u);if(v>bv){bv=v;b=i;}});return b;}
function battleCards(p,side){ return P(p).hand.filter(function(id){var c=cardById(id); var k=c.key||c.fx; if(cardType(id)==="merc")return true; if(cardType(id)==="treasure") return ["fort","autohit","plus1","plus2","noretreat","negate","ignore1","minus1","paralyze","plus2sea","dragon","flask","quake","bigby","heal1"].indexOf(k)>=0&&!(k==="fort"&&side==="att"); return ["giant","marine","peasanthero","castle"].indexOf(k)>=0&&!(k==="castle"&&side==="att");}); }
function* battle(att,defArmy,area,ctx){
  /* att: {p, units(array, live refs), heroes:[ids], origin, edge, sea:boolean, landing:boolean}; defArmy: army at area */
  var A={p:att.p,units:att.units,heroes:att.heroes||[],mods:{},side:"att"}, Dd={p:defArmy.owner,units:defArmy.units,heroes:heroesAt(area).filter(function(h){return h.owner===defArmy.owner;}).map(function(h){return h.id;}),mods:{},side:"def"};
  var seaBattle=isWater(area);
  var hasFort=!!(S.forts[area]&&S.forts[area]===Dd.p)||!!PFORT[area];
  var river=att.edge==="river", landing=!!att.landing||att.edge==="ferry";
  var lines=["Battle in "+areaName(area)+": "+pname(A.p)+" attacks "+pname(Dd.p)+"."];
  if(hasFort) lines.push("Defender is fortified: attackers -1.");
  if(river) lines.push("Attack across a river: defender fires first in round 1.");
  if(landing) lines.push("Sea landing or ferry: attackers -1 and defender fires first in round 1.");
  log(lines[0],"battle");
  S.stats.attacks[A.p]=(S.stats.attacks[A.p]||0)+1;
  var BID=0; A.units.concat(Dd.units).forEach(function(u){u.bid=++BID;});
  function snap(){ return {att:A.units.map(function(u){return {t:u.t,hp:u.hp,bid:u.bid};}),def:Dd.units.map(function(u){return {t:u.t,hp:u.hp,bid:u.bid};})}; }
  var BV={area:area,areaName:areaName(area),att:A.p,def:Dd.p,attHeroes:A.heroes.length,defHeroes:Dd.heroes.length,river:river,landing:landing,fort:hasFort,sea:seaBattle,terrain:terr(area),origin:att.origin,originName:areaName(att.origin)};
  function bview(stage,extra){ var o={}; for(var k in BV)o[k]=BV[k]; o.stage=stage; o.units=snap(); if(extra)for(var k2 in extra)o[k2]=extra[k2]; return {battle:o}; }
  /* cards */
  var played={att:[],def:[]};
  for(var sIdx=0;sIdx<2;sIdx++){
    var side=sIdx===0?A:Dd, key=sIdx===0?"att":"def";
    var avail=battleCards(side.p,key);
    if(avail.length){
      var creq={kind:"cards",who:side.p,title:(sIdx===0?"Attacker":"Defender")+": play battle cards?",text:lines.join("\n")+"\nChoose cards to play face down (Mercenary, Treasure and battle Event cards). They are revealed together.",cards:avail,min:0,max:avail.length}; var bv=bview("cards"); creq.battle=bv.battle;
      var pick=yield creq;
      (pick||[]).forEach(function(id){var i=P(side.p).hand.indexOf(id);if(i>=0){P(side.p).hand.splice(i,1);played[key].push(id);}});
    }
  }
  /* negation */
  ["att","def"].forEach(function(k){ var other=k==="att"?"def":"att";
    played[k].filter(function(id){var c=cardById(id);return c.fx==="negate";}).forEach(function(nid){
      var victim=played[other].filter(function(id){return cardType(id)==="treasure"&&cardById(id).fx!=="negate";})[0];
      if(victim){ played[other].splice(played[other].indexOf(victim),1); discard(victim); log(cardById(nid).item+" cancels "+cardById(victim).item+"."); }
    });
  });
  var reveal=[];
  var sides={att:A,def:Dd};
  var extraAdded={att:[],def:[]};
  ["att","def"].forEach(function(k){ var sd=sides[k];
    played[k].forEach(function(id){ var c=cardById(id); var ty=cardType(id);
      if(ty==="merc"){ c.troops.forEach(function(tr){for(var i=0;i<tr[0];i++){var u=takeFromPool(tr[1]); if(u){sd.units.push(u);extraAdded[k].push(u);}}}); reveal.push(pname(sd.p)+": mercenaries ("+c.troops.map(function(t){return t[0]+" "+UNITS[t[1]].name;}).join(", ")+")"); }
      else { var fx=c.fx||c.key; reveal.push(pname(sd.p)+": "+(c.item||c.title));
        if(fx==="dragon"||fx==="giant"){var u=takeFromPool(fx==="dragon"?"Dragon":"Giant"); if(u)sd.units.push(u);}
        else if(fx==="marine"){var u2=takeFromPool("Marine"); if(u2)sd.units.push(u2);}
        else if(fx==="flask"){var best=["Dragon","Giant","Treant","Troll","HI","Hobgoblin","Ogre","Elf","Dwarf","MI","HC"].filter(function(t){return S.pool[t]>0;})[0]; if(best){sd.units.push(takeFromPool(best)); reveal[reveal.length-1]+=" adds a "+UNITS[best].name;}}
        else if(fx==="fort"||fx==="castle"){ if(k==="def"){ S.forts[area]=sd.p; hasFort=true; } }
        else if(fx==="quake"){ if(k==="att"&&S.forts[area]&&!PFORT[area]){ delete S.forts[area]; hasFort=false; reveal[reveal.length-1]+=" (fortification destroyed)"; } }
        else sd.mods[fx]=(sd.mods[fx]||0)+1;
      }
      discard(id);
    });
  });
  if(A.mods.peasanthero) A.heroBonus=true; if(Dd.mods.peasanthero) Dd.heroBonus=true;
  var heroA=A.heroes.length>0||A.heroBonus, heroD=Dd.heroes.length>0||Dd.heroBonus;
  var maxRounds=3+((heroA||heroD)?1:0); BV.maxRounds=maxRounds; BV.heroA=!!heroA; BV.heroD=!!heroD;
  /* bigby */
  ["att","def"].forEach(function(k){ var sd=sides[k], en=sides[k==="att"?"def":"att"]; for(var n=0;n<(sd.mods.bigby||0);n++){ var hits=0; en.units.forEach(function(u){ if(d10()<=3){ u.hp--; hits++; } }); for(var i=en.units.length-1;i>=0;i--){ if(en.units[i].hp<=0||(!twoStep(en.units[i])&&en.units[i].hp<2&&false)){} } purgeDead(en.units); reveal.push("Bigby's Bottled Breath scores "+hits+" hit(s)."); } });
  A.units.concat(Dd.units).forEach(function(u){if(!u.bid)u.bid=++BID;});
  BV.fort=hasFort;
  if(reveal.length) yield info(null,"Battle cards revealed",reveal.join("\n"),bview("reveal",{reveal:reveal}));
  /* unit bonuses */
  function bonusFor(sd){ var b=new Map(); var hb=(sd.heroes.length||sd.heroBonus)?((P(sd.p).nation==="nyrond"&&S.opts.abilities&&!S.flags["noAbility"+sd.p]&&sd.heroes.length)?2:1):0;
    var add=[["plus1",1],["plus2",2],["plus2sea",seaBattle?2:0]];
    add.forEach(function(a){ for(var n=0;n<(sd.mods[a[0]]||0);n++){ var i=bestIdx(sd.units,function(u){return unitStr(u)-(b.get(u)||0)*0.1;}); if(i>=0) b.set(sd.units[i],(b.get(sd.units[i])||0)+a[1]); } });
    if(hb){ var i=bestIdx(sd.units,function(u){return unitStr(u);}); if(i>=0){ sd.heroUnit=sd.units[i]; } sd.heroAmt=hb; }
    return b; }
  var bonusA=bonusFor(A), bonusD=bonusFor(Dd);
  var minusA=new Map(), minusD=new Map();
  for(var n=0;n<(Dd.mods.minus1||0);n++){var i=bestIdx(A.units,function(u){return unitStr(u);}); if(i>=0)minusA.set(A.units[i],(minusA.get(A.units[i])||0)+1);}
  for(var n2=0;n2<(A.mods.minus1||0);n2++){var j=bestIdx(Dd.units,function(u){return unitStr(u);}); if(j>=0)minusD.set(Dd.units[j],(minusD.get(Dd.units[j])||0)+1);}
  var ignore={att:A.mods.ignore1||0,def:Dd.mods.ignore1||0};
  var paraA=new Set(), paraD=new Set();
  for(var n3=0;n3<(Dd.mods.paralyze||0);n3++){var k3=bestIdx(A.units,function(u){return unitStr(u)-(paraA.has(u)?99:0);}); if(k3>=0)paraA.add(A.units[k3]);}
  for(var n4=0;n4<(A.mods.paralyze||0);n4++){var k4=bestIdx(Dd.units,function(u){return unitStr(u)-(paraD.has(u)?99:0);}); if(k4>=0)paraD.add(Dd.units[k4]);}
  var tAREA=terr(area);
  function str(sd,u,isAtt){ var s=unitStr(u); var bm=isAtt?bonusA:bonusD, mm=isAtt?minusA:minusD;
    s+=(bm.get(u)||0)-(mm.get(u)||0);
    if(sd.heroUnit===u) s+=sd.heroAmt;
    if(S.opts.favored&&UNITS[u.t].fav.indexOf(tAREA)>=0) s+=1;
    if(isAtt&&hasFort) s-=1;
    if(isAtt&&landing) s-=1;
    return Math.max(1,s); }
  function canFire(u,isAtt,round){ if(seaBattle){ var t=UNITS[u.t]; if(t.flags.indexOf("ship")<0&&t.flags.indexOf("marine")<0) return false; } if(round===1&&(isAtt?paraA:paraD).has(u)) return false; return true; }
  function targets(sd){ return sd.units.filter(function(u){return !seaBattle||UNITS[u.t].flags.indexOf("ship")>=0||UNITS[u.t].flags.indexOf("marine")>=0;}); }
  function fire(shooters,sdFrom,sdTo,isAtt,round,out){
    var tg=targets(sdTo); if(!tg.length) return new Map();
    var hits=new Map();
    var order=tg.slice();
    shooters.forEach(function(u,idx){ if(!canFire(u,isAtt,round))return;
      var target=idx<order.length?order[idx]:order.slice().sort(function(a,b){return unitStr(a)-unitStr(b);})[0];
      var s=str(sdFrom,u,isAtt), r=d10();
      EV.push({side:isAtt?"att":"def",bid:u.bid,t:u.t,s:s,r:r,hit:r<=s,tbid:target.bid,tt:target.t});
      if(r<=s){ hits.set(target,(hits.get(target)||0)+1); out.push(UNITS[u.t].name+" ("+s+") rolls "+r+": hit "+UNITS[target.t].name); }
      else out.push(UNITS[u.t].name+" ("+s+") rolls "+r+": miss");
    });
    return hits;
  }
  function apply(hits,sd,key,out){ hits.forEach(function(n,u){ while(n>0&&ignore[key]>0){ignore[key]--;n--;out.push(pname(sd.p)+" ignores a hit (Invulnerable Coat).");} while(n-->0&&u.hp>0){ if(u.hp===2&&twoStep(u))u.hp=1; else u.hp=0; } }); var dead=purgeDead(sd.units); dead.forEach(function(u){out.push(pname(sd.p)+" loses a "+UNITS[u.t].name+".");}); }
  function autohits(sdFrom,sdTo,key,out){ for(var n=0;n<(sdFrom.mods.autohit||0);n++){ var tg=targets(sdTo); if(!tg.length)return; var t=tg.slice().sort(function(a,b){return unitStr(b)-unitStr(a);})[0]; var m=new Map();m.set(t,1); out.push(pname(sdFrom.p)+"'s magic strikes a "+UNITS[t.t].name+"."); apply(m,sdTo,key,out);} }
  function alive(u){return u.hp>0&&(A.units.indexOf(u)>=0||Dd.units.indexOf(u)>=0);}
  var result=null, attRetreated=false, defRetreated=null, EV=[];
  for(var round=1;round<=maxRounds;round++){
    if(round===4){ var hp=heroA?A.p:Dd.p; var go=yield ask(hp,"Fourth round?","A hero is present, so "+pname(hp)+" may fight one more round.",[{id:1,label:"Fight round 4"},{id:0,label:"Stop after round 3"}],bview("ask",{round:3})); if(!go) break; }
    var out=["Round "+round+":"]; EV=[]; var before=snap();
    if(round===1){ autohits(A,Dd,"def",out); autohits(Dd,A,"att",out); }
    var defFirst=round===1&&(river||landing);
    var aS=A.units.filter(function(u){return UNITS[u.t].flags.indexOf("scout")>=0;}), dS=Dd.units.filter(function(u){return UNITS[u.t].flags.indexOf("scout")>=0;});
    var aN=A.units.filter(function(u){return aS.indexOf(u)<0;}), dN=Dd.units.filter(function(u){return dS.indexOf(u)<0;});
    if(defFirst){
      if(dS.length){apply(fire(dS,Dd,A,false,round,out),A,"att",out);}
      if(aS.length){apply(fire(aS.filter(alive),A,Dd,true,round,out),Dd,"def",out);}
      apply(fire(dN.filter(alive),Dd,A,false,round,out),A,"att",out);
      apply(fire(aN.filter(alive),A,Dd,true,round,out),Dd,"def",out);
    } else {
      if(aS.length||dS.length){ var h1=fire(aS,A,Dd,true,round,out), h2=fire(dS,Dd,A,false,round,out); apply(h1,Dd,"def",out); apply(h2,A,"att",out); }
      var aN2=aN.filter(alive), dN2=dN.filter(alive);
      var h3=fire(aN2,A,Dd,true,round,out), h4=fire(dN2,Dd,A,false,round,out); apply(h3,Dd,"def",out); apply(h4,A,"att",out);
    }
    if(A.mods.heal1){ healOne(A.units); A.mods.heal1--; out.push(pname(A.p)+" heals a unit."); }
    if(Dd.mods.heal1){ healOne(Dd.units); Dd.mods.heal1--; out.push(pname(Dd.p)+" heals a unit."); }
    out.push("Left: attacker "+desc(A.units)+"; defender "+desc(Dd.units)+".");
    log(out.join(" "),"battle");
    var aLeft=targets(A).length||(!seaBattle&&A.units.length), dLeft=targets(Dd).length||(!seaBattle&&Dd.units.length);
    yield info(null,"Battle in "+areaName(area)+": round "+round,out.join("\n"),bview("round",{round:round,before:before,events:EV.slice(),defFirst:defFirst,notes:out.slice(1)}));
    if(!aLeft){result="defender";break;}
    if(!dLeft){result="attacker";break;}
    if(round<maxRounds){
      if(!Dd.mods.noretreat){ var ar=yield ask(A.p,"Attacker: retreat?","After round "+round+". Attacker "+desc(A.units)+"; defender "+desc(Dd.units)+".",[{id:0,label:"Continue the battle"},{id:1,label:"Retreat to "+areaName(att.origin)}],bview("ask",{round:round})); if(ar){attRetreated=true;break;} }
      if(!A.mods.noretreat&&!seaBattle){ var dests=defRetreatAreas(Dd.p,area,att.origin);
        if(dests.length){ var dr=yield ask(Dd.p,"Defender: retreat?","The attacker continues. You may retreat to an empty or friendly area.",[{id:0,label:"Hold the area"},{id:1,label:"Retreat"}],bview("ask",{round:round}));
          if(dr){ var to=yield pickArea(Dd.p,"Choose the retreat area",dests,false); defRetreated=to; break; } } }
    }
  }
  if(!result){ if(defRetreated!=null) result="defretreat"; else result="attretreat"; }
  var rtxt={attacker:pname(A.p)+" wins the battle.",defender:pname(Dd.p)+" holds "+areaName(area)+".",defretreat:pname(Dd.p)+" retreats from "+areaName(area)+".",attretreat:pname(A.p)+" falls back to "+areaName(att.origin)+"."}[result];
  yield info(null,"Battle of "+areaName(area)+": result",rtxt,bview("result",{result:result,resultText:rtxt}));
  return {result:result,extraAdded:extraAdded,defTo:defRetreated};
  function desc(units){ if(!units.length)return "none"; var m={}; units.forEach(function(u){var k=UNITS[u.t].name+(u.hp===1&&twoStep(u)?" (damaged)":"");m[k]=(m[k]||0)+1;}); return Object.keys(m).map(function(k){return m[k]+" "+k;}).join(", "); }
}
function healOne(units){ for(var i=0;i<units.length;i++){ if(units[i].hp===1&&twoStep(units[i])){units[i].hp=2;return;} } }
function purgeDead(units){ var dead=[]; for(var i=units.length-1;i>=0;i--){ if(units[i].hp<=0){ dead.push(units[i]); returnUnit(units[i]); units.splice(i,1);} } return dead; }
function defRetreatAreas(p,area,origin){ return ADJ[area].filter(function(b){ if(b===origin||!inPlayArea(b)||isWater(b))return false; if(EDGE[area+"_"+b]==="spine")return false; var x=armyAt(b); if(x&&x.owner!==p) return false; var c=controller(b); return c==null||c===p; }); }
function trimArmy(x){ while(x.units.length>5){ var i=bestIdx(x.units,function(u){return -unitStr(u);}); returnUnit(x.units.splice(i,1)[0]); } }
function* pursuit(winSide,loseUnits,p){
  if(!S.opts.pursuit) return;
  var cav=function(u){return UNITS[u.t].flags.indexOf("cav")>=0;};
  var pc=winSide.filter(cav).length, sc=loseUnits.filter(cav).length; var free=pc-sc;
  if(free<=0) return;
  var inf=loseUnits.filter(function(u){return !cav(u);}); var hits=0;
  for(var i=0;i<free&&inf.length;i++){ var att=winSide.filter(cav)[i]; var u=inf[i%inf.length]; if(d10()<=unitStr(att)){ u.hp = (u.hp===2&&twoStep(u))?1:0; hits++; } }
  purgeDead(loseUnits);
  if(hits) log("Pursuing cavalry score "+hits+" hit(s) on the retreating army.");
}

/* ---------- army actions ---------- */
function canAttack(p,area){
  if(S.scen==="frontier"&&P(p).nation==="furyondy"&&!S.flags.iuzAttacked) return false;
  return true;
}
function* howlInvasion(p,area){
  /* Stonefist enters a country no one has touched */
  var c=countryOf(area); if(!c||S.countries[c].owner!=null||S.countries[c].touched) return;
  S.countries[c].touched=true; S.flags.howlInvaded=true;
  var good=1;
  /* desertion */
  var deserts=CTRY[c].align==="G"?5:(CTRY[c].align==="N"?4:0);
  if(deserts){ var dr=d10(); var barb=["cruski","fruztii","schnai"].filter(function(b){return S.countries[b].owner===0;});
    if(dr<=deserts&&barb.length){ var b=barb[Math.floor(R()*barb.length)]; S.countries[b]={owner:null,rel:null,touched:true}; log("Desertion roll "+dr+": "+CTRY[b].name+" abandons Stonefist (its forces stay on the map).","bad"); }
    else log("Desertion roll "+dr+": the barbarian kings hold.");
  }
  var r=d10();
  if(r<=4){ S.countries[c]={owner:good,rel:"allied",touched:true}; S.flags.howlGoodActivated=true;
    var free=(COUNTRY_AREAS[c]||[]).filter(function(a){return inPlayArea(a)&&!armyAt(a);});
    var pick=free.length?yield pickArea(good,"Invasion roll "+r+": "+CTRY[c].name+" joins you. Place its army",free,false):null;
    if(pick!=null) placeCountryArmy(good,c,rosterUnits(c),pick);
    log("Invasion roll "+r+": "+CTRY[c].name+" joins "+pname(good)+".","good");
  } else {
    var cap=capitalOf(c); var spot=!armyAt(cap)?cap:ADJ[cap].filter(function(a){return countryOf(a)===c&&!armyAt(a);})[0];
    if(spot!=null){ var x=newArmy(good,spot,[]); rosterUnits(c).forEach(function(t){if(t!=="Ship"&&x.units.length<5){var u=takeFromPool(t);if(u)x.units.push(u);}}); if(!x.units.length) removeArmy(x); }
    log("Invasion roll "+r+": "+pname(good)+" takes "+CTRY[c].name+"'s troops in its capital area.");
  }
  yield info(null,"Invasion of "+CTRY[c].name,"Stonefist invades an untouched country. Roll "+r+(r<=4?": the country joins the Good player.":": the Good player takes its troops in the capital area."));
}
function* moveArmy(p,cmd){
  var x=S.armies[cmd.id]; if(!x||x.owner!==p) return false;
  var dbl=x.act&&S.flags.doubletime===p;
  if(x.act&&!dbl) return false;
  if(x.fleet) return yield* moveFleet(p,x,cmd);
  var opts={shepherd:S.flags.shepherd===p,rhenee:S.flags.rhenee===p};
  var take=cmd.take?cmd.take.slice().sort(function(a,b){return b-a;}):null;
  var units=take?take.map(function(i){return x.units[i];}).filter(Boolean):x.units.slice();
  if(!units.length) return false;
  var mp=99; units.forEach(function(u){mp=Math.min(mp,UNITS[u.t].move);});
  var rm=reach(p,x.area,mp,opts); var dest=rm[cmd.to]; if(!dest) return false;
  if(dest.attack&&dbl) return false;
  if(dest.attack&&!canAttack(p,cmd.to)) return false;
  var split=take&&units.length<x.units.length;
  if(split&&freeMarkers(p)<=0&&!armyAt(cmd.to)) return false;
  if(opts.shepherd&&pathUses(rm,x.area,cmd.to,"spine")) S.flags.shepherd=null;
  if(opts.rhenee) S.flags.rhenee=null;
  if(dbl) S.flags.doubletime=null;
  var origin=dest.from, startArea=x.area;
  var movers;
  if(split){ take.forEach(function(i){x.units.splice(i,1);}); movers=units; x.act=x.act; }
  else { movers=x.units; }
  var heroes=(cmd.heroes||[]).map(function(id){return S.heroes[id];}).filter(function(h){return h&&h.owner===p&&h.area===startArea&&!h.act;});
  heroes.forEach(function(h){h.act=true;h.area=dest.attack?origin:cmd.to;});
  var path=pathTo(rm,startArea,cmd.to);
  if(!dest.attack){
    var ex=armyAt(cmd.to);
    if(ex&&ex.owner===p&&ex!==x){ movers.forEach(function(u){ex.units.push(u);}); ex.act=true; if(!split) removeArmy(x,false); log(pname(p)+" moves "+movers.length+" counter(s) from "+areaName(startArea)+" to "+areaName(cmd.to)+" and merges (activated)."); trimArmy(ex); }
    else { if(split){ var nx=newArmy(p,cmd.to,movers); nx.act=true; } else { x.area=cmd.to; x.act=true; } log(pname(p)+" moves from "+areaName(startArea)+" to "+areaName(cmd.to)+"."); }
    if(S.scen==="howl"&&p===0) yield* howlInvasion(p,cmd.to);
    return true;
  }
  /* attack */
  var mover;
  if(split){ mover=newArmy(p,origin,movers); } else { mover=x; x.area=origin; }
  mover.act=true;
  if(S.scen==="frontier"&&P(p).nation==="iuz"){ var tc=countryOf(cmd.to); if(tc) S.flags.iuzAttacked=true; }
  if(S.scen==="howl"&&p===0){ yield* howlInvasion(p,cmd.to); }
  var def=armyAt(cmd.to);
  if(!def){ mover.area=cmd.to; log(pname(p)+" occupies "+areaName(cmd.to)+" unopposed."); return true; }
  var edge=EDGE[origin+"_"+cmd.to];
  yield* fight(p,mover,def,cmd.to,origin,{edge:edge,heroes:heroes.map(function(h){return h.id;})});
  return true;
}
function pathUses(rm,start,dest,type){ var p=pathTo(rm,start,dest); for(var i=1;i<p.length;i++){ if(EDGE[p[i-1]+"_"+p[i]]===type) return true; } return false; }
function* fight(p,mover,def,area,origin,o){
  var res=yield* battle({p:p,units:mover.units,heroes:o.heroes,origin:origin,edge:o.edge,landing:o.landing},def,area,{});
  var defOwner=def.owner;
  var wasFortOwner=S.forts[area];
  if(res.result==="attacker"){
    removeArmy(def,false);
    if(mover.units.length){ mover.area=area; mover.act=true; (o.heroes||[]).forEach(function(id){S.heroes[id].area=area;}); }
    if(S.forts[area]&&S.forts[area]!==p) delete S.forts[area];
    log(pname(p)+" wins and takes "+areaName(area)+".","good");
  } else if(res.result==="defender"){
    if(!mover.units.length) removeArmy(mover,false);
    log(pname(defOwner)+" holds "+areaName(area)+"; the attacker is destroyed.","bad");
  } else if(res.result==="defretreat"){
    yield* pursuit(mover.units,def.units,p);
    var rt=defRetreatAreas(defOwner,area,origin);
    var target=rt.indexOf(res.defTo)>=0?res.defTo:(rt.length?rt[0]:null);
    if(target==null){ removeArmy(def); log("The defender cannot retreat and is destroyed."); }
    else { var ex=armyAt(target); if(ex&&ex.owner===defOwner){ def.units.forEach(function(u){ex.units.push(u);}); removeArmy(def,false); trimArmy(ex);} else def.area=target; log(pname(defOwner)+" retreats to "+areaName(target)+"."); }
    heroesAt(area).filter(function(h){return h.owner===defOwner;}).forEach(function(h){ if(target!=null) h.area=target; });
    mover.area=area; (o.heroes||[]).forEach(function(id){S.heroes[id].area=area;});
    if(S.forts[area]&&S.forts[area]!==p) delete S.forts[area];
    log(pname(p)+" takes "+areaName(area)+".","good");
  } else {
    /* attacker returns to origin */
    if(mover.units.length){
      yield* pursuit(def.units,mover.units,defOwner);
      var oa=armyAt(origin);
      if(oa&&oa!==mover&&oa.owner!==p){ removeArmy(mover); log("The attacker cannot return to "+areaName(origin)+" and is destroyed.","bad"); }
      else if(oa&&oa!==mover&&oa.owner===p){ mover.units.forEach(function(u){oa.units.push(u);}); removeArmy(mover,false); trimArmy(oa); }
      else { mover.area=origin; if(!mover.units.length) removeArmy(mover,false); }
      log(pname(p)+"'s army falls back to "+areaName(origin)+".");
    } else removeArmy(mover,false);
  }
  if(S.armies[def.id]) trimArmy(def);
  if(S.armies[mover.id]) trimArmy(mover);
  checkElimination();
}
function* moveFleet(p,x,cmd){
  if(x.ice){ return false; }
  var rm=fleetReach(p,x.area); var dest=cmd.to!=null?rm[cmd.to]:null;
  var start=x.area;
  if(cmd.load){ var la=armyAt(cmd.load.from); if(la&&la.owner===p&&!la.act&&PORT[la.area]&&ADJ[la.area].indexOf(start)>=0){ var cap=cargoCap(x)-x.cargo.length; var idx=cmd.load.units.slice().sort(function(a,b){return b-a;}).slice(0,cap); idx.forEach(function(i){ var u=la.units.splice(i,1)[0]; if(u)x.cargo.push(u); }); if(!la.units.length) removeArmy(la,false); log(pname(p)+" loads "+idx.length+" counter(s) at "+areaName(la.area)+"."); } }
  if(cmd.to!=null&&cmd.to!==start){
    if(!dest) return false;
    if(dest.attack){ var def=armyAt(cmd.to); x.act=true; var origin=dest.from; x.area=origin;
      var res=yield* battle({p:p,units:x.units,heroes:[],origin:origin},def,cmd.to,{});
      if(res.result==="attacker"){ removeArmy(def,false); x.area=cmd.to; } else if(!x.units.length) cleanupFleet(x);
      if(S.armies[def.id]&&!def.units.length) cleanupFleet(def);
      return true; }
    x.area=cmd.to; log(pname(p)+"'s fleet sails to "+areaName(cmd.to)+".");
  }
  x.act=true;
  if(cmd.unload!=null&&x.cargo.length){
    var to=cmd.unload; if(ADJ[x.area].indexOf(to)<0||isWater(to)||!inPlayArea(to)) return true;
    var units=x.cargo.splice(0);
    var occ=armyAt(to);
    if(occ&&occ.owner!==p){ if(!enemyOf(p,occ.owner)||!canAttack(p,to)){ x.cargo=units; return true; }
      var lander=newArmy(p,x.area,units); lander.act=true; lander.area=x.area;
      yield* fight(p,lander,occ,to,x.area,{landing:true,heroes:[]});
      if(S.armies[lander.id]&&lander.area===x.area){ lander.units.forEach(function(u){if(x.cargo.length<cargoCap(x))x.cargo.push(u);else returnUnit(u);}); removeArmy(lander,false); }
    } else if(occ){ units.forEach(function(u){occ.units.push(u);}); trimArmy(occ); occ.act=true; log(pname(p)+" unloads into "+areaName(to)+"."); }
    else { if(freeMarkers(p)<=0){ x.cargo=units; return true; } var n=newArmy(p,to,units); n.act=true; log(pname(p)+" lands at "+areaName(to)+"."); if(S.scen==="howl"&&p===0) yield* howlInvasion(p,to); }
  }
  return true;
}
function fortifyChance(x,p){ var inf=x.units.filter(function(u){return UNITS[u.t].flags.indexOf("inf")>=0;}).length; var t=Math.min(5,inf); if(x.units.some(function(u){return UNITS[u.t].flags.indexOf("fortify")>=0;}))t++; if(heroesAt(x.area).some(function(h){return h.owner===p&&!h.act;}))t++; return t; }

/* ---------- action phase ---------- */
function* actionPhase(p){
  S.phase="action"; S.cur=p; S.step="A";
  if(P(p).out) return;
  log("— "+pname(p)+"'s Action Phase —","head");
  /* nation abilities at start */
  if(S.opts.abilities&&!S.flags["noAbility"+p]){
    if(P(p).nation==="greatkingdom"){ yield* doRecruit(p,null,true); }
    if(P(p).nation==="iuz"){ yield* doSearch(p,null,true); }
  }
  while(true){
    var cmd=yield {kind:"action",who:p,title:"Phase 4A: "+pname(p)+", activate armies and heroes",text:"Select one of your unactivated armies or heroes on the map and choose an action. Each marker acts once. Press End actions when done."};
    if(!cmd) continue;
    if(cmd.c==="end") break;
    yield* doCommand(p,cmd);
    if(S.over) return;
  }
  /* final actions */
  S.step="final";
  while(true){
    var f=yield {kind:"final",who:p,title:"Phase 4B–D: "+pname(p)+", heal, add units and raise an army",text:"Unactivated armies may heal all damaged counters, or add new counters if they stand in a home or allied country (first type only in a conquered one). You may raise one new army in an empty home or allied area. Then end your turn."};
    if(!f) continue;
    if(f.c==="endturn") break;
    yield* doFinal(p,f);
    if(S.over) return;
  }
  yield* placeNewAllies(p);
  yield* conquestCheck(p);
  armiesOf(p).forEach(trimArmy);
  checkElimination();
  checkLightInfantry();
}
function* doCommand(p,cmd){
  var c=cmd.c;
  if(c==="move"){ yield* moveArmy(p,cmd); }
  else if(c==="fortify"){ var x=S.armies[cmd.id]; if(!x||x.owner!==p||x.act||x.fleet)return; var t=fortifyChance(x,p); var r=d10(); x.act=true; var helper=heroesAt(x.area).filter(function(h){return h.owner===p&&!h.act;})[0]; if(helper)helper.act=true;
    if(r<=t&&!PFORT[x.area]){ S.forts[x.area]=p; log(pname(p)+" fortifies "+areaName(x.area)+" (rolled "+r+", needed "+t+")."); } else log(pname(p)+" fails to fortify "+areaName(x.area)+" (rolled "+r+", needed "+t+")."); }
  else if(c==="disband"){ var x2=S.armies[cmd.id]; if(!x2||x2.owner!==p||x2.act)return; log(pname(p)+" disbands the army in "+areaName(x2.area)+"."); removeArmy(x2); }
  else if(c==="heroMove"){ var h=S.heroes[cmd.id]; if(!h||h.owner!==p||(h.act&&!h.extra))return; var rm=reach(p,h.area,6,{hero:true}); if(!rm[cmd.to])return; useHero(h); h.area=cmd.to; log(pname(p)+"'s hero moves to "+areaName(cmd.to)+"."); }
  else if(c==="diplomacy"){ var h2=S.heroes[cmd.id]; if(!h2||h2.owner!==p||(h2.act&&!h2.extra)||!heroCanAct(h2))return; if(!canDiplomacy(p,h2))return; useHero(h2); yield* doDiplomacy(p,h2); }
  else if(c==="search"){ var h3=S.heroes[cmd.id]; if(!h3||h3.owner!==p||(h3.act&&!h3.extra)||!MAGIC[h3.area]||!heroCanAct(h3))return; if(S.flags.fiend&&S.flags.fiend[h3.area])return; useHero(h3); yield* doSearch(p,h3); }
  else if(c==="recruit"){ var h4=S.heroes[cmd.id]; if(!h4||h4.owner!==p||(h4.act&&!h4.extra)||!MERC[h4.area]||!heroCanAct(h4))return; useHero(h4); yield* doRecruit(p,h4); }
  else if(c==="play"){ var by=cmd.by!=null?cmd.by:p; if(P(by).hand.indexOf(cmd.card)<0)return; yield* playTurnCard(by,cmd.card); }
  else if(c==="assassinate"){ if(P(p).nation!=="scarlet"||!S.opts.abilities||S.flags["noAbility"+p]||S.flags["used_ab"+p])return; S.flags["used_ab"+p]=true; var targets=allHeroes().filter(function(h){return h.owner!==p&&!h.act;}); if(!targets.length)return; var ch=yield ask(p,"Assassination","Roll 6 or less to flip the hero.",targets.map(function(h){return {id:h.id,label:pname(h.owner)+" hero in "+areaName(h.area)};})); var r=d10(); if(r<=6){S.heroes[ch].act=true;S.heroes[ch].byCard=true;} log("Scarlet assassins roll "+r+(r<=6?": the hero is struck down for the turn.":": the attempt fails.")); }
}
function heroCanAct(h){ var ax=armyAt(h.area); return !(ax&&ax.owner!==h.owner); }
function useHero(h){ if(h.act&&h.extra){h.extra--;} else h.act=true; }
function* doFinal(p,f){
  if(f.c==="heal"){ var x=S.armies[f.id]; if(!x||x.owner!==p||x.act)return; x.units.forEach(function(u){if(twoStep(u))u.hp=2;}); x.act=true; log(pname(p)+" heals the army in "+areaName(x.area)+"."); }
  else if(f.c==="furyheal"){ if(P(p).nation!=="furyondy"||!S.opts.abilities||S.flags["noAbility"+p]||S.flags["used_fh"+p])return; var y=S.armies[f.id]; if(!y||y.owner!==p)return; y.units.forEach(function(u){if(twoStep(u))u.hp=2;}); S.flags["used_fh"+p]=true; log("Furyondy heals the army in "+areaName(y.area)+" (nation ability)."); }
  else if(f.c==="add"){ var x2=S.armies[f.id]; if(!x2||x2.owner!==p||x2.act||S.flags["revolt"+p])return; var types=addTypes(p,x2); if(types==null)return;
    if(S.flags.rulership===p){ S.flags.rulership=null; types=types.concat(types.slice(0,2)); }
    var added=[]; types.forEach(function(t){ if(t==="Ship"){ return; } if(x2.units.length>=5)return; var u=takeFromPool(t); if(u){x2.units.push(u);added.push(UNITS[t].name);} });
    var shipT=types.filter(function(t){return t==="Ship";}); if(shipT.length&&PORT[x2.area]){ var sea=portSea(x2.area).filter(function(s){var a=armyAt(s);return !a||(a.owner===p&&a.fleet);})[0]; if(sea!=null){ var fl=armyAt(sea)||(freeMarkers(p)>0?newArmy(p,sea,[],true):null); if(fl){ shipT.forEach(function(){ if(fl.units.length<5){var u=takeFromPool("Ship"); if(u){fl.units.push(u);added.push("Ship");}} }); fl.act=true; } } }
    if(!added.length&&x2.units.length<5){ var li=takeFromPool("LI"); if(li&&x2.units.length<5){x2.units.push(li);added.push("Light Infantry");} }
    x2.act=true; log(pname(p)+" adds "+(added.length?added.join(", "):"nothing")+" in "+areaName(x2.area)+".");
    checkLightInfantry(); }
  else if(f.c==="raise"){ if(S.flags["raised"+p]||S.flags["revolt"+p])return; var opts=raiseAreas(p); if(opts.indexOf(f.area)<0)return; var c=countryOf(f.area); if(freeMarkers(p)<=0)return;
    var types=rosterUnits(c).filter(function(t){return t!=="Ship";}); var uniq=[]; CTRY[c].roster.forEach(function(r){ if(r[1]!=="Ship"&&uniq.length<5) uniq.push(r[1]); });
    var x3=newArmy(p,f.area,[]); uniq.forEach(function(t){var u=takeFromPool(t); if(u&&x3.units.length<5)x3.units.push(u);}); if(!x3.units.length){var li2=takeFromPool("LI"); if(li2)x3.units.push(li2);}
    if(!x3.units.length){removeArmy(x3,false);return;}
    x3.act=true; S.flags["raised"+p]=true; log(pname(p)+" raises a new army in "+areaName(f.area)+": "+x3.units.map(function(u){return UNITS[u.t].name;}).join(", ")+"."); checkLightInfantry(); }
  else if(f.c==="keodemi"){ if(P(p).nation!=="keoland"||!S.opts.abilities||S.flags["noAbility"+p]||S.flags["used_kd"+p])return; var x4=S.armies[f.id]; if(!x4||x4.owner!==p||x4.units.length>=5)return; var u=takeFromPool(f.t); if(!u)return; x4.units.push(u); S.flags["used_kd"+p]=true; log("Keoland recruits a "+UNITS[f.t].name+" (nation ability)."); }
  else if(f.c==="play"){ var by=f.by!=null?f.by:p; if(P(by).hand.indexOf(f.card)<0)return; yield* playTurnCard(by,f.card); }
}
function addTypes(p,x){ var c=countryOf(x.area); if(!c)return null; var r=relation(p,c); if(r==="home"||r==="allied") return CTRY[c].roster.map(function(e){return e[1];}); if(r==="conquered") return [CTRY[c].roster[0][1]]; return null; }
function raiseAreas(p){ var out=[]; for(var c in S.countries){ var s=S.countries[c]; if(s.owner!==p||(s.rel!=="home"&&s.rel!=="allied"))continue; (COUNTRY_AREAS[c]||[]).forEach(function(a){ if(inPlayArea(a)&&!armyAt(a)) out.push(a); }); } return out; }
function* conquestCheck(p){
  var mine={}; armiesOf(p).forEach(function(x){if(!x.fleet)mine[x.area]=1;});
  for(var c in S.countries){
    var areas=(COUNTRY_AREAS[c]||[]).filter(inPlayArea); if(!areas.length)continue;
    var s=S.countries[c]; if(s.owner===p) continue;
    if(!areas.every(function(a){return mine[a];})) continue;
    var ok=yield ask(p,"Conquest of "+CTRY[c].name,"Your armies hold every area of "+CTRY[c].name+". Take its card as a conquered country?",[{id:1,label:"Conquer"},{id:0,label:"Decline"}]);
    if(!ok) continue;
    var prev=s.owner, prevRel=s.rel;
    var liberate=prev!=null&&prevRel==="conquered"&&enemyOf(p,prev)&&CTRY[c].align===alignOf(p);
    S.countries[c]={owner:p,rel:liberate?"allied":"conquered",touched:true};
    log(pname(p)+(liberate?" liberates ":" conquers ")+CTRY[c].name+(prev!=null?" from "+pname(prev):"")+".",liberate?"good":"bad");
    if(S.scen==="frontier"&&P(p).nation==="iuz") S.flags.iuzAttacked=true;
  }
}
function checkElimination(){
  S.players.forEach(function(pl){ if(pl.out)return; var homes=[];for(var c in S.countries){if(S.countries[c].owner===pl.i&&S.countries[c].rel==="home")homes.push(c);}
    var hadHome=D.SCENARIOS[S.scen].sides[pl.i].home.length>0;
    if(hadHome&&!homes.length&&!armiesOf(pl.i).length){ pl.out=true; log(pname(pl.i)+" is eliminated.","bad"); } });
}
function checkLightInfantry(){ if(S.scen==="frontier"&&S.pool.LI<=0&&!S.over){ S.flags.liOut=true; } }

/* ---------- victory ---------- */
function holds(p,area){var x=armyAt(area);return x&&x.owner===p;}
function groupCount(al){return S.players.filter(function(q){return q.align===al;}).reduce(function(s,q){return s+cardsHeld(q.i);},0);}
function mostCards(){var b=null;S.players.forEach(function(q){if(q.out)return;if(b==null||cardsHeld(q.i)>cardsHeld(b))b=q.i;});return b;}
function checkVictory(){
  var sc=S.scen, w=null, why="";
  if(sc==="frontier"){
    if(holds(0,capitalOf("iuz"))){w=0;why="holds Dorakaa";} else if(holds(1,capitalOf("furyondy"))){w=1;why="holds Chendl";}
    else if(S.flags.liOut){ var cnt=[0,0]; for(var k in S.armies){var x=S.armies[k]; var c=countryOf(x.area); if(!c)continue; var o=S.countries[c].owner; if(o!=null&&o!==x.owner) cnt[x.owner]++; }
      if(cnt[0]!==cnt[1]){w=cnt[0]>cnt[1]?0:1;why="holds more enemy areas ("+cnt[w]+") when light infantry ran out";} else { var s0=armiesOf(0).reduce(function(s,x){return s+armyStrength(x);},0), s1=armiesOf(1).reduce(function(s,x){return s+armyStrength(x);},0); w=s0>=s1?0:1; why="wins the tie on total strength"; } }
  } else if(sc==="howl"){
    var all=S.inPlay.every(function(c){return S.countries[c].owner!=null;});
    if(all){ w=cardsHeld(0)>=cardsHeld(1)?0:1; why="controls the most countries"; }
  } else if(sc==="northern"){
    if(cardsHeld(0)>=17){w=0;why="controls 17 countries";} else if(cardsHeld(1)>=17){w=1;why="controls 17 countries";} else if(cardsHeld(2)>=12){w=2;why="controls 12 countries";}
  } else {
    var g=groupCount("G"), e=groupCount("E");
    var gNeed=sc==="great5"?20:30;
    if(g>=gNeed||e>=30){ w=mostCards(); why=(g>=gNeed?"the Good alliance reached "+g:"the Evil alliance reached "+e)+" countries; this player holds the most"; }
  }
  var alive=S.players.filter(function(q){return !q.out;});
  if(w==null&&alive.length===1){w=alive[0].i;why="is the last player standing";}
  if(w==null&&alive.length>1&&alive.every(function(q){return q.align===alive[0].align;})&&S.players.some(function(q){return q.out;})){w=mostCards();why="is the strongest of the surviving alliance";}
  if(w!=null){S.over=true;S.winner=w;S.winWhy=why;log(pname(w)+" wins: "+why+".","head");}
}
function endTurn(){
  for(var k in S.armies){S.armies[k].act=false; if(S.armies[k].units.length>5&&!S.armies[k].fleet) trimArmy(S.armies[k]);}
  for(var h in S.heroes){S.heroes[h].act=false;S.heroes[h].extra=0;S.heroes[h].byCard=false;}
  var keep={passage:S.flags.passage&&S.flags.passage>S.turn?S.flags.passage:null,howlGoodActivated:S.flags.howlGoodActivated,howlInvaded:S.flags.howlInvaded,iuzAttacked:S.flags.iuzAttacked,liOut:S.flags.liOut,blackmail:S.flags.blackmail};
  S.flags=keep;
  if(!S.flags.passage){ /* ice returns only for Cruski's own fleets is not modeled after release */ }
  S.turn++;
}
function* main(){
  yield* setupGame();
  while(!S.over){
    yield* phaseOrder();
    yield* phaseHeroes();
    yield* phaseEvents();
    for(var k=0;k<S.order.length&&!S.over;k++){ yield* actionPhase(S.order[k]); checkVictory(); }
    if(S.over) break;
    checkVictory(); if(S.over) break;
    endTurn();
  }
  S.phase="over";
  yield {kind:"over",who:null,title:"Game over",text:pname(S.winner)+" wins: "+S.winWhy+"."};
}

/* ---------- driver ---------- */
var GEN=null, REQ=null, SAVE=null;
function start(scen,names,opts,seed){
  seed=seed==null?Math.floor(Math.random()*2147483647):seed;
  SAVE={scen:scen,names:names,opts:JSON.parse(JSON.stringify(opts)),seed:seed,answers:[]};
  newState(scen,names,JSON.parse(JSON.stringify(opts)),seed);
  GEN=main(); REQ=GEN.next().value;
  return REQ;
}
function answer(a){
  if(!GEN) return null;
  SAVE.answers.push(a===undefined?null:a);
  var r=GEN.next(a);
  REQ=r.done?null:r.value;
  return REQ;
}
function load(save){
  start(save.scen,save.names,save.opts,save.seed);
  var ans=save.answers.slice(); SAVE.answers=[];
  for(var i=0;i<ans.length;i++){ answer(ans[i]); }
  return REQ;
}
function undo(){ if(!SAVE||!SAVE.answers.length) return REQ; var s=JSON.parse(JSON.stringify(SAVE)); s.answers.pop();
  /* step back over informational prompts too */
  return load(s); }

export const GW={
  start:start,answer:answer,load:load,undo:undo,
  get state(){return S;}, get req(){return REQ;}, get save(){return SAVE;},
  reach:function(p,area,mp,o){return reach(p,area,mp,o);}, fleetReach:function(p,a){return fleetReach(p,a);},
  armyMove:armyMove, armyAt:armyAt, heroesAt:heroesAt, armiesOf:armiesOf, heroesOf:heroesOf, freeMarkers:freeMarkers,
  unitStr:unitStr, twoStep:twoStep, countryOf:countryOf, areaName:areaName, controller:controller, cardsHeld:cardsHeld,
  canDiplomacy:function(p,h){return canDiplomacy(p,h);}, diploTarget:diploTarget, canPlaceHero:canPlaceHero, heroCanAct:heroCanAct,
  fortifyChance:fortifyChance, addTypes:addTypes, raiseAreas:raiseAreas, inPlayArea:inPlayArea, isWater:isWater, terr:terr,
  cardById:cardById, cardType:cardType, turnPlayable:turnPlayable, canAttack:canAttack, armyStrength:armyStrength,
  pathTo:pathTo, enterCost:enterCost, fortifyHelpers:null, data:D, map:MAP, PORT:PORT, MAGIC:MAGIC, MERC:MERC, PFORT:PFORT, ADJ:ADJ, EDGE:EDGE, COUNTRY_AREAS:COUNTRY_AREAS, capitalOf:capitalOf, isCapital:isCapital, cargoCap:cargoCap
};
