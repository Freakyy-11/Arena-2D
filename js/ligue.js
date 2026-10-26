// Ligue Pokémon : régions débloquées l'une après l'autre (Conseil 4 + Maître), Pokémon jouables débloqués en gagnant
// =====================================================================
// LIGUE
// =====================================================================
const LEAGUE_START = ['dracaufeu','leviator','gorythmic','pyrax','lucario','ronflex','gardevoir','zeraora'];   // départ imposé des anciennes sauvegardes
// Pokémon de départ : le joueur en choisit START_N parmi cette sélection (tous les types, sans les pseudo-légendaires)
const START_N = 10;
const START_POOL = ['dracaufeu','demolosse','flamigator','tortank','leviator','amphinobi','gorythmic','roserade','zeraora','lokhlass','mammochon','lucario','mackogneur',
  'nostenfer','arbok','hippodocus','libegon','roucarnage','togekiss','gardevoir','alakazam','pyrax','cizayox','ptera','ectoplasma','absol','noctali','ronflex','steelix'];
// adversaires dans l'ordre ; reward = Pokémon débloqués en gagnant ; arena = arène du combat
const LEAGUE = [
  {id:'kanto', name:'Kanto', trainers:[
    {id:'kanto-olga', team:'dracolosse', name:'Olga', title:'Conseil 4 · Glace', arena:'couronne', mons:['crustabri','lippoutou','lamantine','momartik','mammochon','lokhlass'], reward:['mammochon','lamantine','lokhlass']},
    {id:'kanto-aldo', team:'carchacrok', name:'Aldo', title:'Conseil 4 · Combat', arena:'stade', mons:['kicklee','tygnon','grolem','lucario','tyranocif','mackogneur'], reward:['tyranocif','mackogneur']},
    {id:'kanto-agatha', team:'lanssorien', name:'Agatha', title:'Conseil 4 · Spectre', arena:'chateau', mons:['arbok','sinistrail','flamigator','momartik','naganadel','ectoplasma'], reward:['sinistrail','arbok','ectoplasma']},
    {id:'kanto-peter', team:'naganadel', name:'Peter', title:'Conseil 4 · Dragon', arena:'pilier', mons:['ptera','leviator','carchacrok','lanssorien','dracaufeu','dracolosse'], reward:['ptera','dracolosse']},
    {id:'kanto-blue', name:'Blue', title:'Maître de Kanto', arena:'stade', champion:1, mons:['roucarnage','alakazam','rhinoferos','arcanin','mewtwo','tortank'], reward:['alakazam','arcanin','tortank','mewtwo']}],
   challenges:[{id:'kanto-def', trainer:'kanto-blue', text:'Battre Blue sans perdre un seul Pokémon', test:r => r.lost === 0, reward:['electhorgalar']}]},
  {id:'johto', name:'Johto', trainers:[
    {id:'johto-clement', name:'Clément', title:'Conseil 4 · Psy', arena:'colonnes', mons:['lippoutou','flagadoss','noadkoko','alakazam','gardevoir','xatu'], reward:['metalosse','lippoutou','noadkoko','xatu']},
    {id:'johto-koga', name:'Koga', title:'Conseil 4 · Poison', arena:'tourbillon', mons:['migalos','foretress','grotadmorv','amphinobi','naganadel','nostenfer'], reward:['naganadel','grotadmorv','migalos','foretress','nostenfer']},
    {id:'johto-aldo', name:'Aldo', title:'Conseil 4 · Combat', arena:'stade', mons:['kapoera','steelix','tygnon','kicklee','lucario','mackogneur'], reward:['minotaupe','tygnon','kicklee','kapoera','steelix']},
    {id:'johto-marion', name:'Marion', title:'Conseil 4 · Ténèbres', arena:'chateau', mons:['noctali','corboss','tyranocif','scalpereur','ectoplasma','demolosse'], reward:['amphinobi','noctali','corboss','demolosse']},
    {id:'johto-peter', name:'Peter', title:'Maître de Johto', arena:'pilier', champion:1, mons:['ptera','hyporoi','carchacrok','electhorgalar','leviator','dracolosse'], reward:['carchacrok','roucarnage','hyporoi']}],
   challenges:[{id:'johto-def', trainer:'johto-peter', text:'Battre Peter en moins de 3 minutes', test:r => r.time < 180, reward:['shifours']}]},
  {id:'hoenn', name:'Hoenn', trainers:[
    {id:'hoenn-damien', name:'Damien', title:'Conseil 4 · Ténèbres', arena:'chateau', mons:['tengalice','cacturne','colhomard','grahyena','tyranocif','absol'], reward:['scalpereur','tengalice','cacturne','colhomard','grahyena','absol']},
    {id:'hoenn-spectra', name:'Spectra', title:'Conseil 4 · Spectre', arena:'colonnes', mons:['branette','tenefix','momartik','sinistrail','flamigator','noctunoir'], reward:['flamigator','branette','tenefix','noctunoir']},
    {id:'hoenn-glacia', name:'Glacia', title:'Conseil 4 · Glace', arena:'couronne', mons:['oniglali','crustabri','lamantine','lokhlass','mammochon','kaimorse'], reward:['momartik','crustabri','oniglali','kaimorse']},
    {id:'hoenn-aragon', name:'Aragon', title:'Conseil 4 · Dragon', arena:'pilier', mons:['libegon','altaria','carchacrok','dracolosse','lanssorien','drattak'], reward:['lanssorien','libegon','altaria','drattak']},
    {id:'hoenn-pierre', name:'Pierre Rochard', title:'Maître de Hoenn', arena:'tourbillon', champion:1, mons:['airmure','galeking','kaorine','armaldo','groudon','metalosse'], reward:['milobellus','flagadoss','airmure','galeking','kaorine','vacilys','armaldo','kyogre']}],
   challenges:[{id:'hoenn-def', trainer:'hoenn-pierre', text:'Battre Pierre Rochard en perdant au plus 1 Pokémon', test:r => r.lost <= 1, reward:['groudon']}]},
  {id:'sinnoh', name:'Sinnoh', trainers:[
    {id:'sinnoh-aaron', name:'Aaron', title:'Conseil 4 · Insecte', arena:'pilier', mons:['scarhino','apireine','cizayox','charmillon','pyrax','drascore'], reward:['togekiss','scarhino','apireine','cizayox','charmillon','drascore']},
    {id:'sinnoh-terry', name:'Terry', title:'Conseil 4 · Sol', arena:'couronne', mons:['hippodocus','scorvol','grolem','rhinoferos','minotaupe','rhinastoc'], reward:['grolem','rhinoferos','hippodocus','scorvol','rhinastoc']},
    {id:'sinnoh-adrien', name:'Adrien', title:'Conseil 4 · Feu', arena:'chateau', mons:['simiabraz','pyroli','arcanin','demolosse','dracaufeu','maganon'], reward:['simiabraz','pyroli','maganon']},
    {id:'sinnoh-lucio', name:'Lucio', title:'Conseil 4 · Psy', arena:'colonnes', mons:['mentali','archeodong','alakazam','gardevoir','metalosse','gallame'], reward:['mentali','archeodong','gallame']},
    {id:'sinnoh-cynthia', name:'Cynthia', title:'Maîtresse de Sinnoh', arena:'stade', champion:1, mons:['spiritomb','roserade','sylveroy','togekiss','lucario','carchacrok'], reward:['spiritomb','roserade','sylveroy']}],
   challenges:[]},
  {id:'unys', name:'Unys', trainers:[
    {id:'unys-anis', name:'Anis', title:'Conseil 4 · Spectre', arena:'chateau', mons:['tutankafer','moyade','golemastoc','momartik','ectoplasma','lugulabre'], reward:['lugulabre','tutankafer','moyade','golemastoc']},
    {id:'unys-pieris', name:'Pieris', title:'Conseil 4 · Ténèbres', arena:'tourbillon', mons:['baggaid','leopardus','crocorible','absol','demolosse','scalpereur'], reward:['baggaid','leopardus','crocorible']},
    {id:'unys-percila', name:'Percila', title:'Conseil 4 · Psy', arena:'colonnes', mons:['mushana','cryptero','symbios','mentali','alakazam','siderella'], reward:['siderella','mushana','cryptero','symbios']},
    {id:'unys-kunz', name:'Kunz', title:'Conseil 4 · Combat', arena:'stade', mons:['judokrak','karaclee','betochef','lucario','mackogneur','kungfouine'], reward:['kungfouine','judokrak','karaclee','betochef']},
    {id:'unys-iris', name:'Iris', title:"Maîtresse d'Unys", arena:'pilier', champion:1, mons:['trioxhydre','drakkarmin','aeropteryx','galeking','kyogre','tranchodon'], reward:['tranchodon','trioxhydre','drakkarmin','aeropteryx']}],
   challenges:[]},
  {id:'kalos', name:'Kalos', trainers:[
    {id:'kalos-malva', name:"Malva", title:"Conseil 4 · Feu", arena:'chateau', mons:['nemelios','chartor','lugulabre','maganon','arcanin','flambusard'], reward:['flambusard','nemelios','chartor']},
    {id:'kalos-narcisse', name:"Narcisse", title:"Conseil 4 · Eau", arena:'tourbillon', mons:['gamblast','staross','leviator','milobellus','tortank','golgopathe'], reward:['golgopathe','gamblast','staross']},
    {id:'kalos-thymeo', name:"Thyméo", title:"Conseil 4 · Acier", arena:'colonnes', mons:['trousselin','tarinorme','cizayox','metalosse','airmure','exagide'], reward:['exagide','trousselin','tarinorme']},
    {id:'kalos-dracena', name:"Dracéna", title:"Conseil 4 · Dragon", arena:'pilier', mons:['kravarech','drakkarmin','altaria','hyporoi','libegon','bruyverne'], reward:['bruyverne','kravarech']},
    {id:'kalos-diantha', name:"Dianthéa", title:"Maîtresse de Kalos", arena:'stade', champion:1, mons:['rexillius','amagara','banshitrouye','muplodocus','shifours','gardevoir'], reward:['rexillius','amagara','banshitrouye','muplodocus','brutalibre']}],
   challenges:[]},
  {id:'alola', name:'Alola', trainers:[
    {id:'alola-pectorius', name:"Pectorius", title:"Conseil 4 · Combat", arena:'stade', mons:['hariyama','colossinge','chelours','tartard','kapoera','crabominable'], reward:['crabominable','hariyama','colossinge','chelours','tartard']},
    {id:'alola-alyxia', name:"Alyxia", title:"Conseil 4 · Roche", arena:'couronne', mons:['strassie','grolemalola','tarinorme','tyranocif','rhinastoc','lougaroc'], reward:['lougaroc','strassie','grolemalola']},
    {id:'alola-margie', name:"Margie", title:"Conseil 4 · Spectre", arena:'chateau', mons:['grodrive','tenefix','sinistrail','momartik','noctunoir','trepassable'], reward:['trepassable','grodrive']},
    {id:'alola-kahili', name:"Kahili", title:"Conseil 4 · Vol", arena:'pilier', mons:['plumeline','vaututrice','airmure','nostenfer','togekiss','bazoucan'], reward:['bazoucan','plumeline','vaututrice']},
    {id:'alola-euphorbe', name:"Euphorbe", title:"Maître d'Alola", arena:'tourbillon', champion:1, mons:['feunardalola','gueriaigle','magnezone','ronflex','solgaleo','archeduc'], reward:['archeduc','feunardalola','gueriaigle','magnezone']}],
   challenges:[{id:'alola-def', trainer:'alola-euphorbe', text:'Battre Euphorbe en perdant au plus 2 Pokémon', test:r => r.lost <= 2, reward:['solgaleo']}]},
  {id:'paldea', name:'Paldea', trainers:[
    {id:'paldea-rika', name:"Rika", title:"Conseil 4 · Sol", arena:'couronne', mons:['barbicha','camerupt','donphan','triopikeur','hippodocus','terraiste'], reward:['terraiste','barbicha','camerupt','donphan','triopikeur']},
    {id:'paldea-popi', name:"Popi", title:"Conseil 4 · Acier", arena:'colonnes', mons:['pachyradjah','magnezone','corvaillus','archeodong','steelix','forgelina'], reward:['forgelina','pachyradjah','corvaillus']},
    {id:'paldea-okuba', name:"Okuba", title:"Conseil 4 · Vol", arena:'pilier', mons:['tropius','plumeline','etouraptor','altaria','roucarnage','flamenroule'], reward:['flamenroule','tropius','etouraptor']},
    {id:'paldea-hassel', name:"Hassel", title:"Conseil 4 · Dragon", arena:'tourbillon', mons:['bruyverne','kravarech','pomdrapi','tranchodon','drattak','glaivodo'], reward:['glaivodo','pomdrapi']},
    {id:'paldea-alisma', name:"Alisma", title:"Maîtresse de Paldea", arena:'stade', champion:1, mons:['cleopsytra','chevroum','seracrawl','scalpereur','koraidon','floreclat'], reward:['floreclat','cleopsytra','chevroum','seracrawl']}],
   challenges:[{id:'paldea-def', trainer:'paldea-alisma', text:'Battre Alisma en moins de 4 minutes', test:r => r.time < 240, reward:['koraidon']}]}
];
const LG_TRAINER = {}; for (const r of LEAGUE) for (const t of r.trainers) LG_TRAINER[t.id] = {...t, region:r.id};

// progression gardée sur l'appareil
let lg = {beaten:{}, chal:{}, all:false};
try { Object.assign(lg, JSON.parse(localStorage.getItem('arene-ligue') || '{}')); } catch(e){}
const lgSave = () => { try { localStorage.setItem('arene-ligue', JSON.stringify(lg)); } catch(e){} };
function unlockedSet(){
  if (lg.all) return new Set(Object.keys(MONS));
  const s = new Set(lg.start || LEAGUE_START);
  for (const r of LEAGUE){ for (const t of r.trainers) if (lg.beaten[t.id]) t.reward.forEach(k => s.add(k)); for (const c of r.challenges) if (lg.chal[c.id]) c.reward.forEach(k => s.add(k)); }
  return s;
}
const isUnlocked = k => unlockedSet().has(k);
// équipe prête jouable en entier : débloquée par un membre du Conseil 4 (même si ses Pokémon ne le sont pas un par un)
const teamFree = t => lg.all || LEAGUE.some(r => r.trainers.some(tr => tr.team === t.id && lg.beaten[tr.id]));
// anciennes sauvegardes (progression sans choix de départ) : les 8 imposés restent, on en choisit 2 de plus
const lgLegacy = () => !lg.start && (Object.keys(lg.beaten).length > 0 || !!lg.run);
// équipe conseillée : parmi les Pokémon disponibles, les 6 qui contrent le mieux les types de la région (1 légendaire max, types variés)
function recommendTeam(region, pool){
  const foes = [...new Set(LEAGUE.find(r => r.id === region).trainers.flatMap(t => t.mons))];
  const off = k => { const ts = [...new Set(MONS[k].moves.map(m => MOVES[m]).filter(m => m.p).map(m => m.t))];
    return foes.reduce((a, f) => a + (ts.length ? Math.max(...ts.map(t => typeScale(effMult(t, MONS[f].types))*(MONS[k].types.includes(t) ? 1.25 : 1))) : 1), 0)/foes.length; };
  const def = k => foes.reduce((a, f) => a + Math.max(...MONS[f].types.map(t => typeScale(effMult(t, MONS[k].types)))), 0)/foes.length;
  const base = Object.fromEntries(pool.map(k => [k, off(k) - .8*def(k) + .6*MONS[k].bst/600]));
  const team = [];
  while (team.length < 6){ let best = null, bv = -1e9;
    for (const k of pool){ if (team.includes(k) || (MONS[k].legend && team.some(x => MONS[x].legend))) continue;
      const v = base[k] - .15*team.reduce((a, x) => a + MONS[k].types.filter(t => MONS[x].types.includes(t)).length, 0);
      if (v > bv){ bv = v; best = k; } }
    if (!best) break; team.push(best); }
  return team;
}
// une région s'ouvre quand le Maître de la précédente est battu (au bout d'une Ligue complète)
const regionOpen = i => i === 0 || lg.all || !!lg.beaten[LEAGUE[i-1].trainers.at(-1).id];
// Ligue en cours : région, équipe et difficulté fixées, i = prochain dresseur ; retry = seconde chance restante (1 par Ligue), ensuite une défaite y met fin
const lgRun = () => lg.run && LEAGUE.some(r => r.id === lg.run.region) ? lg.run : null;
function fightNext(){ const run = lgRun(), t = LEAGUE.find(r => r.id === run.region).trainers[run.i];
  $('league').hidden = true;
  startMatch({pk:run.team.slice(), ek:t.mons.slice(), eName:t.name, dk:run.dk, arena:t.arena, vs2:false, league:{id:t.id, name:t.name}}); }
function startRun(region, team, dk){ lg.run = {region, i:0, team:team.slice(), dk, retry:1}; lgSave(); fightNext(); }
function leagueAbandon(){ lg.run = null; lgSave(); }

// ---------- écran de la Ligue ----------
let lgRegion = null, lgNext = null, lgStep = 'diff', lgPick = [];   // lgStep : départ (une seule fois), difficulté, puis régions et équipe
if (!Array.isArray(sel.lgTeam)) sel.lgTeam = [];
function renderLeague(){
  const un = unlockedSet(), run = lgRun();
  if (run) lgStep = 'main'; else if (!lg.start && !lg.all) lgStep = 'start';
  $('lgStepStart').hidden = lgStep !== 'start'; $('lgStepDiff').hidden = lgStep !== 'diff'; $('lgStepMain').hidden = lgStep !== 'main';
  $('lgTitle').textContent = lgStep === 'start' ? 'Pokémon de départ' : lgStep === 'diff' ? 'Difficulté' : run ? 'Ligue en cours · ' + DIFFS[run.dk].label : 'Région et équipe · ' + DIFFS[sel.d].label;
  if (lgStep === 'start'){ renderStart(); return; }
  const rt = sel.lgReady && TEAMS.find(t => t.id === sel.lgReady && teamFree(t));   // équipe prête prise en entier
  if (!rt) sel.lgReady = null;
  sel.lgTeam = sel.lgTeam.filter(k => un.has(k) || (rt && rt.mons.includes(k)));
  if (run) lgRegion = run.region;
  if (!lgRegion || !regionOpen(LEAGUE.findIndex(r => r.id === lgRegion))) lgRegion = LEAGUE[LEAGUE.reduce((m, r, i) => regionOpen(i) ? i : m, 0)].id;
  $('lgSummary').textContent = `Pokémon débloqués : ${un.size}/${Object.keys(MONS).length}`;
  $('lgRegions').innerHTML = LEAGUE.map((r, i) => `<button class="pill" data-lgr="${r.id}" aria-pressed="${lgRegion === r.id}" ${regionOpen(i) && (!run || run.region === r.id) ? '' : 'disabled'}>${regionOpen(i) ? '' : '🔒 '}${r.name}${lg.beaten[r.trainers.at(-1).id] ? ' ✓' : ''}</button>`).join('');
  const R = LEAGUE.find(r => r.id === lgRegion), inRun = run && run.region === R.id, team = run ? run.team : sel.lgTeam, ready = team.length === 6;
  const names = ks => ks.map(k => MONS[k].name).join(', ');
  $('lgList').innerHTML = R.trainers.map((t, j) => { const st = inRun ? (j < run.i ? ' · ✓ battu' : j === run.i ? ' · à affronter' : '') : '', ever = !!lg.beaten[t.id];
    return `<div class="team lgt${t.champion ? ' champ' : ''}${inRun && j === run.i ? ' next' : ''}${inRun && j < run.i ? ' done' : ''}">
      <div class="th"><b>${t.name}</b><small>${t.title}${st}</small></div>
      <div class="minis">${t.mons.map(k => `<div class="m">${pic(k,36)}<i>${MONS[k].name}</i></div>`).join('')}</div>
      ${t.reward.length ? `<small class="rw">${ever ? 'Débloqué' : 'Débloque'} : ${names(t.reward)}${t.team ? ' + l’' + TEAMS.find(x => x.id === t.team).name.replace(/^É/, 'é') + ' (prête)' : ''}</small>` : ''}</div>`; }).join('');
  $('lgChal').innerHTML = R.challenges.length ? '<h3>Défis</h3>' + R.challenges.map(c => `<p class="note">${lg.chal[c.id] ? '✓' : '☆'} ${c.text} → débloque ${names(c.reward)}</p>`).join('') : '';
  const dk = run ? run.dk : sel.d;
  $('lgDiff').innerHTML = diffCards(dk, 'data-lgd');
  $('lgTeamCount').textContent = `${team.length}/6`;
  const freeTeams = TEAMS.filter(t => teamFree(t) || t.mons.every(k => un.has(k)));
  $('lgReady').innerHTML = run ? '' : `<button class="btn" data-lga="reco">Équipe conseillée pour ${R.name}</button>` + freeTeams.map(t => `<button class="pill" data-lgt="${t.id}" aria-pressed="${sel.lgReady === t.id}">${t.legend ? '★ ' : ''}${t.name}</button>`).join('');
  $('lgTeam').innerHTML = [...new Set([...un, ...team])].sort((a, b) => MONS[a].name.localeCompare(MONS[b].name, 'fr')).map(k => { const i = team.indexOf(k);
    return `<button class="mon" data-lgm="${k}" aria-pressed="${i >= 0}" ${run ? 'disabled' : ''}>${i >= 0 ? `<span class="num">${i+1}</span>` : ''}${MONS[k].legend ? '<span class="leg">★</span>' : ''}${pic(k,46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`; }).join('');
  $('lgHint').textContent = run ? `Ligue en cours : équipe et difficulté sont fixées jusqu'à la fin. ${(run.retry ?? 1) > 0 ? 'Seconde chance disponible : à la première défaite, tu pourras rejouer le combat.' : 'Seconde chance utilisée : une défaite fait recommencer depuis le début.'}`
    : 'Choisis 6 Pokémon (1 légendaire ★ maximum). Tu as droit à une seconde chance par Ligue ; à la défaite suivante, il faut recommencer depuis le premier membre du Conseil.';
  $('lgActions').innerHTML = inRun ? `<button class="go" data-lga="next">Affronter ${R.trainers[run.i].name} (${run.i + 1}/${R.trainers.length})${(run.retry ?? 1) > 0 ? ' · ♥ 1 seconde chance' : ''}</button><button class="btn" data-lga="quit">Abandonner la Ligue</button>`
    : `<button class="btn" data-lga="diff">Difficulté : ${DIFFS[sel.d].label}</button><button class="go" data-lga="start" ${ready ? '' : 'disabled'}>${ready ? 'Commencer la Ligue de ' + R.name : 'Choisis encore ' + (6 - team.length) + ' Pokémon'}</button>`;
  hydrate($('league'));
}
// ---------- choix des Pokémon de départ ----------
function renderStart(){
  const fixed = lgLegacy() ? LEAGUE_START : [];
  if (!lgPick.length) lgPick = fixed.slice();
  const pool = [...new Set([...fixed, ...START_POOL])];
  $('lgStartNote').textContent = fixed.length ? `Nouveau : tu peux choisir tes Pokémon de départ. Tes ${fixed.length} Pokémon de départ restent ; choisis-en ${START_N - fixed.length} de plus.`
    : `Choisis tes ${START_N} premiers Pokémon. Les autres se débloquent en battant les membres de la Ligue.`;
  $('lgStartCount').textContent = `${lgPick.length}/${START_N}`;
  $('lgStart').innerHTML = pool.map(k => `<button class="mon" data-lgs="${k}" aria-pressed="${lgPick.includes(k)}" ${fixed.includes(k) ? 'disabled' : ''}>${lgPick.includes(k) ? '<span class="num">✓</span>' : ''}${pic(k,46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`).join('');
  $('lgStartGo').disabled = lgPick.length !== START_N;
  $('lgStartGo').textContent = lgPick.length === START_N ? 'Valider mes Pokémon' : `Choisis encore ${START_N - lgPick.length} Pokémon`;
  hydrate($('lgStart'));
}
$('lgStartGo').onclick = () => { if (lgPick.length !== START_N) return; lg.start = lgPick.slice(); lgPick = []; lgSave(); lgStep = 'diff'; renderLeague(); renderMenu(); $('league').scrollTop = 0; };
function openLeague(step){ lgStep = step === 'main' ? 'main' : 'diff'; renderLeague(); $('menu').hidden = true; $('league').hidden = false; $('league').scrollTop = 0; }
function closeLeague(){ if (lgStep === 'main' && !lgRun()){ lgStep = 'diff'; renderLeague(); $('league').scrollTop = 0; return; }   // retour : régions → difficulté → accueil
  $('league').hidden = true; $('menu').hidden = false; goScreen('home'); }
addEventListener('keydown', e => { if (e.code === 'Escape' && !$('league').hidden) closeLeague(); });
$('openLeague').onclick = openLeague; $('closeLeague').onclick = closeLeague;
$('league').addEventListener('click', e => {
  const b = e.target.closest('[data-lgr],[data-lgm],[data-lgd],[data-lga],[data-lgs],[data-lgt]'); if (!b || b.disabled) return; const y = $('league').scrollTop;
  if (b.dataset.lgs){ const k = b.dataset.lgs, i = lgPick.indexOf(k); if (i >= 0) lgPick.splice(i, 1); else if (lgPick.length < START_N) lgPick.push(k); renderStart(); $('league').scrollTop = y; return; }
  if (b.dataset.lgr) lgRegion = b.dataset.lgr;
  else if (b.dataset.lgt){ const t = TEAMS.find(x => x.id === b.dataset.lgt); sel.lgTeam = t.mons.slice(); sel.lgReady = t.id; save(); }
  else if (b.dataset.lga === 'reco'){ sel.lgTeam = recommendTeam(lgRegion, [...unlockedSet()]); sel.lgReady = null; save(); }
  else if (b.dataset.lgd){ sel.d = b.dataset.lgd; save(); lgStep = 'main'; renderLeague(); $('league').scrollTop = 0; return; }
  else if (b.dataset.lga === 'diff'){ lgStep = 'diff'; renderLeague(); $('league').scrollTop = 0; return; }
  else if (b.dataset.lgm){ const k = b.dataset.lgm, i = sel.lgTeam.indexOf(k); sel.lgReady = null;
    if (i >= 0) sel.lgTeam.splice(i, 1); else if (MONS[k].legend && sel.lgTeam.some(x => MONS[x].legend)) return; else if (sel.lgTeam.length < 6) sel.lgTeam.push(k); save(); }
  else if (b.dataset.lga === 'start'){ startRun(lgRegion, sel.lgTeam, sel.d); return; }
  else if (b.dataset.lga === 'next'){ fightNext(); return; }
  else if (b.dataset.lga === 'quit'){ if (!confirm('Abandonner cette Ligue ? Il faudra la recommencer depuis le début.')) return; leagueAbandon(); }
  renderLeague(); $('league').scrollTop = y;
});
$('lgAll').onclick = () => { if (confirm('Débloquer toutes les régions et tous les Pokémon ?')){ lg.all = true; lgSave(); renderLeague(); } };
$('lgReset').onclick = () => { if (confirm('Effacer toute ta progression dans la Ligue ?')){ lg = {beaten:{}, chal:{}, all:false}; lgPick = []; lgSave(); renderLeague(); renderMenu(); } };

// fin d'un combat de Ligue : victoire (dresseur suivant, déblocages, défis) ou défaite (la Ligue est à recommencer)
function leagueResult(win, pAlive){
  const run = lgRun(), t = LG_TRAINER[game.league.id], R = LEAGUE.find(r => r.id === t.region), msgs = [];
  if (!run){ lgNext = 'back'; return {msg:'', label:'Retour à la Ligue'}; }
  if (!win && (run.retry ?? 1) > 0){ run.retry = 0; lgSave(); lgNext = 'next';   // seconde chance : on rejoue le même dresseur
    return {msg:`Seconde chance utilisée : tu peux rejouer contre ${t.name}. La prochaine défaite fera recommencer la Ligue.`, label:`Réessayer contre ${t.name}`}; }
  if (!win){ lgNext = {region:run.region, team:run.team, dk:run.dk}; leagueAbandon();
    return {msg:`La Ligue de ${R.name} est perdue : il faut la recommencer depuis ${R.trainers[0].name}.`, label:'Recommencer la Ligue'}; }
  const before = unlockedSet(), first = !lg.beaten[t.id], res = {lost:game.ps.team.length - pAlive, time:game.fightT};
  lg.beaten[t.id] = true;
  for (const c of R.challenges) if (c.trainer === t.id && !lg.chal[c.id] && c.test(res)) lg.chal[c.id] = true;
  run.i++; if (t.champion) lg.run = null;
  lgSave();
  const fresh = [...unlockedSet()].filter(k => !before.has(k));
  if (fresh.length) msgs.push('Débloqué : ' + fresh.map(k => MONS[k].name).join(', ') + ' !');
  if (t.champion){ msgs.push(`Ligue de ${R.name} terminée !`); const ri = LEAGUE.indexOf(R); if (first && LEAGUE[ri + 1]) msgs.push(`Région ${LEAGUE[ri + 1].name} débloquée !`); lgNext = 'back'; return {msg:msgs.join(' '), label:'Retour à la Ligue'}; }
  lgNext = 'next'; return {msg:msgs.join(' '), label:`Affronter ${R.trainers[run.i].name}`};
}
function leagueAgain(){ if (lgNext === 'next') fightNext(); else if (lgNext && lgNext.region) startRun(lgNext.region, lgNext.team, lgNext.dk); else toMenu(); }

renderMenu();   // le menu dépend des Pokémon débloqués : rendu une fois la Ligue chargée
AUDIO.music('menu');   // démarre au premier geste du joueur (règle des navigateurs)
