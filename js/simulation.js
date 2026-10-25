// Simulation d'une image de jeu, K.O., fin de match
// ---------- Simulation ----------
function stepFighter(f, ix, iy, dt){
  const foe = foeOf(f); f.inX = ix; f.inY = iy;   // dernière direction de déplacement demandée (pour diriger Chute Libre)
  // recharges en pause pendant un K.O. et pendant le choix du Pokémon suivant (l'adversaire ne profite pas de ce temps)
  const frozen = game.state === 'ko' || game.state === 'choose';
  if (!frozen) for (let i=0;i<4;i++) f.cds[i] = Math.max(0, f.cds[i]-dt);
  for (const k of ['burn','poison','slow','stun','sleep','mirror','ring','recharge','flash','inv','buffT','hurtT','root','defDown','spdDown','atkDown','grounded','busy','doll','shield','gyro']) f[k] = Math.max(0, f[k]-dt);
  if (f.healT > 0 && f.hp > 0){ const st = Math.min(dt, f.healT); f.healT -= st; f.hp = Math.min(f.max, f.hp + f.healRate*st); }
  // Change Éclair : fenêtre de 2 s pour la 2e charge ; si elle n'est pas utilisée, la recharge démarre
  if (!frozen) for (let i=0;i<4;i++) if (f.recast[i] > 0 && (f.recast[i] -= dt) <= 0){ f.recast[i] = 0; f.cds[i] = Math.max(f.cds[i], MOVES[f.d.moves[i]].cd - 2); }
  for (let i = f.ghosts.length-1; i >= 0; i--) if ((f.ghosts[i].life -= dt) <= 0) f.ghosts.splice(i,1);
  // en l'air (soulevé ou projeté) : ne peut pas agir jusqu'à la retombée
  if (f.air){ f.air.t += dt; const k = Math.min(1, f.air.t/f.air.dur); f.h = f.air.h(k); if (k >= 1){ const a = f.air; f.air = null; f.h = 0; if (a.onLand) a.onLand(); } }
  if (f.act && (f.act.t += dt) >= f.act.dur) f.act = null;
  if (f.buffT <= 0) f.buff = {atk:1,spa:1,spe:1,spd:1};
  if (f.hp > 0 && game.state === 'fight' && (f.burn > 0 || f.poison > 0)){   // en pause pendant un K.O.
    f.dot += dt;
    if (f.dot >= 1){ f.dot -= 1; const d = Math.max(1, Math.round(f.max*((f.burn>0?.04:0)+(f.poison>0?.05:0))));
      damage(f, d); popText(f.x, f.y-30, '-'+d, f.burn>0 ? '#EE8130' : '#c06bd0', 16); }
  }
  if (f.ring > 0 && f.hp > 0){ f.hp = Math.min(f.max, f.hp + f.max*.22/6*dt); if (Math.random() < dt*10) burst(f.x+rand(-18,18), f.y+rand(-18,18), '#8fb4ff', 1, 30, 3); }
  f.bob += dt*6;
  if (f.hp <= 0){ f.dead += dt; return; }
  const ghost = col => { if ((f.ghT -= dt) <= 0){ f.ghT = .03; f.ghosts.push({x:f.x, y:f.y, life:.22, max:.22, col}); } };
  if (f.air){ f.vx = f.vy = 0; }
  else if (f.script){ const sc = f.script; f.vx = f.vy = 0; if (!sc.update(dt) && f.script === sc) f.script = null; }
  else if (f.roll){
    f.x += f.roll.vx*dt; f.y += f.roll.vy*dt; f.roll.t -= dt; ghost('#ffffff');
    if (f.roll.t <= 0){ f.vx = f.roll.vx*.3; f.vy = f.roll.vy*.3; f.roll = null; } else { f.vx = f.roll.vx; f.vy = f.roll.vy; }
  } else if (f.dash){
    const dsh = f.dash, mv = dsh.mv;
    f.x += dsh.vx*dt; f.y += dsh.vy*dt; dsh.t -= dt;
    if (dsh.fx) dsh.fx(dt);
    ghost(dsh.trail || TYPES[mv.t][1]);
    const end = () => { if (f.dash === dsh) f.dash = null; if (mv.recharge) f.recharge = mv.recharge; };
    if (dsh.pierce){
      if (!dsh.struck && foe.hp > 0 && !foe.buried && dist(f,foe) < f.r + foe.r + 6){ dsh.struck = true; dsh.onHit ? dsh.onHit(foe) : hit(f, foe, mv, 1); }
      let blocked = false; for (const rk of game.rocks){ if (Math.hypot(f.x-rk.x, f.y-rk.y) < rk.r + f.r){ hitRock(rk, mv.p*.8, TYPES[mv.t][1]); blocked = true; break; } }
      if (blocked || dsh.t <= 0){ end(); if (dsh.onEnd) dsh.onEnd(); }
    } else if (foe.hp > 0 && !foe.buried && dist(f,foe) < f.r + foe.r + 6){
      end();
      if (dsh.onHit) dsh.onHit(foe);
      else { hit(f, foe, mv, 1); const a = Math.atan2(foe.y-f.y, foe.x-f.x); foe.kx += Math.cos(a)*320; foe.ky += Math.sin(a)*320; }
    } else {
      let blocked = false;
      for (const rk of game.rocks){ if (Math.hypot(f.x-rk.x, f.y-rk.y) < rk.r + f.r){ hitRock(rk, mv.p*.8, TYPES[mv.t][1]); blocked = true; break; } }
      if (blocked || dsh.t <= 0){ end(); if (dsh.onEnd) dsh.onEnd(); }
    }
    if (f.dash === dsh){ f.vx = 0; f.vy = 0; }
  } else {
    if (!canMove(f) || game.state !== 'fight' || f.root > 0){ ix = 0; iy = 0; }
    const im = Math.hypot(ix, iy); if (im > .2){ f.lastDir = {x:ix/im, y:iy/im}; }
    const sp = moveSpeed(f), k = Math.min(1, dt*12);
    f.vx += (ix*sp - f.vx)*k; f.vy += (iy*sp - f.vy)*k;
    f.x += f.vx*dt; f.y += f.vy*dt;
  }
  f.x += f.kx*dt; f.y += f.ky*dt;
  const decay = Math.exp(-7*dt); f.kx *= decay; f.ky *= decay;
  for (const rk of game.rocks){ const dx = f.x-rk.x, dy = f.y-rk.y, d = Math.hypot(dx,dy) || 1, min = rk.r + f.r;
    if (d < min){ f.x = rk.x + dx/d*min; f.y = rk.y + dy/d*min; } }
  f.x = Math.max(WALL+f.r, Math.min(W-WALL-f.r, f.x));
  f.y = Math.max(WALL+f.r, Math.min(H-WALL-f.r, f.y));
  f.face = foe.x > f.x ? 1 : -1;
}

function update(dt){
  const g = game;
  g.t += dt; g.dangersPrev = g.dangers; g.dangers = [];
  if (g.trick > 0) g.trick -= dt;   // Distorsion   // l'IA lit les zones signalées à l'image précédente
  if (g.state === 'intro'){ g.introT -= dt; if (g.introT <= 0) g.state = 'fight';
    if (g.introBig){ const n = Math.max(0, Math.ceil(g.introT - .6)); if (n !== g.countN){ g.countN = n; AUDIO.count(n === 0); } } }
  if (g.state === 'fight'){ const before = g.fightT; g.fightT += dt;
    if (before < SUDDEN_DEATH && g.fightT >= SUDDEN_DEATH) popText(CX, CY - 40, 'Mort subite : dégâts en hausse', '#ef5050', 20, 2.4); }
  if (g.state === 'ko'){ g.koT -= dt; if (g.koT <= 0) resolveKO(); }
  g.ps.swCd = Math.max(0, g.ps.swCd - (g.state === 'fight' ? dt : 0));
  g.es.swCd = Math.max(0, g.es.swCd - (g.state === 'fight' ? dt : 0));
  if (g.state === 'fight') for (const side of [g.ps, g.es]) if (side.dashN < DASH_MAX && (side.dashT -= dt) <= 0){
    side.dashN++; side.dashT = side.dashN < DASH_MAX ? DASH_REGEN : 0; }
  const [px,py] = g.spectate ? aiInput(g.p, dt) : playerInput();
  for (const side of g.vs2 ? [] : g.spectate ? [g.ps, g.es] : [g.es]) if (g.diff.dmg > .75 && canMega(side) && (side.team[side.active].hp/side.team[side.active].max < .8 || g.fightT > 8)) tryMega(side);
  const [ax,ay] = g.vs2 ? playerInput2() : aiInput(g.e, dt);
  stepFighter(g.p, px, py, dt);
  stepFighter(g.e, ax, ay, dt);
  // les deux Pokémon ne se chevauchent pas, sauf pendant une charge qui traverse ou sous terre
  const passThrough = f => (f.dash && f.dash.pierce) || f.buried || f.air;   // en l'air (Chute Libre) : pas de poussée
  if (g.p.hp > 0 && g.e.hp > 0 && !passThrough(g.p) && !passThrough(g.e)){ const dx = g.e.x-g.p.x, dy = g.e.y-g.p.y, d = Math.hypot(dx,dy) || 1, min = g.p.r + g.e.r;
    if (d < min){ const o = (min-d)/2; g.p.x -= dx/d*o; g.p.y -= dy/d*o; g.e.x += dx/d*o; g.e.y += dy/d*o; } }

  for (let i = g.projs.length-1; i >= 0; i--){
    const p = g.projs[i];
    if (p.target && p.target.hp > 0){
      const want = Math.atan2(p.target.y-p.y, p.target.x-p.x), cur = Math.atan2(p.vy, p.vx);
      let da = want - cur; while (da > Math.PI) da -= Math.PI*2; while (da < -Math.PI) da += Math.PI*2;
      const turn = Math.max(-p.mv.turn*dt, Math.min(p.mv.turn*dt, da)), sp = Math.hypot(p.vx,p.vy);
      p.vx = Math.cos(cur+turn)*sp; p.vy = Math.sin(cur+turn)*sp;
    }
    p.trail.push({x:p.x, y:p.y}); if (p.trail.length > 10) p.trail.shift();
    p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
    if (Math.random() < (p.mv.flame ? 1 : .35)) g.parts.push({x:p.x+rand(-4,4),y:p.y+rand(-4,4),vx:-p.vx*.1+rand(-30,30),vy:-p.vy*.1+rand(-30,30),life:p.mv.flame?.35:.25,max:.35,col:p.mv.flame?(Math.random()<.5?'#ffd25a':'#EE8130'):p.col,size:p.mv.flame?rand(6,11):3});
    let out = p.x < WALL-10 || p.x > W-WALL+10 || p.y < WALL-10 || p.y > H-WALL+10;
    if (out && p.mv.bounce && !p.bounced){ p.bounced = true; if (p.x < WALL || p.x > W-WALL) p.vx *= -1; if (p.y < WALL || p.y > H-WALL) p.vy *= -1;
      p.x = Math.max(WALL, Math.min(W-WALL, p.x)); p.y = Math.max(WALL, Math.min(H-WALL, p.y)); out = false; sparks(p.x, p.y, ['#ffffff','#9ec0ff'], 6, 120, 3); }
    let dead = p.life <= 0 || out;
    const foe = p.side === 'p' ? g.e : g.p;
    if (!dead && foe.hp > 0 && foe.inv <= 0 && !foe.buried){
      const d = dist(p, foe);
      if (foe.mirror > 0 && d < foe.r + p.r + 16){
        const back = p.side === 'p' ? g.p : g.e, a = Math.atan2(back.y-p.y, back.x-p.x), sp = Math.hypot(p.vx,p.vy);
        p.vx = Math.cos(a)*sp; p.vy = Math.sin(a)*sp; p.owner = foe; p.side = foe.side; p.mult *= 1.5; p.life = p.mv.life;
        if (p.target) p.target = back; p.roll = undefined;
        burst(p.x, p.y, '#F95587', 10, 140, 4); popText(foe.x, foe.y-50, 'Renvoyé !', '#F95587', 15);
      } else if (d < foe.r + p.r){ hit(p.owner, foe, p.mv, p.mult); dead = true; }
    }
    if (!dead) for (const rk of g.rocks){ if (Math.hypot(p.x-rk.x, p.y-rk.y) < rk.r + p.r){ hitRock(rk, (p.mv.p||20)*.3*p.mult, p.col); dead = true; break; } }
    if (dead){ if (p.life > 0) burst(p.x, p.y, p.col, 6, 100, 3); g.projs.splice(i,1); }
  }
  for (let i = g.zones.length-1; i >= 0; i--){
    const z = g.zones[i]; z.t += dt;
    if (z.t >= z.mv.delay){
      const foe = z.owner.side === 'p' ? g.e : g.p;
      if (foe.hp > 0 && Math.hypot(foe.x-z.x, foe.y-z.y) < z.r + foe.r*.6) hit(z.owner, foe, z.mv, 1);
      if (z.mv.t === 'Ground'){ crackDecal(z.x, z.y, z.r); shake(6); sparks(z.x, z.y, ['#E2BF65','#8a6a3a','#6b4a2a'], 18, 300, 6); }
      for (const rk of [...g.rocks]) if (Math.hypot(rk.x-z.x, rk.y-z.y) < z.r + rk.r) hitRock(rk, z.mv.p*.4, TYPES[z.mv.t][1]);
      burst(z.x, z.y, TYPES[z.mv.t][1], 22, 200, 5); g.zones.splice(i,1);
    }
  }
  for (let i = g.rings.length-1; i >= 0; i--){
    const rg = g.rings[i]; rg.t += dt; rg.r = rg.mv.max * Math.min(1, rg.t/rg.mv.dur);
    const foe = rg.owner.side === 'p' ? g.e : g.p, fd = Math.hypot(foe.x-rg.x, foe.y-rg.y);
    if (!rg.hit && foe.hp > 0 && fd < rg.r + foe.r && fd > rg.r - 40){
      rg.hit = true; hit(rg.owner, foe, rg.mv, 1);
      if (rg.mv.kb && foe.inv <= 0){ const a = Math.atan2(foe.y-rg.y, foe.x-rg.x); foe.kx += Math.cos(a)*rg.mv.kb; foe.ky += Math.sin(a)*rg.mv.kb; }
    }
    for (const rk of [...g.rocks]){ const rd = Math.hypot(rk.x-rg.x, rk.y-rg.y); if (!rg.rocks.has(rk) && rd < rg.r + rk.r){ rg.rocks.add(rk); hitRock(rk, rg.mv.p*.6, TYPES[rg.mv.t][1]); } }
    if (rg.t >= rg.mv.dur + .15){ if (rg.cracks) crackLinesDecal(rg.x, rg.y, rg.cracks); g.rings.splice(i,1); }
  }
  for (let i = g.ents.length-1; i >= 0; i--){ const e = g.ents[i]; e.t += dt; if (e.update(dt) === false) g.ents.splice(g.ents.indexOf(e), 1); }
  for (let i = g.decals.length-1; i >= 0; i--) if ((g.decals[i].life -= dt) <= 0) g.decals.splice(i,1);
  for (let i = g.rocks.length-1; i >= 0; i--){ const rk = g.rocks[i]; if (rk.life === undefined) continue; rk.age += dt;
    if ((rk.life -= dt) <= 0){ burst(rk.x, rk.y, '#B6A136', 14, 160, 5); g.rocks.splice(i,1); } }
  if (g.sflash && (g.sflash.t -= dt) <= 0) g.sflash = null;
  g.elec = Math.max(0, g.elec - dt); g.frost = Math.max(0, g.frost - dt); g.dim = Math.max(0, g.dim - dt); g.zoom = 1 + (g.zoom - 1)*Math.exp(-9*dt);
  for (let i = g.slashes.length-1; i >= 0; i--){ g.slashes[i].t += dt; if (g.slashes[i].t > .22) g.slashes.splice(i,1); }
  for (let i = g.parts.length-1; i >= 0; i--){ const q = g.parts[i]; q.x += q.vx*dt; q.y += q.vy*dt; const dr = q.drag || .92; q.vx *= dr; q.vy *= dr; q.life -= dt; if (q.life <= 0) g.parts.splice(i,1); }
  for (let i = g.texts.length-1; i >= 0; i--){ const t = g.texts[i]; t.t += dt; t.y -= 28*dt; if (t.t >= t.life) g.texts.splice(i,1); }
  g.shake = Math.max(0, g.shake - dt*30);

  if (g.state === 'fight' && (g.p.hp <= 0 || g.e.hp <= 0)){
    g.state = 'ko'; g.koT = 1.1; g.p.held.fill(false); g.e.held.fill(false);
    for (const f of [g.p, g.e]) if (f.hp <= 0 && !f.koShown){ f.koShown = true; f.dash = null;
      // ses projectiles et zones en cours disparaissent (l'adversaire ne peut plus bouger pour les esquiver)
      g.projs = g.projs.filter(p => p.owner !== f); g.zones = g.zones.filter(z => z.owner !== f); g.rings = g.rings.filter(r => r.owner !== f); AUDIO.ko(); if (!f.isAI) rumbleFor(f, 1, 260); burst(f.x, f.y, '#fff', 30, 240, 6); shake(14); popText(f.x, f.y - 60, 'K.O. !', '#e6b84c', 28, 1.3); }
  }
}

function resolveKO(){
  const g = game, pa = aliveIdx(g.ps), ea = aliveIdx(g.es);
  if (!pa.length || !ea.length){ g.state = 'end'; showEnd(pa.length, ea.length); return; }
  g.projs.length = 0; g.zones.length = 0; g.rings.length = 0; g.ents.length = 0; g.dangers.length = 0;
  for (const f of [...g.ps.team, ...g.es.team]){ f.script = null; f.dash = null; f.air = null; f.h = 0; f.buried = false; f.iceSpike = null; f.root = 0; }
  if (g.e.hp <= 0){ if (g.vs2) sendIn(g.es, ea[0]);   // joueur 2 : le suivant dans l'ordre de son équipe
    else { const b = bestSwitch(g.es, g.p.hp > 0 ? g.p : g.ps.team[pa[0]]); sendIn(g.es, b.i >= 0 ? b.i : ea[0]); } }
  if (g.p.hp <= 0 && g.spectate){ const b = bestSwitch(g.ps, g.e.hp > 0 ? g.e : g.es.team[ea[0]]); sendIn(g.ps, b.i >= 0 ? b.i : pa[0]); }   // IA contre IA : l'IA 1 choisit seule
  else if (g.p.hp <= 0){ g.state = 'choose'; showChoose(); return; }
  g.state = 'intro'; g.introT = .9; g.introBig = false;
}
function showChoose(){
  const g = game;
  $('chooseT').textContent = `${g.p.d.name} est K.O. !`;
  $('chooseList').innerHTML = g.ps.team.map((f,i) => f.hp > 0 ? `<button data-i="${i}">${pic(f.key,52)}<b>${f.d.name}</b><small>${Math.ceil(f.hp)}/${f.max} PV</small><div class="types">${chips(f.d.types)}</div></button>` : '').join('');
  hydrate($('chooseList'));
  chooseFocus = aliveIdx(g.ps)[0]; focusChoose();
  $('ovChoose').hidden = false;
}
let chooseFocus = 0;
function focusChoose(){ $('chooseList').querySelectorAll('button').forEach(b => b.classList.toggle('focus', inputMode === 'pad' && +b.dataset.i === chooseFocus)); }
$('chooseList').addEventListener('click', e => { const b = e.target.closest('button'); if (b) chooseNext(+b.dataset.i); });
function chooseNext(i){
  const g = game; if (!g || g.state !== 'choose') return;
  const f = g.ps.team[i]; if (!f || f.hp <= 0) return;
  $('ovChoose').hidden = true;
  sendIn(g.ps, i); g.ps.swCd = 0;
  g.state = 'intro'; g.introT = .9; g.introBig = false;
}
function showEnd(pAlive, eAlive){
  const win = eAlive === 0 && pAlive > 0, draw = eAlive === 0 && pAlive === 0;
  $('endT').textContent = draw ? 'Égalité' : game.vs2 ? (win ? 'Le joueur 1 gagne !' : 'Le joueur 2 gagne !') : game.spectate ? (win ? "L'IA 1 gagne !" : "L'IA 2 gagne !") : win ? 'Victoire !' : 'Défaite…';
  $('endT').style.color = win ? 'var(--gold)' : game.vs2 ? '#ef5050' : 'var(--fg)';
  const n = win ? pAlive : eAlive;
  if ((game.vs2 || game.spectate) && !draw){ $('endS').textContent = `Avec ${n} Pokémon encore debout, en ${Math.round(game.fightT)} s.`; $('ovEnd').hidden = false; game.p.held.fill(false); AUDIO.stopMusic(); AUDIO.end(true); return; }
  $('endS').textContent = draw ? 'Les deux derniers Pokémon sont tombés en même temps.'
    : win ? `Tu bats ${game.es.name} avec ${n} Pokémon encore debout, en ${Math.round(game.fightT)} s.`
    : `${game.es.name} gagne avec ${n} Pokémon encore debout.`;
  $('again').textContent = 'Revanche';
  if (game.league){ const r = leagueResult(win, pAlive); if (r.msg) $('endS').textContent += ' ' + r.msg; $('again').textContent = r.label; }
  $('toMenu').textContent = game.league ? 'Retour à la Ligue' : "Changer d'équipe";
  $('ovEnd').hidden = false;
  game.p.held.fill(false); AUDIO.stopMusic(); AUDIO.end(win);
}
