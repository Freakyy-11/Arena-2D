// Menu : choix de l'équipe, de l'adversaire, de la difficulté et de l'arène ; fiche des attaques
// =====================================================================
// MENU
// =====================================================================
const $ = id => document.getElementById(id);
const sel = { mode:'teams', team:'dracolosse', build:[], e:'random', d:'normal', arena:'random' };
try { const s = JSON.parse(localStorage.getItem('arene-sel-v2')||'null'); if (s) Object.assign(sel, s); } catch(e){}
const save = () => { try{ localStorage.setItem('arene-sel-v2', JSON.stringify(sel)); }catch(e){} };
const tokenBg = t => t.length>1 ? `linear-gradient(135deg, ${TYPES[t[0]][1]} 50%, ${TYPES[t[1]][1]} 50%)` : TYPES[t[0]][1];
const chips = types => types.map(t=>`<span class="chip" style="background:${TYPES[t][1]}">${TYPES[t][0]}</span>`).join('');

function pic(k, size){
  const m = MONS[k], img = Math.round(size*1.35);
  return `<div class="pic" style="width:${size}px;height:${size}px"><img data-k="${k}" data-s="${size}" alt="" width="${img}" height="${img}" style="margin:${-(img-size)/2}px" src="${SPRITE_URL(m.id)}"></div>`;
}
function tokenHTML(k, size){ const m = MONS[k];
  return `<div class="token" style="width:${size*.8}px;height:${size*.8}px;background:${tokenBg(m.types)};font-size:${Math.max(9,size*.24)}px">${m.ab}</div>`; }
function hydrate(root){
  root.querySelectorAll('img[data-k]').forEach(img => {
    const swap = () => { img.parentElement.innerHTML = tokenHTML(img.dataset.k, +img.dataset.s); };
    if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener('error', swap, {once:true});
  });
}

let legendWarn = false;
function renderMenu(){
  // Pokémon pas encore débloqués dans la Ligue : grisés, et les équipes qui en contiennent sont verrouillées
  const un = unlockedSet(); sel.build = sel.build.filter(k => un.has(k));
  const lockedN = t => t.mons.filter(k => !un.has(k)).length;
  if (!renderMenu.done && sel.mode === 'teams' && TEAMS.every(t => lockedN(t) > 0)) sel.mode = 'build';   // à l'ouverture, si aucune équipe prête n'est débloquée : on compose la sienne
  renderMenu.done = true;
  $('pickMode').innerHTML = [['teams','Équipes prêtes'],['build','Composer mon équipe']].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${sel.mode===k}">${l}</button>`).join('');
  $('paneTeams').hidden = sel.mode !== 'teams'; $('paneBuild').hidden = sel.mode !== 'build';
  const teamCard = t => `<button class="team${lockedN(t) ? ' locked' : ''}" data-k="${t.id}" aria-pressed="${sel.team===t.id}" ${lockedN(t) ? 'disabled' : ''}>
      <div class="th"><b>${lockedN(t) ? '🔒 ' : ''}${t.name}</b><small>${lockedN(t) ? lockedN(t) + ' Pokémon à débloquer dans la Ligue' : t.mons.reduce((a,k)=>a+MONS[k].bst,0) + ' pts de stats'}</small></div>
      <div class="minis">${t.mons.map(k => `<div class="m">${pic(k,40)}<i>${MONS[k].name}</i></div>`).join('')}</div></button>`;
  // équipes classiques, puis équipes légendaires (un légendaire ★ chacune)
  const legTeams = TEAMS.filter(t => t.legend);
  $('pickTeam').innerHTML = TEAMS.filter(t => !t.legend).map(teamCard).join('') + (legTeams.length ? `<div class="teamsHead">Équipes légendaires <small>un légendaire ★ par équipe</small></div>` + legTeams.map(teamCard).join('') : '');
  $('pickBuild').innerHTML = Object.keys(MONS).sort((a,b)=>MONS[a].name.localeCompare(MONS[b].name,'fr')).map(k => { const i = sel.build.indexOf(k);
    return `<button class="mon" data-k="${k}" aria-pressed="${i>=0}" ${un.has(k) ? '' : 'disabled title="À débloquer dans la Ligue"'}>${un.has(k) ? '' : '<span class="lock">🔒</span>'}${i>=0?`<span class="num">${i+1}</span>`:''}${MONS[k].legend ? '<span class="leg">★</span>' : ''}${pic(k,46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`; }).join('');
  $('buildCount').textContent = `${sel.build.length}/6`;
  $('pickVs').innerHTML = [['ai', "Contre l'IA"], ['p2', '2 joueurs'], ['spec', 'IA contre IA']].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${(sel.vs || 'ai')===k}">${l}</button>`).join('');
  $('vsNote').hidden = sel.vs !== 'p2'; $('specNote').hidden = sel.vs !== 'spec'; $('stepD').hidden = sel.vs === 'p2'; $('eTitle').textContent = sel.vs === 'p2' ? 'Équipe du joueur 2' : sel.vs === 'spec' ? "Équipe de l'IA 2" : "Équipe de l'IA";
  $('pickE').innerHTML = [['random','Aléatoire'], ...TEAMS.map(t=>[t.id,(t.legend ? '★ ' : '') + t.name])].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${sel.e===k}">${l}</button>`).join('');
  $('pickD').innerHTML = Object.keys(DIFFS).map(k => `<button class="pill" data-k="${k}" aria-pressed="${sel.d===k}">${DIFFS[k].label}</button>`).join('');
  $('pickA').innerHTML = [['random','Aléatoire'], ...ARENA_LIST].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${(sel.arena || 'random')===k}">${l}</button>`).join('');
  const teamLocked = sel.mode === 'teams' && lockedN(TEAMS.find(t => t.id === sel.team) || TEAMS[0]) > 0;
  $('start').disabled = (sel.mode === 'build' && sel.build.length !== 6) || teamLocked;
  $('start').textContent = teamLocked ? 'Équipe verrouillée : débloque-la dans la Ligue' : $('start').disabled ? `Choisis encore ${6 - sel.build.length} Pokémon` : 'Combattre';
  hydrate($('menu'));
}
$('menu').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]'); if (!b) return;   // button : le portrait (img[data-k]) n'est pas la tuile
  const pane = b.parentElement.id, k = b.dataset.k;
  if (pane === 'pickMode') sel.mode = k;
  else if (b.classList.contains('team')) sel.team = k;
  else if (pane === 'pickBuild'){ const i = sel.build.indexOf(k);
    if (i >= 0) sel.build.splice(i,1);
    else if (MONS[k].legend && sel.build.some(x => MONS[x].legend)) legendWarn = true;   // 1 légendaire maximum par équipe
    else if (sel.build.length < 6) sel.build.push(k); }
  else if (pane === 'pickVs') sel.vs = k;
  else if (pane === 'pickE') sel.e = k;
  else if (pane === 'pickD') sel.d = k;
  else if (pane === 'pickA') sel.arena = k;
  else return;
  save(); const y = $('menu').scrollTop; renderMenu(); $('menu').scrollTop = y;
  if (legendWarn){ legendWarn = false; const c = $('buildCount'); c.textContent = '1 légendaire max !'; c.style.color = 'var(--foe)';
    clearTimeout(c.tm); c.tm = setTimeout(() => { c.textContent = `${sel.build.length}/6`; c.style.color = ''; }, 1800); }
});


// ---------- Fiche des attaques ----------
const pct = v => Math.round(v*100) + ' %';
const fr = v => String(Math.round(v*10)/10).replace('.', ',');
const STAT_FR = {atk:'Attaque', spa:'Atq. Spé.', spe:'Vitesse', spd:'Déf. Spé.'};
// description d'une attaque, tirée de ses données (ou écrite à la main pour les ★)
function moveDesc(mv){
  if (mv.desc) return mv.desc;
  const base = {
    proj:'Projectile.', spread:`Éventail de ${mv.cnt} projectiles.`, homing:`${mv.cnt > 1 ? mv.cnt + ' projectiles' : 'Projectile'} à tête chercheuse.`,
    psy:'Zone visée qui frappe après un court délai.', quake:'Onde de choc tout autour du lanceur.', melee:'Coup au corps à corps.',
    dash:'Charge.' + (mv.inv ? ' Invulnérable pendant la charge.' : '') + (mv.recharge ? ' Le lanceur doit ensuite récupérer un instant.' : ''),
    buff: mv.buff ? Object.entries(mv.buff).map(([k,v]) => STAT_FR[k] + ' ×' + fr(v)).join(', ') + ` pendant ${mv.dur} s.` : '',
    heal:`Soigne ${pct(mv.pct)} des PV.`, ring:`Soigne peu à peu pendant ${mv.dur} s.`, mirror:'Renvoie les projectiles pendant un court instant (×1,5).',
    rest:'Soigne tous les PV et les statuts, puis s\'endort 4 s.', blink:'Téléportation dans la direction visée.'
  }[mv.k] || '';
  const fx = mv.fx || {}, extra = [];
  if (fx.burn) extra.push(fx.burn >= 1 ? 'Brûle.' : pct(fx.burn) + ' de chance de brûler.');
  if (fx.poison) extra.push(fx.poison >= 1 ? 'Empoisonne.' : pct(fx.poison) + ' de chance d\'empoisonner.');
  if (fx.slow) extra.push((fx.slow >= 1 ? 'Ralentit' : pct(fx.slow) + ' de chance de ralentir') + (fx.slowT ? ` ${fr(fx.slowT)} s.` : '.'));
  if (fx.stun) extra.push(pct(fx.stun) + ' de chance d\'étourdir.');
  if (fx.drain) extra.push('Vole ' + pct(fx.drain) + ' des dégâts en PV.');
  if (fx.recoil) extra.push('Le lanceur subit ' + pct(fx.recoil) + ' des dégâts.');
  if (fx.spdDown) extra.push(pct(fx.spdDown) + ' de chance de baisser la Déf. Spé. pendant 4 s.');
  if (fx.defDown) extra.push(pct(fx.defDown) + ' de chance de baisser la Défense pendant 4 s.');
  if (fx.atkDown) extra.push(fx.atkDown >= 1 ? 'Baisse l\'Attaque pendant 5 s.' : pct(fx.atkDown) + ' de chance de baisser l\'Attaque pendant 5 s.');
  if (mv.lock) extra.push(`Le lanceur ne peut ni bouger ni attaquer pendant ${fr(mv.lock)} s.`);
  if (mv.selfDown) extra.push(`Baisse les défenses du lanceur pendant ${mv.selfDown} s.`);
  if (fx.self) extra.push(Object.entries(fx.self).map(([k,v]) => STAT_FR[k] + ' ×' + fr(v)).join(', ') + ' quand ça touche.');
  if (mv.kb) extra.push('Repousse.');
  return [base, ...extra].join(' ');
}
// Ordre des attaques : chaque joueur choisit sur quel bouton va chaque attaque (gardé sur l'appareil)
const DEFAULT_MOVES = Object.fromEntries(Object.keys(MONS).map(k => [k, MONS[k].moves.slice()]));
const SLOT_NAMES = ['L1', 'L2', 'R1', 'R2'];
let moveOrder = {}; try { moveOrder = JSON.parse(localStorage.getItem('arene-ordre') || '{}') || {}; } catch(e){}
for (const [k, o] of Object.entries(moveOrder)) if (MONS[k] && Array.isArray(o) && o.length === 4 && new Set(o).size === 4 && o.every(m => DEFAULT_MOVES[k].includes(m))) MONS[k].moves = o.slice(); else delete moveOrder[k];
function saveOrder(k){ const m = MONS[k].moves; if (m.every((x, n) => x === DEFAULT_MOVES[k][n])) delete moveOrder[k]; else moveOrder[k] = m.slice(); try { localStorage.setItem('arene-ordre', JSON.stringify(moveOrder)); } catch(e){} }
function moveSlot(k, i, d){ const m = MONS[k].moves, j = i + d; if (j < 0 || j > 3) return; [m[i], m[j]] = [m[j], m[i]]; saveOrder(k); }
function resetOrder(k){ MONS[k].moves = DEFAULT_MOVES[k].slice(); saveOrder(k); }
function moveRow(k, slot, mon){
  const mv = MOVES[k], cat = mv.c === 'ph' ? 'Physique' : mv.c === 'sp' ? 'Spécial' : 'Statut';
  const pow = mv.p ? `Puissance ${mv.p}${mv.per ? ' par coup' : ''} · ` : '';
  const ord = mon ? `<span class="ord"><button data-mv="${mon}" data-i="${slot}" data-d="-1" aria-label="Monter" ${slot === 0 ? 'disabled' : ''}>▲</button><button data-mv="${mon}" data-i="${slot}" data-d="1" aria-label="Descendre" ${slot === 3 ? 'disabled' : ''}>▼</button></span>` : '';
  return `<div class="mvr${mv.k === 'sig' ? ' sig' : ''}" style="--tc:${TYPES[mv.t][1]}"><div class="mh">${mon ? `<span class="slot">${SLOT_NAMES[slot]}</span>` : ''}<b>${mv.k === 'sig' ? '★ ' : ''}${mv.n}</b>${chips(mv.t2 ? [mv.t, mv.t2] : [mv.t])}<small>${cat} · ${pow}Recharge ${fr(mv.cd)} s</small>${ord}</div><p>${moveDesc(mv)}</p></div>`;
}
function monCard(k){
  const m = MONS[k], b = m.base, custom = !!moveOrder[k];
  return `<article class="pk"><div class="ph">${pic(k,44)}<div><b>${m.name}</b><div class="types">${chips(m.types)}</div></div>${custom ? `<button class="reset" data-reset="${k}">Ordre par défaut</button>` : ''}</div>
    <div class="stats">PV ${b[0]} · Atq ${b[1]} · Déf ${b[2]} · Atq.Spé ${b[3]} · Déf.Spé ${b[4]} · Vit ${b[5]}</div>${m.moves.map((mv, i) => moveRow(mv, i, k)).join('')}</article>`;
}
let dexTab = null;
function renderDex(){
  const tabs = [...TEAMS.map(t => [t.id, t.name]), ['legend','Légendaires'], ['all','Tous']];
  if (sel.mode === 'build' && sel.build.length) tabs.unshift(['mine','Mon équipe']);
  if (!dexTab || !tabs.some(t => t[0] === dexTab)) dexTab = sel.mode === 'build' && sel.build.length ? 'mine' : sel.team;
  $('dexTabs').innerHTML = tabs.map(([k,l]) => `<button class="pill" data-tab="${k}" aria-pressed="${dexTab === k}">${l}</button>`).join('');
  const keys = dexTab === 'all' ? Object.keys(MONS).sort((a,b) => MONS[a].name.localeCompare(MONS[b].name,'fr'))
    : dexTab === 'mine' ? sel.build : dexTab === 'legend' ? Object.keys(MONS).filter(k => MONS[k].legend) : TEAMS.find(t => t.id === dexTab).mons;
  $('dexList').innerHTML = keys.map(monCard).join('');
  hydrate($('dexList'));
}
$('dexList').addEventListener('click', e => {
  const b = e.target.closest('[data-mv], [data-reset]'); if (!b) return; const y = $('dex').scrollTop;
  if (b.dataset.reset) resetOrder(b.dataset.reset); else moveSlot(b.dataset.mv, +b.dataset.i, +b.dataset.d);
  renderDex(); $('dex').scrollTop = y;
});
$('dexTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; dexTab = b.dataset.tab; renderDex(); $('dex').scrollTop = 0; });
const openDex = () => { renderDex(); $('menu').hidden = true; $('dex').hidden = false; $('dex').scrollTop = 0; };
const closeDex = () => { $('dex').hidden = true; $('menu').hidden = false; };
$('openDex').onclick = openDex; $('closeDex').onclick = closeDex;
addEventListener('keydown', e => { if (e.code === 'Escape' && !$('dex').hidden) closeDex(); });

// ---------- Avertissement à l'ouverture ----------
$('splashGo').addEventListener('click', () => { $('splash').hidden = true; });
