// Rendu : vue, sol, Pokémon, projectiles, repères de visée, boucle principale
// =====================================================================
// RENDU
// =====================================================================
function resize(){
  const st = $('stage'), r = st.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width*dpr)); cv.height = Math.max(1, Math.round(r.height*dpr));
  // zoom constant d'une arène à l'autre (calculé avec le décor de fond par défaut) ;
  // le décor de fond plus haut d'une image (backdrop) n'est montré que s'il reste de la place (téléphone en hauteur)
  const s = Math.min(r.width/W, r.height/(H + BACKDROP_DEFAULT)), vb = Math.max(BACKDROP_DEFAULT, Math.min(BACKDROP, r.height/s - H));
  view = {s, ox:(r.width - W*s)/2, oy:(r.height - (H + vb)*s)/2 + vb*s, dpr};
}
new ResizeObserver(() => { if (game) resize(); }).observe($('stage'));


function drawFloor(){
  const key = game.arena in ARENAS ? game.arena : 'stade', A = ARENAS[key], img = ARENA_IMG[key];
  // l'image est ajustée à la largeur de l'arène et calée en bas : son carré du bas est l'arène, le reste est le décor de fond
  const fr = img && ARENA_FRAME[key];
  if (fr){ const sx = (W - 2*WALL)/(fr[2] - fr[0]), sy = (H - 2*WALL)/(fr[3] - fr[1]);
    ctx.imageSmoothingEnabled = img.width*sx < img.width*1.5; ctx.imageSmoothingQuality = 'high'; const top = ARENA_IMAGES[key].top || 0;   // top : lignes du haut de l'image à ne pas afficher
    ctx.drawImage(img, 0, top, img.width, img.height - top, WALL - fr[0]*sx, WALL + (top - fr[1])*sy, img.width*sx, (img.height - top)*sy); }
  else if (img){ const dh = img.height*W/img.width;
    if (dh < H + BACKDROP){ ctx.imageSmoothingEnabled = false; ctx.drawImage(arenaBg(key), 0, -BACKDROP, W, H + BACKDROP); }   // image trop basse : le décor dessiné complète le haut
    ctx.imageSmoothingEnabled = img.width >= W; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, H - dh, W, dh); }
  else { ctx.imageSmoothingEnabled = false; ctx.drawImage(arenaBg(key), 0, -BACKDROP, W, H + BACKDROP); A.anim(game.t); }
  const shade = img && ARENA_IMAGES[key] && ARENA_IMAGES[key].shade;
  if (shade){ ctx.fillStyle = `rgba(24,14,48,${shade})`; ctx.fillRect(0, 0, W, H); }
  drawAmbience(key, game.t, !!img);
  if (!img){ ctx.globalAlpha = .45; ctx.strokeStyle = A.line; ctx.lineWidth = 2; ctx.strokeRect(WALL, WALL, W-WALL*2, H-WALL*2); ctx.globalAlpha = 1; }   // une image a déjà ses propres bords
}
function drawRock(rk){
  if (rk.spike){ const up = Math.min(1, rk.age/.12), h = rk.r*2.8*up, al = Math.min(1, rk.life/.4);
    ctx.globalAlpha = al; ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(rk.x+3, rk.y+rk.r*.5, rk.r*1.1, rk.r*.45, 0, 0, Math.PI*2); ctx.fill();
    const g = ctx.createLinearGradient(rk.x - rk.r, 0, rk.x + rk.r, 0); g.addColorStop(0, '#d8c890'); g.addColorStop(.5, '#a8925a'); g.addColorStop(1, '#5e5030');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(rk.x - rk.r, rk.y + rk.r*.4); ctx.lineTo(rk.x - rk.r*.35, rk.y + rk.r*.4 - h*.75); ctx.lineTo(rk.x + rk.r*.1, rk.y + rk.r*.4 - h);
    ctx.lineTo(rk.x + rk.r*.55, rk.y + rk.r*.4 - h*.6); ctx.lineTo(rk.x + rk.r, rk.y + rk.r*.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a301a'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; return; }
  ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(rk.x+4, rk.y+rk.r*.55, rk.r, rk.r*.45, 0, 0, Math.PI*2); ctx.fill();
  const g = ctx.createRadialGradient(rk.x-rk.r*.3, rk.y-rk.r*.4, 2, rk.x, rk.y, rk.r);
  g.addColorStop(0,'#8a80b6'); g.addColorStop(1,'#463d73');
  ctx.fillStyle = g; ctx.beginPath();
  for (let i=0;i<8;i++){ const a = i/8*Math.PI*2, rr = rk.r*(i%2 ? .92 : 1); ctx.lineTo(rk.x+Math.cos(a)*rr, rk.y+Math.sin(a)*rr); }
  ctx.closePath(); ctx.fill();
  const dmg = 1 - rk.hp/rk.max;
  if (dmg > .3){ ctx.strokeStyle = '#1b1636'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rk.x-rk.r*.5, rk.y-rk.r*.3); ctx.lineTo(rk.x, rk.y+2); ctx.lineTo(rk.x+rk.r*.3, rk.y-rk.r*.5);
    if (dmg > .6){ ctx.moveTo(rk.x, rk.y+2); ctx.lineTo(rk.x-rk.r*.1, rk.y+rk.r*.6); } ctx.stroke(); }
}
const FLOATERS = ['momartik','flamigator'];
const PMD_SCALE = 2.5;
// Animation PMD à jouer : [nom, avancement 0..1] (avancement null = en boucle)
function pmdAnim(f){
  if (f.hp <= 0) return ['Hurt', 1];
  if (f.sleep > 0) return ['Sleep', null];
  if (f.hurtT > 0) return ['Hurt', 1 - f.hurtT/.3];
  if (f.act) return [f.act.n, f.act.t/f.act.dur];
  if (f.stun > 0 || f.recharge > 0) return ['Hurt', 1];
  return [Math.hypot(f.vx, f.vy) > 25 ? 'Walk' : 'Idle', null];
}
// Direction du regard : vers la cible pendant une attaque, vers où il marche sinon, vers l'adversaire à l'arrêt
function pmdDir(f){
  if (f.roll) return Math.atan2(f.roll.vy, f.roll.vx);
  if (f.act || f.dash) return f.aimA;
  if (Math.hypot(f.vx, f.vy) > 25) return Math.atan2(f.vy, f.vx);
  const foe = foeOf(f); return Math.atan2(foe.y - f.y, foe.x - f.x);
}
// Dessine le sprite PMD, pieds en (x, fy) ; renvoie le haut approximatif du sprite
function drawPmd(f, pm, fy, x = f.x){
  const [name, prog] = pmdAnim(f);
  const A = pm.a[name] || ((name === 'Shoot' || name === 'Charge') && pm.a.Attack) || pm.a.Idle || pm.a.Walk;
  const loop = prog == null || A === pm.a.Idle || A === pm.a.Walk;
  const i = pmdFrame(A, loop ? game.t*60 + f.seed : Math.max(0, Math.min(1, prog))*A.total, loop);
  const oct = ((Math.round(pmdDir(f)/(Math.PI/4)) % 8) + 8) % 8, row = DIR_ROW[oct], S = PMD_SCALE;
  ctx.save(); ctx.translate(x, fy);
  // on retire l'essentiel du bond de l'animation (3 px d'élan gardés) pour que le sprite reste sur sa hitbox
  if (A.dr && A.dr[row]){ const d = A.dr[row][i] || {x:0,y:0}, k = v => Math.sign(v)*Math.max(0, Math.abs(v)-3); ctx.translate(-k(d.x)*S, -k(d.y)*S); }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(A.img, i*A.fw, row*A.fh, A.fw, A.fh, -A.fw/2*S, -(A.fh/2+4)*S, A.fw*S, A.fh*S);
  ctx.restore();
  const ref = pm.a.Idle || A;
  return fy - (ref.fh*.5 + 4)*S;
}
function drawFighter(f){
  const alpha = f.hp > 0 ? 1 : Math.max(0, 1 - f.dead*1.2);
  if (alpha <= 0) return;
  const t = game.t, pm = PMD[f.key], pmOk = pm.st === 'ok';
  // sous terre (Tunnel, plongée de Cascade) : seulement un monticule qui avance
  if (f.buried){ ctx.fillStyle = '#5a4026'; ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r*.6, f.r*.9, f.r*.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r*.45, f.r*.6, f.r*.28, 0, 0, TAU); ctx.fill(); return; }
  const flying = f.d.types.includes('Flying') || f.d.types.includes('Ghost') || FLOATERS.includes(f.key);
  const lift = pmOk ? 0 : flying && f.key !== 'flamigator' ? 10 + Math.sin(f.bob)*4 : Math.abs(Math.sin(f.bob*.8))*2;
  ctx.globalAlpha = alpha * (f.inv > 0 ? (Math.floor(t*20)%2 ? .35 : .7) : 1);
  const sh = Math.max(.4, 1 - f.h/220);
  ctx.fillStyle = '#00000066'; ctx.beginPath(); ctx.ellipse(f.x, f.y+f.r*.75, f.r*.95*sh, f.r*.35*sh, 0, 0, Math.PI*2); ctx.fill();
  // images rémanentes (Dash, charges, Vitesse Extrême)
  if (pmOk && f.ghosts.length){ for (const gh of f.ghosts){ ctx.globalAlpha = alpha * gh.life/gh.max * .45; drawPmd(f, pm, gh.y + f.r*.75, gh.x); } ctx.globalAlpha = alpha; }
  if (f.air && f.air.glow) glowBall(f.x, f.y - f.h, 30, '#ffffff', f.air.glow, f.air.glow);
  if (f.buffT > 0){ ctx.strokeStyle = `rgba(230,184,76,${.35+.25*Math.sin(t*8)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y+f.r*.75, f.r*1.2, f.r*.5, 0, 0, Math.PI*2); ctx.stroke(); }
  if (f.ring > 0){ for (let i=0;i<3;i++){ const a = t*3 + i*2.09; ctx.fillStyle = '#8fb4ff'; ctx.beginPath(); ctx.arc(f.x+Math.cos(a)*34, f.y+Math.sin(a)*14+f.r*.6, 4, 0, Math.PI*2); ctx.fill(); } }
  const y = f.y - lift;
  if (f.mirror > 0){ ctx.strokeStyle = `rgba(249,85,135,${.5+.4*Math.sin(t*30)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, y, f.r+14, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = '#F9558722'; ctx.fill(); }
  const blink = f.flash > 0 && Math.floor(f.flash*30)%2 === 0;
  const s = SPR[f.key];
  let top = y - (s.ok ? 50 : f.r+10);
  if (f.dash && f.dash.mv.aura) glowBall(f.x, f.y - f.h - 6, f.r + 10 + Math.sin(t*30)*2, '#ffffff', '#ffc0d8', f.dash.mv.aura);
  if (pmOk){ if (blink) ctx.filter = 'brightness(4)'; top = drawPmd(f, pm, f.y + f.r*.75 - f.h); ctx.filter = 'none'; }
  if (!blink && !pmOk){
    if (s.ok){
      ctx.save(); ctx.translate(f.x, y - 10); if (f.face === 1) ctx.scale(-1,1);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(s.img, -48, -52, 96, 96); ctx.restore();
    } else {
      const ty = f.d.types;
      const gr = ctx.createLinearGradient(f.x-f.r, y-f.r, f.x+f.r, y+f.r);
      gr.addColorStop(0, TYPES[ty[0]][1]); gr.addColorStop(.5, TYPES[ty[0]][1]); gr.addColorStop(.5, TYPES[ty[ty.length-1]][1]); gr.addColorStop(1, TYPES[ty[ty.length-1]][1]);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, y, f.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = f.side === 'e' ? '#ef5050' : '#e6b84c'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 13px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.d.ab, f.x, y+1);
    }
  }
  ctx.fillStyle = f.side === 'e' ? '#ef5050' : '#e6b84c';
  const my = top;
  ctx.beginPath(); ctx.moveTo(f.x-6, my-8); ctx.lineTo(f.x+6, my-8); ctx.lineTo(f.x, my); ctx.closePath(); ctx.fill();
  if (f.sleep > 0){ ctx.fillStyle = '#c9c3ef'; ctx.font = '700 14px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Z', f.x+14+Math.sin(t*3)*3, my-14-((t*20)%12)); }
  else if (f.stun > 0 || f.recharge > 0){ ctx.fillStyle = '#F7D02C'; for (let i=0;i<3;i++){ const a = t*6 + i*2.09; ctx.beginPath(); ctx.arc(f.x+Math.cos(a)*16, my-16+Math.sin(a)*5, 3, 0, Math.PI*2); ctx.fill(); } }
  if (f.slow > 0){ ctx.strokeStyle = '#96D9D6aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, y, f.r+6, 0, Math.PI*2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (game.vs2 && f.side === 'e' && f.hp > 0) drawP2Info(f, my);
}
// 2 joueurs : le joueur 2 n'a pas de boutons à l'écran ; ses recharges, Dash et Pokémon présélectionné s'affichent sous et sur son Pokémon
function drawP2Info(f, my){
  const side = game.es, x0 = f.x - 33, y0 = f.y + f.r + 10;
  for (let i=0;i<4;i++){ const mv = MOVES[f.d.moves[i]], c = Math.max(0, f.cds[i]/mv.cd), x = x0 + i*15;
    ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y0 - 1, 14, 8);
    ctx.globalAlpha = c > 0 ? .45 : 1; ctx.fillStyle = TYPES[mv.t][1]; ctx.fillRect(x, y0, 12*(1 - c), 6); }
  ctx.globalAlpha = 1;
  for (let i=0;i<DASH_MAX;i++){ ctx.fillStyle = i < side.dashN ? '#ffffff' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(f.x + 33 + 2, y0 + 3 - 6 + i*5, 1.8, 0, TAU); ctx.fill(); }
  if (side.swSel != null){ ctx.font = '700 12px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#ef5050';
    ctx.fillText('△ ' + side.team[side.swSel].d.name, f.x, my - 12); }
}

// Repère au sol : forme de l'attaque en cours de visée (glissé tactile, souris ou manette maintenue)
function drawAim(f = game.p, P = pad, main = true){   // main : joueur 1 (tactile, souris…) ; sinon joueur 2 à la manette
  const g = game;
  if (f.hp <= 0 || (g.state !== 'fight' && g.state !== 'intro')) return;
  let i = -1, aim = null;
  if (main && touchAim){ i = touchAim.i; aim = touchAim.active ? aimPoint(touchAim, i) : null; }
  else { const h = f.held.findIndex(x => x); if (h >= 0){ i = h; aim = aimPoint(f.held[h], h, f); } }
  ctx.save();
  if (i < 0){
    // stick droit sans attaque : simple ligne de visée
    if ((!main || inputMode === 'pad') && P.aimOn){ const a = P.aimA;
      ctx.strokeStyle = f.side === 'e' ? '#ef5050' : '#e6b84c'; ctx.globalAlpha = .5; ctx.lineWidth = 3; ctx.setLineDash([8,8]);
      ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a)*f.r, f.y + Math.sin(a)*f.r); ctx.lineTo(f.x + Math.cos(a)*170, f.y + Math.sin(a)*170); ctx.stroke(); }
    ctx.restore(); return;
  }
  const mv = MOVES[f.d.moves[i]], foe = foeOf(f);
  const tx = aim ? aim.x : foe.x, ty = aim ? aim.y : foe.y, a = Math.atan2(ty - f.y, tx - f.x);
  const col = TYPES[mv.t][1], ready = f.cds[i] <= 0;
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = ready ? .3 : .12;
  const wedge = (R, half) => { ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.globalAlpha *= 2; ctx.stroke(); };
  const disc = (x, y, R) => { ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha *= 2; ctx.stroke(); };
  const lane = (L, half) => { ctx.translate(f.x, f.y); ctx.rotate(a); ctx.fillRect(0, -half, L, half*2); ctx.globalAlpha *= 2; ctx.strokeRect(0, -half, L, half*2); };
  switch (mv.k){
    case 'proj': case 'homing': lane(Math.min(mv.spd*mv.life, 700), mv.r); break;
    case 'spread': wedge(Math.min(mv.spd*mv.life, 700), (mv.cnt-1)/2*mv.ang + .06); break;
    case 'psy': { const z = clampRange(f, tx, ty);
      ctx.save(); ctx.globalAlpha = .35; ctx.setLineDash([6,8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, PSY_RANGE, 0, Math.PI*2); ctx.stroke(); ctx.restore();
      disc(z.x, z.y, mv.r); break; }
    case 'quake': disc(f.x, f.y, mv.max); break;
    case 'dash': lane(mv.spd*mv.dur, f.r); break;
    case 'melee': wedge(f.r + mv.reach, 1.2); break;
    case 'blink': disc(f.x + Math.cos(a)*BLINK_DIST, f.y + Math.sin(a)*BLINK_DIST, f.r); break;
    case 'sig': case 'spec': { const sh = mv.shape, al = ctx.globalAlpha;
      if (sh[0] === 'lane') lane(sh[1], sh[2]);
      else if (sh[0] === 'wedge') wedge(sh[1], sh[2]);
      else if (sh[0] === 'self') disc(f.x, f.y, sh[1]);
      else if (sh[0] === 'lanezone'){ const z = clampTo(f, tx, ty, PSY_RANGE);
        ctx.save(); ctx.globalAlpha = .35; ctx.setLineDash([6,8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, PSY_RANGE, 0, Math.PI*2); ctx.stroke(); ctx.restore();
        disc(z.x, z.y, sh[3]); ctx.globalAlpha = al; lane(sh[1], sh[2]); }
      else if (sh[0] === 'zone' || sh[0] === 'leap' || sh[0] === 'zone3'){ const R = sh[0] === 'leap' ? mv.range : PSY_RANGE, z = clampTo(f, tx, ty, R);
        ctx.save(); ctx.globalAlpha = .35; ctx.setLineDash([6,8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI*2); ctx.stroke(); ctx.restore();
        if (sh[0] === 'zone3') for (const c of tripleSpots(z, a)){ ctx.globalAlpha = al; disc(c.x, c.y, sh[1]); } else disc(z.x, z.y, sh[1]); }
      else if (sh[0] === 'tambour'){ const ux = Math.cos(a), uy = Math.sin(a);
        for (let b=1;b<=3;b++) for (let j=0;j<b;j++){ const lat = (j - (b-1)/2)*78, c = clampArena(f.x + ux*70*b - uy*lat, f.y + uy*70*b + ux*lat, 10); ctx.globalAlpha = al; disc(c.x, c.y, 44); } }
      else if (sh[0] === 'lanes3'){ const px = -Math.sin(a), py = Math.cos(a), al0 = ctx.globalAlpha;
        for (const j of [-1, 1]){ ctx.save(); ctx.translate(px*j*sh[2], py*j*sh[2]); ctx.globalAlpha = al0*.7; lane(sh[1], 22); ctx.restore(); }
        ctx.globalAlpha = al0; lane(sh[1], 22); }
      else if (sh[0] === 'obscur'){ const ex = f.x + Math.cos(a)*sh[1], ey = f.y + Math.sin(a)*sh[1], px = -Math.sin(a), py = Math.cos(a);
        for (const j of [0, -1, 1]){ ctx.globalAlpha = al*.7; disc(ex + px*j*72, ey + py*j*72, 46); }
        ctx.globalAlpha = al; lane(sh[1], f.r); }
      else if (sh[0] === 'plasma'){ const ex = f.x + Math.cos(a)*sh[1], ey = f.y + Math.sin(a)*sh[1];
        for (const [da, d] of [[0,0],[.55,95],[-.55,95]]){ ctx.globalAlpha = al*.7; disc(ex + Math.cos(a+da)*d, ey + Math.sin(a+da)*d, 46); }
        ctx.globalAlpha = al; lane(sh[1], f.r); }
      if (mv.sig === 'aurasphere'){ const ht = main && touchAim && touchAim.i === i ? game.t - touchAim.t0 : game.t - f.holdT[i], c = Math.max(0, Math.min(1, ht/1.1));
        ctx.restore(); ctx.save();   // sort du repère tourné pour dessiner l'orbe qui grossit
        glowBall(f.x + Math.cos(a)*(f.r + 10), f.y + Math.sin(a)*(f.r + 10) - 10, 6 + 13*c, '#ffffff', '#a8d4ff', '#2f63d8'); }
      break; }
    default: disc(f.x, f.y, f.r + 16);
  }
  ctx.restore();
}
function render(){
  const g = game;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
  const sx = g.shake ? rand(-g.shake,g.shake)*.5 : 0, sy = g.shake ? rand(-g.shake,g.shake)*.5 : 0;
  const zs = view.s*g.zoom, zx = view.ox + W/2*(view.s - zs), zy = view.oy + H/2*(view.s - zs);
  ctx.setTransform(zs*view.dpr, 0, 0, zs*view.dpr, (zx+sx)*view.dpr, (zy+sy)*view.dpr);
  drawFloor();
  for (const d of g.decals) d.draw(Math.min(1, d.life/Math.min(1, d.max)));
  ctx.globalAlpha = 1;
  if (g.dim > 0){ ctx.fillStyle = `rgba(5,3,14,${.5*Math.min(1, g.dim/.2)})`; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP); }
  for (const e of g.ents) if (e.ground) e.ground();
  ctx.globalAlpha = 1;
  for (const z of g.zones){ const k = z.t / z.mv.delay, col = TYPES[z.mv.t][1];
    ctx.globalAlpha = .15 + k*.3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6,6]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r*k, 0, Math.PI*2); ctx.stroke(); }
  for (const rg of g.rings) drawRing(rg);
  ctx.globalAlpha = 1;
  drawAim(); if (g.vs2) drawAim(g.e, pad2, false);
  for (const rk of g.rocks) drawRock(rk);
  for (const q of g.parts) if (q.ghost){ ctx.globalAlpha = q.life/q.max*.35; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI*2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const f of [g.p, g.e].sort((a,b) => a.y - b.y)) drawFighter(f);
  for (const sl of g.slashes){ const k = sl.t/.22, R = sl.r*.6 + 14 + k*12;
    ctx.save(); ctx.translate(sl.x, sl.y); ctx.rotate(sl.a); ctx.globalAlpha = 1 - k; ctx.fillStyle = sl.col;
    ctx.beginPath(); ctx.arc(-14, 0, R, -1.05, 1.05); ctx.arc(-14 - R*.3, 0, R*.85, .95, -.95, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-14, 0, R, -1.05, 1.05); ctx.stroke(); ctx.restore(); }
  ctx.globalAlpha = 1;
  for (const p of g.projs) drawProj(p);
  ctx.globalAlpha = 1;
  for (const e of g.ents) if (e.top) e.top();
  ctx.globalAlpha = 1;
  for (const q of g.parts) if (!q.ghost){ const k = Math.max(0, q.life/q.max); ctx.globalAlpha = k; ctx.fillStyle = q.col;
    if (q.star){ starPath(q.x, q.y, q.size*(k+.3)*1.4, q.size*(k+.3)*.5, 4, q.x*.1); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size*(k+.3), 0, Math.PI*2); ctx.fill(); } }
  ctx.globalAlpha = 1;
  // effets d'écran : éclair, électricité, givre, soulèvement psychique
  if (g.sflash){ ctx.globalAlpha = g.sflash.a*g.sflash.t/g.sflash.max; ctx.fillStyle = g.sflash.col; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP); ctx.globalAlpha = 1; }
  if (g.elec > 0){ const k = Math.min(1, g.elec/.3); ctx.fillStyle = `rgba(120,180,255,${.1*k})`; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP);
    ctx.globalAlpha = .55*k; for (let i=0;i<2;i++){ if (Math.random() < .6){ const x1 = rand(0, W), y1 = rand(0, H); drawBolt(boltPath(x1, y1, x1 + rand(-160,160), y1 + rand(-160,160), 18), '#9fd8ff', 1.6); } } ctx.globalAlpha = 1; }
  if (g.frost > 0){ const k = Math.min(1, g.frost/.3), gr = ctx.createRadialGradient(W/2, H/2, W*.25, W/2, H/2, W*.75);
    gr.addColorStop(0, 'rgba(230,248,255,0)'); gr.addColorStop(1, `rgba(230,248,255,${.45*k})`); ctx.fillStyle = gr; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP); }
  if ((g.p.air && g.p.air.glow) || (g.e.air && g.e.air.glow)){ ctx.fillStyle = 'rgba(249,85,135,.08)'; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of g.texts){ const a = 1 - Math.max(0, (t.t - t.life*.6) / (t.life*.4));
    ctx.globalAlpha = a; ctx.font = `700 ${t.size}px "Chakra Petch", sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = '#110e22'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
  if (g.state === 'intro'){
    let txt, size = 64;
    if (g.introBig){ const n = Math.ceil(g.introT - .6); txt = n > 0 ? String(n) : 'Combat !'; if (n > 0) size = 96; }
    else txt = 'Go !';
    ctx.font = `700 ${size}px "Chakra Petch", sans-serif`; ctx.lineWidth = 8; ctx.strokeStyle = '#110e22';
    ctx.strokeText(txt, CX, CY); ctx.fillStyle = '#e6b84c'; ctx.fillText(txt, CX, CY);
    ctx.font = '600 15px "Barlow", sans-serif'; ctx.lineWidth = 4; const vs = `${g.p.d.name}  vs  ${g.e.d.name}`;
    ctx.strokeText(vs, CX, CY + 70); ctx.fillStyle = '#efebff'; ctx.fillText(vs, CX, CY + 70);
  }
}

let last = performance.now();
function loop(now){
  const dt = Math.min(.033, (now - last)/1000); last = now;
  pollPad();
  if (game){ if (!game.paused && game.state !== 'end'){ if (game.hitstop > 0) game.hitstop -= dt; else update(dt); } render(); updateHUD(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// appli installable et jouable hors ligne (voir sw.js)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
