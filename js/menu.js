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

function renderMenu(){
  $('pickMode').innerHTML = [['teams','Équipes prêtes'],['build','Composer mon équipe']].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${sel.mode===k}">${l}</button>`).join('');
  $('paneTeams').hidden = sel.mode !== 'teams'; $('paneBuild').hidden = sel.mode !== 'build';
  $('pickTeam').innerHTML = TEAMS.map(t => `<button class="team" data-k="${t.id}" aria-pressed="${sel.team===t.id}">
      <div class="th"><b>${t.name}</b><small>${t.mons.reduce((a,k)=>a+MONS[k].bst,0)} pts de stats</small></div>
      <div class="minis">${t.mons.map(k => `<div class="m">${pic(k,40)}<i>${MONS[k].name}</i></div>`).join('')}</div></button>`).join('');
  $('pickBuild').innerHTML = Object.keys(MONS).sort((a,b)=>MONS[a].name.localeCompare(MONS[b].name,'fr')).map(k => { const i = sel.build.indexOf(k);
    return `<button class="mon" data-k="${k}" aria-pressed="${i>=0}">${i>=0?`<span class="num">${i+1}</span>`:''}${pic(k,46)}<b>${MONS[k].name}</b><div class="types">${chips(MONS[k].types)}</div></button>`; }).join('');
  $('buildCount').textContent = `${sel.build.length}/6`;
  $('pickVs').innerHTML = [['ai', "Contre l'IA"], ['p2', '2 joueurs']].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${(sel.vs || 'ai')===k}">${l}</button>`).join('');
  $('vsNote').hidden = sel.vs !== 'p2'; $('stepD').hidden = sel.vs === 'p2'; $('eTitle').textContent = sel.vs === 'p2' ? 'Équipe du joueur 2' : "Équipe de l'IA";
  $('pickE').innerHTML = [['random','Aléatoire'], ...TEAMS.map(t=>[t.id,t.name])].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${sel.e===k}">${l}</button>`).join('');
  $('pickD').innerHTML = Object.keys(DIFFS).map(k => `<button class="pill" data-k="${k}" aria-pressed="${sel.d===k}">${DIFFS[k].label}</button>`).join('');
  $('pickA').innerHTML = [['random','Aléatoire'], ...ARENA_LIST].map(([k,l]) => `<button class="pill" data-k="${k}" aria-pressed="${(sel.arena || 'random')===k}">${l}</button>`).join('');
  $('start').disabled = sel.mode === 'build' && sel.build.length !== 6;
  $('start').textContent = $('start').disabled ? `Choisis encore ${6 - sel.build.length} Pokémon` : 'Combattre';
  hydrate($('menu'));
}
$('menu').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  const pane = b.parentElement.id, k = b.dataset.k;
  if (pane === 'pickMode') sel.mode = k;
  else if (b.classList.contains('team')) sel.team = k;
  else if (pane === 'pickBuild'){ const i = sel.build.indexOf(k); if (i >= 0) sel.build.splice(i,1); else if (sel.build.length < 6) sel.build.push(k); }
  else if (pane === 'pickVs') sel.vs = k;
  else if (pane === 'pickE') sel.e = k;
  else if (pane === 'pickD') sel.d = k;
  else if (pane === 'pickA') sel.arena = k;
  else return;
  save(); const y = $('menu').scrollTop; renderMenu(); $('menu').scrollTop = y;
});
renderMenu();


// ---------- Fiche des attaques ----------
const pct = v => Math.round(v*100) + ' %';
const fr = v => String(Math.round(v*10)/10).replace('.', ',');
const STAT_FR = {atk:'Attaque', spa:'Atq. Spé.', spe:'Vitesse'};
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
function moveRow(k){
  const mv = MOVES[k], cat = mv.c === 'ph' ? 'Physique' : mv.c === 'sp' ? 'Spécial' : 'Statut';
  const pow = mv.p ? `Puissance ${mv.p}${mv.per ? ' par coup' : ''} · ` : '';
  return `<div class="mvr${mv.k === 'sig' ? ' sig' : ''}" style="--tc:${TYPES[mv.t][1]}"><div class="mh"><b>${mv.k === 'sig' ? '★ ' : ''}${mv.n}</b>${chips([mv.t])}<small>${cat} · ${pow}Recharge ${fr(mv.cd)} s</small></div><p>${moveDesc(mv)}</p></div>`;
}
function monCard(k){
  const m = MONS[k], b = m.base, mv = [...m.moves].sort((x,y) => (MOVES[y].k === 'sig') - (MOVES[x].k === 'sig'));
  return `<article class="pk"><div class="ph">${pic(k,44)}<div><b>${m.name}</b><div class="types">${chips(m.types)}</div></div></div>
    <div class="stats">PV ${b[0]} · Atq ${b[1]} · Déf ${b[2]} · Atq.Spé ${b[3]} · Déf.Spé ${b[4]} · Vit ${b[5]}</div>${mv.map(moveRow).join('')}</article>`;
}
let dexTab = null;
function renderDex(){
  const tabs = [...TEAMS.map(t => [t.id, t.name]), ['all','Tous']];
  if (sel.mode === 'build' && sel.build.length) tabs.unshift(['mine','Mon équipe']);
  if (!dexTab || !tabs.some(t => t[0] === dexTab)) dexTab = sel.mode === 'build' && sel.build.length ? 'mine' : sel.team;
  $('dexTabs').innerHTML = tabs.map(([k,l]) => `<button class="pill" data-tab="${k}" aria-pressed="${dexTab === k}">${l}</button>`).join('');
  const keys = dexTab === 'all' ? Object.keys(MONS).sort((a,b) => MONS[a].name.localeCompare(MONS[b].name,'fr'))
    : dexTab === 'mine' ? sel.build : TEAMS.find(t => t.id === dexTab).mons;
  $('dexList').innerHTML = keys.map(monCard).join('');
  hydrate($('dexList'));
}
$('dexTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; dexTab = b.dataset.tab; renderDex(); $('dex').scrollTop = 0; });
const openDex = () => { renderDex(); $('menu').hidden = true; $('dex').hidden = false; $('dex').scrollTop = 0; };
const closeDex = () => { $('dex').hidden = true; $('menu').hidden = false; };
$('openDex').onclick = openDex; $('closeDex').onclick = closeDex;
addEventListener('keydown', e => { if (e.code === 'Escape' && !$('dex').hidden) closeDex(); });
