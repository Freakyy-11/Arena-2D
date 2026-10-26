// Succès, défi du jour, notifications et explications des statuts
// =====================================================================
// NOTIFICATIONS (petit bandeau en haut de l'écran)
// =====================================================================
const toastQ = [];
function toast(title, text, kind = ''){ toastQ.push({title, text, kind}); if (toastQ.length === 1) toastNext(); }
function toastNext(){
  const t = toastQ[0]; if (!t) return; const el = $('toast');
  el.className = 'toast ' + t.kind; el.innerHTML = `<b>${t.title}</b><span>${t.text}</span>`; el.hidden = false;
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; toastQ.shift(); toastNext(); }, 300); }, t.kind === 'tip' ? 5200 : 3400);
}

// =====================================================================
// EXPLICATIONS DES STATUTS : la première fois qu'un statut apparaît en combat
// =====================================================================
const STATUS_TIP = {
  burn:"Brûlé : ses attaques physiques font 25 % de dégâts en moins, et il perd des PV pendant 5 s.",
  poison:"Empoisonné : il perd 4 % de ses PV max chaque seconde pendant 5 s.",
  slow:"Ralenti : il se déplace beaucoup moins vite pendant un moment.",
  stun:"Étourdi : il ne peut ni bouger ni attaquer pendant un court instant.",
  sleep:"Endormi : il ne peut plus rien faire jusqu'au réveil.",
  atkDown:"Attaque baissée : ses attaques physiques font moins de dégâts pendant 5 s.",
  defDown:"Défense baissée : il encaisse plus de dégâts physiques pendant 4 s.",
  spdDown:"Déf. Spé. baissée : il encaisse plus de dégâts spéciaux pendant 4 s.",
  grounded:"Au sol : un Pokémon Vol qui se pose perd son type Vol (il devient sensible aux attaques Sol).",
};
let tipsSeen = {}; try { tipsSeen = JSON.parse(localStorage.getItem('arene-astuces') || '{}') || {}; } catch(e){}
// appelé par updateHUD avec les statuts actifs d'un Pokémon
function statusTips(keys){ for (const k of keys) if (STATUS_TIP[k] && !tipsSeen[k]){ tipsSeen[k] = 1; try { localStorage.setItem('arene-astuces', JSON.stringify(tipsSeen)); } catch(e){} toast(STATUS[k][0], STATUS_TIP[k], 'tip'); } }

// =====================================================================
// SUCCÈS
// =====================================================================
let succ = {}, cnt = {kos:0, sigKos:0, se:0, wins:0, defis:0};
try { succ = JSON.parse(localStorage.getItem('arene-succes') || '{}') || {}; Object.assign(cnt, JSON.parse(localStorage.getItem('arene-compteurs') || '{}') || {}); } catch(e){}
const succSave = () => { try { localStorage.setItem('arene-succes', JSON.stringify(succ)); localStorage.setItem('arene-compteurs', JSON.stringify(cnt)); } catch(e){} };
const legendsUnlocked = () => [...unlockedSet()].filter(k => MONS[k].legend).length;
// goal / val : succès à progression (affichage « 37/50 ») ; test(c) : c = résultat du dernier combat (ou rien hors combat)
const SUCCES = [
  {id:'premiere', reward:['altaria'], n:'Première victoire', d:'Gagner un combat.', test:() => cnt.wins >= 1},
  {id:'victoires', reward:['dracolosse'], n:'Habitué de l\'arène', d:'Gagner 50 combats.', goal:50, val:() => cnt.wins},
  {id:'parfait', reward:['metalosse'], n:'Sans une égratignure', d:'Gagner un combat à 3 contre 3 ou plus sans perdre un seul Pokémon.', test:c => c && c.win && c.lost === 0 && c.size >= 3},
  {id:'dernier', reward:['lanssorien'], n:'Dernier debout', d:'Gagner avec un seul Pokémon encore debout, à moins de 15 % de ses PV.', test:c => c && c.win && c.alive === 1 && c.lastHp < .15},
  {id:'eclair', reward:['drattak'], n:'Éclair', d:'Gagner un combat à 6 contre 6 en moins de 100 secondes.', test:c => c && c.win && c.size >= 6 && c.time < 100},
  {id:'mega', reward:['absol'], n:'Méga-puissance', d:'Méga-évoluer pendant un combat.', test:c => c && c.mega},
  {id:'types', reward:['tyranocif'], n:'Expert des types', d:'Réussir 100 coups super efficaces.', goal:100, val:() => cnt.se},
  {id:'signature', reward:['carchacrok'], n:'Signature', d:'Mettre 25 Pokémon K.O. avec une attaque ★.', goal:25, val:() => cnt.sigKos},
  {id:'centurion', reward:['glaivodo'], n:'Centurion', d:'Mettre 200 Pokémon K.O.', goal:200, val:() => cnt.kos},
  {id:'enfer', reward:['trioxhydre'], n:'Revenu des Enfers', d:'Gagner un combat en difficulté Enfer.', test:c => c && c.win && c.diff === 'enfer'},
  {id:'maitre1', n:'Maître de Ligue', d:'Battre le Maître d\'une région.', test:() => LEAGUE.some(r => lg.beaten[r.trainers.at(-1).id])},
  {id:'maitres', n:'Légende des Ligues', d:'Battre les Maîtres des 8 régions.', goal:8, val:() => LEAGUE.filter(r => lg.beaten[r.trainers.at(-1).id]).length},
  {id:'legende', n:'Légendaire', d:'Débloquer un Pokémon légendaire.', test:() => legendsUnlocked() >= 1},
  {id:'collection', n:'Collectionneur', d:'Débloquer 100 Pokémon.', goal:100, val:() => unlockedSet().size},
  {id:'pokedex', n:'Pokédex complet', d:'Débloquer tous les Pokémon.', goal:() => Object.keys(MONS).length, val:() => unlockedSet().size},
  {id:'tour10', reward:['lougaroc'], n:'Grimpeur', d:'Atteindre l\'étage 10 de la Tour de combat.', goal:10, val:() => Math.min(10, tourBest)},
  {id:'tourfin', reward:['muplodocus'], n:'Maître de la Tour', d:'Terminer la Tour de combat.', test:() => Object.keys(tourDone).length > 0},
  {id:'tourchamp', n:'Sommet de la Tour', d:'Terminer la Tour en Champion ou en Enfer.', test:() => tourDone.champion || tourDone.enfer},
  {id:'defi1', reward:['feunardalola'], n:'Défi relevé', d:'Réussir un défi du jour.', test:() => cnt.defis >= 1},
  {id:'defi7', n:'Assidu', d:'Réussir 7 défis du jour.', goal:7, val:() => cnt.defis},
  {id:'tuto', reward:['cleopsytra'], n:'Apprenti', d:'Terminer le tutoriel.', test:() => { try { return !!localStorage.getItem('arene-tuto'); } catch(e){ return false; } }},
];
const succGoal = s => typeof s.goal === 'function' ? s.goal() : s.goal;
function checkSucces(c){
  for (const s of SUCCES){ if (succ[s.id]) continue;
    if (s.goal ? s.val() >= succGoal(s) : s.test(c)){ succ[s.id] = Date.now(); toast('Succès débloqué : ' + s.n, s.reward ? 'Débloque ' + s.reward.map(k => MONS[k].name).join(', ') + ' !' : s.d, 'gold'); AUDIO.ui('ok'); } }
  succSave(); renderSuccesBadge(); if (!$('menu').hidden) renderMenu();
}
// fin de combat : compteurs cumulés (ton équipe uniquement) puis vérification
function succesAfterMatch(win, pAlive){
  const g = game; if (!g || g.vs2 || g.spectate || g.tuto) return;
  const T = g.ps.team, sum = k => T.reduce((a, f) => a + (f[k] || 0), 0), alive = T.filter(f => f.hp > 0);
  cnt.kos += sum('kos'); cnt.sigKos += sum('sigKos'); cnt.se += sum('seHits'); if (win) cnt.wins++;
  checkSucces({win, lost:T.length - pAlive, size:T.length, alive:alive.length, lastHp:alive.length === 1 ? alive[0].hp/alive[0].max : 1, time:g.fightT, diff:Object.keys(DIFFS).find(k => DIFFS[k] === g.diff), mega:!!g.ps.megaUsed});
}
function renderSuccesBadge(){ const el = $('succInfo'); if (el) el.textContent = `${Object.keys(succ).filter(k => SUCCES.some(s => s.id === k)).length}/${SUCCES.length} débloqués`; }
function renderSucces(){
  $('succList').innerHTML = SUCCES.map(s => { const done = !!succ[s.id], g = s.goal ? succGoal(s) : 0, v = s.goal ? Math.min(g, s.val()) : 0;
    return `<div class="succ${done ? ' done' : ''}"><span class="ico">${done ? '★' : '☆'}</span><div><b>${s.n}</b><small>${s.d}</small>${s.reward ? `<span class="rew">${s.reward.map(k => pic(k, 30) + `<i>${done ? '' : 'Débloque '}${MONS[k].name}</i>`).join('')}</span>` : ''}${s.goal && !done ? `<i class="prog"><b style="width:${Math.round(v/g*100)}%"></b></i><em>${v}/${g}</em>` : ''}${done ? `<em>Débloqué le ${new Date(succ[s.id]).toLocaleDateString('fr-FR')}</em>` : ''}</div></div>`; }).join('');
  hydrate($('succList'));
}
$('openSucces').onclick = () => { renderSucces(); goScreen('succes'); };

// =====================================================================
// DÉFI DU JOUR : la même équipe imposée et la même règle pour tout le monde, chaque jour
// =====================================================================
const DEFI_RULES = [
  {t:'Gagner le combat.', test:() => true},
  {t:'Gagner en perdant au plus 2 Pokémon.', test:r => r.lost <= 2},
  {t:'Gagner en moins de 3 minutes.', test:r => r.time < 180},
  {t:'Gagner avec au moins 6 coups super efficaces.', test:r => r.se >= 6},
  {t:'Gagner sans méga-évolution.', test:r => !r.mega},
  {t:'Gagner en perdant au plus 1 Pokémon.', test:r => r.lost <= 1},
];
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function seeded(str){ let h = 1779033703 ^ str.length; for (let i=0;i<str.length;i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0)/4294967296; }; }
let defiDone = {}; try { defiDone = JSON.parse(localStorage.getItem('arene-defis') || '{}') || {}; } catch(e){}
function defiToday(){
  const day = dayKey(), r = seeded('defi-' + day), pool = Object.keys(MONS).filter(k => !MONS[k].legend).sort(), pick = n => { const out = []; while (out.length < n){ const k = pool[Math.floor(r()*pool.length)]; if (!out.includes(k)) out.push(k); } return out; };
  const pk = pick(6), ek = pick(12).filter(k => !pk.includes(k)).slice(0, 6), rule = DEFI_RULES[Math.floor(r()*DEFI_RULES.length)], arena = ARENA_LIST[Math.floor(r()*ARENA_LIST.length)][0];
  return {day, pk, ek, rule, arena};
}
function renderDefiInfo(){ const el = $('defiInfo'); if (!el) return; const d = defiToday(); el.textContent = (defiDone[d.day] ? '✓ Réussi · ' : '') + d.rule.t; }
$('openDefi').onclick = () => { const d = defiToday(); startMatch({pk:d.pk, ek:d.ek, eName:'Défi du jour', dk:'normal', arena:d.arena, vs2:false, defi:d}); game.defi = d; };
// fin d'un défi : message et réussite
function defiResult(win, pAlive){
  const d = game.defi, T = game.ps.team, r = {lost:T.length - pAlive, time:game.fightT, se:T.reduce((a, f) => a + (f.seHits || 0), 0), mega:!!game.ps.megaUsed};
  const ok = win && d.rule.test(r);
  if (ok && !defiDone[d.day]){ defiDone[d.day] = true; cnt.defis++; try { localStorage.setItem('arene-defis', JSON.stringify(defiDone)); } catch(e){} }
  return ok ? `Défi du jour réussi : ${d.rule.t.replace(/\.$/, '')} ✓` : `Défi : ${d.rule.t} ${win ? 'Condition non remplie, réessaie !' : 'Réessaie !'}`;
}
renderSuccesBadge(); renderDefiInfo();
