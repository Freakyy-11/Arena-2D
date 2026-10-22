// Match : début de combat, changements de Pokémon, HUD, commandes (clavier, souris, manettes, tactile), lancement des attaques et dégâts
// =====================================================================
// JEU
// =====================================================================
// Arène : 760 × 760 (intérieur 656 × 656 entre les murs, décor dans la bordure), CX/CY = centre
const W = 760, H = 760, WALL = 52, CX = W/2, CY = H/2;
// décor de fond affiché au-dessus de l'arène (non jouable, coordonnées y négatives) : mise en scène façon théâtre
const BACKDROP_DEFAULT = 110;
let BACKDROP = BACKDROP_DEFAULT;   // une image d'arène peut demander plus de décor de fond (ARENA_IMAGES[...].backdrop)
const cv = $('cv'), ctx = cv.getContext('2d');
let view = {s:1, ox:0, oy:0, dpr:1};
let game = null, lastMatch = null;
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const rand = (a,b) => a + Math.random()*(b-a);
const foeOf = f => f.side === 'p' ? game.e : game.p;
const sideOf = f => f.side === 'p' ? game.ps : game.es;

function makeFighter(key, side){
  const d = MONS[key], b = d.base, s = v => Math.floor((2*v+31)/2)+5;
  const hp = Math.floor((2*b[0]+31)/2)+60;
  return { key, d, side, isAI: side === 'e', x:CX, y:CY, vx:0, vy:0, kx:0, ky:0, r:24, hp, max:hp,
    st:{atk:s(b[1]),def:s(b[2]),spa:s(b[3]),spd:s(b[4])},
    cds:[0,0,0,0], burn:0, poison:0, slow:0, stun:0, sleep:0, dot:0, mirror:0, ring:0, dash:null, recharge:0, inv:0,
    buff:{atk:1,spa:1,spe:1,spd:1}, buffT:0, busy:0, flash:0, face:1, bob:Math.random()*6, dead:0, koShown:false,
    act:null, hurtT:0, aimA:0, seed:Math.random()*600, roll:null, script:null, air:null, h:0, buried:false, root:0, slowF:.55, ghosts:[], ghT:0, holdT:[0,0,0,0], iceSpike:null, defDown:0, spdDown:0, atkDown:0, grounded:0, healT:0, healRate:0, recast:[0,0,0,0], recastN:[0,0,0,0], lastDir:{x:0, y: side === 'p' ? -1 : 1},
    held:[false,false,false,false], ai:{think:1, strafe:1, strafeT:0, swT:2} };
}
// Vitesse de déplacement compressée : 160 (Vit 30) → 230 (Vit 143)
const moveSpeed = f => (160 + (f.d.base[5]-30)/113*70) * f.buff.spe * (f.slow > 0 ? f.slowF : 1);

function resolveTeams(){
  const pk = sel.mode === 'build' ? sel.build.slice() : TEAMS.find(t=>t.id===sel.team).mons.slice();
  let et = sel.e;
  // adversaire au hasard : dans la même catégorie que ton équipe (avec ou sans légendaire)
  const legendSide = sel.mode === 'build' ? sel.build.some(k => MONS[k].legend) : !!TEAMS.find(t => t.id === sel.team).legend;
  if (et === 'random'){ const pool = TEAMS.filter(t => !!t.legend === legendSide && (sel.mode === 'build' || t.id !== sel.team)); et = pool[Math.floor(Math.random()*pool.length)].id; }
  const ar = !sel.arena || sel.arena === 'random' ? ARENA_LIST[Math.floor(Math.random()*ARENA_LIST.length)][0] : sel.arena;
  return {pk, ek: TEAMS.find(t=>t.id===et).mons.slice(), eName: TEAMS.find(t=>t.id===et).name, dk: sel.d, arena: ar, vs2: sel.vs === 'p2'};
}
function startMatch(m){
  lastMatch = m; touchAim = null;
  const ai = ARENA_IMAGES[m.arena]; BACKDROP = (ai && ARENA_IMG[m.arena] && ai.backdrop) || BACKDROP_DEFAULT;
  const ps = {team: m.pk.map(k => makeFighter(k,'p')), active:0, swCd:0, dashN:DASH_MAX, dashT:0, spawn:{x:CX,y:H-140}};
  const es = {team: m.ek.map(k => makeFighter(k,'e')), active:0, swCd:0, dashN:DASH_MAX, dashT:0, spawn:{x:CX,y:140}, name:m.eName};
  if (m.vs2) es.team.forEach(f => f.isAI = false);   // 2 joueurs : le joueur 2 remplace l'IA
  game = { ps, es, p:ps.team[0], e:es.team[0], diff: DIFFS[m.dk], arena: m.arena || 'stade', vs2: !!m.vs2,
    projs:[], zones:[], rings:[], parts:[], texts:[], slashes:[], ents:[], decals:[], dangers:[], shake:0, t:0, fightT:0,
    sflash:null, elec:0, frost:0, dim:0, zoom:1, hitstop:0,
    state:'intro', introT:2.6, introBig:true, koT:0, paused:false,
    rocks:[] };   // seuls obstacles : ceux créés par les attaques (piliers de Lame de Roc)
  Object.assign(game.p, ps.spawn); Object.assign(game.e, es.spawn);
  buildHUD(); buildMoves(); buildBench();
  $('menu').hidden = true; $('battle').hidden = false;
  for (const o of ['ovEnd','ovPause','ovChoose']) $(o).hidden = true;
  resize(); AUDIO.music(game.arena); AUDIO.duck(false);
}
$('start').onclick = () => { if (!$('start').disabled) startMatch(resolveTeams()); };
$('again').onclick = () => startMatch(sel.e === 'random' ? {...resolveTeams(), pk:lastMatch.pk, arena:lastMatch.arena} : lastMatch);   // la revanche garde l'arène
const toMenu = () => { game = null; AUDIO.stopMusic(); $('battle').hidden = true; $('menu').hidden = false; renderMenu(); };
$('toMenu').onclick = toMenu; $('quit').onclick = toMenu;
$('pauseBtn').onclick = () => setPause(true);
$('resume').onclick = () => setPause(false);
function setPause(v){ if (!game || game.state === 'end' || game.state === 'choose') return; game.paused = v; $('ovPause').hidden = !v; AUDIO.duck(v); if (v){ game.p.held.fill(false); game.e.held.fill(false); touchAim = null; } }
document.addEventListener('visibilitychange', () => { if (document.hidden && game && game.state === 'fight') setPause(true); });

// ---------- Changements de Pokémon ----------
function sendIn(side, idx, announce=true){
  const old = side.team[side.active], f = side.team[idx];
  const alive = old.hp > 0;
  f.x = alive ? old.x : side.spawn.x; f.y = alive ? old.y : side.spawn.y;
  f.vx = f.vy = f.kx = f.ky = 0; f.dash = null; f.roll = null; f.script = null; f.air = null; f.h = 0; f.buried = false; f.root = 0; f.act = null; f.hurtT = 0; f.stun = 0; f.recharge = 0; f.mirror = 0; f.ring = 0; f.slow = 0;
  f.buff = {atk:1,spa:1,spe:1,spd:1}; f.buffT = 0; f.busy = 0; f.inv = INV_ON_SWITCH; f.held.fill(false); f.defDown = f.spdDown = f.atkDown = f.grounded = f.healT = 0; f.recast.fill(0); f.recastN.fill(0);
  if (alive){ old.dash = null; old.roll = null; old.script = null; old.air = null; old.h = 0; old.buried = false; old.buff = {atk:1,spa:1,spe:1,spd:1}; old.buffT = 0; old.mirror = 0; old.ring = 0; old.held.fill(false); }
  side.active = idx;
  if (side === game.ps){ game.p = f; buildMoves(); } else game.e = f;
  for (const p of game.projs) if (p.target === old) p.target = f;
  buildCard(side === game.ps ? 'p' : 'e');
  burst(f.x, f.y, '#ffffff', 16, 160, 4);
  if (announce) AUDIO.swap();
  if (announce) popText(f.x, f.y - 52, (alive ? 'Changement : ' : 'Go ! ') + f.d.name, side === game.ps ? '#e6b84c' : '#ef5050', 14, 1);
}
function trySwitch(side, idx){
  if (!game || game.state !== 'fight' || game.paused) return false;
  const f = side.team[idx];
  if (!f || idx === side.active || f.hp <= 0 || side.swCd > 0) return false;
  const cur = side.team[side.active]; if (cur.stun > 0 && cur.sleep <= 0) return false;
  sendIn(side, idx); side.swCd = SWITCH_CD; return true;
}
function tryRoll(f, dx, dy){
  if (!game || game.state !== 'fight' || game.paused) return false;
  const side = sideOf(f);
  if (side.dashN < 1 || !canMove(f)) return false;
  let m = Math.hypot(dx, dy);
  if (m < .2){ dx = f.lastDir.x; dy = f.lastDir.y; m = 1; }
  if (side.dashN === DASH_MAX) side.dashT = DASH_REGEN;
  side.dashN--;
  f.roll = {vx:dx/m*DASH_SPD, vy:dy/m*DASH_SPD, t:DASH_DUR};
  f.inv = Math.max(f.inv, DASH_INV);
  burst(f.x, f.y, '#ffffff', 8, 120, 3); AUDIO.dash();
  return true;
}
const aliveIdx = side => side.team.map((f,i)=>f.hp>0?i:-1).filter(i=>i>=0);

// ---------- Affichage HUD ----------
function buildHUD(){ buildCard('p'); buildCard('e'); }
function buildCard(s){
  const side = s === 'p' ? game.ps : game.es, f = side.team[side.active], el = $(s === 'p' ? 'hudP' : 'hudE');
  el.innerHTML = `<div class="top"><span class="nm">${f.d.name}</span><span class="who">${s==='p' ? (game.vs2 ? 'Joueur 1' : 'Toi') : (game.vs2 ? 'Joueur 2' : 'IA · '+game.diff.label)}</span></div>
    <div class="types">${chips(f.d.types)}</div>
    <div class="bar"><i></i></div><div class="meta"><span class="balls"></span><span class="hpn"></span><span class="sts"></span></div>`;
  side.hud = { bar: el.querySelector('.bar i'), hpn: el.querySelector('.hpn'), sts: el.querySelector('.sts'), balls: el.querySelector('.balls'), last:'', lastB:'' };
}
function buildMoves(){
  $('moves').innerHTML = game.p.d.moves.map((k,i) => { const mv = MOVES[k];
    const tag = mv.c === 'ph' ? 'Physique' : mv.c === 'sp' ? 'Spécial' : 'Statut';
    return `<button class="mv" data-i="${i}" style="--tc:${TYPES[mv.t][1]}"><em></em><b>${mv.k === 'sig' ? '★ ' : ''}${mv.n}</b><span>${TYPES[mv.t][0]}${mv.t2 ? '/' + TYPES[mv.t2][0] : ''} · ${tag}</span></button>`; }).join('');
  game.p.btns = [...$('moves').querySelectorAll('.mv')];
  game.p.btns.forEach((b,i) => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){}
      if (!game) return;
      if (e.pointerType === 'mouse'){ press(i, 'auto'); return; }
      setMode('touch');
      touchAim = {i, id:e.pointerId, sx:e.clientX, sy:e.clientY, dx:0, dy:0, mag:0, active:false, t0:game.t};
    });
    b.addEventListener('pointermove', e => { if (!touchAim || touchAim.id !== e.pointerId) return;
      const dx = e.clientX - touchAim.sx, dy = e.clientY - touchAim.sy, m = Math.hypot(dx,dy);
      touchAim.active = m > AIM_DEAD; touchAim.dx = dx; touchAim.dy = dy; touchAim.mag = Math.max(0, Math.min(1, (m - AIM_DEAD)/AIM_FULL)); });
    const up = e => {
      if (game && game.p.held[i] === 'auto'){ if (e.type === 'pointerup') release(i, 'auto'); else game.p.held[i] = false; }
      if (touchAim && touchAim.id === e.pointerId){ const t = touchAim; touchAim = null;
        if (game && e.type === 'pointerup') use(game.p, t.i, t.active ? aimPoint(t, t.i) : null, {charge: game.t - t.t0}); }
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  labelControls();
}
function buildBench(){
  $('bench').innerHTML = game.ps.team.map((f,i) => `<button data-i="${i}" aria-label="${f.d.name}">${pic(f.key,34)}<span class="hb"><i></i></span><em class="tri">△</em></button>`).join('');
  hydrate($('bench'));
  game.ps.benchBtns = [...$('bench').querySelectorAll('button')];
}
$('bench').addEventListener('click', e => { const b = e.target.closest('button'); if (b && game) trySwitch(game.ps, +b.dataset.i); });
function hpColor(r){ return r > .5 ? 'var(--hp)' : r > .2 ? 'var(--hp-mid)' : 'var(--hp-low)'; }
function updateHUD(){
  for (const sd of [game.ps, game.es]) if (sd.swSel != null && ((sd.swSelT -= 1/60) <= 0 || sd.swSel === sd.active || sd.team[sd.swSel].hp <= 0)) sd.swSel = null;
  for (const side of [game.ps, game.es]){
    const f = side.team[side.active], r = f.hp / f.max, h = side.hud;
    h.bar.style.transform = `scaleX(${r})`; h.bar.style.background = hpColor(r);
    h.hpn.textContent = `${Math.ceil(f.hp)}/${f.max}`;
    const s = Object.keys(STATUS).filter(k => f[k] > 0).map(k => `<span class="st" style="background:${STATUS[k][1]}">${STATUS[k][0]}</span>`).join('');
    if (s !== h.last){ h.sts.innerHTML = s; h.last = s; }
    const b = side.team.map(x => x.hp > 0 ? '1' : '0').join('');
    if (b !== h.lastB){ h.balls.innerHTML = side.team.map(x => `<i class="${x.hp>0?'':'ko'}"></i>`).join(''); h.lastB = b; }
  }
  game.p.btns.forEach((b,i) => { const mv = MOVES[game.p.d.moves[i]]; const c = Math.max(0, game.p.cds[i] / mv.cd);
    b.style.setProperty('--cd', c.toFixed(3)); b.classList.toggle('ready', c === 0); b.classList.toggle('recast', game.p.recast[i] > 0); });
  const ps = game.ps;
  $('dashPips').querySelectorAll('i').forEach((pip,i) => { pip.classList.toggle('on', i < ps.dashN);
    pip.style.setProperty('--p', i === ps.dashN ? (1 - ps.dashT/DASH_REGEN).toFixed(3) : 0); });
  const cd = (game.ps.swCd / SWITCH_CD).toFixed(3);
  game.ps.benchBtns.forEach((b,i) => { const f = game.ps.team[i]; b.classList.toggle('pick', i === game.ps.swSel);
    b.classList.toggle('on', i === game.ps.active); b.classList.toggle('ko', f.hp <= 0);
    b.style.setProperty('--cd', cd);
    const hb = b.querySelector('.hb i'); hb.style.transform = `scaleX(${f.hp/f.max})`; hb.style.background = hpColor(f.hp/f.max); });
}

// ---------- Contrôles ----------
const keys = new Set();
const joy = {x:0, y:0, id:null};
const MOVE_KEYS = {KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
const ATK_KEYS = {KeyJ:0,KeyK:1,KeyL:2,Semicolon:3,KeyM:3};   // clavier seul : visée automatique
const AIM_KEYS = {KeyQ:2, KeyE:3};                             // à côté de ZQSD (A et E en AZERTY) : visée à la souris
// Visée : 'auto' (vers l'adversaire), 'mouse' (curseur), 'pad' (stick droit), ou un glissé tactile {dx,dy,mag}
const AIM_DEAD = 18, AIM_FULL = 70;
// Zones à distance (Psyko, Telluriforce, Chute Glace) : portée max et distance mini du lancer
const PSY_RANGE = 380, PSY_MIN = 60;
const clampRange = (f, x, y) => { const d = Math.hypot(x-f.x, y-f.y); return d <= PSY_RANGE ? {x, y} : {x: f.x + (x-f.x)/d*PSY_RANGE, y: f.y + (y-f.y)/d*PSY_RANGE}; };
let touchAim = null, inputMode = matchMedia('(pointer:fine)').matches ? 'mouse' : 'touch', keyQLabel = 'A';
try { navigator.keyboard.getLayoutMap().then(m => { const k = m.get('KeyQ'); if (k){ keyQLabel = k.toUpperCase(); labelControls(); } }).catch(()=>{}); } catch(e){}
const mouse = {x:0, y:0, seen:false};
const PAD_ATK = [4,6,5,7], PAD_LBL = ['L1','L2','R1','R2'];   // boutons standard : L1=4, L2=6, R1=5, R2=7
const mkPad = () => ({on:false, lx:0, ly:0, rx:0, ry:0, aimOn:false, aimA:0, aimMag:0, aimHold:0, t:0, prev:[]});
const pad = mkPad(), pad2 = mkPad();   // pad2 : manette du joueur 2 (mode 2 joueurs)
// Sticks : zone morte circulaire (et non axe par axe), remise à l'échelle pour repartir de 0 au bord de la zone.
// Visée : l'angle suit le stick avec un léger lissage, ne bouge que stick bien incliné,
// et reste figé un court instant quand le stick revient au centre (pour ne pas tirer de travers en le relâchant).
const PAD_DZ_MOVE = .15, PAD_DZ_AIM = .25, PAD_AIM_ON = .35, PAD_AIM_SMOOTH = 20, PAD_AIM_HOLD = .18;
function padStick(x, y, dz){ const m = Math.hypot(x, y); if (m < dz) return [0,0,0]; const k = Math.min(1, (m-dz)/(1-dz)); return [x/m*k, y/m*k, k]; }
// attaque maintenue : on vise ; au relâchement, l'attaque part vers le point visé
function press(i, src, f = game && game.p){ if (game && !f.held[i]){ f.held[i] = src; f.holdT[i] = game.t; } }
function release(i, src, f = game && game.p){
  if (!game) return; const h = f.held[i];
  if (!h || (src && h !== src)) return;
  f.held[i] = false; use(f, i, aimPoint(h, i, f), {charge: game.t - f.holdT[i]});
}
function setMode(m){ if (m === inputMode) return; inputMode = m; document.body.classList.toggle('pad', m === 'pad'); labelControls(); }
function labelControls(){
  if (!game || !game.p.btns) return;
  const L = inputMode === 'pad' ? PAD_LBL : inputMode === 'kb' ? ['J','K','L','M'] : ['Clic G','Clic D', keyQLabel, 'E'];
  game.p.btns.forEach((b,i) => b.querySelector('em').textContent = L[i]);
  $('dashBtn').querySelector('em').textContent = inputMode === 'pad' ? '✕' : 'Espace';
}
// point visé selon la source (null = visée automatique)
function aimPoint(src, i, f = game.p){
  if (src === 'pad2') return pad2.aimOn ? dirPoint(f, Math.cos(pad2.aimA), Math.sin(pad2.aimA), pad2.aimMag, i) : null;
  if (src === 'mouse') return mouse.seen ? {x:mouse.x, y:mouse.y} : null;
  if (src === 'pad') return pad.aimOn ? dirPoint(f, Math.cos(pad.aimA), Math.sin(pad.aimA), pad.aimMag, i) : null;
  if (src && src.dx !== undefined) return dirPoint(f, src.dx, src.dy, src.mag, i);
  return null;
}
// direction (dx,dy) → point visé ; pour une zone (Psyko…), la distance vient du glissé ou de l'inclinaison du stick (0..1)
function dirPoint(f, dx, dy, mag, i){
  const m = Math.hypot(dx,dy) || 1, mv = MOVES[f.d.moves[i]];
  const zone = mv.k === 'psy' || (mv.shape && ['zone','zone3','leap','lanezone'].includes(mv.shape[0])), R = mv.shape && mv.shape[0] === 'leap' ? mv.range : PSY_RANGE;
  const d = zone ? PSY_MIN + (mag != null ? mag : 1)*(R - PSY_MIN) : 200;
  return {x: f.x + dx/m*d, y: f.y + dy/m*d};
}

const SW_KEYS = {Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,Numpad5:4,Numpad6:5};
addEventListener('keydown', e => {
  if (!game) return;
  if (e.code === 'Escape' || e.code === 'KeyP'){ setPause(!game.paused); return; }
  if (MOVE_KEYS[e.code]){ keys.add(e.code); e.preventDefault(); }
  if (ATK_KEYS[e.code] !== undefined){ setMode('kb'); press(ATK_KEYS[e.code], 'auto'); e.preventDefault(); }
  if (AIM_KEYS[e.code] !== undefined){ setMode('mouse'); press(AIM_KEYS[e.code], 'mouse'); e.preventDefault(); }
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight'){ if (!e.repeat) tryRoll(game.p, ...playerInput()); e.preventDefault(); }
  if (SW_KEYS[e.code] !== undefined){
    if (game.state === 'choose') chooseNext(SW_KEYS[e.code]); else trySwitch(game.ps, SW_KEYS[e.code]);
    e.preventDefault();
  }
});
addEventListener('keyup', e => { keys.delete(e.code); if (!game) return;
  if (ATK_KEYS[e.code] !== undefined) release(ATK_KEYS[e.code], 'auto');
  if (AIM_KEYS[e.code] !== undefined) release(AIM_KEYS[e.code], 'mouse'); });
// Souris sur l'arène : position visée, clic gauche = attaque 1, clic droit = attaque 2
let lastTouch = 0;
addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') lastTouch = performance.now(); }, true);
const stageEl = $('stage');
function toWorld(e){ const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left - view.ox)/view.s, y:(e.clientY - r.top - view.oy)/view.s}; }
stageEl.addEventListener('mousemove', e => { if (performance.now() - lastTouch < 800) return; Object.assign(mouse, toWorld(e)); mouse.seen = true; });
stageEl.addEventListener('mousedown', e => {
  if (!game || performance.now() - lastTouch < 800 || (e.button !== 0 && e.button !== 2)) return;
  e.preventDefault(); Object.assign(mouse, toWorld(e)); mouse.seen = true; setMode('mouse');
  press(e.button === 0 ? 0 : 1, 'mouse');
});
addEventListener('mouseup', e => { if (!game || (e.button !== 0 && e.button !== 2)) return; release(e.button === 0 ? 0 : 1, 'mouse'); });
stageEl.addEventListener('contextmenu', e => e.preventDefault());

// Manette (API Gamepad, disposition standard) : lue à chaque image
// sticks d'une manette → déplacement et visée (P = état de la manette : pad ou pad2)
function readSticks(P, gp){
  const now = performance.now(), dt = Math.min(.05, (now - (P.t || now))/1000); P.t = now;
  [P.lx, P.ly] = padStick(gp.axes[0] || 0, gp.axes[1] || 0, PAD_DZ_MOVE);
  const [rx, ry, rk] = padStick(gp.axes[2] || 0, gp.axes[3] || 0, PAD_DZ_AIM); P.rx = rx; P.ry = ry;
  if (rk > PAD_AIM_ON){
    const want = Math.atan2(ry, rx);
    const wantMag = Math.min(1, (rk - PAD_AIM_ON)/(.95 - PAD_AIM_ON));
    if (!P.aimOn){ P.aimA = want; P.aimMag = wantMag; }
    else { const k = 1 - Math.exp(-dt*PAD_AIM_SMOOTH); let d = want - P.aimA; d = Math.atan2(Math.sin(d), Math.cos(d)); P.aimA += d*k; P.aimMag += (wantMag - P.aimMag)*k; }
    P.aimOn = true; P.aimHold = PAD_AIM_HOLD;
  } else if (P.aimOn && rk < PAD_AIM_ON*.6 && (P.aimHold -= dt) <= 0) P.aimOn = false;
}
// flèches gauche/droite : présélection du prochain Pokémon vivant de la barre d'équipe
function preselect(side, right){
  const al = aliveIdx(side).filter(i => i !== side.active); if (!al.length) return;
  const from = side.swSel != null ? side.swSel : side.active, n = side.team.length;
  side.swSel = right ? al.reduce((best,i) => ((i-from+n)%n || n) < ((best-from+n)%n || n) ? i : best)
                     : al.reduce((best,i) => ((from-i+n)%n || n) < ((from-best+n)%n || n) ? i : best);
  side.swSelT = 3;
}
// 2 joueurs : avec deux manettes, la 1re est au joueur 1 ; avec une seule, elle est au joueur 2 (le joueur 1 garde clavier, souris ou tactile)
function pollPad(){
  let list = []; try { list = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(g => g && g.connected); } catch(e){}
  const vs2 = !!(game && game.vs2);
  const gp = !game ? list[0] || null : vs2 ? (list.length >= 2 ? list[0] : null) : list[0] || null;
  pollPad2(vs2 ? (list.length >= 2 ? list[1] : list[0]) || null : null);
  if (!gp){ if (pad.on && game) game.p.held.forEach((h,i) => { if (h === 'pad') game.p.held[i] = false; }); pad.on = false; pad.lx = pad.ly = 0; pad.aimOn = false; return; }
  pad.on = true;
  readSticks(pad, gp);
  const b = gp.buttons.map(x => x.pressed || x.value > .5), down = i => b[i] && !pad.prev[i];
  if (b.some(Boolean) || pad.lx || pad.ly || pad.aimOn) setMode('pad');
  if (!game){ if (down(0) || down(9)){ if (!$('splash').hidden) $('splash').hidden = true; else $('start').click(); } pad.prev = b; return; }   // l'avertissement d'ouverture se ferme d'abord
  const g = game;
  if (g.state === 'end'){ if (down(0)) $('again').click(); else if (down(1)) toMenu(); pad.prev = b; return; }
  if (g.paused){ if (down(9) || down(0) || down(1)) setPause(false); pad.prev = b; return; }
  if (down(9)) setPause(true);
  if (g.state === 'choose'){
    const al = aliveIdx(g.ps); let k = al.indexOf(chooseFocus); if (k < 0) k = 0;
    if (down(14) || down(12)) k = (k + al.length - 1) % al.length;
    if (down(15) || down(13)) k = (k + 1) % al.length;
    if (al[k] !== chooseFocus){ chooseFocus = al[k]; focusChoose(); }
    if (down(0) || down(3)) chooseNext(chooseFocus);
    pad.prev = b; return;
  }
  PAD_ATK.forEach((bi,i) => { if (down(bi)) press(i, 'pad'); else if (!b[bi]) release(i, 'pad'); });
  if (down(0)) tryRoll(g.p, ...playerInput());
  // flèches gauche/droite : présélection d'un Pokémon de la barre d'équipe ; Triangle : changement
  if (down(14) || down(15)) preselect(g.ps, down(15));
  if (down(3) && g.ps.swSel != null && trySwitch(g.ps, g.ps.swSel)) g.ps.swSel = null;
  pad.prev = b;
}
// manette du joueur 2 : mêmes boutons que le joueur 1
function pollPad2(gp){
  const g = game;
  if (!gp || !g){ if (pad2.on && g) g.e.held.forEach((h,i) => { if (h === 'pad2') g.e.held[i] = false; }); pad2.on = false; pad2.lx = pad2.ly = 0; pad2.aimOn = false; return; }
  pad2.on = true; readSticks(pad2, gp);
  const b = gp.buttons.map(x => x.pressed || x.value > .5), prev = pad2.prev, down = i => b[i] && !prev[i]; pad2.prev = b;
  if (g.state === 'end' || g.state === 'choose') return;
  if (g.paused){ if (down(9)) setPause(false); return; }
  if (down(9)){ setPause(true); return; }
  PAD_ATK.forEach((bi,i) => { if (down(bi)) press(i, 'pad2', g.e); else if (!b[bi]) release(i, 'pad2', g.e); });
  if (down(0)) tryRoll(g.e, pad2.lx, pad2.ly);
  if (down(14) || down(15)) preselect(g.es, down(15));
  if (down(3) && g.es.swSel != null && trySwitch(g.es, g.es.swSel)) g.es.swSel = null;
}
const playerInput2 = () => [pad2.lx, pad2.ly];
// vibration pour le joueur dont le Pokémon encaisse (en 2 joueurs, seulement sa manette)
function rumbleFor(f, strength, ms){
  if (!game.vs2) return AUDIO.rumble(strength, ms);
  let list = []; try { list = [...navigator.getGamepads()].filter(g => g && g.connected); } catch(e){}
  const gp = f.side === 'e' ? (list.length >= 2 ? list[1] : list[0]) : (list.length >= 2 ? list[0] : null);
  AUDIO.rumble(strength, ms, gp || false);
}
addEventListener('blur', () => { keys.clear(); if (game) game.p.held.fill(false); });

$('dashBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (game) tryRoll(game.p, ...playerInput()); });
$('dashBtn').addEventListener('contextmenu', e => e.preventDefault());
const stick = $('stick'), knob = $('knob');
function joyUpdate(e){
  const r = stick.getBoundingClientRect(), R = 44;
  let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
  const m = Math.hypot(dx,dy); if (m > R){ dx *= R/m; dy *= R/m; }
  joy.x = dx/R; joy.y = dy/R;
  if (Math.hypot(joy.x,joy.y) < .18){ joy.x = 0; joy.y = 0; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
}
stick.addEventListener('pointerdown', e => { e.preventDefault(); try{ stick.setPointerCapture(e.pointerId); }catch(_){} joy.id = e.pointerId; joyUpdate(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyUpdate(e); });
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', joyEnd); stick.addEventListener('pointercancel', joyEnd);
function playerInput(){
  let x = joy.x + pad.lx, y = joy.y + pad.ly;
  for (const k of keys){ const v = MOVE_KEYS[k]; if (v){ x += v[0]; y += v[1]; } }
  const m = Math.hypot(x,y); if (m > 1){ x /= m; y /= m; }
  return [x,y];
}

// ---------- Effets ----------
function burst(x, y, col, n=12, sp=160, size=4){
  if (!game) return;
  for (let i=0;i<n;i++){ const a = Math.random()*Math.PI*2, v = rand(.3,1)*sp;
    game.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.3,.6),max:.6,col,size:rand(size*.5,size)}); }
}
function popText(x, y, s, col, size=20, life=.9){ if (game) game.texts.push({x,y,s,col,size,t:0,life}); }
function shake(v){ game.shake = Math.max(game.shake, v); }

// ---------- Attaques ----------
// animation PMD jouée par type d'attaque, et sa durée (s)
const ACT_ANIM = {melee:'Attack', dash:'Attack', quake:'Attack', proj:'Shoot', spread:'Shoot', homing:'Shoot', psy:'Shoot',
  buff:'Charge', heal:'Charge', ring:'Charge', mirror:'Charge', blink:'Charge', rest:'Charge'};
const ACT_DUR = {Attack:.45, Shoot:.4, Charge:.6};
const BLINK_DIST = 220;
function canMove(f){ return f.hp > 0 && f.stun <= 0 && f.sleep <= 0 && f.recharge <= 0 && !f.dash && !f.roll && !f.script && !f.air; }
function canAct(f){ return canMove(f) && !(f.busy > 0); }   // busy : attaque en cours (Close Combat, Frappe Psy) : on peut bouger et faire un Dash, pas attaquer
// aim : point visé {x,y} ; absent = visée automatique sur l'adversaire (avec anticipation pour l'IA)
function use(f, i, aim, opts){
  if (!game || game.state !== 'fight') return false;
  const mv = MOVES[f.d.moves[i]], foe = foeOf(f);
  if (f.cds[i] > 0 || !canAct(f)) return false;
  f.cds[i] = mv.cd;
  // plusieurs utilisations : 2 s pour relancer après chacune ; la recharge démarre après la dernière
  if (mv.uses){ if (f.recast[i] > 0 && --f.recastN[i] > 0){ f.recast[i] = 2; f.cds[i] = 0; } else if (f.recast[i] > 0) f.recast[i] = 0; else { f.recastN[i] = mv.uses - 1; f.recast[i] = 2; f.cds[i] = 0; } }
  if (f.iceSpike) f.iceSpike.explode();   // Mammochon : sa prochaine attaque fait exploser la stalactite plantée
  const zoneLike = mv.k === 'psy' || (mv.shape && ['zone','zone3','leap','lanezone'].includes(mv.shape[0]));
  let tx = foe.x, ty = foe.y;
  if (aim){ tx = aim.x; ty = aim.y; if (Math.hypot(tx-f.x, ty-f.y) < 1) tx = f.x + 1; }
  else {
    if (f.isAI && mv.spd && mv.k !== 'dash'){ const t = dist(f,foe)/mv.spd * game.diff.lead; tx += foe.vx*t; ty += foe.vy*t; }
    if (f.isAI && zoneLike){ const t = (mv.delay || .7) * game.diff.lead; tx += foe.vx*t; ty += foe.vy*t; }
    if (f.isAI && mv.beam){ const t = .2 * game.diff.lead; tx += foe.vx*t; ty += foe.vy*t; }   // rayons : 0,3 s de visée avant le tir
    // l'IA ne vise pas parfaitement
    if (f.isAI){ const e = game.diff.aimErr;
      if (zoneLike){ const a = Math.random()*Math.PI*2, r = Math.random()*e*150; tx += Math.cos(a)*r; ty += Math.sin(a)*r; }
      else { const a = (Math.random()*2-1)*e, dx = tx-f.x, dy = ty-f.y; tx = f.x + dx*Math.cos(a) - dy*Math.sin(a); ty = f.y + dx*Math.sin(a) + dy*Math.cos(a); } }
  }
  tx = Math.max(WALL, Math.min(W-WALL, tx)); ty = Math.max(WALL, Math.min(H-WALL, ty));
  const a = Math.atan2(ty - f.y, tx - f.x);
  const an = mv.sig ? (mv.anim || 'Attack') : (ACT_ANIM[mv.k] || 'Attack');
  f.aimA = a; f.act = {n:an, t:0, dur: mv.k === 'dash' ? mv.dur + .15 : ACT_DUR[an]};
  AUDIO.cast(mv);
  switch (mv.k){
    case 'sig': case 'spec': SIG[mv.sig](f, mv, a, tx, ty, {...(opts || {}), slot:i, manual:!!aim}); break;
    case 'proj': spawnProj(f, mv, a, 1); break;
    case 'spread': { const n = mv.cnt; for (let j=0;j<n;j++) spawnProj(f, mv, a + (j-(n-1)/2)*mv.ang, 1.35/n); break; }
    case 'homing': { const n = mv.cnt || 1; for (let j=0;j<n;j++) spawnProj(f, mv, a + (n>1 ? (j-(n-1)/2)*.5 : 0), 1, foe); break; }
    case 'psy': { const z = clampRange(f, tx, ty); game.zones.push({x:z.x, y:z.y, r:mv.r, t:0, owner:f, mv}); break; }
    case 'quake': { const rg = {x:f.x, y:f.y, r:0, t:0, owner:f, mv, hit:false, rocks:new Set()};
      if (mv.ring === 'cracks') rg.cracks = makeCracks(mv.max);
      if (mv.ring === 'stars') rg.stars = Array.from({length:46}, () => ({a:Math.random()*TAU, k:Math.sqrt(Math.random()), s:rand(2,4.5), ph:Math.random()*6}));
      game.rings.push(rg);
      if (mv.t === 'Ground'){ shake(10); zoomPunch(.02); } else if (!mv.ring) shockRing(f.x, f.y, mv.max*.5, TYPES[mv.t][1], .3, 10); break; }
    case 'dash': f.dash = {vx:Math.cos(a)*mv.spd, vy:Math.sin(a)*mv.spd, t:mv.dur, mv}; if (mv.inv) f.inv = mv.dur + .05; break;
    case 'melee': {
      f.kx += Math.cos(a)*240; f.ky += Math.sin(a)*240;
      if (mv.jaw) jawFx(f.x + Math.cos(a)*(f.r + 26), f.y + Math.sin(a)*(f.r + 26), a, mv.jaw);
      else game.slashes.push({x:f.x+Math.cos(a)*(f.r+20), y:f.y+Math.sin(a)*(f.r+20), a, t:0, col:TYPES[mv.t][1], r:mv.reach});
      // il faut être à portée ET viser à peu près l'adversaire
      const da = Math.abs(((Math.atan2(foe.y-f.y, foe.x-f.x) - a) % (Math.PI*2) + Math.PI*3) % (Math.PI*2) - Math.PI);
      if (dist(f,foe) <= f.r + foe.r + mv.reach && (da < 1.2 || dist(f,foe) < f.r + foe.r + 4)) hit(f, foe, mv, 1);
      else popText(f.x, f.y - 30, 'Raté', '#a39bd0', 13, .6);
      if (mv.selfDown){ f.defDown = f.spdDown = mv.selfDown; popText(f.x, f.y - 62, 'Défenses −', '#c98a8a', 13); }
      break; }
    case 'buff': f.buff = {atk:1,spa:1,spe:1,spd:1,...mv.buff}; f.buffT = mv.dur; burst(f.x, f.y, '#e6b84c', 14, 120, 4); shockRing(f.x, f.y, 60, '#e6b84c', .35, 6);
      for (let j=0;j<14;j++) game.parts.push({x:f.x + rand(-20,20), y:f.y + rand(-10,10), vx:0, vy:-rand(60,140), life:rand(.4,.8), max:.8, col:pick(['#e6b84c','#fff3c0']), size:rand(2,4), drag:.99}); break;
    case 'heal': if (mv.lock){ const lk = mv.lock; f.act = {n:'Charge', t:0, dur:lk}; f.script = {t:0, update(dt){ this.t += dt; return this.t < lk; }}; }
      if (mv.roost){ f.healT = mv.roost; f.healRate = f.max*mv.pct/mv.roost; f.grounded = mv.roost; popText(f.x, f.y - 30, 'Atterrissage', '#4fd17a', 15); shockRing(f.x, f.y, 50, '#4fd17a', .35, 6); break; } { const h = Math.round(f.max*mv.pct); f.hp = Math.min(f.max, f.hp + h); popText(f.x, f.y-30, '+'+h, '#4fd17a', 18); burst(f.x, f.y, '#4fd17a', 12, 100, 4); break; }
    case 'rest': f.hp = f.max; f.burn = f.poison = 0; f.sleep = 4; popText(f.x, f.y-30, 'PV max !', '#4fd17a', 18); break;
    case 'ring': f.ring = mv.dur; break;
    case 'mirror': f.mirror = mv.dur; break;
    case 'blink': {
      burst(f.x, f.y, TYPES.Psychic[1], 14, 140, 4);
      let nx, ny;
      if (aim){ nx = f.x + Math.cos(a)*BLINK_DIST; ny = f.y + Math.sin(a)*BLINK_DIST; }
      else {
        const away = Math.atan2(f.y - foe.y, f.x - foe.x) + rand(-.6,.6);
        nx = foe.x + Math.cos(away)*240; ny = foe.y + Math.sin(away)*240;
      }
      nx = Math.max(WALL+f.r, Math.min(W-WALL-f.r, nx)); ny = Math.max(WALL+f.r, Math.min(H-WALL-f.r, ny));
      if (!aim && Math.hypot(nx-foe.x, ny-foe.y) < 150){ nx = W - foe.x; ny = H - foe.y; }
      f.x = nx; f.y = ny; f.vx = f.vy = f.kx = f.ky = 0; f.inv = .6;
      burst(f.x, f.y, TYPES.Psychic[1], 14, 140, 4); break; }
  }
  popText(f.x, f.y - 46, (mv.k === 'sig' ? '★ ' : '') + mv.n, mv.k === 'sig' ? '#ffe9a8' : TYPES[mv.t][1], mv.k === 'sig' ? 16 : 13, mv.k === 'sig' ? 1 : .8);
  return true;
}
function spawnProj(f, mv, a, mult, target=null){
  game.projs.push({x:f.x+Math.cos(a)*f.r, y:f.y+Math.sin(a)*f.r, vx:Math.cos(a)*mv.spd, vy:Math.sin(a)*mv.spd,
    r:mv.r, life:mv.life, owner:f, side:f.side, mv, mult, target, col:TYPES[mv.t][1], seed:Math.random()*10, trail:[]});
}
function applyStatus(def, fx){
  const T = def.d.types;
  if (fx.burn && !T.includes('Fire') && def.burn <= 0 && Math.random() < fx.burn){ def.burn = 5; popText(def.x, def.y-62, 'Brûlé !', '#EE8130', 13); }
  if (fx.poison && !T.includes('Poison') && !T.includes('Steel') && Math.random() < fx.poison) def.poison = 5;
  if (fx.slow && !T.includes('Ice') && Math.random() < fx.slow){ if (def.slow <= 0 || def.slowF >= .55) def.slowF = .55; def.slow = Math.max(def.slow, fx.slowT || 2.5); }
  if (fx.stun && Math.random() < fx.stun){ def.stun = .45; def.dash = null; }
  if (fx.spdDown && Math.random() < fx.spdDown){ def.spdDown = 4; popText(def.x, def.y - 62, 'Déf. Spé. −', '#8a9ac9', 13); }
  if (fx.atkDown && Math.random() < fx.atkDown){ def.atkDown = 5; popText(def.x, def.y - 74, 'Attaque −', '#c9a08a', 13); }
  if (fx.defDown && Math.random() < fx.defDown){ def.defDown = 4; popText(def.x, def.y - 62, 'Défense −', '#c98a8a', 13); }
}
function hit(att, def, mv, mult){
  if (def.hp <= 0 || def.buried) return;
  if (def.inv > 0){ popText(def.x, def.y - 34, 'Esquivé', '#a39bd0', 13, .6); return; }
  const e = effMult(mv.t, typesOf(def), mv.hitsImmune)*(mv.t2 ? effMult(mv.t2, typesOf(def), mv.hitsImmune) : 1);   // t2 : 2e type (Coup Fulgurant)   // ex. Poing Plasma : ×1 sur le type Sol
  if (e === 0){ AUDIO.immune(); popText(def.x, def.y - 34, 'Aucun effet', '#a39bd0', 15); burst(def.x, def.y, '#a39bd0', 5, 80, 3); return; }
  const fx = mv.fx || {};
  if (!mv.p){ applyStatus(def, fx); burst(def.x, def.y, TYPES[mv.t][1], 8, 100, 3); return; }
  const A = mv.c === 'ph' ? att.st.atk*att.buff.atk*(att.atkDown > 0 ? .75 : 1) : att.st.spa*att.buff.spa, D = mv.c === 'ph' || mv.vsDef ? def.st.def*(def.defDown > 0 ? .75 : 1) : def.st.spd*(def.spdDown > 0 ? .75 : 1)*(def.buff.spd || 1);   // vsDef : Frappe Psy
  let dmg = ((22*mv.p*A/D)/50 + 2) * (att.d.types.includes(mv.t) || (mv.t2 && att.d.types.includes(mv.t2)) ? 1.5 : 1) * e * rand(.88,1) * .3 * mult * suddenDeath();
  if (att.burn > 0 && mv.c === 'ph') dmg *= .5;
  if (att.isAI) dmg *= game.diff.dmg;   // force de l'IA selon la difficulté
  dmg = Math.max(1, Math.round(dmg));
  damage(def, dmg);
  AUDIO.hit(mv.t, dmg, e); if (!def.isAI) rumbleFor(def, .25 + dmg/50, 40 + Math.min(120, dmg*2));
  def.flash = .22; def.hurtT = .3;
  if (def.sleep > 0){ def.sleep = 0; }
  popText(def.x + rand(-10,10), def.y - 30, '-' + dmg, '#fff', 22);
  if (e > 1) popText(def.x, def.y - 58, 'Super efficace !', '#e6b84c', 15, 1.1);
  else if (e < 1) popText(def.x, def.y - 58, 'Pas très efficace…', '#a39bd0', 13, 1.1);
  burst(def.x, def.y, TYPES[mv.t][1], 14, 180, 5);
  shake(Math.min(10, 2 + dmg/6)); impactFx(def.x, def.y, TYPES[mv.t][1], dmg, e);
  applyStatus(def, fx);
  if (fx.drain && att.hp > 0){ const h = Math.round(dmg*fx.drain); att.hp = Math.min(att.max, att.hp + h); popText(att.x, att.y-30, '+'+h, '#4fd17a', 15); }
  if (fx.recoil && att.hp > 0){ const r = Math.max(1, Math.round(dmg*fx.recoil)); damage(att, r); popText(att.x, att.y-30, '-'+r, '#c9a3a3', 14); }
  if (fx.self){ att.buff = {...att.buff}; for (const k in fx.self) att.buff[k] = Math.min(1.6, att.buff[k]*fx.self[k]); att.buffT = Math.max(att.buffT, 8); }
}
function damage(f, d){ f.hp = Math.max(0, f.hp - d); }
// Mort subite : après 3 min de combat, les dégâts augmentent progressivement pour éviter les combats sans fin
const SUDDEN_DEATH = 180;
const suddenDeath = () => game.fightT > SUDDEN_DEATH ? 1 + (game.fightT - SUDDEN_DEATH)/40 : 1;
function hitRock(rk, amount, col){
  if (!game.rocks.includes(rk)) return;
  rk.hp -= amount; burst(rk.x, rk.y, col || '#8f86b8', 6, 120, 4);
  if (rk.hp <= 0){ burst(rk.x, rk.y, rk.spike ? '#B6A136' : '#8f86b8', 26, 220, 7); shake(6); game.rocks.splice(game.rocks.indexOf(rk), 1); }
}
