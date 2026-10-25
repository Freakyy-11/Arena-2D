// Ligue Pokémon : régions débloquées l'une après l'autre (Conseil 4 + Maître), Pokémon jouables débloqués en gagnant
// =====================================================================
// LIGUE
// =====================================================================
const LEAGUE_START = ['dracaufeu','leviator','gorythmic','pyrax','lucario','ronflex','gardevoir','zeraora'];
// adversaires dans l'ordre ; reward = Pokémon débloqués en gagnant ; arena = arène du combat
const LEAGUE = [
  {id:'kanto', name:'Kanto', trainers:[
    {id:'kanto-olga', name:'Olga', title:'Conseil 4 · Glace', arena:'couronne', mons:['crustabri','lippoutou','lamantine','momartik','mammochon','lokhlass'], reward:['mammochon','lamantine','lokhlass']},
    {id:'kanto-aldo', name:'Aldo', title:'Conseil 4 · Combat', arena:'stade', mons:['kicklee','tygnon','grolem','lucario','tyranocif','mackogneur'], reward:['tyranocif','mackogneur']},
    {id:'kanto-agatha', name:'Agatha', title:'Conseil 4 · Spectre', arena:'chateau', mons:['arbok','sinistrail','flamigator','momartik','naganadel','ectoplasma'], reward:['sinistrail','arbok','ectoplasma']},
    {id:'kanto-peter', name:'Peter', title:'Conseil 4 · Dragon', arena:'pilier', mons:['ptera','leviator','carchacrok','lanssorien','dracaufeu','dracolosse'], reward:['ptera','dracolosse']},
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
   challenges:[]}
];
const LG_TRAINER = {}; for (const r of LEAGUE) for (const t of r.trainers) LG_TRAINER[t.id] = {...t, region:r.id};

// progression gardée sur l'appareil
let lg = {beaten:{}, chal:{}, all:false};
try { Object.assign(lg, JSON.parse(localStorage.getItem('arene-ligue') || '{}')); } catch(e){}
const lgSave = () => { try { localStorage.setItem('arene-ligue', JSON.stringify(lg)); } catch(e){} };
function unlockedSet(){
  if (lg.all) return new Set(Object.keys(MONS));
  const s = new Set(LEAGUE_START);
  for (const r of LEAGUE){ for (const t of r.trainers) if (lg.beaten[t.id]) t.reward.forEach(k => s.add(k)); for (const c of r.challenges) if (lg.chal[c.id]) c.reward.forEach(k => s.add(k)); }
  return s;
}
const isUnlocked = k => unlockedSet().has(k);
// une région s'ouvre quand le Maître de la précédente est battu (au bout d'une Ligue complète)
const regionOpen = i => i === 0 || lg.all || !!lg.beaten[LEAGUE[i-1].trainers.at(-1).id];
// Ligue en cours : région, équipe et difficulté fixées, i = prochain dresseur ; une défaite y met fin (il faut recommencer)
const lgRun = () => lg.run && LEAGUE.some(r => r.id === lg.run.region) ? lg.run : null;
function fightNext(){ const run = lgRun(), t = LEAGUE.find(r => r.id === run.region).trainers[run.i];
  $('league').hidden = true;
  startMatch({pk:run.team.slice(), ek:t.mons.slice(), eName:t.name, dk:run.dk, arena:t.arena, vs2:false, league:{id:t.id, name:t.name}}); }
function startRun(region, team, dk){ lg.run = {region, i:0, team:team.slice(), dk}; lgSave(); fightNext(); }
function leagueAbandon(){ lg.run = null; lgSave(); }

// ---------- écran de la Ligue ----------
let lgRegion = null, lgNext = null;
if (!Array.isArray(sel.lgTeam)) sel.lgTeam = [];
function renderLeague(){
  const un = unlockedSet(), run = lgRun();
  sel.lgTeam = sel.lgTeam.filter(k => un.has(k));
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
      ${t.reward.length ? `<small class="rw">${ever ? 'Débloqué' : 'Débloque'} : ${names(t.reward)}</small>` : ''}</div>`; }).join('');
  $('lgChal').innerHTML = R.challenges.length ? '<h3>Défis</h3>' + R.challenges.map(c => `<p class="note">${lg.chal[c.id] ? '✓' : '☆'} ${c.text} → débloque ${names(c.reward)}</p>`).join('') : '';
  const dk = run ? run.dk : sel.d;
  $('lgDiff').innerHTML = Object.keys(DIFFS).map(k => `<button class="pill" data-lgd="${k}" aria-pressed="${dk === k}" ${run ? 'disabled' : ''}>${DIFFS[k].label}</button>`).join('');
  $('lgTeamCount').textContent = `${team.length}/6`;
  $('lgTeam').innerHTML = [...un].sort((a, b) => MONS[a].name.localeCompare(MONS[b].name, 'fr')).map(k => { const i = team.indexOf(k);
    return `<button class="mon" data-lgm="${k}" aria-pressed="${i >= 0}" ${run ? 'disabled' : ''}>${i >= 0 ? `<span class="num">${i+1}</span>` : ''}${MONS[k].legend ? '<span class="leg">★</span>' : ''}${pic(k,46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`; }).join('');
  $('lgHint').textContent = run ? "Ligue en cours : équipe et difficulté sont fixées jusqu'à la fin. Une défaite fait recommencer depuis le début."
    : 'Choisis 6 Pokémon (1 légendaire ★ maximum). Une défaite fera recommencer la Ligue depuis le premier membre du Conseil.';
  $('lgActions').innerHTML = inRun ? `<button class="go" data-lga="next">Affronter ${R.trainers[run.i].name} (${run.i + 1}/${R.trainers.length})</button><button class="btn" data-lga="quit">Abandonner la Ligue</button>`
    : `<button class="go" data-lga="start" ${ready ? '' : 'disabled'}>${ready ? 'Commencer la Ligue de ' + R.name : 'Choisis encore ' + (6 - team.length) + ' Pokémon'}</button>`;
  hydrate($('league'));
}
function openLeague(){ renderLeague(); $('menu').hidden = true; $('league').hidden = false; }
function closeLeague(){ $('league').hidden = true; $('menu').hidden = false; renderMenu(); }
$('openLeague').onclick = openLeague; $('closeLeague').onclick = closeLeague;
$('league').addEventListener('click', e => {
  const b = e.target.closest('[data-lgr],[data-lgm],[data-lgd],[data-lga]'); if (!b || b.disabled) return; const y = $('league').scrollTop;
  if (b.dataset.lgr) lgRegion = b.dataset.lgr;
  else if (b.dataset.lgd){ sel.d = b.dataset.lgd; save(); }
  else if (b.dataset.lgm){ const k = b.dataset.lgm, i = sel.lgTeam.indexOf(k);
    if (i >= 0) sel.lgTeam.splice(i, 1); else if (MONS[k].legend && sel.lgTeam.some(x => MONS[x].legend)) return; else if (sel.lgTeam.length < 6) sel.lgTeam.push(k); save(); }
  else if (b.dataset.lga === 'start'){ startRun(lgRegion, sel.lgTeam, sel.d); return; }
  else if (b.dataset.lga === 'next'){ fightNext(); return; }
  else if (b.dataset.lga === 'quit'){ if (!confirm('Abandonner cette Ligue ? Il faudra la recommencer depuis le début.')) return; leagueAbandon(); }
  renderLeague(); $('league').scrollTop = y;
});
$('lgAll').onclick = () => { if (confirm('Débloquer toutes les régions et tous les Pokémon ?')){ lg.all = true; lgSave(); renderLeague(); } };
$('lgReset').onclick = () => { if (confirm('Effacer toute ta progression dans la Ligue ?')){ lg = {beaten:{}, chal:{}, all:false}; lgSave(); renderLeague(); } };

// fin d'un combat de Ligue : victoire (dresseur suivant, déblocages, défis) ou défaite (la Ligue est à recommencer)
function leagueResult(win, pAlive){
  const run = lgRun(), t = LG_TRAINER[game.league.id], R = LEAGUE.find(r => r.id === t.region), msgs = [];
  if (!run){ lgNext = 'back'; return {msg:'', label:'Retour à la Ligue'}; }
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
