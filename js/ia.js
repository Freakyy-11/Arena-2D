// Intelligence artificielle de l'adversaire
// ---------- IA ----------
function offense(a, b){ let best = 0;
  for (const k of a.d.moves){ const mv = MOVES[k]; if (!mv.p) continue;
    const st = mv.c === 'ph' ? a.st.atk : a.st.spa;
    best = Math.max(best, effMult(mv.t, b.d.types) * (a.d.types.includes(mv.t) ? 1.5 : 1) * mv.p/90 * st/120); }
  return best; }
const matchup = (c, foe) => offense(c, foe) - .85*offense(foe, c) + .4*(c.hp/c.max);
function bestSwitch(side, foe){ let bi = -1, bs = -1e9;
  side.team.forEach((c,i) => { if (c.hp <= 0 || i === side.active) return; const s = matchup(c, foe); if (s > bs){ bs = s; bi = i; } });
  return {i:bi, s:bs}; }

function aiInput(f, dt){
  const D = game.diff, ai = f.ai, foe = foeOf(f), side = sideOf(f);
  if (f.hp <= 0 || foe.hp <= 0 || game.state !== 'fight') return [0,0];
  ai.swT -= dt;
  if (ai.swT <= 0){ ai.swT = rand(1.2, 2);
    if (D.sw > 0 && side.swCd <= 0 && f.hp/f.max > .2){
      const cur = matchup(f, foe), alt = bestSwitch(side, foe);
      if (alt.i >= 0 && alt.s > cur + 1.0 && Math.random() < D.sw){ trySwitch(side, alt.i); return [0,0]; }
    } }
  let ix = 0, iy = 0;
  const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx,dy) || 1, ux = dx/d, uy = dy/d;
  const radial = d > f.d.pref + 35 ? 1 : d < f.d.pref - 35 ? -1 : 0;
  ix += ux*radial; iy += uy*radial;
  ai.strafeT -= dt;
  if (ai.strafeT <= 0){ ai.strafe = Math.random() < .5 ? -1 : 1; ai.strafeT = rand(1, 2.6); }
  ix += -uy*ai.strafe*.7; iy += ux*ai.strafe*.7;
  if (f.x < 90 || f.x > W-90 || f.y < 90 || f.y > H-90){ ix += (CX-f.x)/180; iy += (CY-f.y)/180; }
  let threat = false;
  for (const p of game.projs){
    if (p.side === f.side) continue;
    const sp = Math.hypot(p.vx,p.vy) || 1, hx = p.vx/sp, hy = p.vy/sp, rx = f.x-p.x, ry = f.y-p.y;
    const along = rx*hx + ry*hy; if (along < 0 || along > 300) continue;
    const lat = -rx*hy + ry*hx; if (Math.abs(lat) > f.r + p.r + 16) continue;
    threat = true;
    if (p.roll === undefined) p.roll = Math.random() < D.react;
    if (!p.roll) continue;
    const s = lat === 0 ? ai.strafe : Math.sign(lat);
    ix += -hy*s*2.4; iy += hx*s*2.4;
    if (along < 150){ if (p.dodge === undefined) p.dodge = Math.random() < D.dash;
      if (p.dodge && tryRoll(f, -hy*s, hx*s)) p.dodge = false; }
  }
  for (const z of game.zones){ if (z.owner.side === f.side) continue;
    const zd = Math.hypot(f.x-z.x, f.y-z.y);
    if (zd < z.r + f.r + 8){ if (z.roll === undefined) z.roll = Math.random() < D.react + .1;
      if (z.roll){ ix += (f.x-z.x)/(zd||1)*2.5; iy += (f.y-z.y)/(zd||1)*2.5;
        if (z.t > z.mv.delay - .3){ if (z.dodge === undefined) z.dodge = Math.random() < D.dash;
          if (z.dodge && tryRoll(f, f.x-z.x, f.y-z.y)) z.dodge = false; } } } }
  // zones signalées par les attaques adverses (piliers, lunes, éclairs, atterrissages…)
  if ((ai.dT = (ai.dT || 0) - dt) <= 0){ ai.dT = .45; ai.dRoll = Math.random() < D.react + .1; ai.dDash = Math.random() < D.dash; }
  for (const z of (game.dangersPrev || [])){ if (z.side === f.side || !ai.dRoll) continue; const zd = Math.hypot(f.x-z.x, f.y-z.y);
    if (zd < z.r + f.r + 6){ ix += (f.x-z.x)/(zd||1)*2.4; iy += (f.y-z.y)/(zd||1)*2.4; if (ai.dDash && tryRoll(f, f.x-z.x, f.y-z.y)) ai.dDash = false; } }
  for (const g of game.rings){ if (g.owner.side === f.side || g.hit) continue;
    if (g.roll === undefined) g.roll = Math.random() < D.react;
    if (g.roll){ ix -= ux*2; iy -= uy*2; } }
  if (foe.dash){ if (ai.dashRoll === undefined) ai.dashRoll = Math.random() < D.react;
    if (ai.dashRoll){ ix += -uy*ai.strafe*2.6; iy += ux*ai.strafe*2.6;
      if (d < 170){ if (ai.dashDodge === undefined) ai.dashDodge = Math.random() < D.dash;
        if (ai.dashDodge && tryRoll(f, -uy*ai.strafe, ux*ai.strafe)) ai.dashDodge = false; } } } else { ai.dashRoll = undefined; ai.dashDodge = undefined; }
  for (const rk of game.rocks){ const rx = rk.x-f.x, ry = rk.y-f.y, rd = Math.hypot(rx,ry) || 1;
    if (rd < rk.r + f.r + 28){ ix -= rx/rd*1.2; iy -= ry/rd*1.2; } }
  const m = Math.hypot(ix,iy); if (m > 1){ ix /= m; iy /= m; }
  if (threat && D.mirror){ const i = f.d.moves.indexOf('voilemiroir');
    if (i >= 0 && f.cds[i] <= 0 && Math.random() < D.react*dt*8) use(f, i); }
  ai.think -= dt;
  if (ai.think <= 0){ ai.think = D.think * rand(.7,1.3); aiPick(f, foe, d); }
  return [ix, iy];
}
function aiPick(f, foe, d){
  let best = -1, bs = 0;
  const hpr = f.hp/f.max;
  f.d.moves.forEach((k,i) => {
    if (f.cds[i] > 0) return;
    const mv = MOVES[k]; let s = 0;
    switch (mv.k){
      case 'ring': s = (hpr < .55 && f.ring <= 0) ? 2.2 : 0; break;
      case 'heal': s = hpr < .45 ? 2.2 : 0; break;
      case 'rest': s = (hpr < .35 && d > 200) ? 2.6 : 0; break;
      case 'buff': s = (f.buffT <= 0 && hpr > .5 && d > 150) ? 1.3 : 0; break;
      case 'blink': s = d < 130 ? 1.6 : 0; break;
      case 'mirror': s = 0; break;
      case 'sig': case 'spec': {
        const e = effMult(mv.t, foe.d.types); if (e === 0 && !mv.hitsImmune) break;
        const st = mv.c === 'ph' ? f.st.atk*f.buff.atk : f.st.spa*f.buff.spa;
        s = (mv.aiP || mv.p)/90 * (e || 1) * (f.d.types.includes(mv.t) ? 1.5 : 1) * st/120 * 1.25;
        if (d > mv.range*1.05) s *= mv.close ? .05 : .15;
        if (f.recast[i] > 0) s *= 3;   // 2e charge de Change Éclair : à utiliser tant qu'elle est disponible
        break; }
      default: {
        const e = effMult(mv.t, foe.d.types);
        if (!mv.p){ s = (foe.burn <= 0 && !foe.d.types.includes('Fire') && foe.st.atk > foe.st.spa) ? 1.4 : 0; break; }
        if (e === 0) break;
        const st = mv.c === 'ph' ? f.st.atk*f.buff.atk : f.st.spa*f.buff.spa;
        s = mv.p/90 * e * (f.d.types.includes(mv.t) ? 1.5 : 1) * st/120;
        if (mv.k === 'quake' && d > mv.max*.85) s *= .1;
        if (mv.k === 'psy' && d > PSY_RANGE + mv.r*.5) s *= .1;
        if (mv.k === 'dash' && d > mv.spd*mv.dur + 40) s *= .15;
        if (mv.k === 'melee' && d > f.r + foe.r + mv.reach + 10) s *= .05;
        if ((mv.k === 'proj' || mv.k === 'spread') && mv.spd*mv.life < d) s *= .25;
        if (mv.recharge) s *= (foe.hp < foe.max*.35) ? 1.1 : .5;
        if (mv.fx && mv.fx.recoil && hpr < .25) s *= .4;
      }
    }
    s *= 1 + (Math.random()-.5)*2*game.diff.noise;
    if (s > bs){ bs = s; best = i; }
  });
  if (best >= 0 && bs > .25) use(f, best, null, MOVES[f.d.moves[best]].sig === 'aurasphere' ? {charge:rand(.2, 1.1)} : undefined);
}
