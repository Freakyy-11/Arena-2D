// Modes de jeu : statistiques de fin de combat, tutoriel guidé, Tour de combat (rogue-lite)
// =====================================================================
// STATISTIQUES DE FIN DE COMBAT
// =====================================================================
// les compteurs (dmgDone, hits, seHits, kos) sont remplis par hit() dans jeu.js
function renderEndStats(){
  const g = game, sum = (t, k) => Math.round(t.reduce((a, f) => a + (f[k] || 0), 0)), score = f => (f.dmgDone || 0) + 40*(f.kos || 0);
  const P = g.ps.team, E = g.es.team, mvp = [...P, ...E].reduce((b, f) => score(f) > score(b) ? f : b);
  const row = (l, k) => `<tr><th>${l}</th><td>${sum(P, k)}</td><td>${sum(E, k)}</td></tr>`;
  $('endStats').innerHTML = `<table class="stats"><thead><tr><th></th><td>${g.vs2 ? 'Joueur 1' : g.spectate ? 'IA 1' : 'Toi'}</td><td>${g.vs2 ? 'Joueur 2' : g.spectate ? 'IA 2' : 'Adversaire'}</td></tr></thead>
    <tbody>${row('Dégâts infligés', 'dmgDone')}${row('K.O.', 'kos')}${row('Coups réussis', 'hits')}${row('Super efficaces', 'seHits')}</tbody></table>
    <div class="mvp">${pic(mvp.key, 46)}<div><small>Meilleur Pokémon du combat</small><b>${mvp.d.name}</b><span>${Math.round(mvp.dmgDone || 0)} dégâts · ${mvp.kos || 0} K.O.</span></div></div>
    <p class="note">Durée : ${Math.floor(g.fightT/60)} min ${String(Math.round(g.fightT % 60)).padStart(2, '0')} s</p>`;
  hydrate($('endStats'));
}

// =====================================================================
// TUTORIEL : un combat guidé contre un Ronflex d'entraînement qui ne riposte pas
// =====================================================================
let tuto = null;
const TUTO_KEYS = {
  mouse:{move:'ZQSD (ou les flèches)', aim:'la souris', atk:['clic gauche', 'clic droit', 'A', 'E'], dash:'Espace', sw:"les touches 1 à 6 (ou un clic sur la barre d'équipe)", mega:'R'},
  pad:{move:'le stick gauche', aim:'le stick droit', atk:['L1', 'L2', 'R1', 'R2'], dash:'✕', sw:'Carré ou Rond pour choisir, puis Triangle', mega:'la flèche du haut'},
  touch:{move:'le joystick à gauche', aim:"en faisant glisser le doigt depuis un bouton d'attaque", atk:['le 1er bouton', 'le 2e bouton', 'le 3e bouton', 'le 4e bouton'], dash:'le bouton Dash', sw:"la barre d'équipe au-dessus des boutons", mega:'le bouton Méga en bas à droite'}};
const sigSlot = f => f.d.moves.findIndex(m => MOVES[m].k === 'sig');
const TUTO_STEPS = [
  {id:'move', txt:k => `Déplace-toi avec ${k.move}.`},
  {id:'attack', txt:k => `Approche-toi du Ronflex d'entraînement et attaque-le : vise avec ${k.aim}, puis utilise une attaque (${k.atk[1]}). L'attaque part quand tu relâches ; sans viser, elle va droit sur l'adversaire.`},
  {id:'dash', txt:k => `Esquive avec le Dash (${k.dash}) : un court instant d'invincibilité. Tu as 3 charges, partagées par toute l'équipe.`},
  {id:'sig', txt:(k, f) => `Chaque Pokémon a une attaque emblématique ★, plus puissante : utilise ${MOVES[f.d.moves[sigSlot(f)]].n} (${k.atk[sigSlot(f)]}).`},
  {id:'switch', txt:k => `Change de Pokémon avec ${k.sw}. Celui qui arrive est protégé un instant ; on peut changer toutes les 4 s.`},
  {id:'mega', txt:k => `Une fois par combat, un Pokémon compatible peut méga-évoluer et devenir bien plus fort : appuie sur ${k.mega}.`},
];
const tutoKeys = () => TUTO_KEYS[inputMode === 'pad' ? 'pad' : inputMode === 'touch' ? 'touch' : 'mouse'];
function startTuto(){
  tuto = {i:0, dist:0, done:false};
  startMatch({pk:['dracaufeu', 'lucario'], ek:['ronflex'], eName:"Ronflex d'entraînement", dk:'facile', arena:'stade', vs2:false, tuto:true});
  game.tuto = tuto; game.e.y = H*.45;   // le mannequin au milieu, sous la consigne
  tutoShow();
}
function tutoShow(){
  $('tutoTxt').textContent = TUTO_STEPS[tuto.i].txt(tutoKeys(), game.p); $('tutoN').textContent = `Tutoriel · étape ${tuto.i + 1}/${TUTO_STEPS.length}`;
  Object.assign(tuto, {px:game.p.x, py:game.p.y, hp:game.e.hp, dash:game.ps.dashN, active:game.ps.active, t:0});
}
// appelé à chaque image pendant le tutoriel (simulation.js)
function tutoTick(dt){
  const g = game, f = g.p, e = g.e; if (!tuto || tuto.done || g.state !== 'fight') return;
  const s = TUTO_STEPS[tuto.i]; let ok = false; tuto.t += dt;
  if (s.id === 'move'){ tuto.dist += Math.hypot(f.x - tuto.px, f.y - tuto.py); tuto.px = f.x; tuto.py = f.y; ok = tuto.dist > 250; }
  else if (s.id === 'attack') ok = e.hp < tuto.hp;
  else if (s.id === 'dash') ok = g.ps.dashN < tuto.dash;
  else if (s.id === 'sig') ok = f.cds[sigSlot(f)] > 0;
  else if (s.id === 'switch') ok = g.ps.active !== tuto.active;
  else if (s.id === 'mega') ok = !!g.ps.megaUsed;
  if (e.hp < e.max*.4) e.hp = e.max; if (f.hp < f.max*.5) f.hp = f.max;   // personne ne tombe pendant le tutoriel
  if (s.id === 'attack') tuto.hp = Math.max(tuto.hp, e.hp);
  if (ok && tuto.t > .4){ AUDIO.ui('ok'); popText(f.x, f.y - 70, 'Bien joué !', '#4fd17a', 18); tuto.i++; if (tuto.i >= TUTO_STEPS.length) tutoEnd(); else tutoShow(); }
}
function tutoEnd(){
  if (!tuto || tuto.done) return; tuto.done = true; try { localStorage.setItem('arene-tuto', '1'); } catch(e){}
  game.state = 'end'; game.p.held.fill(false); $('tutoBox').hidden = true;
  $('endT').textContent = 'Tutoriel terminé !'; $('endT').style.color = 'var(--gold)';
  $('endS').textContent = "Tu connais les bases : déplacement, attaques, Dash, ★, changement et Méga-évolution. Prochaine étape : la Ligue Pokémon !";
  $('endStats').innerHTML = ''; $('again').textContent = 'Commencer la Ligue'; $('again').hidden = false; $('toMenu').textContent = 'Menu';
  $('ovEnd').hidden = false; AUDIO.stopMusic(); AUDIO.end(true);
}
$('tutoSkip').onclick = tutoEnd;
$('openTuto').onclick = startTuto;


// =====================================================================
// TOUR DE COMBAT : on commence en 2 contre 2 ; un Pokémon de plus après chaque gardien (tous les 5 étages), jusqu'à 6.
// Les PV sont gardés d'un étage à l'autre. Les dégâts infligés rapportent de l'argent (₽) ; après chaque étage,
// un bonus gratuit parmi 3, puis les autres s'achètent, de plus en plus cher.
// =====================================================================
// 25 étages : un gardien (avec un légendaire) tous les 5 étages, le dernier est le Maître de la Tour (deux légendaires)
const TOUR_FLOORS = 25;
let tour = null, tourBest = 0, tourDone = {}, tourDraft = [], tourDraftPick = [];
try { tourBest = +localStorage.getItem('arene-tour') || 0; tourDone = JSON.parse(localStorage.getItem('arene-tour-fin') || '{}') || {}; } catch(e){}
const tourSave = () => { try { localStorage.setItem('arene-tour', String(tourBest)); localStorage.setItem('arene-tour-fin', JSON.stringify(tourDone)); } catch(e){} };
const shuffled = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const TOUR_BONUS = [
  {id:'heal', n:'Soins complets', d:"Toute l'équipe récupère tous ses PV.", apply:t => { t.hp = t.hp.map(() => 1); }},
  {id:'atk', n:'Puissance +10 %', d:"Attaque et Atq. Spé. de toute l'équipe +10 % jusqu'à la fin de la Tour.", apply:t => { t.b.atk *= 1.1; }},
  {id:'def', n:'Résistance +10 %', d:"Défense et Déf. Spé. de toute l'équipe +10 %.", apply:t => { t.b.def *= 1.1; }},
  {id:'hp', n:'Vitalité +12 %', d:"PV max de toute l'équipe +12 %.", apply:t => { t.b.hp *= 1.12; }},
  {id:'cd', n:'Recharges −10 %', d:'Les attaques de ton équipe se rechargent 10 % plus vite.', apply:t => { t.b.cd *= .9; }},
];
const tourPool = t => [...unlockedSet()].filter(k => !MONS[k].legend && !(t || []).includes(k));

// ---------- tirage des 2 premiers Pokémon (écran du menu) ----------
function rollTourDraft(){ tourDraft = shuffled(tourPool()).slice(0, 8); tourDraftPick = []; renderTourDraft(); }
function renderTourDraft(){
  $('tourDiff').innerHTML = Object.keys(DIFFS).map(k => `<button class="pill" data-tdk="${k}" aria-pressed="${sel.d === k}">${DIFFS[k].label}${tourDone[k] ? ' ✓' : ''}</button>`).join('');   // une difficulté pour toute la Tour
  $('tourDraft').innerHTML = tourDraft.map(k => { const i = tourDraftPick.indexOf(k);
    return `<button class="mon" data-tk="${k}" aria-pressed="${i >= 0}">${i >= 0 ? `<span class="num">${i + 1}</span>` : ''}${pic(k, 46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`; }).join('');
  $('tourDraftN').textContent = `${tourDraftPick.length}/2`; $('tourGo').disabled = tourDraftPick.length !== 2;
  $('tourGo').textContent = tourDraftPick.length === 2 ? 'Commencer la Tour' : `Choisis encore ${2 - tourDraftPick.length} Pokémon`;
  hydrate($('tourDraft'));
}
$('tourDiff').addEventListener('click', e => { const b = e.target.closest('[data-tdk]'); if (!b) return; sel.d = b.dataset.tdk; save(); renderTourDraft(); });
$('tourDraft').addEventListener('click', e => { const b = e.target.closest('[data-tk]'); if (!b) return; const k = b.dataset.tk, i = tourDraftPick.indexOf(k);
  if (i >= 0) tourDraftPick.splice(i, 1); else if (tourDraftPick.length < 2) tourDraftPick.push(k); renderTourDraft(); });
$('tourReroll').onclick = rollTourDraft;
$('tourGo').onclick = () => { if (tourDraftPick.length === 2) startTour(tourDraftPick); };

// ---------- étages ----------
function startTour(pk){ tour = {team:pk.slice(), dk:sel.d, floor:1, hp:pk.map(() => 1), b:{atk:1, def:1, hp:1, cd:1}, money:0, price:30, over:false}; tourFight(); }
function tourFight(){
  const n = tour.team.length, ek = shuffled(tourPool(tour.team)).slice(0, n), boss = tour.floor % 5 === 0, last = tour.floor === TOUR_FLOORS;   // l'adversaire a autant de Pokémon que toi
  if (boss){ const legs = shuffled(Object.keys(MONS).filter(k => MONS[k].legend && !tour.team.includes(k))); ek[n - 1] = legs[0]; if (last && n > 1) ek[n - 2] = legs[1]; }   // gardien : un légendaire ; Maître : deux
  startMatch({pk:tour.team.slice(), ek, eName:last ? 'Maître de la Tour' : boss ? `Gardien de l'étage ${tour.floor}` : `Étage ${tour.floor}/${TOUR_FLOORS}`, dk:tour.dk, arena:ARENA_LIST[Math.floor(Math.random()*ARENA_LIST.length)][0], vs2:false, tour:true});
  game.tour = tour;
  game.ps.team.forEach((f, i) => { f.st.atk *= tour.b.atk; f.st.spa *= tour.b.atk; f.st.def *= tour.b.def; f.st.spd *= tour.b.def; f.max = Math.round(f.max*tour.b.hp); f.hp = Math.round(f.max*tour.hp[i]); });
  const first = game.ps.team.findIndex(f => f.hp > 0);
  if (first > 0) sendIn(game.ps, first, false); else buildCard('p');
  buildBench();
}
// fin d'un étage : message et libellé du bouton principal (null = l'écran des récompenses prend le relais)
function tourResult(win){
  if (!win){ tour.over = true; const n = tour.floor - 1, rec = n > tourBest; if (rec){ tourBest = n; tourSave(); }
    return {msg:`La Tour s'arrête à l'étage ${tour.floor}. ${rec ? `Nouveau record : ${n} étage${n > 1 ? 's' : ''} !` : `Record : ${tourBest} étage${tourBest > 1 ? 's' : ''}.`}`, label:'Recommencer la Tour'}; }
  if (tour.floor >= TOUR_FLOORS){ tour.over = true; const first = !tourDone[tour.dk]; tourDone[tour.dk] = true; tourBest = Math.max(tourBest, TOUR_FLOORS); tourSave();
    return {msg:`Tu as vaincu le Maître de la Tour : Tour terminée en ${DIFFS[tour.dk].label} !${first ? ' Essaie la difficulté au-dessus !' : ''}`, label:'Nouvelle Tour'}; }
  const earn = Math.round(game.ps.team.reduce((a, f) => a + (f.dmgDone || 0), 0)/5) + 5*tour.floor, boss = tour.floor % 5 === 0;
  tour.money += earn;
  tour.hp = game.ps.team.map(f => f.hp > 0 ? Math.min(1, f.hp/f.max + .15) : .25);   // entre deux étages : +15 % de PV, les K.O. reviennent à 25 %
  if (tour.floor > tourBest){ tourBest = tour.floor; tourSave(); }
  tour.floor++;
  tour.phase = boss && tour.team.length < 6 ? 'mon' : 'bonus';
  tour.monOffer = shuffled(tourPool(tour.team)).slice(0, 3);
  tour.offer = shuffled(TOUR_BONUS).slice(0, 3); tour.taken = []; tour.free = true;
  renderTourPick(); $('tourPick').hidden = false;
  return {msg:`Étage ${tour.floor - 1}/${TOUR_FLOORS} réussi : +${earn} ₽.`, label:null};
}
function renderTourPick(){
  const t = tour, head = `<p class="money">Argent : <b>${t.money} ₽</b></p>`;
  if (t.phase === 'mon'){
    $('tourPick').innerHTML = head + `<p class="note">Gardien vaincu ! Un nouveau Pokémon rejoint ton équipe (${t.team.length + 1}/6) : choisis-le.</p><div class="monpick">`
      + t.monOffer.map(k => `<button class="mon" data-tmon="${k}">${pic(k, 46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`).join('') + '</div>';
    hydrate($('tourPick')); return; }
  $('tourPick').innerHTML = head + `<p class="note">${t.free ? 'Choisis un bonus gratuit.' : `Achète d'autres bonus si tu veux (le prix augmente à chaque achat), puis passe à l'étage ${t.floor}${t.floor === TOUR_FLOORS ? ' : le Maître de la Tour et ses deux légendaires t\'attendent' : t.floor % 5 === 0 ? ' : un gardien légendaire t\'attend' : ''}.`}</p>`
    + t.offer.map(b => { const taken = t.taken.includes(b.id), cost = t.free ? 0 : t.price;
      return `<button class="bonus${taken ? ' taken' : ''}" data-bonus="${b.id}" ${taken || (!t.free && t.money < cost) ? 'disabled' : ''}><b>${b.n}<em>${taken ? 'Pris' : t.free ? 'Gratuit' : cost + ' ₽'}</em></b><small>${b.d}</small></button>`; }).join('')
    + `<button class="go" data-tnext ${t.free ? 'disabled' : ''}>Étage ${t.floor}</button>`;
}
$('tourPick').addEventListener('click', e => { const t = tour; if (!t) return;
  const m = e.target.closest('[data-tmon]'), b = e.target.closest('[data-bonus]'), nx = e.target.closest('[data-tnext]');
  if (m){ t.team.push(m.dataset.tmon); t.hp.push(1); t.phase = 'bonus'; renderTourPick(); return; }
  if (b && !b.disabled){ const bo = TOUR_BONUS.find(x => x.id === b.dataset.bonus);
    if (t.free) t.free = false; else { if (t.money < t.price) return; t.money -= t.price; t.price = Math.round(t.price*1.6/5)*5; }
    bo.apply(t); t.taken.push(bo.id); renderTourPick(); return; }
  if (nx && !nx.disabled){ $('tourPick').hidden = true; tourFight(); } });
function renderTourInfo(){ const el = $('tourInfo'); if (!el) return; const done = Object.keys(DIFFS).filter(k => tourDone[k]).map(k => DIFFS[k].label);
  el.textContent = done.length ? `Terminée en ${done.join(', ')} ✓` : tourBest ? `Record : étage ${tourBest}/${TOUR_FLOORS}` : `${TOUR_FLOORS} étages · nouveau mode`; }
renderTourInfo();
