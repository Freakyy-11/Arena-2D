// Effets visuels et attaques emblématiques (SIG)
// =====================================================================
// EFFETS VISUELS ET ATTAQUES EMBLÉMATIQUES
// =====================================================================
const TAU = Math.PI*2;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clampArena = (x, y, m=0) => ({x:Math.max(WALL+m, Math.min(W-WALL-m, x)), y:Math.max(WALL+m, Math.min(H-WALL-m, y))});
const sub = (mv, o) => Object.assign({}, mv, o);   // variante d'une attaque (puissance, effets…)
const clampTo = (f, x, y, R) => { const d = Math.hypot(x-f.x, y-f.y); return d <= R ? {x, y} : {x: f.x + (x-f.x)/d*R, y: f.y + (y-f.y)/d*R}; };

// Effets d'attaque : {update(dt) → false pour disparaître, ground() dessin au sol, top() dessin au-dessus} ; t avance tout seul
function spawnFx(o){ o.t = 0; game.ents.push(o); return o; }
// Zones dangereuses signalées à l'IA adverse (remises à zéro à chaque image)
function danger(f, x, y, r){ game.dangers.push({x, y, r, side:f.side}); }
// Marques au sol qui s'estompent : {x, y, life, draw(alpha)}
function decal(o){ o.max = o.life; game.decals.push(o); }

// Effets d'écran
function screenFlash(col, a=.35, dur=.25){ game.sflash = {col, a, t:dur, max:dur}; }
function electrify(dur){ game.elec = Math.max(game.elec, dur); }
function frostScreen(dur){ game.frost = Math.max(game.frost, dur); }
function zoomPunch(v){ game.zoom = Math.max(game.zoom, 1+v); }
function hitstop(s){ game.hitstop = Math.max(game.hitstop, s); }
function dimScreen(dur){ game.dim = Math.max(game.dim, dur); }

// L'adversaire de f est-il dans le cercle (x,y,r) ? Peut-il être touché par mv ?
function foeIn(f, x, y, r){ const e = foeOf(f); return e.hp > 0 && !e.buried && Math.hypot(e.x-x, e.y-y) < r + e.r*.6 ? e : null; }
function typesOf(f){ if (f.grounded > 0 && f.d.types.includes('Flying')){ const t = f.d.types.filter(x => x !== 'Flying'); return t.length ? t : ['Normal']; } return f.d.types; }
function canHit(f, e, mv){ return !!e && e.hp > 0 && e.inv <= 0 && !(e.doll > 0) && !e.buried && game.state !== 'ko'; }
// Frappe ce qui est dans le cercle (adversaire + rochers) ; renvoie l'adversaire s'il a pu être touché
function zoneHit(f, mv, x, y, r, mult=1){
  const e = foeIn(f, x, y, r), ok = canHit(f, e, mv);
  if (e) hit(f, e, mv, mult);
  for (const rk of [...game.rocks]) if (Math.hypot(rk.x-x, rk.y-y) < r + rk.r) hitRock(rk, (mv.p||30)*.5*mult, TYPES[mv.t][1]);
  return ok ? e : null;
}
function inWedge(f, e, a, R, half){ return e.hp > 0 && !e.buried && dist(f, e) < R + e.r*.6 && (angDiff(Math.atan2(e.y-f.y, e.x-f.x), a) < half || dist(f, e) < f.r + e.r); }
// Projeté en l'air : ne peut plus agir jusqu'à la retombée
function launch(e, dur, H, onLand){ e.dash = null; e.script = null; e.roll = null;
  e.air = {t:0, dur, h:k => Math.sin(Math.PI*k)*H, onLand(){ shake(6); burst(e.x, e.y + e.r*.6, '#c9b98f', 10, 150, 4); if (onLand) onLand(); }}; }

// ---------- Petits effets réutilisables ----------
function shockRing(x, y, R, col, dur=.35, w=8){
  spawnFx({update(){ return this.t < dur; }, ground(){ const k = this.t/dur; ctx.globalAlpha = 1-k; ctx.strokeStyle = col; ctx.lineWidth = w*(1-k)+1;
    ctx.beginPath(); ctx.arc(x, y, R*(.2+.8*Math.sqrt(k)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }});
}
function crackDecal(x, y, R){
  const lines = [], n = 6 + Math.floor(Math.random()*4);
  for (let i=0;i<n;i++){ let a = Math.random()*TAU, px = x, py = y; const L = R*rand(.55,1), pts = [[px,py]];
    for (let s=0;s<4;s++){ a += rand(-.45,.45); px += Math.cos(a)*L/4; py += Math.sin(a)*L/4; pts.push([px,py]); } lines.push(pts); }
  decal({x, y, life:4, draw(al){ ctx.globalAlpha = al*.35; ctx.fillStyle = '#05030c'; ctx.beginPath(); ctx.ellipse(x, y, R*.32, R*.22, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = al*.85; ctx.strokeStyle = '#08060f'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const l of lines){ ctx.beginPath(); ctx.moveTo(l[0][0], l[0][1]); for (const p of l) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.globalAlpha = al*.25; ctx.strokeStyle = '#8f86b8'; ctx.lineWidth = 1;
    for (const l of lines){ ctx.beginPath(); ctx.moveTo(l[0][0]+1, l[0][1]+1); for (const p of l) ctx.lineTo(p[0]+1, p[1]+1); ctx.stroke(); } }});
}
function scorchDecal(x, y, R, life=3){ decal({x, y, life, draw(al){ const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(25,10,4,${.6*al})`); g.addColorStop(1, 'rgba(25,10,4,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }}); }
function frostDecal(x, y, R){ const sp = []; for (let i=0;i<8;i++) sp.push([Math.random()*TAU, rand(.4,1)]);
  decal({x, y, life:3.5, draw(al){ const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(220,248,255,${.45*al})`); g.addColorStop(1, 'rgba(220,248,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = al*.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    for (const [a,k] of sp){ ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*R*k, y + Math.sin(a)*R*k); ctx.stroke(); } ctx.globalAlpha = 1; }}); }
function drawBoltBurst(x, y){ spawnFx({b:Array.from({length:5}, () => { const a = Math.random()*TAU; return boltPath(x, y, x + Math.cos(a)*50, y + Math.sin(a)*50, 10); }),
  update(){ return this.t < .15; }, top(){ ctx.globalAlpha = 1 - this.t/.15; for (const b of this.b) drawBolt(b, '#F7D02C', 2); ctx.globalAlpha = 1; }}); }
function boltPath(x1, y1, x2, y2, jag){ const pts = [[x1,y1]], n = 9; for (let i=1;i<n;i++){ const k = i/n; pts.push([x1+(x2-x1)*k + rand(-jag,jag), y1+(y2-y1)*k + rand(-jag,jag)*.3]); } pts.push([x2,y2]); return pts; }
function strokePts(pts){ ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
function drawBolt(pts, col, w){ ctx.lineJoin = 'round'; ctx.lineCap = 'round'; const a = ctx.globalAlpha;
  ctx.strokeStyle = col; ctx.globalAlpha = a*.35; ctx.lineWidth = w*3.2; strokePts(pts); ctx.globalAlpha = a; ctx.lineWidth = w; strokePts(pts);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w*.4; strokePts(pts); }
function drawFlame(x, y, s, al=1){ ctx.globalAlpha = al; const g = ctx.createRadialGradient(x, y - s*.2, 0, x, y - s*.3, s*1.5);
  g.addColorStop(0, '#fff6c0'); g.addColorStop(.35, '#ffc040'); g.addColorStop(.75, '#ff6a1a'); g.addColorStop(1, 'rgba(232,67,42,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - s*1.8); ctx.quadraticCurveTo(x + s*1.1, y - s*.3, x, y + s*.5); ctx.quadraticCurveTo(x - s*1.1, y - s*.3, x, y - s*1.8); ctx.fill(); ctx.globalAlpha = 1; }
function starPath(x, y, R, r, n, rot){ ctx.beginPath(); for (let i=0;i<n*2;i++){ const a = rot + i*Math.PI/n, rr = i%2 ? r : R; ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); } ctx.closePath(); }
function glowBall(x, y, R, c0, c1, c2){ const g = ctx.createRadialGradient(x, y, 0, x, y, R*1.6);
  g.addColorStop(0, c0); g.addColorStop(.3, c1); g.addColorStop(.62, c2); g.addColorStop(1, c2 + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R*1.6, 0, TAU); ctx.fill(); }
function sparks(x, y, cols, n, sp, size, drag){ for (let i=0;i<n;i++){ const a = Math.random()*TAU, v = rand(.3,1)*sp;
  game.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:rand(.3,.6), max:.6, col:pick(cols), size:rand(size*.5,size), drag}); } }
// Halo lumineux (mélange additif) : un dégradé radial par couleur, mis en cache
const GLOW = {};
const isHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const hexLum = c => isHex(c) ? (parseInt(c.slice(1,3),16)*.299 + parseInt(c.slice(3,5),16)*.587 + parseInt(c.slice(5,7),16)*.114)/255 : 0;
function glowSprite(col){ let c = GLOW[col]; if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, col); g.addColorStop(.35, col + '99'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return GLOW[col] = c; }
function drawGlow(x, y, R, col, a){ if (!isHex(col) || a <= 0) return; const op = ctx.globalCompositeOperation, al = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(col), x - R, y - R, R*2, R*2); ctx.globalCompositeOperation = op; ctx.globalAlpha = al; }
// Impact d'un coup : petit gel, flash coloré du type, étoile d'impact blanche, ondes
function impactFx(x, y, col, dmg, e){
  hitstop(Math.min(.09, .02 + dmg/450));
  const big = e > 1, s = Math.min(1.6, .7 + dmg/50)*(big ? 1.3 : 1), rot = Math.random()*TAU, n = big ? 8 : 6;
  shockRing(x, y, 26 + Math.min(40, dmg), '#ffffff', .2, 4);
  shockRing(x, y, (34 + Math.min(50, dmg))*(big ? 1.3 : 1), col, .28, big ? 6 : 3);
  spawnFx({update(){ return this.t < .2; }, top(){ const k = this.t/.2;
    drawGlow(x, y, 46*s*(.6 + .6*k), col, (1 - k)*.9); drawGlow(x, y, 22*s, '#ffffff', (1 - k)*.8);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff';
    for (let i=0;i<n;i++){ const a = i/n*TAU, L = (i % 2 ? 22 : 34)*s*(.5 + k*.8), w = 3.2*s*(1 - k);
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*L, Math.sin(a)*L); ctx.lineTo(-Math.sin(a)*w, Math.cos(a)*w); ctx.lineTo(Math.sin(a)*w, -Math.cos(a)*w); ctx.closePath(); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
  if (big){ screenFlash('#ffffff', .12, .12); zoomPunch(.015); sparks(x, y, ['#ffffff', col], 10, 260, 4); }
}
function drawPmdAt(pm, name, x, y, dirA, S){
  const A = pm.a[name] || pm.a.Walk || pm.a.Idle; if (!A) return;
  const i = pmdFrame(A, game.t*60, true), oct = ((Math.round(dirA/(Math.PI/4)) % 8) + 8) % 8, row = pmdRow(A, oct);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(A.img, i*A.fw, row*A.fh, A.fw, A.fh, x - A.fw/2*S, y - A.fh/2*S, A.fw*S, A.fh*S);
}

// ---------- Rendu des projectiles selon leur type ----------
function drawProj(p){
  const look = p.mv.look || p.mv.t, a = Math.atan2(p.vy, p.vx), r = p.r, t = game.t, tr = p.trail || [], n = tr.length;
  if (isHex(p.col)){ drawGlow(p.x, p.y, r*3.2, p.col, .45);
    if (Math.random() < .3) game.parts.push({x:p.x + rand(-r, r)*.6, y:p.y + rand(-r, r)*.6, vx:-p.vx*.1 + rand(-20,20), vy:-p.vy*.1 + rand(-20,20), life:.3, max:.3, col:hexLum(p.col) > .35 ? p.col : '#ffffff', size:rand(1.5, 3)}); }
  ctx.save();
  switch (look){
    case 'Fire':
      for (let i=0;i<n;i++){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.55; ctx.fillStyle = k > .6 ? '#ff9a2a' : '#e8432a';
        ctx.beginPath(); ctx.arc(q.x, q.y, r*(.3+.6*k)*(.85+.3*Math.random()), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r*(1.1+.1*Math.sin(t*40)), '#fff7c8', '#ffb43a', '#ff5a1a'); break;
    case 'Water':
      for (let i=0;i<n;i+=2){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.6; ctx.fillStyle = '#9ec0ff'; ctx.beginPath(); ctx.arc(q.x + Math.sin(i*2.3)*3, q.y + Math.cos(i*1.7)*3, r*.35*k + 1, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r, '#ffffff', '#8fb2ff', '#3d6fe0');
      ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r*.6, -2.4, -1.2); ctx.stroke(); break;
    case 'Electric': {
      if (n > 1){ const pts = tr.map(q => [q.x + rand(-6,6), q.y + rand(-6,6)]); pts.push([p.x, p.y]); ctx.globalAlpha = .9; drawBolt(pts, '#F7D02C', 2.5); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r, '#ffffff', '#fff3a0', '#F7D02C');
      for (let i=0;i<3;i++){ const aa = Math.random()*TAU; drawBolt([[p.x, p.y], [p.x + Math.cos(aa)*r*1.4, p.y + Math.sin(aa)*r*1.4], [p.x + Math.cos(aa+.5)*r*2.2, p.y + Math.sin(aa+.5)*r*2.2]], '#F7D02C', 1.2); }
      break; }
    case 'Ice':
      if (n){ ctx.strokeStyle = '#dff8ff'; ctx.globalAlpha = .4; ctx.lineWidth = r*.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.translate(p.x, p.y); ctx.rotate(t*9 + (p.seed||0)); starPath(0, 0, r*1.5, r*.55, 6, 0);
      ctx.fillStyle = '#ecfcff'; ctx.fill(); ctx.strokeStyle = '#6fcfdc'; ctx.lineWidth = 2; ctx.stroke(); break;
    case 'Rock': case 'Ground': {
      const s = p.seed || 1; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + r*.9, r, r*.4, 0, 0, TAU); ctx.fill();
      ctx.translate(p.x, p.y); ctx.rotate(t*7 + s*9); ctx.beginPath();
      for (let i=0;i<7;i++){ const aa = i/7*TAU, rr = r*(.8 + .35*Math.abs(Math.sin(s*13 + i*2.1))); ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr); } ctx.closePath();
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, look === 'Rock' ? '#d8c890' : '#ecd08a'); g.addColorStop(1, look === 'Rock' ? '#6e5f34' : '#8a6a3a');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3a301a'; ctx.lineWidth = 2; ctx.stroke(); break; }
    case 'Psychic':
      for (let j=0;j<3;j++){ const ph = (t*2.5 + j/3) % 1; ctx.globalAlpha = (1-ph)*.8; ctx.strokeStyle = '#ff7eb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r*(.6 + ph*1.4), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r*.9, '#ffffff', '#ffa0c8', '#F95587'); break;
    case 'Ghost': {
      for (let i=0;i<n;i++){ const k = (i+1)/n, q = tr[i], w = Math.sin(i*.9 + t*12)*4; ctx.globalAlpha = k*.45; ctx.fillStyle = '#735797';
        ctx.beginPath(); ctx.arc(q.x - Math.sin(a)*w, q.y + Math.cos(a)*w, r*(.35+.6*k), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r, '#efe0ff', '#9a78c8', '#3a2458');
      ctx.fillStyle = '#ffffff'; for (const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a)*r*.25 - Math.sin(a)*s*r*.3, p.y + Math.sin(a)*r*.25 + Math.cos(a)*s*r*.3, r*.16, r*.24, a, 0, TAU); ctx.fill(); }
      break; }
    case 'Dragon':
      for (let i=1;i<n;i++){ const k = i/n, q0 = tr[i-1], q1 = tr[i], w0 = Math.sin((i-1)*.8 - t*14)*5, w1 = Math.sin(i*.8 - t*14)*5;
        ctx.globalAlpha = k*.7; ctx.strokeStyle = i%2 ? '#8a5cff' : '#6F35FC'; ctx.lineWidth = r*1.3*k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q0.x - Math.sin(a)*w0, q0.y + Math.cos(a)*w0); ctx.lineTo(q1.x - Math.sin(a)*w1, q1.y + Math.cos(a)*w1); ctx.stroke(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r, '#ffffff', '#c0a8ff', '#6F35FC'); break;
    case 'Fairy':
      for (let i=0;i<4;i++){ const aa = t*5 + i*TAU/4; starPath(p.x + Math.cos(aa)*r*1.7, p.y + Math.sin(aa)*r*1.7, 3.5, 1.4, 4, aa); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      glowBall(p.x, p.y, r*.9, '#ffffff', '#ffd0e8', '#D685AD');
      starPath(p.x, p.y, r*1.3, r*.55, 5, t*4); ctx.fillStyle = '#fff3fa'; ctx.fill(); ctx.strokeStyle = '#D685AD'; ctx.lineWidth = 1.5; ctx.stroke(); break;
    case 'Grass':
      for (let i=0;i<3;i++){ const aa = t*8 + i*TAU/3; ctx.save(); ctx.translate(p.x + Math.cos(aa)*r*.6, p.y + Math.sin(aa)*r*.6); ctx.rotate(aa + 1.2);
        ctx.fillStyle = '#7AC74C'; ctx.beginPath(); ctx.ellipse(0, 0, r*.95, r*.42, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3f7a24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r*.9, 0); ctx.lineTo(r*.9, 0); ctx.stroke(); ctx.restore(); } break;
    case 'Poison':
      for (let i=0;i<n;i+=2){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.6; ctx.strokeStyle = '#d58ad5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, r*.3*k + 2, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = .9; ctx.fillStyle = '#A33EA1'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#e8b0e8'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ffffffaa'; ctx.beginPath(); ctx.arc(p.x - r*.35, p.y - r*.35, r*.25, 0, TAU); ctx.fill(); break;
    case 'Steel': {
      ctx.translate(p.x, p.y); ctx.rotate(a); const h = r*1.3*Math.abs(Math.cos(t*22)) + 2;
      const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#B7B7CE'); g.addColorStop(1, '#5c5c74');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, h, r*1.3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); break; }
    case 'Fighting':
      glowBall(p.x, p.y, r, '#ffffff', '#ffb08a', '#C22E28'); ctx.strokeStyle = '#ffd0b0'; ctx.lineWidth = 2; ctx.setLineDash([5,5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, r*1.3, t*8, t*8 + TAU); ctx.stroke(); ctx.setLineDash([]); break;
    case 'aura':
      glowBall(p.x, p.y, r*1.05, '#ffffff', '#a8d4ff', '#2f63d8');
      for (let i=0;i<3;i++){ const aa = t*9 + i*TAU/3; ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r*1.25, aa, aa + 1.3); ctx.stroke(); }
      break;
    case 'Dark':
      ctx.translate(p.x, p.y); ctx.rotate(a); ctx.shadowColor = '#c04a6a'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#2a1626'; ctx.beginPath(); ctx.arc(0, 0, r*1.5, -1.3, 1.3); ctx.arc(-r*.7, 0, r*1.2, 1.1, -1.1, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d06080'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r*1.5, -1.3, 1.3); ctx.stroke(); break;
    case 'Flying':
      ctx.translate(p.x, p.y); ctx.rotate(a);
      for (let i=0;i<2;i++){ ctx.globalAlpha = 1 - i*.4; ctx.strokeStyle = i ? '#cbbcff' : '#ffffff'; ctx.lineWidth = 3.5 - i; ctx.beginPath(); ctx.arc(-i*r*.8, 0, r*1.4, -1.1, 1.1); ctx.stroke(); }
      break;
    case 'Bug':
      glowBall(p.x, p.y, r, '#f4ffd0', '#c8e050', '#A6B91A');
      for (let i=0;i<2;i++){ ctx.strokeStyle = '#e8f8a0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, r*1.6, r*.6, t*12 + i*1.6, 0, TAU); ctx.stroke(); }
      break;
    case 'focusblast':
      for (let i=0;i<n;i+=2){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.35; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(q.x, q.y, r*(.4 + .5*k), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r*1.1, '#ffffff', '#ffe08a', '#ff7a1a');
      for (let i=0;i<4;i++){ const aa = t*7 + i*TAU/4; ctx.strokeStyle = i%2 ? '#fff3c0' : '#ff9a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r*(.95 + .1*Math.sin(t*20 + i)), aa, aa + 1.1); ctx.stroke(); }
      break;
    case 'psyblade':
      ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = '#ffd0e4'; ctx.strokeStyle = '#F95587'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r*1.6, -1.2, 1.2); ctx.arc(-r*.6, 0, r*1.3, 1.05, -1.05, true); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'darkpulse': case 'waterpulse': {
      const dark = look === 'darkpulse', c1 = dark ? '#140a18' : '#2f63d8', c2 = dark ? '#8a4a8a' : '#cfe2ff';
      ctx.translate(p.x, p.y); ctx.rotate(a); ctx.lineCap = 'round';
      for (let j=2;j>=0;j--){ const off = -j*10 - ((t*30) % 10), rr = r*(1 - j*.12), al = 1 - j*.25;
        ctx.globalAlpha = al; ctx.strokeStyle = c1; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(off, 0, rr, -1.05, 1.05); ctx.stroke();
        ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.globalAlpha = 1; break; }
    case 'wisp': {
      for (let i=0;i<n;i+=2){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.4; ctx.fillStyle = '#7a5cff'; ctx.beginPath(); ctx.arc(q.x, q.y, r*.35*k + 2, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; const s0 = r*(.9 + .12*Math.sin(t*25)), g = ctx.createRadialGradient(p.x, p.y - s0*.2, 0, p.x, p.y - s0*.3, s0*1.6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#c8b8ff'); g.addColorStop(.75, '#6a4ae0'); g.addColorStop(1, 'rgba(58,26,138,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x, p.y - s0*1.9); ctx.quadraticCurveTo(p.x + s0*1.1, p.y - s0*.3, p.x, p.y + s0*.6); ctx.quadraticCurveTo(p.x - s0*1.1, p.y - s0*.3, p.x, p.y - s0*1.9); ctx.fill(); break; }
    case 'dragonpulse':
      for (let i=0;i<n;i+=2){ const k = (i+1)/n, q = tr[i]; ctx.globalAlpha = k*.35; ctx.strokeStyle = '#6a9cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, r*(.4 + .5*k), 0, TAU); ctx.stroke(); }
      for (let j=0;j<3;j++){ const ph = (t*3 + j/3) % 1; ctx.globalAlpha = (1 - ph)*.9; ctx.strokeStyle = j === 1 ? '#cfe0ff' : '#4a7dff'; ctx.lineWidth = 3 - ph*1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, r*(.35 + ph*.95), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r*.45, '#ffffff', '#a8c4ff', '#3a6aff'); break;
    case 'diamond': {
      if (n){ ctx.globalAlpha = .35; ctx.strokeStyle = '#dff8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.translate(p.x, p.y); ctx.rotate(a); const g = ctx.createLinearGradient(-r*1.6, -r, r*1.6, r); g.addColorStop(0, '#9fe3f0'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, '#5fb8d0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r*1.7, 0); ctx.lineTo(0, -r*.85); ctx.lineTo(-r*1.2, 0); ctx.lineTo(0, r*.85); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*1.7, 0); ctx.lineTo(-r*1.2, 0); ctx.moveTo(0, -r*.85); ctx.lineTo(0, r*.85); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
      if (Math.sin(t*20) > .6){ ctx.fillStyle = '#ffffff'; starPath(r*.4, -r*.3, 4, 1.2, 4, 0); ctx.fill(); }
      break; }
    case 'shadowball':
      for (let i=0;i<n;i++){ const k = (i+1)/n, q = tr[i], w = Math.sin(i*1.3 + t*10)*5; ctx.globalAlpha = k*.5; ctx.fillStyle = i%2 ? '#2a1838' : '#4a2a6a';
        ctx.beginPath(); ctx.arc(q.x - Math.sin(a)*w, q.y + Math.cos(a)*w, r*(.3 + .5*k), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; glowBall(p.x, p.y, r*1.05, '#0c0614', '#24123a', '#8a5cc8');
      ctx.fillStyle = '#0a0410'; ctx.beginPath(); ctx.arc(p.x, p.y, r*.78, 0, TAU); ctx.fill();
      for (let i=0;i<3;i++){ const aa = t*6 + i*TAU/3; ctx.strokeStyle = '#a77ee0'; ctx.globalAlpha = .7; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r*.9, aa, aa + 1.2); ctx.stroke(); }
      ctx.globalAlpha = 1; break;
    case 'dart':
      ctx.translate(p.x, p.y); ctx.rotate(a); ctx.strokeStyle = '#c86ad0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r*3, 0); ctx.lineTo(r*1.2, 0); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(r*2.4, 0); ctx.lineTo(r*.8, -r*.7); ctx.lineTo(r*.8, r*.7); ctx.closePath(); ctx.fill(); break;
    case 'dreepy': {
      const pm = PMD.fantyrm;
      if (n){ ctx.globalAlpha = .35; ctx.strokeStyle = '#6F35FC'; ctx.lineWidth = r; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
      if (pm && pm.st === 'ok') drawPmdAt(pm, 'Walk', p.x, p.y - 4, a, 1.7); else glowBall(p.x, p.y, r, '#e0f0ff', '#7fb0d0', '#3a6080');
      break; }
    case 'shuriken':
      if (n){ ctx.globalAlpha = .35; ctx.strokeStyle = '#9ec0ff'; ctx.lineWidth = r*.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.translate(p.x, p.y); ctx.rotate(t*28); starPath(0, 0, r*1.6, r*.45, 4, 0); ctx.fillStyle = '#d8e8ff'; ctx.fill(); ctx.strokeStyle = '#3d6fe0'; ctx.lineWidth = 2; ctx.stroke(); break;
    default:
      glowBall(p.x, p.y, r, '#ffffff', '#f4f0e0', p.col.length === 7 ? p.col : '#A8A77A');
  }
  ctx.restore();
}

// ---------- Attaques emblématiques ----------
// SIG[nom](f, mv, a, tx, ty, opts) : a = direction visée, (tx,ty) = point visé
function fireField(f, a, R, half){
  const ox = f.x, oy = f.y, fl = [];
  for (let i=0;i<28;i++){ const aa = a + rand(-half, half)*.92, d = rand(36, R*.95); fl.push({x:ox + Math.cos(aa)*d, y:oy + Math.sin(aa)*d, s:rand(.7,1.3), ph:Math.random()*6}); }
  for (let i=0;i<5;i++){ const d = R*(i+1)/6; scorchDecal(ox + Math.cos(a)*d, oy + Math.sin(a)*d, 30 + d*.35, 3.5); }
  const burnMv = sub(MOVES.rafalefeu, {p:16, fx:{burn:.25}}); let tick = 0;
  spawnFx({update(dt){ tick -= dt; const e = foeOf(f);
      for (let k=1;k<=3;k++) danger(f, ox + Math.cos(a)*R*k/3.6, oy + Math.sin(a)*R*k/3.6, 34*k);
      if (tick <= 0 && e.hp > 0 && !e.buried && Math.hypot(e.x-ox, e.y-oy) < R && angDiff(Math.atan2(e.y-oy, e.x-ox), a) < half){ tick = .5; hit(f, e, burnMv, 1); }
      return this.t < 3; },
    ground(){ const al = Math.min(1, (3-this.t)/.6); for (const p of fl) drawFlame(p.x, p.y, 7*p.s*(.8 + .25*Math.sin(game.t*13 + p.ph)), al*.9); }});
}
function meteorCrater(x, y, big, f){
  if (f){ const R = big ? 70 : 45; spawnFx({update(){ const e = foeOf(f); if (e.hp > 0 && !e.buried && Math.hypot(e.x-x, e.y-y) < R + e.r*.5){ if (e.slow <= 0 || e.slowF >= .55) e.slowF = .55; e.slow = Math.max(e.slow, .3); } return this.t < 2.5; },
    ground(){ const al = Math.min(1, (2.5 - this.t)/.5); ctx.globalAlpha = al*.35; ctx.fillStyle = '#0a0818'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = al*(.5 + .2*Math.sin(game.t*8)); ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1; }}); }
  shake(big ? 13 : 6); if (big){ screenFlash('#e8f0ff', .3, .2); zoomPunch(.04); }
  crackDecal(x, y, big ? 70 : 40); shockRing(x, y, big ? 110 : 60, '#dfe6ff', .4, 10); sparks(x, y, ['#ffffff','#B7B7CE','#ffb347'], 22, 280, 6);
}
function drumBeat(f, n){ shake(2 + n*2); shockRing(f.x, f.y, 55 + n*18, '#9be070', .3, 9); sparks(f.x, f.y, ['#a8e07a','#7AC74C'], 8, 140, 4); }
function rootZone(f, mv, x, y){
  const r = 44, delay = .22, spikes = []; for (let i=0;i<6;i++){ const a = i/6*TAU + rand(-.3,.3), d = rand(8, r*.8); spikes.push({x:x + Math.cos(a)*d, y:y + Math.sin(a)*d*.7, h:rand(28,46), lean:rand(-.35,.35)}); }
  spawnFx({update(){ if (!this.done){ danger(f, x, y, r);
        if (this.t >= delay){ this.done = true; const e = zoneHit(f, mv, x, y, r); if (e && e.hp > 0){ e.root = Math.max(e.root, 1); popText(e.x, e.y - 62, 'Immobilisé !', '#7AC74C', 13); } sparks(x, y, ['#7AC74C','#5b3a1e','#a8e07a'], 14, 200, 5); shake(4); crackDecal(x, y, 34); } }
      return this.t < delay + .75; },
    ground(){ if (!this.done){ const k = this.t/delay; ctx.globalAlpha = .2 + .3*k; ctx.fillStyle = '#7AC74C'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
      const k = Math.min(1, (this.t - delay)/.75), up = k < .25 ? k/.25 : 1 - (k-.25)/.75;
      for (const s of spikes){ ctx.globalAlpha = Math.min(1, up*1.5); const tx = s.x + Math.sin(s.lean)*s.h*up, ty = s.y - s.h*up;
        ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + s.lean*30, s.y - s.h*up*.5, tx, ty); ctx.stroke();
        ctx.strokeStyle = '#7AC74C'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.globalAlpha = 1; }});
}
function boltZone(f, mv, x, y, delay){
  const r = 46;
  spawnFx({update(){ if (!this.done){ danger(f, x, y, r);
        if (this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, r); shake(7); screenFlash('#e4f4ff', .28, .12);
          this.bolt = boltPath(x + rand(-30,30), y - 360, x, y, 28); sparks(x, y, ['#ffffff','#F7D02C','#9fd8ff'], 18, 280, 4); scorchDecal(x, y, 38); } }
      return this.t < delay + .32; },
    ground(){ if (this.done) return; const k = this.t/delay; ctx.globalAlpha = .18 + .35*k; ctx.fillStyle = '#F7D02C'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*(1-k*.6), 0, TAU); ctx.stroke();
      if (Math.random() < .5){ const aa = Math.random()*TAU; drawBolt([[x, y], [x + Math.cos(aa)*r*.6, y + Math.sin(aa)*r*.6], [x + Math.cos(aa+.4)*r, y + Math.sin(aa+.4)*r]], '#F7D02C', 1.2); }
      ctx.globalAlpha = 1; },
    top(){ if (!this.done) return; const k = (this.t - this.max0())/.32; ctx.globalAlpha = Math.max(0, 1-k);
      if (Math.random() < .5) this.bolt = boltPath(x + rand(-30,30), y - 360, x, y, 28);
      drawBolt(this.bolt, '#8fd0ff', 7); glowBall(x, y, 22, '#ffffff', '#fff3a0', '#F7D02C'); ctx.globalAlpha = 1; },
    max0(){ return delay; }});
}
function geyser(x, y){
  shake(10); screenFlash('#9ec0ff', .22, .2); sparks(x, y, ['#ffffff','#9ec0ff','#6390F0'], 26, 300, 6);
  spawnFx({update(){ return this.t < .6; }, top(){ const k = this.t/.6, h = 150*Math.sin(Math.min(1, k*1.6)*Math.PI/2)*(1-Math.max(0, k-.6)/.4), w = 22*(1 - k*.3);
    const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, 'rgba(158,192,255,.9)'); g.addColorStop(1, 'rgba(61,111,224,.6)');
    ctx.globalAlpha = 1 - Math.max(0, k-.7)/.3; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w*.6, y - h*.6, x - w*.4 + Math.sin(game.t*30)*3, y - h);
    ctx.lineTo(x + w*.4, y - h); ctx.quadraticCurveTo(x + w*.6, y - h*.6, x + w, y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }});
}
function xSlash(f, mv, x, y, a){
  const R = 80, delay = .1;
  spawnFx({update(){ if (!this.done && this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, R); shake(15); hitstop(.1); screenFlash('#2a0820', .4, .25); zoomPunch(.05);
        sparks(x, y, ['#ffffff','#d0d0e8','#c04a6a'], 26, 320, 5); crackDecal(x, y, 50); } return this.t < .6; },
    top(){ const fade = this.t > .3 ? Math.max(0, 1 - (this.t - .3)/.3) : 1;
      for (let s=0;s<2;s++){ const k = Math.max(0, Math.min(1, (this.t - s*.07)/.1)); if (!k) continue; const aa = a + (s ? -.8 : .8), L = R*1.3;
        const x1 = x - Math.cos(aa)*L, y1 = y - Math.sin(aa)*L, x2 = x1 + Math.cos(aa)*2*L*k, y2 = y1 + Math.sin(aa)*2*L*k;
        ctx.globalAlpha = fade; ctx.lineCap = 'round'; ctx.strokeStyle = '#3a0a2a'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = '#c04a6a'; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.globalAlpha = 1; }});
}
function liftAndSlam(f, e, mv){
  const up = .55, hold = .2, down = .12, T = up + hold + down;
  e.dash = null; e.script = null; e.roll = null; zoomPunch(.04);
  e.air = {t:0, dur:T, glow:'#F95587', h(k){ const s = k*T; return s < up ? 78*Math.sin(s/up*Math.PI/2) : s < up + hold ? 78 + Math.sin(s*40)*2 : 78*(1 - (s-up-hold)/down); },
    onLand(){ hit(f, e, mv, 1); shake(16); zoomPunch(.06); hitstop(.08); screenFlash('#ffd0e4', .3, .2); crackDecal(e.x, e.y, 60); shockRing(e.x, e.y, 95, '#F95587', .4, 12); }};
}
function iceSpike(f, x, y){
  if (f.iceSpike) f.iceSpike.dead = true;
  f.iceSpike = spawnFx({x, y, update(){ if (this.dead) return false; if (this.t > 8){ sparks(x, y, ['#ffffff','#bfe9f5'], 10, 120, 4); f.iceSpike = null; return false; } return true; },
    explode(){ if (this.dead) return; this.dead = true; f.iceSpike = null; zoneHit(f, sub(MOVES.chuteglace, {p:85}), x, y, 85);
      shake(12); hitstop(.06); screenFlash('#e8fbff', .3, .2); shockRing(x, y, 115, '#bff3ff', .4, 12); sparks(x, y, ['#ffffff','#dff8ff','#96D9D6'], 34, 320, 6); frostDecal(x, y, 95); },
    top(){ const pulse = .5 + .5*Math.sin(game.t*6); glowBall(x, y - 14, 20 + pulse*4, '#ffffff', '#c8f2ff', '#5fb8d0');
      for (const [dx, h, w] of [[-9, 30, 8], [0, 44, 10], [10, 26, 7]]){ const g = ctx.createLinearGradient(x + dx, y - h, x + dx, y);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#7fd0e0'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + dx - w, y); ctx.lineTo(x + dx, y - h); ctx.lineTo(x + dx + w, y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); } }});
}
function icicle(f, mv, x, y, delay, last){
  const r = last ? 44 : 30;
  spawnFx({update(){ if (this.done) return false; danger(f, x, y, r);
      if (this.t >= delay){ this.done = true; const e = zoneHit(f, mv, x, y, r); shake(last ? 8 : 4); sparks(x, y, ['#ffffff','#dff8ff','#96D9D6'], 12, 220, 4); frostDecal(x, y, r + 6);
        if (last){ if (e && e.hp > 0){ e.root = Math.max(e.root, .4); e.dash = null; popText(e.x, e.y - 62, 'Immobilisé !', '#96D9D6', 13); } iceSpike(f, x, y); } }
      return true; },
    ground(){ const k = Math.min(1, this.t/delay); ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#0a1a24'; ctx.beginPath(); ctx.ellipse(x, y, r*k, r*k*.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .6; ctx.strokeStyle = '#bfe9f5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), yy = y - (1 - k*k)*340, w = last ? 13 : 10, h = last ? 50 : 40;
      const g = ctx.createLinearGradient(x, yy - h, x, yy); g.addColorStop(0, '#7fd0e0'); g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, yy - h); ctx.lineTo(x + w, yy - h); ctx.lineTo(x, yy); ctx.closePath(); ctx.fill(); }});
}
// trois griffes violettes en arc, avec une traînée de flammes draconiques (Colère)
function dragonClawSlash(f, a, R, half, big){
  const x = f.x, y = f.y, dur = big ? .32 : .26;
  for (let i=0;i<(big ? 22 : 12);i++){ const aa = a + rand(-half, half), d = R*rand(.7, 1.05); game.parts.push({x:x + Math.cos(aa)*d, y:y + Math.sin(aa)*d, vx:Math.cos(aa)*60, vy:-rand(40, 110), life:rand(.3, .5), max:.5, col:pick(['#b08cff','#6F35FC','#ffffff','#d8c8ff']), size:rand(3, 6)}); }
  spawnFx({update(){ return this.t < dur; }, top(){ const sweep = Math.min(1, this.t/.1), fade = this.t > .12 ? Math.max(0, 1 - (this.t - .12)/(dur - .12)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineCap = 'round'; ctx.globalAlpha = fade;
    for (const [k, w] of [[.78, 1], [.92, 1.2], [1.06, 1]]){ const rr = R*k, a0 = -half, a1 = -half + 2*half*sweep;
      ctx.strokeStyle = '#2a1458'; ctx.lineWidth = (big ? 11 : 8)*w; ctx.beginPath(); ctx.arc(0, 0, rr, a0, a1); ctx.stroke();
      ctx.strokeStyle = big ? '#a07bff' : '#7a4cff'; ctx.lineWidth = (big ? 6 : 4.5)*w; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6*w; ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
}
function bigSlash(f, a, R, half, col){
  const x = f.x, y = f.y;
  spawnFx({update(){ return this.t < .24; }, top(){ const k = this.t/.24; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = 1 - k;
    const rr = R*(.85 + .15*k); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, rr, -half, half); ctx.arc(-rr*.3, 0, rr*.85, half*.9, -half*.9, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rr, -half, half); ctx.stroke(); ctx.restore(); }});
}
// Point visé en direct (Choc Psy) : souris ou stick si la visée est manuelle, sinon l'ennemi (avec l'erreur de visée de l'IA)
function liveAimPoint(f, i, manual){
  const e = foeOf(f);
  if (f.isAI){ const a = Math.random()*TAU, r = Math.random()*game.diff.aimErr*150; return clampRange(f, e.x + Math.cos(a)*r, e.y + Math.sin(a)*r); }
  if (manual && f.side === 'e' && game.vs2){ if (pad2.aimOn){ const p = dirPoint(f, Math.cos(pad2.aimA), Math.sin(pad2.aimA), pad2.aimMag, i, true); return clampRange(f, p.x, p.y); } }
  else if (manual){
    if (inputMode === 'mouse' && mouse.seen) return clampRange(f, mouse.x, mouse.y);
    if (inputMode === 'pad' && pad.aimOn){ const p = dirPoint(f, Math.cos(pad.aimA), Math.sin(pad.aimA), pad.aimMag, i, true); return clampRange(f, p.x, p.y); }
  }
  return clampRange(f, e.x, e.y);
}
// Direction visée en direct (pour les enchaînements comme Colère)
function liveAimAngle(f){
  const e = foeOf(f), toFoe = Math.atan2(e.y - f.y, e.x - f.x);
  if (f.isAI) return toFoe + (Math.random()*2-1)*game.diff.aimErr;
  if (f.side === 'e' && game.vs2) return pad2.aimOn ? pad2.aimA : toFoe;
  if (inputMode === 'mouse' && mouse.seen) return Math.atan2(mouse.y - f.y, mouse.x - f.x);
  if (inputMode === 'pad' && pad.aimOn) return pad.aimA;
  if (inputMode === 'touch' && touchAim && touchAim.active) return Math.atan2(touchAim.dy, touchAim.dx);
  return toFoe;
}

// Fissures qui partent du centre (Séisme) : lignes brisées avec leur longueur cumulée
function makeCracks(R){
  const lines = [];
  for (let i=0;i<13;i++){ let a = i/13*TAU + rand(-.2,.2), x = 0, y = 0, L = 0; const pts = [{x, y, L}], seg = 7, len = R*rand(.8,1.05);
    for (let s=0;s<seg;s++){ a += rand(-.35,.35); const d = len/seg; x += Math.cos(a)*d; y += Math.sin(a)*d; L += d; pts.push({x, y, L}); }
    // petite branche
    const b = pts[3 + Math.floor(Math.random()*3)], ba = Math.atan2(b.y, b.x) + (Math.random() < .5 ? .7 : -.7);
    lines.push(pts, [{x:b.x, y:b.y, L:b.L}, {x:b.x + Math.cos(ba)*R*.18, y:b.y + Math.sin(ba)*R*.18, L:b.L + R*.18}]); }
  return lines;
}
function strokeCracks(x, y, lines, maxL){
  for (const l of lines){ if (l[0].L > maxL) continue; ctx.beginPath(); ctx.moveTo(x + l[0].x, y + l[0].y);
    for (let i=1;i<l.length;i++){ const p0 = l[i-1], p1 = l[i]; if (p1.L <= maxL) ctx.lineTo(x + p1.x, y + p1.y);
      else { const k = (maxL - p0.L)/(p1.L - p0.L); ctx.lineTo(x + p0.x + (p1.x-p0.x)*k, y + p0.y + (p1.y-p0.y)*k); break; } }
    ctx.stroke(); }
}
function crackLinesDecal(x, y, lines){ decal({x, y, life:3.5, draw(al){ ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = al*.85; ctx.strokeStyle = '#08060f'; ctx.lineWidth = 3.5; strokeCracks(x, y, lines, 1e9);
  ctx.globalAlpha = al*.3; ctx.strokeStyle = '#E2BF65'; ctx.lineWidth = 1; strokeCracks(x + 1, y + 1, lines, 1e9); ctx.globalAlpha = 1; }}); }
// Rendu des ondes autour du lanceur (Séisme, Bourdon, Éclat Magique, Bourdon…)
function drawRing(rg){
  const k = Math.min(1, rg.t/rg.mv.dur), col = TYPES[rg.mv.t][1], R = Math.max(1, rg.r);
  if (rg.mv.ring === 'cracks'){
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 1; ctx.strokeStyle = '#08060f'; ctx.lineWidth = 4; strokeCracks(rg.x, rg.y, rg.cracks, R);
    ctx.strokeStyle = '#E2BF65'; ctx.globalAlpha = .55; ctx.lineWidth = 1.5; strokeCracks(rg.x + 1, rg.y + 1, rg.cracks, R);
    if (k < 1 && Math.random() < .9) for (let i=0;i<3;i++){ const a = Math.random()*TAU; game.parts.push({x:rg.x + Math.cos(a)*R, y:rg.y + Math.sin(a)*R, vx:rand(-30,30), vy:-rand(30,90), life:.4, max:.4, col:pick(['#c9b98f','#8a6a3a','#E2BF65']), size:rand(3,6)}); }
  } else if (rg.mv.ring === 'sound'){
    for (let j=0;j<3;j++){ const rr = R - j*14; if (rr <= 4) continue; ctx.globalAlpha = (1 - k*.7)*(1 - j*.25); ctx.strokeStyle = j === 1 ? '#f0ffb0' : '#c8e050'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i=0;i<=72;i++){ const a = i/72*TAU, w = Math.sin(a*14 + game.t*24 + j)*3; ctx.lineTo(rg.x + Math.cos(a)*(rr + w), rg.y + Math.sin(a)*(rr + w)); } ctx.stroke(); }
  } else if (rg.mv.ring === 'stars'){
    ctx.globalAlpha = (1 - k*.5)*.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rg.x, rg.y, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const st of rg.stars){ ctx.globalAlpha = (1 - k*.6)*(.55 + .45*Math.sin(game.t*14 + st.ph)); starPath(rg.x + Math.cos(st.a)*st.k*R, rg.y + Math.sin(st.a)*st.k*R, st.s, st.s*.4, 4, st.ph); ctx.fill(); }
  } else {
    ctx.globalAlpha = 1 - k*.6; ctx.strokeStyle = col; ctx.lineWidth = 14*(1-k)+3; ctx.beginPath(); ctx.arc(rg.x, rg.y, R, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const BEAMS = {
  ice:{tele:'#bff3ff', glow:'#7fd6e8', core:'#ffffff', ball:['#ffffff','#dff8ff','#7fd6e8'], flash:'#e8fbff', sp:['#ffffff','#bff3ff']},
  fire:{tele:'#ffd25a', glow:'#ff6a1a', core:'#fff3c0', ball:['#fff6c0','#ffc040','#ff5a1a'], flash:'#ffe2b8', sp:['#fff3b0','#ffb43a','#ff6a1a']},
  steel:{tele:'#ececff', glow:'#9aa0c8', core:'#ffffff', ball:['#ffffff','#e4e4f4','#8a8aa8'], flash:'#f2f2ff', sp:['#ffffff','#d0d0e8']}
};
function beamAttack(f, mv, a, kind){
  const B = BEAMS[kind], wind = .2, ux = Math.cos(a), uy = Math.sin(a);
  f.act = {n:'Charge', t:0, dur:wind};
  spawnFx({update(){ for (let d=40; d<560; d+=70) danger(f, f.x + ux*d, f.y + uy*d, 20); if (this.t >= wind){ beamFire(f, mv, a, kind); return false; } return true; },
    ground(){ const k = this.t/wind; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a); ctx.globalAlpha = .25 + .5*k; ctx.strokeStyle = B.tele; ctx.lineWidth = 1 + 2*k; ctx.setLineDash([10,8]);
      ctx.beginPath(); ctx.moveTo(f.r, 0); ctx.lineTo(560, 0); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; glowBall(f.x + ux*(f.r+6), f.y + uy*(f.r+6), 5 + 9*k, ...B.ball); }});
}
function beamFire(f, mv, a, kind){
  const B = BEAMS[kind], ux = Math.cos(a), uy = Math.sin(a), sx = f.x + ux*f.r*.6, sy = f.y + uy*f.r*.6, hw = 18;
  let L = 560; for (let d=0; d<560; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL || x > W-WALL || y < WALL || y > H-WALL){ L = d; break; } }
  const ex = sx + ux*L, ey = sy + uy*L, e = foeOf(f);
  const onLine = (o, w) => { const rx = o.x - sx, ry = o.y - sy, along = rx*ux + ry*uy; return along > -10 && along < L + 10 && Math.abs(-rx*uy + ry*ux) < w; };
  if (e.hp > 0 && !e.buried && onLine(e, hw + e.r*.6)){ const ok = canHit(f, e, mv); hit(f, e, mv, 1);
    if (kind === 'ice' && ok && e.hp > 0 && Math.random() < .1){ e.root = 1; popText(e.x, e.y - 62, 'Gelé !', '#bff3ff', 15); frostDecal(e.x, e.y, 34); } }
  for (const rk of [...game.rocks]) if (onLine(rk, hw + rk.r)) hitRock(rk, mv.p*.4, B.glow);
  shake(4); screenFlash(B.flash, .15, .12); sparks(ex, ey, B.sp, 12, 170, 3);
  spawnFx({update(){ return this.t < .3; }, top(){ const k = this.t/.3; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = B.glow; ctx.lineWidth = 18*(1-k) + 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = B.core; ctx.lineWidth = 6*(1-k) + 1.5; ctx.stroke(); ctx.globalAlpha = 1; }});
  if (kind === 'ice'){
    const crystals = Array.from({length:Math.floor(L/26)}, (_, i) => ({d:i*26 + rand(0,20), o:rand(-10,10), s:rand(4,8), a:Math.random()*3}));
    spawnFx({update(){ const o = foeOf(f);
        if (o.hp > 0 && !o.buried && onLine(o, 16 + o.r*.5) && !o.d.types.includes('Ice')){ if (o.slow <= 0 || o.slowF >= .55) o.slowF = .55; o.slow = Math.max(o.slow, .3); }
        return this.t < 3; },
      ground(){ const al = Math.min(1, (3 - this.t)/.6); ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
        const g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, 'rgba(220,248,255,0)'); g.addColorStop(.5, `rgba(220,248,255,${.45*al})`); g.addColorStop(1, 'rgba(220,248,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, -16, L, 32); ctx.globalAlpha = al*.85; ctx.fillStyle = '#f0fcff'; ctx.strokeStyle = '#7fd0e0'; ctx.lineWidth = 1;
        for (const c of crystals){ starPath(c.d, c.o, c.s, c.s*.4, 4, c.a); ctx.fill(); ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = 1; }});
  } else if (kind === 'fire'){
    const fl = Array.from({length:Math.floor(L/30)}, (_, i) => ({d:i*30 + rand(0,22), o:rand(-9,9), s:rand(.6,1.1), ph:Math.random()*6})); let tick = 0;
    for (let d=30; d<L; d+=60) scorchDecal(sx + ux*d, sy + uy*d, 26, 3.2);
    spawnFx({update(dt){ const o = foeOf(f); tick -= dt;
        if (tick <= 0 && o.hp > 0 && !o.buried && onLine(o, 16 + o.r*.5)){ tick = .5; applyStatus(o, {burn:.25}); }
        return this.t < 3; },
      ground(){ const al = Math.min(1, (3 - this.t)/.6); for (const c of fl) drawFlame(sx + ux*c.d - uy*c.o, sy + uy*c.d + ux*c.o, 6*c.s*(.8 + .25*Math.sin(game.t*13 + c.ph)), al*.85); }});
  }
}
// bande longue et étroite devant le lanceur (Mégafouet, Sabotage)
function laneStrike(f, mv, a, wind, look){
  const L = 170, half = 20, ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y;
  const inLane = o => { const rx = o.x - sx, ry = o.y - sy, along = rx*ux + ry*uy; return along > -o.r && along < L + o.r*.5 && Math.abs(-rx*uy + ry*ux) < half + o.r*.6; };
  spawnFx({update(){
      if (!this.done){ danger(f, sx + ux*L*.5, sy + uy*L*.5, 40);
        if (this.t >= wind){ this.done = true; const e = foeOf(f); if (e.hp > 0 && !e.buried && inLane(e)) hit(f, e, mv, 1);
          shake(look === 'whip' ? 7 : 4);
          if (look === 'whip'){ crackDecal(sx + ux*L, sy + uy*L, 30); for (let d=40; d<=L; d+=26) sparks(sx + ux*d, sy + uy*d, ['#7AC74C','#a8e07a','#5b3a1e'], 3, 120, 4); }
          else sparks(sx + ux*L*.75, sy + uy*L*.75, ['#2a1626','#c04a6a','#ffffff'], 14, 220, 5); } }
      return this.t < wind + .32; },
    ground(){ if (!this.done){ ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.globalAlpha = .15 + .3*this.t/wind; ctx.fillStyle = look === 'whip' ? '#7AC74C' : '#705746'; ctx.fillRect(0, -half, L, half*2); ctx.restore(); ctx.globalAlpha = 1; } },
    top(){ const bx = sx, by = sy - 18;
      if (look === 'whip'){
        // liane levée pendant la préparation, puis qui s'abat jusqu'au bout de la bande
        const k = this.t < wind ? 0 : Math.min(1, (this.t - wind)/.1), fade = this.t > wind + .14 ? Math.max(0, 1 - (this.t - wind - .14)/.18) : 1;
        const ex = bx + (-ux*30)*(1-k) + ux*L*k, ey = by - 120*(1-k) + (uy*L + 18)*k, cx = bx + ux*L*.45, cy = by - 110*(1-k*.7) + uy*L*.45;
        ctx.globalAlpha = fade; ctx.lineCap = 'round'; ctx.strokeStyle = '#3f6e22'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
        ctx.strokeStyle = '#8fd65a'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#7AC74C';
        for (let i=1;i<5;i++){ const q = i/5, px = (1-q)*(1-q)*bx + 2*(1-q)*q*cx + q*q*ex, py = (1-q)*(1-q)*by + 2*(1-q)*q*cy + q*q*ey; ctx.beginPath(); ctx.ellipse(px + 6, py - 4, 7, 3, .6, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else if (this.done){
        const k = Math.min(1, (this.t - wind)/.24); ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#2a1626'; ctx.beginPath(); ctx.moveTo(10, -half); ctx.lineTo(L*(.4 + .6*Math.min(1, k*3)), -half*.4); ctx.lineTo(L*(.4 + .6*Math.min(1, k*3)), half*.4); ctx.lineTo(10, half); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d06080'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
      } }});
}
// 3 points en triangle autour du point visé (Éboulement)
function tripleSpots(z, a){ return [0,1,2].map(j => clampArena(z.x + Math.cos(a + j*TAU/3)*48, z.y + Math.sin(a + j*TAU/3)*48, 10)); }
function fallingRock(f, mv, x, y, delay){
  const r = 42, seed = Math.random()*10;
  spawnFx({update(){ if (this.done) return false; danger(f, x, y, r);
      if (this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, r); shake(5); crackDecal(x, y, 34); sparks(x, y, ['#d8c890','#B6A136','#6e5f34'], 14, 220, 5); }
      return true; },
    ground(){ const k = Math.min(1, this.t/delay); ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#1a140a'; ctx.beginPath(); ctx.ellipse(x, y, r*k, r*k*.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .6; ctx.strokeStyle = '#d8c890'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), yy = y - (1 - k*k)*340, R = 20; ctx.save(); ctx.translate(x, yy); ctx.rotate(this.t*5 + seed); ctx.beginPath();
      for (let i=0;i<7;i++){ const aa = i/7*TAU, rr = R*(.8 + .35*Math.abs(Math.sin(seed*13 + i*2.1))); ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr); } ctx.closePath();
      const g = ctx.createLinearGradient(-R, -R, R, R); g.addColorStop(0, '#d8c890'); g.addColorStop(1, '#6e5f34'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3a301a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }});
}
// bond en arrière à distance fixe de l'ennemi (Demi-Tour, Double Dard) : invulnérable pendant le saut
function backLeap(f, e, a){
  const back = clampArena(e.x - Math.cos(a)*230, e.y - Math.sin(a)*230, f.r), sx = f.x, sy = f.y, dur = .45;
  f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur); f.x = sx + (back.x - sx)*k; f.y = sy + (back.y - sy)*k;
    f.h = Math.sin(Math.PI*k)*75; f.inv = Math.max(f.inv, .05); f.aimA = a; if (k >= 1){ f.h = 0; return false; } return true; }};
}
// mâchoire qui se referme (Mâchouille : sombre, Crocs Givre : glacée)
function jawFx(x, y, a, kind){
  const P = {poison:['#A33EA1','#e0a0e0','#ffffff'], ice:['#bfe9f5','#ffffff','#e8fbff'], fire:['#ff6a1a','#fff3b0','#fff6c0'], dark:['#2a1626','#c04a6a','#ffffff']}[kind] || ['#2a1626','#c04a6a','#ffffff'], jaw = P[0], edge = P[1], teeth = P[2];
  if (kind === 'ice') sparks(x, y, ['#ffffff','#bfe9f5','#96D9D6'], 10, 160, 4); else sparks(x, y, ['#2a1626','#c04a6a'], 8, 140, 4);
  spawnFx({update(){ return this.t < .32; }, top(){ const close = Math.min(1, this.t/.13), fade = this.t > .2 ? 1 - (this.t - .2)/.12 : 1, open = 26*(1 - close);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    for (const s of [-1, 1]){ ctx.save(); ctx.translate(0, s*(open + 4)); ctx.scale(1, s);
      ctx.fillStyle = jaw; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(0, -20, 22, 0); ctx.lineTo(16, 2); ctx.quadraticCurveTo(0, -10, -16, 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = teeth;
      for (let i=0;i<5;i++){ const tx = -12 + i*6; ctx.beginPath(); ctx.moveTo(tx - 2.5, -3 + Math.abs(i-2)*1.2); ctx.lineTo(tx + 2.5, -3 + Math.abs(i-2)*1.2); ctx.lineTo(tx, 5); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
}
// épée blanche (Lame d'Air)
function drawSword(){
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#A98FF3'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(3.5, -16); ctx.lineTo(3.5, 6); ctx.lineTo(-3.5, 6); ctx.lineTo(-3.5, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e8e2ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 4); ctx.stroke();
  ctx.fillStyle = '#cbbcff'; ctx.fillRect(-9, 6, 18, 3.5); ctx.fillStyle = '#8a74c8'; ctx.fillRect(-2, 9.5, 4, 8); ctx.beginPath(); ctx.arc(0, 19, 2.5, 0, TAU); ctx.fill();
}
// grand shuriken qui retombe sur la zone visée (Sheauriken)
function bigShuriken(f, mv, z){
  const sx = f.x, sy = f.y, r = 55, delay = .5;
  spawnFx({update(){ if (!this.done){ danger(f, z.x, z.y, r);
        if (this.t >= delay){ this.done = true; zoneHit(f, mv, z.x, z.y, r); shake(6); sparks(z.x, z.y, ['#ffffff','#9ec0ff','#3d6fe0'], 18, 240, 5); shockRing(z.x, z.y, r*1.3, '#9ec0ff', .35, 8); } }
      return this.t < delay + .35; },
    ground(){ if (this.done) return; const k = this.t/delay; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#6390F0'; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = .7; ctx.strokeStyle = '#cfe2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, r*(1 - k*.6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), x = sx + (z.x - sx)*k, y = sy + (z.y - sy)*k - Math.sin(Math.PI*k)*90, fade = this.done ? Math.max(0, 1 - (this.t - delay)/.35) : 1;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(this.t*22); starPath(0, 0, 26, 7, 4, 0); ctx.fillStyle = '#d8e8ff'; ctx.fill(); ctx.strokeStyle = '#3d6fe0'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#3d6fe0'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }});
}
// coup de poing (Poing Glace) : le poing avance puis éclate en glace
function punchFx(x, y, a, kind){   // kind : 'fire' (Poing Feu), glace sinon
  const fire = kind === 'fire';
  sparks(x, y, fire ? ['#fff3b0','#ffb43a','#ff6a1a'] : ['#ffffff','#bfe9f5','#96D9D6'], 16, 220, 5); if (fire) scorchDecal(x, y, 30, 2.5); else frostDecal(x, y, 30); shake(5);
  spawnFx({update(){ return this.t < .28; }, top(){ const k = Math.min(1, this.t/.08), fade = this.t > .12 ? 1 - (this.t - .12)/.16 : 1;
    ctx.save(); ctx.translate(x - Math.cos(a)*16*(1-k), y - Math.sin(a)*16*(1-k)); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    glowBall(0, 0, 18 + 8*k, fire ? '#fff6c0' : '#ffffff', fire ? '#ffc040' : '#dff8ff', fire ? '#ff5a1a' : '#5fb8d0');
    ctx.fillStyle = fire ? '#ffe0b0' : '#eafcff'; ctx.strokeStyle = fire ? '#ff6a1a' : '#5fb8d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(6, -8 + i*6); ctx.lineTo(11, -8 + i*6); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
}
// rayon d'eau en plusieurs coups qui repousse (Hydrocanon)
function hydroBeam(f, mv, a){
  const wind = .25, dur = .6, ux = Math.cos(a), uy = Math.sin(a), hw = 30; let ticks = 0;
  f.act = {n:'Charge', t:0, dur:wind};
  f.script = {t:0, update(dt){ this.t += dt; f.aimA = a;
    if (this.t < wind){ for (let d=40; d<520; d+=70) danger(f, f.x + ux*d, f.y + uy*d, 32); return true; }
    if (!this.started){ this.started = true; f.act = {n:'Shoot', t:0, dur}; screenFlash('#9ec0ff', .15, .2); }
    const sx = f.x + ux*f.r*.6, sy = f.y + uy*f.r*.6; let L = 520; for (let d=0; d<520; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL || x > W-WALL || y < WALL || y > H-WALL){ L = d; break; } }
    this.sx = sx; this.sy = sy; this.L = L;
    while (ticks < 4 && this.t - wind >= ticks*.15){ ticks++; const e = foeOf(f), rx = e.x - sx, ry = e.y - sy, along = rx*ux + ry*uy;
      if (e.hp > 0 && !e.buried && along > -10 && along < L + 10 && Math.abs(-rx*uy + ry*ux) < hw + e.r*.6){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ e.kx += ux*300; e.ky += uy*300; } }
      for (const rk of [...game.rocks]){ const rrx = rk.x - sx, rry = rk.y - sy, al = rrx*ux + rry*uy; if (al > 0 && al < L && Math.abs(-rrx*uy + rry*ux) < hw + rk.r) hitRock(rk, mv.p*.5, '#9ec0ff'); }
      shake(4); }
    for (let i=0;i<4;i++){ const d = rand(0, this.L), l = rand(-hw, hw); game.parts.push({x:sx + ux*d - uy*l, y:sy + uy*d + ux*l, vx:ux*200 + rand(-40,40), vy:uy*200 - rand(20,80), life:.3, max:.3, col:pick(['#ffffff','#cfe2ff','#9ec0ff']), size:rand(3,6)}); }
    return this.t < wind + dur; }};
  spawnFx({update(){ return this.t < wind + dur + .1 && f.hp > 0; },
    ground(){ if (this.t < wind){ const k = this.t/wind; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a); ctx.globalAlpha = .15 + .25*k; ctx.fillStyle = '#6390F0'; ctx.fillRect(f.r, -hw, 520, hw*2); ctx.restore(); ctx.globalAlpha = 1; } },
    top(){ const sc = f.script; if (this.t < wind || !sc || sc.L == null) return; const fade = Math.min(1, (wind + dur + .1 - this.t)/.15);
      ctx.save(); ctx.translate(sc.sx, sc.sy); ctx.rotate(a); ctx.globalAlpha = fade;
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, 'rgba(61,111,224,0)'); g.addColorStop(.2, 'rgba(61,111,224,.85)'); g.addColorStop(.5, 'rgba(220,235,255,.95)'); g.addColorStop(.8, 'rgba(61,111,224,.85)'); g.addColorStop(1, 'rgba(61,111,224,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -hw*.6);
      for (let d=0; d<=sc.L; d+=16) ctx.lineTo(d, -hw + Math.sin(d*.05 - game.t*30)*4);
      for (let d=sc.L; d>=0; d-=16) ctx.lineTo(d, hw + Math.sin(d*.05 + game.t*30)*4);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sc.L, 0); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1; }});
}
// pentagramme de flammes qui avance ; le sol traversé brûle 3 s (Déflagration)
function flameStar(f, mv, a){
  const ux = Math.cos(a), uy = Math.sin(a), spd = 250, R = 30, patches = []; let x = f.x + ux*30, y = f.y + uy*30, struck = false, lastD = 0, d = 0, alive = true, tick = 0;
  const burnFx = {burn:.5};
  spawnFx({update(dt){ const e = foeOf(f);
      if (alive){ x += ux*spd*dt; y += uy*spd*dt; d += spd*dt; this.x = x; this.y = y;
        if (d - lastD > 24){ lastD = d; patches.push({x, y, t:this.t, ph:Math.random()*6}); scorchDecal(x, y, 30, 3.4); }
        if (!struck && e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < R + e.r*.6){ struck = true; hit(f, e, mv, 1); }
        let blocked = false; for (const rk of [...game.rocks]) if (Math.hypot(rk.x - x, rk.y - y) < rk.r + R*.6){ hitRock(rk, mv.p*.6, '#ff8a2a'); blocked = true; }
        if (blocked || d > 420 || x < WALL || x > W-WALL || y < WALL || y > H-WALL){ alive = false; this.endT = this.t; sparks(x, y, ['#fff3b0','#ffb43a','#ff6a1a'], 20, 240, 6); shake(5); }
        danger(f, x, y, R + 6); }
      tick -= dt;
      if (tick <= 0 && e.hp > 0 && !e.buried && patches.some(pt => this.t - pt.t < 3 && Math.hypot(e.x - pt.x, e.y - pt.y) < 26 + e.r*.5)){ tick = .5; applyStatus(e, burnFx); }
      for (let i = patches.length-1; i >= 0; i--) if (this.t - patches[i].t >= 3) patches.splice(i,1);
      return alive || patches.length > 0; },
    ground(){ for (const pt of patches){ const al = Math.min(1, (3 - (this.t - pt.t))/.5); drawFlame(pt.x, pt.y, 7 + 2*Math.sin(game.t*12 + pt.ph), al*.85); } },
    top(){ if (!alive) return; ctx.save(); ctx.translate(x, y); ctx.rotate(game.t*3); glowBall(0, 0, R*1.05, '#fff6c0', '#ffb43a', '#ff5a1a');
      ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 3; ctx.beginPath(); for (let i=0;i<=5;i++){ const ang = -Math.PI/2 + i*2*TAU/5; ctx.lineTo(Math.cos(ang)*R, Math.sin(ang)*R); } ctx.stroke();
      ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.restore(); }});
}
function windTornado(f, mv, a){
  const spd = 300; let x = f.x + Math.cos(a)*24, y = f.y + Math.sin(a)*24, struck = false;
  spawnFx({update(dt){ x += Math.cos(a)*spd*dt; y += Math.sin(a)*spd*dt; this.x = x; this.y = y;
      if (x < WALL || x > W-WALL || y < WALL || y > H-WALL) return false;
      for (const rk of game.rocks) if (Math.hypot(rk.x-x, rk.y-y) < rk.r + 14){ hitRock(rk, mv.p*.4, '#e8e2ff'); sparks(x, y, ['#ffffff','#cbbcff'], 8, 140, 4); return false; }
      danger(f, x, y, 30); const e = foeOf(f);
      if (!struck && e.hp > 0 && !e.buried && Math.hypot(e.x-x, e.y-y) < 26 + e.r*.6){ struck = true; hit(f, e, mv, 1); }
      if (Math.random() < .6) game.parts.push({x:x + rand(-14,14), y:y + rand(-6,6), vx:-Math.cos(a)*80, vy:-40 - Math.random()*60, life:.3, max:.3, col:pick(['#ffffff','#e8e2ff','#cbbcff']), size:rand(2,4)});
      return this.t < 1.3; },
    ground(){ ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 22, 8, 0, 0, TAU); ctx.fill(); },
    top(){ const al = Math.min(1, (1.3 - this.t)/.25);
      for (let i=0;i<6;i++){ const k = i/5, w = 22 - 11*k, yy = this.y - k*40, ph = game.t*16 + i*.8; ctx.globalAlpha = al*(.8 - k*.35);
        ctx.strokeStyle = i%2 ? '#ffffff' : '#cbbcff'; ctx.lineWidth = 4 - k*2; ctx.beginPath(); ctx.ellipse(this.x + Math.sin(ph*.4)*4, yy, w, w*.35, 0, ph % TAU, ph % TAU + 4.4); ctx.stroke(); }
      ctx.globalAlpha = 1; }});
}
// Choc Psy : délai avant la frappe et rayon de chaque cercle
const CHOCPSY = {delay:.38, r:52};
function psyPulse(f, mv, x, y, delay){
  const r = CHOCPSY.r;
  spawnFx({update(){ if (!this.done){ danger(f, x, y, r);
        if (this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, r); shockRing(x, y, r*1.25, '#F95587', .3, 6); sparks(x, y, ['#ffffff','#ffa0c8','#F95587'], 12, 180, 4); shake(3); } }
      return this.t < delay + .25; },
    ground(){ if (!this.done){ const k = this.t/delay; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#F95587'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ffc0d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*(1 - k*.7), 0, TAU); ctx.stroke(); }
      else { const k = (this.t - delay)/.25; ctx.globalAlpha = .5*(1-k); glowBall(x, y, r*.8, '#ffffff', '#ffa0c8', '#F95587'); }
      ctx.globalAlpha = 1; }});
}

const SIG = {
  // Vent Violent : 3 tornades, deux en V et une au centre
  ventviolent(f, mv, a){ for (const da of [-.55, 0, .55]) windTornado(f, mv, a + da); },
  deflagration(f, mv, a){ flameStar(f, mv, a); },
  hydrocanon(f, mv, a){ hydroBeam(f, mv, a); },
  poingglace(f, mv, a){
    f.dash = {vx:Math.cos(a)*760, vy:Math.sin(a)*760, t:.35, mv, trail:'#bfe9f5',
      onHit(e){ hit(f, e, mv, 1); punchFx(e.x - Math.cos(a)*e.r*.5, e.y - Math.sin(a)*e.r*.5, a); }, onEnd(){ punchFx(f.x + Math.cos(a)*f.r, f.y + Math.sin(a)*f.r, a); }};
  },
  // Rayons (0,2 s de visée puis tir) : glace (traînée de givre qui ralentit), feu (traînée de flammes qui brûle), acier
  laserglace(f, mv, a){ beamAttack(f, mv, a, 'ice'); },
  lanceflammes(f, mv, a){ beamAttack(f, mv, a, 'fire'); },
  luminocanon(f, mv, a){ beamAttack(f, mv, a, 'steel'); },
  // Hantise : charge invulnérable ; si elle touche, traverse et redevient vulnérable derrière l'ennemi
  hantise(f, mv, a){
    f.inv = .6;
    f.dash = {vx:Math.cos(a)*600, vy:Math.sin(a)*600, t:.5, mv, pierce:1, trail:'#735797',
      fx(){ if (this.passing){ if (dist(f, this.passing) > f.r + this.passing.r + 4){ f.inv = 0; this.passing = null; this.done = true; sparks(f.x, f.y, ['#735797','#c0a8e8'], 8, 120, 3); } }
        else if (!this.done) f.inv = Math.max(f.inv, .05);
        if (Math.random() < .6) game.parts.push({x:f.x + rand(-10,10), y:f.y + rand(-10,10), vx:0, vy:-30, life:.35, max:.35, col:pick(['#3a2458','#735797']), size:rand(5,10)}); },
      onHit(e){ hit(f, e, mv, 1); this.passing = e; }};
  },
  // Demi-Tour : charge ; si elle touche, bondit en arrière à distance fixe (évite les attaques en l'air)
  demitour(f, mv, a){
    f.dash = {vx:Math.cos(a)*820, vy:Math.sin(a)*820, t:.32, mv, trail:'#A6B91A',
      onHit(e){ hit(f, e, mv, 1); sparks(e.x, e.y, ['#c8e050','#A6B91A','#ffffff'], 12, 200, 4); backLeap(f, e, a); }};
  },
  // Mégafouet : une liane s'abat du haut vers le sol sur une bande longue et étroite
  megafouet(f, mv, a){ laneStrike(f, mv, a, .2, 'whip'); },
  // Sabotage : claque sur la même bande
  sabotage(f, mv, a){ laneStrike(f, mv, a, .08, 'slap'); },
  // Éboulement : 3 zones en même temps, des rochers tombent du ciel
  eboulement(f, mv, a, tx, ty){ const z = clampRange(f, tx, ty); tripleSpots(z, a).forEach((c, i) => fallingRock(f, mv, c.x, c.y, .55 + i*.04)); },
  // Change Éclair : charge qui traverse ; 2 s pour lancer la 2e charge
  changeeclair(f, mv, a, tx, ty, o){
    const i = o.slot;
    electrify(.25);
    f.dash = {vx:Math.cos(a)*900, vy:Math.sin(a)*900, t:.3, mv, pierce:1, trail:'#F7D02C',
      fx(){ if (Math.random() < .9) game.parts.push({x:f.x + rand(-10,10), y:f.y + rand(-10,10), vx:rand(-50,50), vy:rand(-50,50), life:.2, max:.2, col:pick(['#ffffff','#F7D02C','#9fd8ff']), size:rand(2,5)}); },
      onHit(e){ hit(f, e, mv, 1); drawBoltBurst(e.x, e.y); }};
  },
  // Coup d'Jus : 3 décharges autour du lanceur, ralentit
  coupdjus(f, mv, a){
    const R = 115, m = sub(mv, {fx:{slow:1}}); let n = 0;
    spawnFx({update(){
        while (n < 3 && this.t >= n*.35){ n++; this.cx = f.x; this.cy = f.y; this.bt = this.t; zoneHit(f, m, f.x, f.y, R); shake(4); electrify(.3); scorchDecal(f.x, f.y, 50, 1.5);
          this.bolts = []; for (let j=0;j<8;j++){ const aa = j/8*TAU + rand(-.3,.3); this.bolts.push(boltPath(f.x, f.y, f.x + Math.cos(aa)*R, f.y + Math.sin(aa)*R, 14)); } }
        if (n < 3) danger(f, f.x, f.y, R);
        return this.t < .95; },
      ground(){ if (n < 3){ ctx.globalAlpha = .18; ctx.fillStyle = '#F7D02C'; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = .6; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; } },
      top(){ if (!this.bolts) return; const k = (this.t - this.bt)/.2; if (k > 1) return; ctx.globalAlpha = 1 - k;
        for (const b of this.bolts) drawBolt(b, '#F7D02C', 2.5); glowBall(this.cx, this.cy, 26, '#ffffff', '#fff3a0', '#F7D02C'); ctx.globalAlpha = 1; }});
  },
  // Choc Psy : 3 zones en ligne qui éclatent l'une après l'autre
  chocpsy(f, mv, a, tx, ty, o){
    // 1er cercle sur le point visé ; les suivants suivent la visée en direct (ou l'ennemi en visée automatique)
    const first = clampRange(f, tx, ty); psyPulse(f, mv, first.x, first.y, CHOCPSY.delay); let n = 1;
    spawnFx({update(){ while (n < 3 && this.t >= n*.3){ n++; const z = liveAimPoint(f, o.slot, o.manual); psyPulse(f, mv, z.x, z.y, CHOCPSY.delay); } return n < 3; }});
  },
  // Dracaufeu : énorme cône de feu, le sol reste en flammes
  rafalefeu(f, mv, a){
    const R = 240, half = .55, wind = .38;
    dimScreen(.45); f.act = {n:'Charge', t:0, dur:wind};
    spawnFx({update(){ for (let k=1;k<=3;k++) danger(f, f.x + Math.cos(a)*R*k/3.6, f.y + Math.sin(a)*R*k/3.6, 34*k); return this.t < wind; },
      ground(){ const k = this.t/wind; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a-half, a+half); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ffd25a'; ctx.lineWidth = 2; ctx.setLineDash([8,6]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a;
      if (this.t >= wind && !this.done){ this.done = true; f.act = {n:'Shoot', t:0, dur:.45};
        shake(15); screenFlash('#ff7a1a', .35, .35); zoomPunch(.05); hitstop(.06);
        const e = foeOf(f); if (inWedge(f, e, a, R, half)) hit(f, e, mv, 1);
        for (const rk of [...game.rocks]) if (dist(f, rk) < R && angDiff(Math.atan2(rk.y-f.y, rk.x-f.x), a) < half) hitRock(rk, mv.p*.6, '#ff8a2a');
        for (let i=0;i<110;i++){ const aa = a + rand(-half, half)*.95, v = rand(240, 620);
          game.parts.push({x:f.x + Math.cos(aa)*18, y:f.y + Math.sin(aa)*18, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.35,.7), max:.7, col:pick(['#fff3b0','#ffd25a','#ff9a2a','#ff6a1a','#e8432a']), size:rand(6,15), drag:.965}); }
        fireField(f, a, R, half); }
      return this.t < wind + .35; }};
  },
  // Gardevoir : une lune descend sur la zone et explose
  pouvoirlunaire(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), r = 76, delay = .6;
    spawnFx({update(dt){ if (!this.done){ danger(f, z.x, z.y, r);
          const e = foeOf(f); if (e.hp > 0 && !e.buried){ const dx = e.x - z.x, dy = e.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 45*dt); z.x += dx/m*st; z.y += dy/m*st; } }   // la lune suit lentement l'ennemi (45 px/s)
          if (this.t >= delay){ this.done = true; zoneHit(f, mv, z.x, z.y, r); shake(11); screenFlash('#ffd0ee', .35, .3); zoomPunch(.03);
            shockRing(z.x, z.y, r*1.5, '#ffc2e6', .45, 14);
            for (let i=0;i<34;i++){ const aa = Math.random()*TAU, v = rand(120, 340); game.parts.push({x:z.x, y:z.y, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.4,.8), max:.8, col:pick(['#ffffff','#ffd0ee','#D685AD']), size:rand(4,8), star:1}); } } }
        return this.t < delay + .1; },
      ground(){ if (this.done) return; const k = this.t/delay; ctx.globalAlpha = .12 + .28*k; ctx.fillStyle = '#D685AD'; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ffe0f2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, r*k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
      top(){ if (this.done) return; const k = this.t/delay, y = z.y - (1 - k*k)*320 - 14, R = 26 + 10*k;
        glowBall(z.x, y, R*1.2, '#ffffff', '#ffe6f4', '#ff9ccf'); ctx.fillStyle = '#fff8fc'; ctx.beginPath(); ctx.arc(z.x, y, R, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(214,133,173,.45)'; ctx.beginPath(); ctx.arc(z.x + R*.35, y - R*.15, R*.85, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(214,133,173,.35)'; for (const [cx, cy, cr] of [[-.4,.2,.18], [-.1,-.45,.12], [-.5,-.25,.09]]){ ctx.beginPath(); ctx.arc(z.x + cx*R, y + cy*R, cr*R, 0, TAU); ctx.fill(); } }});
  },
  // Lucario : plus on maintient, plus la sphère est grosse et puissante
  aurasphere(f, mv, a, tx, ty, o){
    const c = Math.max(0, Math.min(1, (o.charge || 0)/1.1));
    spawnProj(f, sub(mv, {p:mv.p + 50*c, r:11 + 13*c, spd:340 - 60*c, life:2.6, turn:2.4, look:'aura'}), a, 1, foeOf(f));
    if (c > .6){ shake(6); screenFlash('#8fc0ff', .2, .2); shockRing(f.x, f.y, 70, '#a8d4ff', .3, 8); }
  },
  // Dracolosse : traverse l'adversaire en un éclair
  vitesseextreme(f, mv, a){
    const R = 280, e = foeOf(f), ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y;
    let L = R, target = null;
    if (e.hp > 0 && !e.buried){ const rx = e.x - sx, ry = e.y - sy, along = rx*ux + ry*uy, lat = Math.abs(-rx*uy + ry*ux);
      if (along > 0 && along < R + e.r && lat < f.r + e.r){ target = e; L = along + f.r + e.r + 20; } }
    const end = clampArena(sx + ux*L, sy + uy*L, f.r);
    for (let i=1;i<=7;i++) f.ghosts.push({x:sx + (end.x-sx)*i/8, y:sy + (end.y-sy)*i/8, life:.18 + i*.025, max:.36});
    f.x = end.x; f.y = end.y; f.vx = ux*200; f.vy = uy*200; f.inv = Math.max(f.inv, .25);
    spawnFx({update(){ return this.t < .3; }, top(){ const k = this.t/.3; ctx.globalAlpha = (1-k)*.9; ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12*(1-k) + 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.lineWidth = 1.5; for (const o of [-22, -12, 12, 22]){ ctx.beginPath(); ctx.moveTo(sx - uy*o, sy + ux*o); ctx.lineTo(end.x - uy*o - ux*40, end.y + ux*o - uy*40); ctx.stroke(); }
      ctx.globalAlpha = 1; }});
    sparks(sx, sy, ['#ffffff'], 10, 160, 3);
    if (target){ hit(f, target, mv, 1); hitstop(.09); shake(10); screenFlash('#ffffff', .3, .15); target.kx += ux*280; target.ky += uy*280; }
  },
  // Tyranocif : une ligne de piliers jaillit du sol, puis reste un moment comme obstacles
  lamederoc(f, mv, a){
    const n = 6, gap = 46, ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y; let struck = false, i = 0;
    spawnFx({update(){
      while (i < n && this.t >= i*.075){ const p = clampArena(sx + ux*(f.r + 26 + i*gap), sy + uy*(f.r + 26 + i*gap), 20); i++;
        shake(4); sparks(p.x, p.y, ['#d8c890','#B6A136','#6e5f34'], 12, 220, 5); crackDecal(p.x, p.y, 34);
        if (!struck){ const e = zoneHit(f, mv, p.x, p.y, 30); if (e){ struck = true; if (e.hp > 0) launch(e, .8, 95); } }
        if (!game.rocks.some(rk => Math.hypot(rk.x-p.x, rk.y-p.y) < rk.r + 18)) game.rocks.push({x:p.x, y:p.y, r:17, hp:70, max:70, spike:true, life:1.5, age:0}); }
      for (let j=i;j<n;j++) danger(f, sx + ux*(f.r + 26 + j*gap), sy + uy*(f.r + 26 + j*gap), 30);
      return i < n; }});
  },
  // Métalosse : charge météore, cratère à l'impact
  poingmeteore(f, mv, a){
    f.dash = {vx:Math.cos(a)*840, vy:Math.sin(a)*840, t:.38, mv, trail:'#cfe3ff',
      fx(){ game.parts.push({x:f.x + rand(-8,8), y:f.y + rand(-8,8), vx:-Math.cos(a)*140 + rand(-40,40), vy:-Math.sin(a)*140 + rand(-40,40), life:.35, max:.35, col:pick(['#ffffff','#cfe3ff','#ffb347','#ff7a1a']), size:rand(4,10)}); },
      onHit(e){ hit(f, e, mv, 1); meteorCrater(e.x, e.y, true, f); e.kx += Math.cos(a)*380; e.ky += Math.sin(a)*380;
        if (Math.random() < .3){ f.buff = {...f.buff, atk:Math.min(1.6, f.buff.atk*1.2)}; f.buffT = Math.max(f.buffT, 8); popText(f.x, f.y - 62, 'Attaque +', '#e6b84c', 14); } },
      onEnd(){ meteorCrater(f.x, f.y, false, f); }};
  },
  // Ronflex : saute et retombe sur la zone (en l'air, il passe au-dessus des attaques)
  plaquage(f, mv, a, tx, ty){
    const z0 = clampTo(f, tx, ty, mv.range), z = clampArena(z0.x, z0.y, f.r), sx = f.x, sy = f.y, dur = .55, R = 110, land = sub(mv, {fx:{stun:1}});
    f.act = {n:'Attack', t:0, dur};
    spawnFx({update(){ return this.t < dur; }, ground(){ const k = this.t/dur; ctx.globalAlpha = .12 + .3*k; ctx.fillStyle = '#A8A77A'; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, R*k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur), e = foeOf(f);
      if (k < .5 && e.hp > 0 && !e.buried){ const w = clampTo(f, e.x, e.y, mv.range), dx = w.x - z.x, dy = w.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 260*dt); z.x += dx/m*st; z.y += dy/m*st; } }
      f.x = sx + (z.x-sx)*k; f.y = sy + (z.y-sy)*k; f.h = Math.sin(Math.PI*k)*120; if (k > .15 && k < .85) f.inv = Math.max(f.inv, .04);
      danger(f, z.x, z.y, R);
      if (k >= 1){ f.h = 0; zoneHit(f, land, z.x, z.y, R); shake(18); zoomPunch(.07); hitstop(.08); screenFlash('#ffffff', .2, .2);
        crackDecal(z.x, z.y, R); shockRing(z.x, z.y, R*1.35, '#e8dcc0', .45, 16); sparks(z.x, z.y, ['#c9b98f','#e8dcc0','#8a7a5a'], 30, 320, 7); return false; }
      return true; }};
  },
  // Gorythmic : 3 coups de tambour → 1, puis 2, puis 3 zones de racines de plus en plus loin
  tambourbattant(f, mv, a){
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, sx = f.x, sy = f.y, root = mv, beats = [0, .38, .76]; let b = 0;
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a;
      while (b < 3 && this.t >= beats[b]){ b++; f.act = {n:'Attack', t:0, dur:.3}; drumBeat(f, b);
        for (let j=0;j<b;j++){ const lat = (j - (b-1)/2)*78, d = 70*b, c = clampArena(sx + ux*d + px*lat, sy + uy*d + py*lat, 10); rootZone(f, root, c.x, c.y); } }
      return this.t < 1; }};
  },
  // Zeraora : charge ; à l'impact (ou au bout), 3 zones en V où tombent des éclairs (touchent aussi les types Sol)
  poingplasma(f, mv, a){
    const strike = sub(mv, {fx:{stun:.35}}), punch = sub(mv, {p:45});
    const vee = (x, y) => { [[0,0],[.55,95],[-.55,95]].forEach(([da, d], i) => { const p = clampArena(x + Math.cos(a+da)*d, y + Math.sin(a+da)*d, 10); boltZone(f, strike, p.x, p.y, .3 + i*.12); }); electrify(.7); };
    f.dash = {vx:Math.cos(a)*820, vy:Math.sin(a)*820, t:.36, mv:punch, trail:'#F7D02C',
      fx(){ if (Math.random() < .8) game.parts.push({x:f.x + rand(-12,12), y:f.y + rand(-12,12), vx:rand(-60,60), vy:rand(-60,60), life:.2, max:.2, col:pick(['#ffffff','#F7D02C','#9fd8ff']), size:rand(2,5)}); },
      onHit(e){ const ok = canHit(f, e, punch); hit(f, e, punch, 1); if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.dash = null; } vee(e.x, e.y); }, onEnd(){ vee(f.x, f.y); }};   // la charge étourdit 0,5 s : l'éclair central (0,3 s) touche à coup sûr
  },
  // Togekiss : 3 lames de vent qui reviennent comme des boomerangs (touchent à l'aller et au retour)
  lamedair(f, mv, a){
    for (const da of [-.32, 0, .32]){ const aa = a + da, sx = f.x, sy = f.y, out = 260;
      spawnFx({x:sx, y:sy, phase:0, hits:[false,false], rot:0, update(dt){ this.rot += dt*18;
          if (this.phase === 0){ const k = Math.min(1, this.t/.5), d = out*(1 - (1-k)*(1-k)), p = clampArena(sx + Math.cos(aa)*d, sy + Math.sin(aa)*d, 6); this.x = p.x; this.y = p.y; if (k >= 1) this.phase = 1; }
          else { const dx = f.x - this.x, dy = f.y - this.y, m = Math.hypot(dx, dy) || 1; this.x += dx/m*560*dt; this.y += dy/m*560*dt; if (m < 24 || f.hp <= 0 || this.t > 2.2) return false; }
          const e = foeOf(f); if (!this.hits[this.phase] && e.hp > 0 && !e.buried && Math.hypot(e.x - this.x, e.y - this.y) < e.r + 16){ this.hits[this.phase] = true; hit(f, e, mv, 1); }
          danger(f, this.x, this.y, 22);
          if (Math.random() < .5) game.parts.push({x:this.x, y:this.y, vx:0, vy:0, life:.25, max:.25, col:'#ece6ff', size:4});
          return true; },
        top(){ ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); drawSword(); ctx.restore(); }}); }
  },
  // Pyrax : tourbillon de flammes qui se dirige vers l'ennemi ; 50 % de chance d'augmenter l'Atq. Spé.
  dansedufeu(f, mv, a){
    if (Math.random() < .5){ f.buff = {...f.buff, spa:Math.min(1.6, f.buff.spa*1.3)}; f.buffT = Math.max(f.buffT, 6); popText(f.x, f.y - 62, 'Atq. Spé. +', '#e6b84c', 14); sparks(f.x, f.y, ['#e6b84c','#ffd25a'], 12, 120, 4); }
    let vx = Math.cos(a)*440, vy = Math.sin(a)*440, tick = 0, n = 0, cap = null, life = 1;
    spawnFx({x:f.x + Math.cos(a)*30, y:f.y + Math.sin(a)*30, update(dt){ const e = foeOf(f);
        if (cap){ const sp = Math.hypot(vx, vy) || 1; vx = vx/sp*110; vy = vy/sp*110; }   // emporte l'ennemi, plus lentement
        this.x += vx*dt; this.y += vy*dt; const c = clampArena(this.x, this.y, 30); this.x = c.x; this.y = c.y;
        danger(f, this.x, this.y, 42); tick -= dt;
        // au contact, l'ennemi est pris dans la tornade : immobilisé et emporté, 5 coups rapides
        if (!cap && e.hp > 0 && !e.buried && e.inv <= 0 && Math.hypot(e.x - this.x, e.y - this.y) < 36 + e.r*.6){ cap = this.t; life = this.t + 1; tick = 0; popText(e.x, e.y - 62, 'Emporté !', '#ff8a2a', 14); }
        if (cap !== null){ if (e.hp > 0 && !e.buried){ e.stun = Math.max(e.stun, .12); e.dash = null; const k = Math.min(1, dt*12); e.x += (this.x - e.x)*k; e.y += (this.y - e.y)*k; }
          if (tick <= 0 && n < 5 && e.hp > 0){ tick = .18; n++; hit(f, e, mv, 1); }
          if (n >= 5 || e.hp <= 0){ if (e.hp > 0){ e.kx += vx*2.5; e.ky += vy*2.5; } sparks(this.x, this.y, ['#fff3b0','#ffb43a','#ff6a1a'], 20, 240, 5); return false; } }
        for (let i=0;i<3;i++){ const aa = Math.random()*TAU, rr = rand(6, 30); game.parts.push({x:this.x + Math.cos(aa)*rr, y:this.y + Math.sin(aa)*rr*.4, vx:-Math.sin(aa)*150, vy:-70 - Math.random()*90, life:.4, max:.4, col:pick(['#ffd25a','#ff8a2a','#e8432a']), size:rand(4,8)}); }
        return this.t < life; },
      ground(){ ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 30, 11, 0, 0, TAU); ctx.fill(); },
      top(){ const al = Math.min(1, (life - this.t)/.3);
        for (let i=0;i<8;i++){ const k = i/7, w = 32 - 16*k, yy = this.y - k*80, ph = game.t*14 + i*.7; ctx.globalAlpha = al*(.75 - k*.35);
          ctx.strokeStyle = i%2 ? '#ffd25a' : '#ff6a1a'; ctx.lineWidth = 7 - k*4; ctx.beginPath(); ctx.ellipse(this.x + Math.sin(ph*.4)*5, yy, w, w*.35, 0, ph % TAU, ph % TAU + 4.6); ctx.stroke(); }
        ctx.globalAlpha = 1; }});
  },
  // Milobellus : une vague traverse l'arène et emporte l'adversaire
  surf(f, mv, a){
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, half = 115, spd = 360, ox = f.x - ux*20, oy = f.y - uy*20, hitRocks = new Set(); let struck = false;
    screenFlash('#6390F0', .15, .4);
    spawnFx({d:0, update(dt){ this.d += spd*dt; const cx = ox + ux*this.d, cy = oy + uy*this.d;
        danger(f, cx + ux*70, cy + uy*70, half*.85);
        const e = foeOf(f);
        if (e.hp > 0 && !e.buried){ const rx = e.x - ox, ry = e.y - oy, along = rx*ux + ry*uy, lat = Math.abs(rx*px + ry*py);
          if (lat < half + e.r*.5 && along < this.d + 22 && along > this.d - 55){
            if (!struck){ struck = true; hit(f, e, mv, 1); shake(9); }
            if (e.inv <= 0){ e.kx = ux*spd*1.1; e.ky = uy*spd*1.1; } } }
        for (const rk of [...game.rocks]){ const along = (rk.x-ox)*ux + (rk.y-oy)*uy, lat = Math.abs((rk.x-ox)*px + (rk.y-oy)*py);
          if (!hitRocks.has(rk) && lat < half && Math.abs(along - this.d) < 30){ hitRocks.add(rk); hitRock(rk, mv.p*.6, '#9ec0ff'); } }
        for (let i=0;i<4;i++){ const l = rand(-half, half); game.parts.push({x:cx + px*l, y:cy + py*l, vx:ux*spd*.6 + rand(-30,30), vy:uy*spd*.6 - rand(20,90), life:.4, max:.4, col:pick(['#ffffff','#cfe2ff','#9ec0ff']), size:rand(3,7)}); }
        return this.d < 820; },
      top(){ const cx = ox + ux*this.d, cy = oy + uy*this.d; ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        const g = ctx.createLinearGradient(-120, 0, 8, 0); g.addColorStop(0, 'rgba(40,80,200,0)'); g.addColorStop(.55, 'rgba(61,111,224,.75)'); g.addColorStop(.9, 'rgba(158,192,255,.92)'); g.addColorStop(1, 'rgba(255,255,255,.95)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-120, -half);
        for (let l=-half; l<=half; l+=10) ctx.lineTo(Math.sin(l*.08 + game.t*9)*7, l);
        ctx.lineTo(-120, half); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); for (let l=-half; l<=half; l+=10) ctx.lineTo(Math.sin(l*.08 + game.t*9)*7 + 2, l); ctx.stroke();
        ctx.restore(); }});
  },
  // Lanssorien : lance deux Fantyrm qui suivent l'adversaire
  dracofleches(f, mv, a){
    const m = sub(mv, {spd:430, r:11, life:1.6, turn:2.7, look:'dreepy'});
    spawnProj(f, m, a - .35, 1, foeOf(f));
    spawnFx({update(){ if (this.t >= .14){ spawnProj(f, m, a + .35, 1, foeOf(f)); return false; } return true; }});
  },
  // Alakazam : soulève l'adversaire (immobilisé) puis l'écrase au sol
  psyko(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), r = 60, delay = .5;
    spawnFx({update(dt){ if (!this.done){ danger(f, z.x, z.y, r);
          const e = foeOf(f); if (e.hp > 0 && !e.buried){ const dx = e.x - z.x, dy = e.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 50*dt); z.x += dx/m*st; z.y += dy/m*st; } }   // suit lentement l'ennemi (50 px/s)
          if (this.t >= delay){ this.done = true; const e = foeIn(f, z.x, z.y, r); shockRing(z.x, z.y, r*1.3, '#F95587', .35, 6);
            if (canHit(f, e, mv)) liftAndSlam(f, e, mv); else sparks(z.x, z.y, ['#F95587','#ffa0c8'], 14, 160, 4); } }
        return this.t < delay + .1; },
      ground(){ if (this.done) return; const k = this.t/delay, last = k > .78; ctx.globalAlpha = last ? .45 + .35*Math.sin(game.t*60) : .12 + .25*k; ctx.fillStyle = '#F95587'; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.fill();
        // anneau blanc qui se referme : quand il touche le bord de la zone, l'attaque frappe
        ctx.globalAlpha = .95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, r*(1 + (1 - k)*.9), 0, TAU); ctx.stroke();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ffc0d8'; ctx.lineWidth = 2; ctx.setLineDash([10,8]);
        for (const s of [1, -1]){ ctx.beginPath(); ctx.arc(z.x, z.y, r*(s > 0 ? .9 : .6), game.t*3*s, game.t*3*s + TAU); ctx.stroke(); }
        ctx.setLineDash([]); ctx.globalAlpha = 1; }});
  },
  // Scalpereur : longue charge, puis attaque en X à l'impact ou au bout
  genusection(f, mv, a){
    const wind = .22, L = 360; dimScreen(.55); f.act = {n:'Charge', t:0, dur:wind};
    spawnFx({update(){ for (let k=1;k<=4;k++) danger(f, f.x + Math.cos(a)*L*k/4.5, f.y + Math.sin(a)*L*k/4.5, 34); return this.t < wind; },
      ground(){ ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a); ctx.globalAlpha = .25 + .3*this.t/wind; ctx.fillStyle = '#5a2040'; ctx.fillRect(0, -18, L, 36); ctx.restore(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind) return true;
      f.act = {n:'Attack', t:0, dur:.7};
      f.dash = {vx:Math.cos(a)*600, vy:Math.sin(a)*600, t:.6, mv, trail:'#c04a6a',
        fx(){ game.parts.push({x:f.x + rand(-6,6), y:f.y + rand(-6,6), vx:0, vy:0, life:.35, max:.35, col:pick(['#2a1a3a','#5a2a6a','#c0c0d8']), size:rand(6,12)}); },
        onHit(e){ xSlash(f, mv, e.x, e.y, a); }, onEnd(){ xSlash(f, mv, f.x + Math.cos(a)*30, f.y + Math.sin(a)*30, a); }};
      return false; }};
  },
  // Minotaupe : s'enterre (invulnérable) et ressort sous la cible
  tunnel(f, mv, a, tx, ty){
    const z0 = clampTo(f, tx, ty, mv.range), z = clampArena(z0.x, z0.y, f.r), dig = .1, spd = 600, R = 80, home = {x:f.x, y:f.y}, st = {done:false};
    sparks(f.x, f.y, ['#8a6a3a','#6b4a2a','#b08a50'], 16, 200, 5); crackDecal(f.x, f.y, 40); shake(4);
    f.act = {n:'Attack', t:0, dur:.3};
    spawnFx({update(){ return !st.done && this.t < 1.5; }, ground(){ const k = Math.min(1, this.t/.5); ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#8a6a3a';
      ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = .8; ctx.strokeStyle = '#E2BF65'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, R*k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt;
      if (this.t < dig) return true;
      f.buried = true; f.inv = Math.max(f.inv, .1);
      // la sortie suit l'ennemi (jusqu'à 150 px/s), sans dépasser la portée depuis le point de départ
      const e = foeOf(f);
      if (e.hp > 0 && !e.buried){ const w0 = clampTo(home, e.x, e.y, mv.range), w = clampArena(w0.x, w0.y, f.r), dx = w.x - z.x, dy = w.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const s2 = Math.min(m, 150*dt); z.x += dx/m*s2; z.y += dy/m*s2; } }
      const dx = z.x - f.x, dy = z.y - f.y, m = Math.hypot(dx, dy), step = spd*dt;
      if (m > step){ f.x += dx/m*step; f.y += dy/m*step; } else { f.x = z.x; f.y = z.y; }
      if (Math.random() < .7) game.parts.push({x:f.x + rand(-12,12), y:f.y + rand(-6,6), vx:rand(-50,50), vy:rand(-90,-20), life:.4, max:.4, col:pick(['#8a6a3a','#6b4a2a','#b08a50']), size:rand(3,6)});
      if (Math.random() < .3) crackDecal(f.x, f.y, 18);
      danger(f, z.x, z.y, R);
      if (m <= step || this.t > 1.2){ st.done = true; f.buried = false; f.inv = .15; const hitE = zoneHit(f, mv, f.x, f.y, R); if (hitE && hitE.hp > 0) launch(hitE, .55, 60);
        shake(14); zoomPunch(.05); hitstop(.07); crackDecal(f.x, f.y, R); shockRing(f.x, f.y, R*1.35, '#E2BF65', .4, 12);
        sparks(f.x, f.y, ['#8a6a3a','#E2BF65','#6b4a2a'], 26, 320, 7); f.act = {n:'Attack', t:0, dur:.45}; return false; }
      return true; }};
  },
  // Léviator : charge ; à l'impact, plonge dessous et envoie voler l'ennemi
  cascade(f, mv, a){
    f.dash = {vx:Math.cos(a)*780, vy:Math.sin(a)*780, t:.4, mv, trail:'#6390F0',
      fx(){ game.parts.push({x:f.x + rand(-10,10), y:f.y + rand(-10,10), vx:rand(-40,40), vy:rand(-80,0), life:.35, max:.35, col:pick(['#ffffff','#9ec0ff','#6390F0']), size:rand(3,6)}); },
      onHit(e){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); geyser(e.x, e.y);
        if (ok && e.hp > 0) launch(e, 1.1, 125, () => { shake(9); crackDecal(e.x, e.y, 40); });
        f.script = {t:0, update(dt){ this.t += dt; f.buried = this.t < .3; f.inv = Math.max(f.inv, .05); if (this.t >= .3){ f.buried = false; sparks(f.x, f.y, ['#ffffff','#9ec0ff'], 12, 160, 4); return false; } return true; }}; }};
  },
  // Naganadel : lance un dard (empoisonne) et charge en même temps (vole des PV)
  doubledard(f, mv, a){
    spawnProj(f, sub(mv, {k:'proj', spd:680, r:7, life:.6, fx:{poison:1}, look:'dart'}), a, 1);
    const drain = sub(mv, {fx:{drain:.5}});
    f.dash = {vx:Math.cos(a)*700, vy:Math.sin(a)*700, t:.34, mv:drain, trail:'#A33EA1',
      onHit(e){ const ok = canHit(f, e, drain); hit(f, e, drain, 1); sparks(e.x, e.y, ['#A33EA1','#e0a0e0'], 12, 180, 4);
        if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.dash = null; } backLeap(f, e, a); }};
  },
  // Mammochon : pluie de stalactites ; la dernière ralentit fortement et reste plantée — la prochaine attaque de Mammochon la fait exploser
  // Mammochon : 5 stalactites l'une après l'autre ; chacune vise la position de l'ennemi au moment où elle tombe (elles le suivent)
  chuteglace(f, mv, a, tx, ty){
    const first = clampRange(f, tx, ty); let n = 0;
    const drop = p => { const c = clampArena(p.x, p.y, 10); icicle(f, mv, c.x, c.y, .4, n === 4); n++; };
    drop(first);
    spawnFx({update(){ while (n < 5 && this.t >= n*.18){ const e = foeOf(f); drop(e.hp > 0 && !e.buried ? clampRange(f, e.x + e.vx*.3 + rand(-12, 12), e.y + e.vy*.3 + rand(-12, 12)) : first); } return n < 5; }});
  },
  // Cavalerie Lourde : charge ; au bout (ou au contact), petit bond en avant qui écrase une zone en cercle et immobilise
  cavalerielourde(f, mv, a){
    const ux = Math.cos(a), uy = Math.sin(a);
    const hop = () => { const sx = f.x, sy = f.y, end = clampArena(sx + ux*70, sy + uy*70, f.r), dur = .22, R = 80; f.act = {n:'Attack', t:0, dur:.35};
      f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur); f.x = sx + (end.x - sx)*k; f.y = sy + (end.y - sy)*k; f.h = Math.sin(Math.PI*k)*45; danger(f, end.x, end.y, R);
        if (k >= 1){ f.h = 0; const e = zoneHit(f, mv, end.x, end.y, R); if (e && e.hp > 0){ e.root = Math.max(e.root, .35); e.dash = null; popText(e.x, e.y - 62, 'Immobilisé !', '#E2BF65', 13); }
          shake(13); zoomPunch(.04); hitstop(.05); crackDecal(end.x, end.y, R); shockRing(end.x, end.y, R*1.3, '#E2BF65', .4, 12); sparks(end.x, end.y, ['#c9b98f','#8a6a3a','#E2BF65'], 26, 300, 6); return false; }
        return true; }}; };
    f.dash = {vx:ux*700, vy:uy*700, t:.3, mv, trail:'#c9a86a',
      fx(){ if (Math.random() < .7) game.parts.push({x:f.x + rand(-12,12), y:f.y + f.r*.6, vx:-ux*80 + rand(-30,30), vy:-rand(20,60), life:.35, max:.35, col:pick(['#c9b98f','#8a6a3a','#E2BF65']), size:rand(3,6)}); },
      onHit(){ hop(); }, onEnd(){ hop(); }};
  },
  // Momartik : tempête de neige en cône pendant 1 s
  blizzard(f, mv, a){
    const R = 235, half = .7, slowMv = sub(mv, {fx:{slow:.8}}); let ticks = 0, hits = 0;
    f.act = {n:'Shoot', t:0, dur:1.05};
    const flakes = Array.from({length:40}, () => ({a:rand(-half, half), d:rand(.1, 1), s:rand(1.5, 3.5), v:rand(.6, 1.4)}));
    spawnFx({update(){ return this.t < 1.05 && f.hp > 0; }, ground(){ const al = Math.min(1, this.t/.12, (1.05 - this.t)/.15);
      ctx.globalAlpha = .22*al; ctx.fillStyle = '#dff6ff'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a - half, a + half); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = .75*al; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([10,7]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; for (const fl of flakes){ const d = ((fl.d + this.t*fl.v) % 1)*R; ctx.globalAlpha = al*(1 - d/R*.6); ctx.beginPath(); ctx.arc(f.x + Math.cos(a + fl.a)*d, f.y + Math.sin(a + fl.a)*d, fl.s, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a;
      for (let k=1;k<=3;k++) danger(f, f.x + Math.cos(a)*R*k/3.6, f.y + Math.sin(a)*R*k/3.6, 34*k);
      for (let i=0;i<6;i++){ const aa = a + rand(-half, half), v = rand(260, 500); game.parts.push({x:f.x + Math.cos(aa)*16, y:f.y + Math.sin(aa)*16, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.4,.6), max:.6, col:pick(['#ffffff','#e6f7ff','#bfe9f5']), size:rand(2,5), drag:.985}); }
      if (this.t >= ticks*.25 && ticks < 4){ ticks++; const e = foeOf(f); if (inWedge(f, e, a, R, half)){ if (canHit(f, e, slowMv)) hits++; hit(f, e, slowMv, 1); } shake(3);
        if (ticks === 4 && hits === 4 && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.root = Math.max(e.root, .5); e.dash = null; popText(e.x, e.y - 62, 'Gelé !', '#bff3ff', 16); frostDecal(e.x, e.y, 40); sparks(e.x, e.y, ['#ffffff','#bff3ff'], 16, 180, 4); } }
      return this.t < 1.05; }};
  },
  // Flamigator : onde circulaire qui part du lanceur ; toucher augmente son Atq. Spé.
  // Flamigator : une large vague de flammes et de notes part droit devant ; si elle touche, Atq. Spé. augmentée
  chantflamboyant(f, mv, a){
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, spd = 380, max = 420, half = 46, ox = f.x + ux*f.r, oy = f.y + uy*f.r; let struck = false;
    f.act = {n:'Shoot', t:0, dur:.4}; shake(4);
    spawnFx({d:0, update(dt){ this.d += spd*dt; const cx = ox + ux*this.d, cy = oy + uy*this.d, e = foeOf(f);
        if (cx < WALL || cx > W - WALL || cy < WALL || cy > H - WALL) return false;
        danger(f, cx + ux*50, cy + uy*50, half + 10);
        if (!struck && e.hp > 0 && !e.buried){ const rx = e.x - cx, ry = e.y - cy, al = rx*ux + ry*uy, lat = Math.abs(rx*px + ry*py);
          if (al > -30 && al < 26 && lat < half + e.r*.5){ struck = true; const ok = canHit(f, e, mv); hit(f, e, mv, 1);
            if (ok){ f.buff = {...f.buff, spa:Math.min(1.6, f.buff.spa*1.3)}; f.buffT = Math.max(f.buffT, 6); popText(f.x, f.y - 62, 'Atq. Spé. +', '#e6b84c', 14); } } }
        for (let i=0;i<3;i++){ const l = rand(-half, half); game.parts.push({x:cx + px*l, y:cy + py*l, vx:ux*120 + rand(-30,30), vy:uy*120 - rand(20,70), life:.35, max:.35, col:pick(['#fff3b0','#ffb43a','#ff6a1a','#b48ae8']), size:rand(4,8)}); }
        return this.d < max; },
      top(){ const cx = ox + ux*this.d, cy = oy + uy*this.d, al = Math.min(1, (max - this.d)/80);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.globalAlpha = al;
        drawGlow(0, 0, half*1.6, '#ff6a1a', .6);
        const g = ctx.createLinearGradient(-60, 0, 14, 0); g.addColorStop(0, 'rgba(232,67,42,0)'); g.addColorStop(.6, 'rgba(255,138,42,.85)'); g.addColorStop(1, 'rgba(255,243,176,.95)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-60, -half); for (let l = -half; l <= half; l += 8) ctx.lineTo(Math.sin(l*.12 + game.t*16)*6 + 10 - Math.abs(l)*.25, l); ctx.lineTo(-60, half); ctx.closePath(); ctx.fill();
        for (let i=0;i<5;i++){ const l = (i - 2)*half*.45; drawFlame(-10 - Math.abs(l)*.2, l, 9 + 2*Math.sin(game.t*14 + i), 1); }
        ctx.fillStyle = '#fff3c0'; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i=0;i<3;i++){ const l = (i - 1)*half*.7; ctx.fillText(i % 2 ? '♫' : '♪', -34, l + Math.sin(game.t*8 + i)*5); }
        ctx.restore(); ctx.globalAlpha = 1; }});
  },
  // Carchacrok : 4 coups redirigeables, de plus en plus larges
  // Carchacrok : 4 coups de griffes enchaînés ; il bondit en avant à chaque coup, l'ennemi touché reste pris dans le combo,
  // le dernier coup fend le sol et repousse ; ensuite Carchacrok est épuisé 0,5 s
  colere(f, mv, a){
    const reach = [60, 78, 98, 122], half = [.9, 1, 1.1, 1.25], times = [0, .3, .6, .92], last = sub(mv, {p:mv.p*1.4}); let n = 0, lunge = null;
    f.script = {t:0, update(dt){ this.t += dt;
      if (lunge && lunge.t > 0){ const st = Math.min(dt, lunge.t); lunge.t -= st; const c = clampArena(f.x + lunge.vx*st, f.y + lunge.vy*st, f.r); f.x = c.x; f.y = c.y; }   // petit bond en avant
      while (n < 4 && this.t >= times[n]){ const aa = n ? liveAimAngle(f) : a, R = f.r + reach[n], fin = n === 3; f.aimA = aa; f.act = {n:'Attack', t:0, dur:.28};
        lunge = {vx:Math.cos(aa)*400, vy:Math.sin(aa)*400, t:.1};
        const e = foeOf(f);
        if (inWedge(f, e, aa, R + 20, half[n])){ const ok = canHit(f, e, fin ? last : mv); hit(f, e, fin ? last : mv, 1);
          if (ok && e.hp > 0){ if (fin){ e.kx += Math.cos(aa)*520; e.ky += Math.sin(aa)*520; }
            else { e.stun = Math.max(e.stun, .22); e.dash = null; const hx = f.x + Math.cos(aa)*(f.r + e.r + 30), hy = f.y + Math.sin(aa)*(f.r + e.r + 30); e.kx = (hx - e.x)*5; e.ky = (hy - e.y)*5; } } }
        dragonClawSlash(f, aa, R, half[n], fin); shake(3 + n*3);
        if (fin){ screenFlash('#6F35FC', .25, .2); zoomPunch(.04); const cx = f.x + Math.cos(aa)*R*.8, cy = f.y + Math.sin(aa)*R*.8; crackDecal(cx, cy, 70); shockRing(cx, cy, 110, '#8a5cff', .4, 12); }
        n++; }
      if (this.t >= 1.15){ f.stun = Math.max(f.stun, .5); popText(f.x, f.y - 62, 'Épuisé…', '#a39bd0', 13); return false; }   // contrepartie, comme la confusion de Colère dans les jeux
      return true; }};
  },
  // Sinistrail : lance son ancre au bout d'une chaîne, qui attire et immobilise
  ancrage(f, mv, a){
    const out = 360, spd = 640; let struck = false;
    spawnFx({x:f.x, y:f.y, phase:0, d:0, update(dt){
        if (this.phase === 0){ this.d += spd*dt; this.x = f.x + Math.cos(a)*this.d; this.y = f.y + Math.sin(a)*this.d;
          const e = foeOf(f);
          if (!struck && e.hp > 0 && !e.buried && Math.hypot(e.x - this.x, e.y - this.y) < e.r + 14){ struck = true; const ok = canHit(f, e, mv); hit(f, e, mv, 1);
            if (ok && e.hp > 0){ e.dash = null; e.roll = null; popText(e.x, e.y - 62, 'Ancré !', '#B7B7CE', 14); shake(8);
              e.script = {t:0, update(dt){ this.t += dt; const dx = f.x - e.x, dy = f.y - e.y, m = Math.hypot(dx, dy) || 1, stop = f.r + e.r + 4;
                if (m <= stop || f.hp <= 0 || this.t > .7){ e.root = Math.max(e.root, .5); return false; }
                const st = Math.min(m - stop, 760*dt); e.x += dx/m*st; e.y += dy/m*st; return true; }}; }
            this.phase = 1; }
          if (this.d >= out || this.x < WALL || this.x > W - WALL || this.y < WALL || this.y > H - WALL) this.phase = 1; }
        else { this.d -= spd*1.3*dt; this.x = f.x + Math.cos(a)*this.d; this.y = f.y + Math.sin(a)*this.d; if (this.d <= 0) return false; }
        danger(f, this.x, this.y, 18); return f.hp > 0; },
      top(){ const n = Math.floor(this.d/11); ctx.fillStyle = '#8f8fa8';
        for (let i=1;i<n;i++){ const k = i/n; ctx.beginPath(); ctx.arc(f.x + (this.x - f.x)*k, f.y + (this.y - f.y)*k, 3, 0, TAU); ctx.fill(); }
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(a - Math.PI/2); ctx.strokeStyle = '#d8d8ea'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 12); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 2, 12, .3, Math.PI - .3); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -17, 4, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.stroke(); ctx.restore(); }});
  },
  // Amphinobi : 3 shurikens d'eau rapides qui rebondissent une fois sur les murs
  sheauriken(f, mv, a, tx, ty){
    bigShuriken(f, sub(mv, {p:60, fx:{slow:1}}), clampRange(f, tx, ty));
    for (let i=0;i<3;i++) spawnFx({update(){ if (this.t >= i*.08){ spawnProj(f, sub(mv, {k:'proj', spd:660, r:9, life:1, look:'shuriken', bounce:1}), a + (i-1)*.05, 1); return false; } return true; }});
  }
};

// =====================================================================
// LÉGENDAIRES : Mewtwo, Groudon, Kyogre, Shifours (et Close Combat en rafale)
// =====================================================================
// météore psychique qui tombe sur une zone (Frappe Psy) ; big = le dernier, énorme, qui étourdit 0,5 s
function psyMeteor(f, mv, x, y, delay, big){
  const r = big ? 80 : 40;
  spawnFx({update(){ if (this.done) return this.t < delay + .3; danger(f, x, y, r);
      if (this.t >= delay){ this.done = true; const e = zoneHit(f, mv, x, y, r);
        if (big){ if (e && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.dash = null; popText(e.x, e.y - 62, 'Étourdi !', '#F95587', 14); }
          shake(16); zoomPunch(.06); hitstop(.08); screenFlash('#ffd0e4', .35, .25); crackDecal(x, y, 70); shockRing(x, y, 130, '#F95587', .45, 14);
          sparks(x, y, ['#ffffff','#ffa0c8','#F95587','#b06cff'], 40, 340, 7); }
        else { shake(5); shockRing(x, y, 60, '#ffa0c8', .3, 6); sparks(x, y, ['#ffffff','#ffa0c8','#F95587'], 14, 220, 5); crackDecal(x, y, 30); } }
      return true; },
    ground(){ if (this.done){ const k = (this.t - delay)/.3; ctx.globalAlpha = .5*(1-k); glowBall(x, y, r*.8, '#ffffff', '#ffa0c8', '#F95587'); ctx.globalAlpha = 1; return; }
      const k = Math.min(1, this.t/delay); ctx.globalAlpha = .12 + .3*k; ctx.fillStyle = '#F95587'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8; ctx.strokeStyle = '#ffc0d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*(1 - k*.7), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ if (this.done) return; const k = Math.min(1, this.t/delay), yy = y - (1 - k*k)*360 - 10, R = (big ? 26 : 13)*(.7 + .3*k);
      ctx.globalAlpha = .45; ctx.strokeStyle = '#ffa0c8'; ctx.lineWidth = R*1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, yy - R*3); ctx.lineTo(x, yy); ctx.stroke(); ctx.globalAlpha = 1;
      glowBall(x, yy, R*1.15, '#ffffff', '#ffb8d8', '#b04ae0'); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - R*.25, yy - R*.25, R*.35, 0, TAU); ctx.fill(); }});
}
// pieu de pierre (Lame Pangéenne) : sort du sol avec une lueur de magma à la base
function drawStoneSpike(s, up){
  if (up <= 0) return; const h = s.h*up, tx = s.x + s.lean*h, ty = s.y - h;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, s.w*1.3, s.w*.5, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(s.x, ty, s.x, s.y); g.addColorStop(0, '#f0c08a'); g.addColorStop(.5, '#b4683a'); g.addColorStop(1, '#5a2a16');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x - s.w, s.y); ctx.lineTo(tx, ty); ctx.lineTo(s.x + s.w, s.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a140a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,150,60,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - s.w*.8, s.y - 1); ctx.lineTo(s.x + s.w*.8, s.y - 1); ctx.stroke();
}
function punchFire(x, y, a){ punchFx(x, y, a, 'fire'); }
// trois griffes bleu-mauve sur la zone d'attaque (Draco-Griffe)
function dragonClaws(f, mv, x, y, a){
  zoneHit(f, mv, x, y, 48); shake(6); sparks(x, y, ['#ffffff','#8a7aff','#4aa0ff'], 14, 220, 4);
  spawnFx({update(){ return this.t < .38; }, top(){ const fade = this.t > .2 ? Math.max(0, 1 - (this.t - .2)/.18) : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineCap = 'round'; ctx.globalAlpha = fade;
    for (let s=0;s<3;s++){ const k = Math.max(0, Math.min(1, (this.t - s*.04)/.07)); if (!k) continue; const o = (s-1)*16;
      const x1 = o - 12, y1 = -36, x2 = x1 + 24*k, y2 = y1 + 72*k;
      ctx.strokeStyle = '#241650'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const g = ctx.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, '#8a5cff'); g.addColorStop(1, '#4aa8ff');
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
}
// gros poing noir vu de face (Poing Obscur)
function drawFrontFist(x, y, S, al, pal = {fill:'#16101c', stroke:'#a83a5e', glow:'#c04a6a', line:'#5a2a40'}){
  // paume, 4 jointures, pouce ; 1re passe : halo rouge (ombre), 2e passe : remplissage noir et contour par-dessus
  const boxes = [[-26, -12, 52, 40, 10], [-26, -28, 13, 22, 6], [-13, -28, 13, 22, 6], [0, -28, 13, 22, 6], [13, -28, 13, 22, 6], [-32, 2, 20, 13, 6]];
  const path = () => { ctx.beginPath(); for (const [bx, by, w, h, r] of boxes) ctx.roundRect(bx, by, w, h, r); };
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S); ctx.globalAlpha = al; ctx.fillStyle = pal.fill;
  ctx.shadowColor = pal.glow; ctx.shadowBlur = 18; path(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.stroke; ctx.lineWidth = 1.6;
  for (const [bx, by, w, h, r] of boxes){ ctx.beginPath(); ctx.roundRect(bx, by, w, h, r); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = pal.line; ctx.lineWidth = 1.5;
  for (let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(-23 + i*13, -20); ctx.lineTo(-16 + i*13, -20); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function darkFist(f, mv, x, y, delay){
  const r = 46;
  spawnFx({update(){ if (!this.done){ danger(f, x, y, r);
        if (this.t >= delay){ this.done = true; const e = zoneHit(f, mv, x, y, r); if (e) popText(e.x, e.y - 80, 'Coup critique !', '#ef5050', 14, 1);
          shake(9); hitstop(.05); crackDecal(x, y, 44); shockRing(x, y, 80, '#c04a6a', .35, 10); sparks(x, y, ['#140a18','#c04a6a','#ffffff'], 16, 260, 5); } }
      return this.t < delay + .3; },
    ground(){ if (this.done) return; const k = this.t/delay; ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#2a1626'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8; ctx.strokeStyle = '#d06080'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*(1 - k*.6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), fade = this.done ? Math.max(0, 1 - (this.t - delay)/.3) : 1;
      drawFrontFist(x, y - 30 - (1 - k)*70, this.done ? 1.3 : .45 + .85*k*k, fade); }});
}
// petit poing orange de profil (Close Combat)
function drawJab(x, y, a, S, al){
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(S, S); ctx.globalAlpha = al;
  ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 2; for (const o of [-6, 0, 6]){ ctx.beginPath(); ctx.moveTo(-26, o); ctx.lineTo(-12, o); ctx.stroke(); }
  glowBall(0, 0, 12, '#fff3c0', '#ffb060', '#ff7a1a');
  ctx.fillStyle = '#ffb060'; ctx.strokeStyle = '#a8400a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, 10, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
  for (let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(4, -6 + i*6); ctx.lineTo(9, -6 + i*6); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

Object.assign(SIG, {
  // Mewtwo : 5 météores psychiques l'un après l'autre (ils suivent la visée) ; il s'immobilise seulement pour le dernier, énorme, qui étourdit
  frappepsy(f, mv, a, tx, ty, o){
    const T = [0, .25, .5, .75, 1.05], hold = .85, delay = .4, big = sub(mv, {p:90}); let n = 0;
    f.busy = T[4];   // pas d'autre attaque pendant la série
    const drop = () => { const z = n === 0 ? clampRange(f, tx, ty) : liveAimPoint(f, o.slot, o.manual); psyMeteor(f, n < 4 ? mv : big, z.x, z.y, delay, n === 4); n++; };
    drop(); f.act = {n:'Charge', t:0, dur:.4};
    const side = sideOf(f);
    spawnFx({update(){ if (f.hp <= 0 || side.team[side.active] !== f) return false;   // K.O. ou changé : la série s'arrête
        while (n < 4 && this.t >= T[n]){ drop(); f.act = {n:'Charge', t:0, dur:.4}; }
        if (n === 4 && this.t >= hold && !this.held){ this.held = true; dimScreen(.5); f.act = {n:'Charge', t:0, dur:T[4] - hold + .2};
          // immobile le temps de faire tomber le dernier météore
          f.script = {t:0, update(dt){ this.t += dt; f.vx = f.vy = 0; if (n === 4 && this.t >= T[4] - hold) drop(); return this.t < T[4] - hold + .15; }}; }
        if (this.held && Math.random() < .6) game.parts.push({x:f.x + rand(-20,20), y:f.y + rand(-14,10), vx:0, vy:-rand(40,90), life:.4, max:.4, col:pick(['#ffa0c8','#b06cff','#ffffff']), size:rand(2,4)});
        return n < 5 && this.t < 2; }});
  },
  // Groudon : grand cône de pieux de pierre qui jaillissent du sol et empalent (×1 sur les types Vol)
  lamepangeenne(f, mv, a){
    const R = 250, half = .55, wind = .35, sx = f.x, sy = f.y, spikes = [], rocksHit = new Set(); let struck = false;
    for (let i=0;i<36;i++){ const aa = a + rand(-half, half)*.95, d = rand(40, R); spikes.push({x:sx + Math.cos(aa)*d, y:sy + Math.sin(aa)*d, d, h:rand(26, 48), w:rand(6, 10), lean:rand(-.25,.25)}); }
    spikes.sort((p, q) => p.y - q.y);
    f.act = {n:'Charge', t:0, dur:wind}; shake(3);
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; return this.t < wind + .15; }};
    spawnFx({update(){ const tt = this.t - wind;
        if (tt < .3) for (let k=1;k<=3;k++) danger(f, sx + Math.cos(a)*R*k/3.6, sy + Math.sin(a)*R*k/3.6, 34*k);
        if (tt >= 0){
          if (!this.started){ this.started = true; f.act = {n:'Attack', t:0, dur:.45}; shake(15); zoomPunch(.05); hitstop(.05); screenFlash('#ff7a3a', .25, .25); }
          const front = 40 + (R - 40)*Math.min(1, tt/.25), e = foeOf(f);
          if (!struck && e.hp > 0 && !e.buried && Math.hypot(e.x - sx, e.y - sy) < front + e.r*.6 && angDiff(Math.atan2(e.y - sy, e.x - sx), a) < half){
            struck = true; const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok && e.hp > 0){ launch(e, .6, 70); popText(e.x, e.y - 62, 'Empalé !', '#E2BF65', 14); } crackDecal(e.x, e.y, 46); }
          for (const rk of [...game.rocks]) if (!rocksHit.has(rk) && Math.hypot(rk.x - sx, rk.y - sy) < front && angDiff(Math.atan2(rk.y - sy, rk.x - sx), a) < half){ rocksHit.add(rk); hitRock(rk, mv.p*.6, '#E2BF65'); }
          for (const s of spikes) if (!s.up && s.d < front){ s.up = this.t; if (Math.random() < .4) sparks(s.x, s.y, ['#c9b98f','#8a6a3a','#ff8a3a'], 3, 120, 4); } }
        return tt < 1.2; },
      ground(){ if (this.t < wind){ const k = this.t/wind; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#c87a3a'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, R, a - half, a + half); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ffb060'; ctx.lineWidth = 2; ctx.setLineDash([8,6]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } },
      top(){ const tt = this.t - wind, out = tt > .95 ? Math.max(0, 1 - (tt - .95)/.25) : 1;
        for (const s of spikes) if (s.up) drawStoneSpike(s, Math.min(1, (this.t - s.up)/.08)*out); }});
  },
  poingfeu(f, mv, a){
    f.dash = {vx:Math.cos(a)*760, vy:Math.sin(a)*760, t:.35, mv, trail:'#ffb43a',
      fx(){ if (Math.random() < .6) game.parts.push({x:f.x + rand(-10,10), y:f.y + rand(-10,10), vx:-Math.cos(a)*80, vy:-60, life:.3, max:.3, col:pick(['#ffd25a','#ff8a2a','#e8432a']), size:rand(3,6)}); },
      onHit(e){ hit(f, e, mv, 1); punchFire(e.x - Math.cos(a)*e.r*.5, e.y - Math.sin(a)*e.r*.5, a); }, onEnd(){ punchFire(f.x + Math.cos(a)*f.r, f.y + Math.sin(a)*f.r, a); }};
  },
  // Draco-Griffe : courte charge, puis trois griffes sur la zone devant le lanceur
  dracogriffe(f, mv, a){
    const claw = () => dragonClaws(f, mv, f.x + Math.cos(a)*(f.r + 22), f.y + Math.sin(a)*(f.r + 22), a);
    f.dash = {vx:Math.cos(a)*700, vy:Math.sin(a)*700, t:.18, mv, trail:'#7a5cff', onHit(){ claw(); }, onEnd(){ claw(); }};
  },
  // Kyogre : une vague circulaire grandit et repousse, laisse une flaque qui ralentit, puis une vague plus fine revient vers le centre
  ondeoriginelle(f, mv, a){
    const cx = f.x, cy = f.y, R = 240, grow = .55, gap = .4, back = .45, band = 34, ret = sub(mv, {p:50}); let hit1 = false, hit2 = false;
    f.act = {n:'Charge', t:0, dur:.5}; screenFlash('#6390F0', .2, .35); shake(8);
    spawnFx({update(){ const t = this.t, e = foeOf(f), alive = e.hp > 0 && !e.buried, d = Math.hypot(e.x - cx, e.y - cy);
        this.r1 = t < grow ? R*Math.sin(t/grow*Math.PI/2) : null;
        if (this.r1 !== null){ danger(f, cx, cy, Math.min(R, this.r1 + 60));
          if (!hit1 && alive && Math.abs(d - this.r1) < band + e.r*.5){ hit1 = true; const ok = canHit(f, e, mv); hit(f, e, mv, 1);
            if (ok){ const ang = Math.atan2(e.y - cy, e.x - cx); e.kx += Math.cos(ang)*460; e.ky += Math.sin(ang)*460; } } }
        const t2 = t - grow - gap; this.r2 = t2 >= 0 && t2 < back ? R*(1 - t2/back) : null;
        if (this.r2 !== null){ danger(f, cx, cy, R); if (!hit2 && alive && Math.abs(d - this.r2) < 18 + e.r*.5){ hit2 = true; hit(f, e, ret, 1); } }
        if (t > grow && t < grow + 2 && alive && d < R*.85 && !e.d.types.includes('Water')){ if (e.slow <= 0 || e.slowF >= .6) e.slowF = .6; e.slow = Math.max(e.slow, .25); }
        for (const rr of [this.r1, this.r2]) if (rr) for (let i=0;i<5;i++){ const aa = Math.random()*TAU; game.parts.push({x:cx + Math.cos(aa)*rr, y:cy + Math.sin(aa)*rr, vx:Math.cos(aa)*60, vy:-rand(30,90), life:.35, max:.35, col:pick(['#ffffff','#cfe2ff','#9ec0ff']), size:rand(3,6)}); }
        return t < grow + 2; },
      ground(){ const t = this.t; if (t <= grow) return; const al = Math.min(1, (grow + 2 - t)/.5)*Math.min(1, (t - grow)/.2), RR = R*.85;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, RR); g.addColorStop(0, `rgba(61,111,224,${.28*al})`); g.addColorStop(.85, `rgba(61,111,224,${.2*al})`); g.addColorStop(1, 'rgba(61,111,224,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RR, 0, TAU); ctx.fill();
        ctx.globalAlpha = al*.35; ctx.strokeStyle = '#cfe2ff'; ctx.lineWidth = 1.5; for (let j=0;j<3;j++){ const rr = (game.t*30 + j*RR/3) % RR; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; },
      top(){ const wave = (r, w) => { if (!r || r < 4) return; const r0 = Math.max(0, r - w), r1 = r + w*.4, g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
          g.addColorStop(0, 'rgba(40,80,200,0)'); g.addColorStop(.55, 'rgba(61,111,224,.8)'); g.addColorStop(.85, 'rgba(158,192,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.arc(cx, cy, r0, 0, TAU, true); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); for (let i=0;i<=72;i++){ const aa = i/72*TAU, rr = r + Math.sin(aa*12 + game.t*14)*3; ctx.lineTo(cx + Math.cos(aa)*rr, cy + Math.sin(aa)*rr); } ctx.stroke(); };
        wave(this.r1, band*1.6); wave(this.r2, 18); }});
  },
  // Fatal-Foudre : un éclair au centre de la zone, puis 5 éclairs ensemble tout autour
  fatalfoudre(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), center = sub(mv, {fx:{stun:.3}}), ring = sub(mv, {p:Math.round(mv.p*.6)});
    boltZone(f, center, z.x, z.y, .5);
    for (let i=0;i<5;i++){ const aa = a + i*TAU/5, p = clampArena(z.x + Math.cos(aa)*88, z.y + Math.sin(aa)*88, 10); boltZone(f, ring, p.x, p.y, .85); }
    electrify(1.1);
  },
  // Shifours : charge ; au bout, 3 poings noirs s'abattent sur 3 zones côte à côte ; si la charge touche, elle étourdit et le poing du centre touche
  poingobscur(f, mv, a){
    const charge = sub(mv, {p:40}), ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const row = (x, y) => { for (const j of [0, -1, 1]){ const p = clampArena(x + px*j*72, y + py*j*72, 10); darkFist(f, mv, p.x, p.y, .32); } dimScreen(.4); };
    f.dash = {vx:ux*820, vy:uy*820, t:.34, mv:charge, trail:'#3a1a2a',
      fx(){ if (Math.random() < .7) game.parts.push({x:f.x + rand(-10,10), y:f.y + rand(-10,10), vx:-ux*80, vy:-uy*80, life:.25, max:.25, col:pick(['#140a18','#3a1a2a','#c04a6a']), size:rand(4,8)}); },
      onHit(e){ const ok = canHit(f, e, charge); hit(f, e, charge, 1); if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.dash = null; } row(e.x, e.y); },
      onEnd(){ row(f.x + ux*40, f.y + uy*40); }};
  },
  // Close Combat : rafale de coups de poing devant soi pendant 1 s (le lanceur peut bouger) ; chaque coup bloque l'ennemi un instant ; le dernier, plus gros, repousse
  closecombat(f, mv, a){
    const jab = sub(mv, {p:6}), last = sub(mv, {p:40}), N = 10, dur = 1, side = sideOf(f); let n = 0;
    f.busy = dur + .05;
    spawnFx({fists:[], update(){ if (f.hp <= 0 || side.team[side.active] !== f){ f.busy = 0; return false; }
        const aa = liveAimAngle(f); f.aimA = aa;
        while (n < N && this.t >= n*dur/(N - 1)){ n++; const fin = n === N, reach = fin ? 46 : 36, d = f.r + (fin ? 30 : 24), j = fin ? 0 : 8;
          const x = f.x + Math.cos(aa)*d + rand(-j, j), y = f.y + Math.sin(aa)*d + rand(-j, j), m = fin ? last : jab, e = foeOf(f);
          f.act = {n:'Attack', t:0, dur:.18};
          if (e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < reach + e.r*.6){ const ok = canHit(f, e, m); hit(f, e, m, 1);
            if (fin && ok){ e.kx += Math.cos(aa)*480; e.ky += Math.sin(aa)*480; }
            // chaque coup bloque un instant et ramène l'ennemi devant les poings : il reste pris dans le combo tant que le lanceur ne s'éloigne pas trop
            else if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .16); e.dash = null; const hx = f.x + Math.cos(aa)*(f.r + e.r + 6), hy = f.y + Math.sin(aa)*(f.r + e.r + 6); e.kx = (hx - e.x)*5; e.ky = (hy - e.y)*5; } }
          for (const rk of [...game.rocks]) if (Math.hypot(rk.x - x, rk.y - y) < reach + rk.r) hitRock(rk, fin ? 30 : 5, '#ff9a3a');
          this.fists.push({x, y, a:aa, t:this.t, big:fin});
          if (fin){ shake(9); shockRing(x, y, 70, '#ffb060', .3, 8); sparks(x, y, ['#ffffff','#ffb060','#ff7a1a'], 16, 260, 5); f.defDown = f.spdDown = mv.selfDown; popText(f.x, f.y - 62, 'Défenses −', '#c98a8a', 13); }
          else shake(2); }
        if (n < N) danger(f, f.x + Math.cos(aa)*(f.r + 26), f.y + Math.sin(aa)*(f.r + 26), 40);
        return n < N || this.t < dur + .25; },
      top(){ for (const p of this.fists){ const k = (this.t - p.t)/(p.big ? .25 : .14); if (k <= 1) drawJab(p.x, p.y, p.a, p.big ? 1.7 : 1, 1 - k); } }});
  },
});

// ---------- Sylveroy Cavalier d'Effroi ----------
// longueur d'un couloir avant le mur
function laneEnd(sx, sy, ux, uy, L){ for (let d=0; d<L; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL+10 || x > W-WALL-10 || y < WALL+10 || y > H-WALL-10) return d; } return L; }
// double spectral du cavalier (sprite de Spectreval, teinté violet)
function drawRiderGhost(x, y, a, al){
  const pm = PMD.sylveroy; ctx.save(); ctx.globalAlpha = al; glowBall(x, y - 12, 26, '#e8d8ff', '#8a5cc8', '#3a2458');
  if (pm && pm.st === 'ok'){ ctx.filter = 'brightness(.75) sepia(1) hue-rotate(225deg) saturate(2.5)'; drawPmdAt(pm, 'Walk', x, y - 12, a, PMD_SCALE); ctx.filter = 'none'; }
  ctx.restore(); ctx.globalAlpha = 1;
}
// branche maudite qui sort du sol
function drawCursedBranch(b, up, al){
  if (up <= 0 || al <= 0) return; const h = b.h*Math.min(1, up), tx = b.x + b.lean*h, ty = b.y - h, cx = b.x + b.lean*18, cy = b.y - h*.5;
  ctx.globalAlpha = al; ctx.lineCap = 'round';
  ctx.strokeStyle = '#140a1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
  const mx = b.x + b.lean*h*.5, my = b.y - h*.55; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + b.fork*13*Math.min(1, up), my - 9*Math.min(1, up)); ctx.stroke();
  ctx.strokeStyle = '#9a6ad8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
  ctx.fillStyle = '#c8a8ff'; ctx.beginPath(); ctx.arc(tx, ty, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
}
// baiser rose (Vampibaiser)
function kissFx(x, y){
  sparks(x, y, ['#ffffff','#ffc0de','#ff7ab8'], 12, 160, 4);
  spawnFx({hearts:Array.from({length:5}, () => ({dx:rand(-22,22), v:rand(40,80), ph:Math.random()*6, s:rand(4,7)})),
    update(){ return this.t < .7; },
    top(){ const k = this.t/.7, pop = Math.min(1, this.t/.1), fade = 1 - Math.max(0, (this.t - .3)/.4);
      ctx.save(); ctx.translate(x, y - 20); ctx.scale(pop*1.2, pop*1.2); ctx.globalAlpha = Math.max(0, fade);
      // lèvres
      ctx.fillStyle = '#ff5fa8'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-8, -12, 0, -4); ctx.quadraticCurveTo(8, -12, 16, 0); ctx.quadraticCurveTo(0, 14, -16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c0306e'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, 4, 14, 0); ctx.stroke();
      ctx.restore();
      for (const h of this.hearts){ const hx = x + h.dx + Math.sin(game.t*6 + h.ph)*4, hy = y - 20 - h.v*k*1.4, s = h.s; ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = '#ff8ac4';
        ctx.beginPath(); ctx.moveTo(hx, hy + s*.9); ctx.bezierCurveTo(hx - s*1.4, hy - s*.2, hx - s*.6, hy - s*1.2, hx, hy - s*.4); ctx.bezierCurveTo(hx + s*.6, hy - s*1.2, hx + s*1.4, hy - s*.2, hx, hy + s*.9); ctx.fill(); }
      ctx.globalAlpha = 1; }});
}
Object.assign(SIG, {
  // Sylveroy Effroi : se dédouble ; 3 cavaliers chargent et traversent (ralentit), puis des branches maudites jaillissent des couloirs et les ralentissent 2 s
  // préparation (comme Génusection) : les 3 couloirs s'affichent, le lanceur marque un court arrêt, puis les cavaliers partent
  sombreruade(f, mv, a){
    const wind = .35, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const lanes = [-62, 0, 62].map(o => { const s = clampArena(f.x + px*o, f.y + py*o, 20); return {sx:s.x, sy:s.y, L:laneEnd(s.x, s.y, ux, uy, 380)}; });
    dimScreen(.6); f.act = {n:'Charge', t:0, dur:wind};
    spawnFx({update(){ for (const l of lanes) for (let d = 30; d < l.L; d += 60) danger(f, l.sx + ux*d, l.sy + uy*d, 30); return this.t < wind; },
      ground(){ const k = this.t/wind; for (const l of lanes){ ctx.save(); ctx.translate(l.sx, l.sy); ctx.rotate(a); ctx.globalAlpha = .2 + .3*k; ctx.fillStyle = '#3a2458'; ctx.fillRect(0, -22, l.L, 44);
        ctx.globalAlpha = .8; ctx.strokeStyle = '#b08ae8'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.strokeRect(0, -22, l.L, 44); ctx.setLineDash([]); ctx.restore(); } ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind) return true; f.script = null; SIG.sombreruadeGo(f, mv, a); return false; }};
  },
  sombreruadeGo(f, mv, a){
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, spd = 1050, wait = .3, slowT = 2, run = sub(mv, {fx:{slow:1}}), branchMv = sub(mv, {p:60, fx:{slow:1}});
    const lanes = [-62, 0, 62].map(o => { const s = clampArena(f.x + px*o, f.y + py*o, 20); return {sx:s.x, sy:s.y, L:laneEnd(s.x, s.y, ux, uy, 380), o}; });
    const runT = Math.max(...lanes.map(l => l.L))/spd, branches = [];
    for (const l of lanes) for (let d=20; d<l.L; d+=24) branches.push({x:l.sx + ux*d + px*rand(-12,12), y:l.sy + uy*d + py*rand(-12,12), h:rand(24,42), lean:rand(-.45,.45), fork:Math.random() < .5 ? -1 : 1, delay:d/Math.max(1, l.L)*.12});
    branches.sort((p, q) => p.y - q.y);
    const inLane = (l, o, len, w) => { const rx = o.x - l.sx, ry = o.y - l.sy, along = rx*ux + ry*uy; return along > -w && along < len + w && Math.abs(-rx*uy + ry*ux) < w; };
    let struck = false;
    screenFlash('#3a2458', .3, .3); dimScreen(.6); for (const l of lanes) if (l.o) sparks(l.sx, l.sy, ['#e8d8ff','#8a5cc8','#3a2458'], 12, 160, 5);
    // le vrai Sylveroy charge au centre, ses doubles sur les côtés
    f.dash = {vx:ux*spd, vy:uy*spd, t:lanes[1].L/spd, mv:run, pierce:1, trail:'#8a5cc8', onHit(){}};
    spawnFx({update(){ const t = this.t, e = foeOf(f), ok = e.hp > 0 && !e.buried, tb = t - runT - wait;
        if (t < runT){ const head = t*spd;
          for (const l of lanes) for (let d = head; d < Math.min(l.L, head + 160); d += 50) danger(f, l.sx + ux*d, l.sy + uy*d, 34);
          if (!struck && ok) for (const l of lanes) if (inLane(l, e, Math.min(head, l.L), 28 + e.r*.6)){ struck = true; hit(f, e, run, 1); sparks(e.x, e.y, ['#3a2458','#8a5cc8','#e8d8ff'], 16, 220, 5); break; } }
        else if (tb < 0) for (const l of lanes) for (let d = 20; d < l.L; d += 50) danger(f, l.sx + ux*d, l.sy + uy*d, 30);
        if (tb >= 0 && !this.burst){ this.burst = true; shake(10); zoomPunch(.03); screenFlash('#2a1838', .25, .2);
          if (ok && lanes.some(l => inLane(l, e, l.L, 26 + e.r*.6))) hit(f, e, branchMv, 1);
          for (const l of lanes) for (let d=30; d<l.L; d+=70) sparks(l.sx + ux*d, l.sy + uy*d, ['#140a1c','#8a5cc8','#c8a8ff'], 4, 140, 4); }
        if (tb >= 0 && tb < slowT && ok && lanes.some(l => inLane(l, e, l.L, 24 + e.r*.5))){ if (e.slow <= 0 || e.slowF >= .5) e.slowF = .5; e.slow = Math.max(e.slow, .3); }
        return tb < slowT; },
      ground(){ const t = this.t, tb = t - runT - wait, al = tb < 0 ? .3 : .3*Math.min(1, (slowT - tb)/.5);
        ctx.save(); ctx.fillStyle = '#3a2458';
        for (const l of lanes){ const len = tb < 0 ? Math.min(t*spd, l.L) : l.L; ctx.save(); ctx.translate(l.sx, l.sy); ctx.rotate(a); ctx.globalAlpha = al; ctx.fillRect(0, -22, len, 44);
          if (tb >= 0){ ctx.globalAlpha = al*.8; ctx.strokeStyle = '#8a5cc8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]); ctx.strokeRect(0, -22, len, 44); ctx.setLineDash([]); } ctx.restore(); }
        ctx.restore(); ctx.globalAlpha = 1; },
      top(){ const t = this.t, tb = t - runT - wait;
        for (const l of lanes) if (l.o && t < l.L/spd + .12){ const d = Math.min(t*spd, l.L), fade = t > l.L/spd ? Math.max(0, 1 - (t - l.L/spd)/.12) : 1; drawRiderGhost(l.sx + ux*d, l.sy + uy*d, a, .8*fade); }
        if (tb >= 0){ const out = tb > slowT - .4 ? Math.max(0, (slowT - tb)/.4) : 1; for (const b of branches) drawCursedBranch(b, (tb - b.delay)/.1, out); } }});
  },
  // Vampibaiser : courte charge, puis un baiser qui vole des PV
  vampibaiser(f, mv, a){
    const kiss = (x, y) => kissFx(x, y);
    f.dash = {vx:Math.cos(a)*720, vy:Math.sin(a)*720, t:.22, mv, trail:'#ff8ac4',
      onHit(e){ hit(f, e, mv, 1); kiss(e.x, e.y); }, onEnd(){ kiss(f.x + Math.cos(a)*(f.r + 10), f.y + Math.sin(a)*(f.r + 10)); }};
  },
});

// ---------- Électhor de Galar ----------
Object.assign(SIG, {
  // 1re et 2e utilisations : charge fulgurante qui traverse ; 3e : bondit et s'écrase sur l'adversaire (étourdit)
  coupfulgurant(f, mv, a, tx, ty, o){
    const n = mv.uses - (f.recastN[o.slot] || 0);
    if (n < 3){
      const R = 260, e = foeOf(f), ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y; let L = R, target = null;
      if (e.hp > 0 && !e.buried){ const rx = e.x - sx, ry = e.y - sy, along = rx*ux + ry*uy, lat = Math.abs(-rx*uy + ry*ux);
        if (along > 0 && along < R + e.r && lat < f.r + e.r){ target = e; L = along + f.r + e.r + 20; } }
      const end = clampArena(sx + ux*L, sy + uy*L, f.r), bolt = boltPath(sx, sy, end.x, end.y, 14);
      for (let i=1;i<=6;i++) f.ghosts.push({x:sx + (end.x-sx)*i/7, y:sy + (end.y-sy)*i/7, life:.15 + i*.025, max:.3});
      f.x = end.x; f.y = end.y; f.vx = ux*200; f.vy = uy*200; f.inv = Math.max(f.inv, .2); electrify(.25); sparks(sx, sy, ['#ffffff','#F7D02C'], 10, 160, 3);
      spawnFx({update(){ return this.t < .25; }, top(){ const k = this.t/.25; ctx.globalAlpha = 1 - k; drawBolt(bolt, '#F7D02C', 5*(1 - k) + 1.5); ctx.globalAlpha = 1; }});
      if (target){ hit(f, target, mv, 1); hitstop(.07); shake(8); drawBoltBurst(target.x, target.y); target.kx += ux*200; target.ky += uy*200; }
      return;
    }
    const slam = sub(mv, {p:85}), z = clampArena(tx, ty, f.r), sx = f.x, sy = f.y, dur = .5, R = 70;
    f.act = {n:'Attack', t:0, dur};
    spawnFx({update(){ return this.t < dur; }, ground(){ const k = this.t/dur; ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#F7D02C'; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = '#C22E28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, R*k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur), e = foeOf(f);
      // pendant la montée, la zone suit un peu l'adversaire
      if (k < .5 && e.hp > 0 && !e.buried){ const w = clampTo({x:sx, y:sy}, e.x, e.y, 300), dx = w.x - z.x, dy = w.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 240*dt); z.x += dx/m*st; z.y += dy/m*st; } }
      f.x = sx + (z.x - sx)*k; f.y = sy + (z.y - sy)*k; f.h = Math.sin(Math.PI*k)*110; if (k > .15 && k < .85) f.inv = Math.max(f.inv, .04);
      if (Math.random() < .7) game.parts.push({x:f.x + rand(-12,12), y:f.y - f.h + rand(-12,12), vx:rand(-50,50), vy:rand(-50,50), life:.2, max:.2, col:pick(['#ffffff','#F7D02C','#ff8a5a']), size:rand(2,5)});
      danger(f, z.x, z.y, R);
      if (k >= 1){ f.h = 0; const t = zoneHit(f, slam, z.x, z.y, R); if (t && t.hp > 0){ t.stun = Math.max(t.stun, .45); t.dash = null; popText(t.x, t.y - 62, 'Étourdi !', '#F7D02C', 14); }
        shake(16); zoomPunch(.06); hitstop(.08); electrify(.5); screenFlash('#fff3a0', .3, .2); crackDecal(z.x, z.y, 60);
        shockRing(z.x, z.y, 110, '#F7D02C', .4, 14); shockRing(z.x, z.y, 70, '#C22E28', .35, 8); drawBoltBurst(z.x, z.y); sparks(z.x, z.y, ['#ffffff','#F7D02C','#C22E28'], 30, 320, 6); return false; }
      return true; }};
  },
  // Rapace : s'envole (hors d'atteinte), puis pique sur la zone ; étourdit 0,5 s, recul d'un quart des dégâts
  rapace(f, mv, a, tx, ty){
    const z0 = clampTo(f, tx, ty, mv.range), z = clampArena(z0.x, z0.y, f.r), up = .4, dive = .14, R = 60, H = 150;
    f.act = {n:'Charge', t:0, dur:up};
    spawnFx({update(){ return this.t < up + dive; }, ground(){ const k = Math.min(1, this.t/(up + dive)); ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#A98FF3'; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, R*(1 - k*.6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; const e = foeOf(f); danger(f, z.x, z.y, R + 10);
      if (this.t < up){ const k = this.t/up; f.h = H*Math.sin(k*Math.PI/2); f.inv = Math.max(f.inv, .05);
        if (e.hp > 0 && !e.buried){ const w = clampTo(f, e.x, e.y, mv.range), dx = w.x - z.x, dy = w.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 200*dt); z.x += dx/m*st; z.y += dy/m*st; } }
        if (Math.random() < .5) game.parts.push({x:f.x + rand(-16,16), y:f.y + rand(-4,4), vx:rand(-40,40), vy:rand(10,40), life:.3, max:.3, col:pick(['#ffffff','#e8e2ff']), size:rand(2,4)});
        return true; }
      if (!this.d){ this.d = {x:f.x, y:f.y}; f.act = {n:'Attack', t:0, dur:.3}; }
      const k = Math.min(1, (this.t - up)/dive); f.x = this.d.x + (z.x - this.d.x)*k; f.y = this.d.y + (z.y - this.d.y)*k; f.h = H*(1 - k); f.inv = Math.max(f.inv, .03);
      for (let i=0;i<3;i++) game.parts.push({x:f.x + rand(-10,10), y:f.y - f.h + rand(-10,10), vx:rand(-30,30), vy:-rand(40,120), life:.25, max:.25, col:pick(['#ffffff','#cbbcff','#A98FF3']), size:rand(3,6)});
      if (k >= 1){ f.h = 0; const t = zoneHit(f, mv, z.x, z.y, R); if (t && t.hp > 0){ t.stun = Math.max(t.stun, .5); t.dash = null; }
        shake(14); zoomPunch(.05); hitstop(.06); screenFlash('#ffffff', .25, .15); crackDecal(z.x, z.y, 50); shockRing(z.x, z.y, 100, '#A98FF3', .4, 12); sparks(z.x, z.y, ['#ffffff','#cbbcff','#A98FF3'], 26, 300, 6); return false; }
      return true; }};
  },
});

// =====================================================================
// LIGUE — LOT 1 : les aces des dresseurs
// =====================================================================
// zone qui se déclenche après un délai (cercle qui se referme), avec rappel au déclenchement
function delayedZone(f, x, y, r, delay, col, onFire, opts = {}){
  spawnFx({update(){ if (this.done) return this.t < delay + (opts.after || .3); if (!opts.hidden || this.t > delay - .25) danger(f, x, y, r);
      if (this.t >= delay){ this.done = true; onFire(x, y); } return true; },
    ground(){ if (this.done) return; const k = Math.min(1, this.t/delay), last = k > .8;
      ctx.globalAlpha = (opts.faint ? .06 + .14*k : .12 + .25*k) + (last ? .2*Math.sin(game.t*50) : 0); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = opts.faint ? .35 : .9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r*(1 + (1 - k)*.8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      if (opts.ground) opts.ground(k); }});
}
// rocher qui roule et rebondit sur les murs (Roc-Boulet)
function rollingBoulder(f, mv, a, R, p){
  let x = f.x + Math.cos(a)*(f.r + R), y = f.y + Math.sin(a)*(f.r + R), vx = Math.cos(a)*380, vy = Math.sin(a)*380, struck = false, rot = 0; const m = sub(mv, {p});
  spawnFx({update(dt){ x += vx*dt; y += vy*dt; rot += dt*8;
      if (x < WALL + R || x > W - WALL - R){ vx = -vx; x = Math.max(WALL + R, Math.min(W - WALL - R, x)); shake(3); sparks(x, y, ['#c9b98f','#8a6a3a'], 6, 140, 4); }
      if (y < WALL + R || y > H - WALL - R){ vy = -vy; y = Math.max(WALL + R, Math.min(H - WALL - R, y)); shake(3); sparks(x, y, ['#c9b98f','#8a6a3a'], 6, 140, 4); }
      danger(f, x, y, R + 10); const e = foeOf(f);
      if (!struck && e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < R + e.r*.6){ struck = true; const ok = canHit(f, e, m); hit(f, e, m, 1); if (ok){ e.kx += vx*.9; e.ky += vy*.9; } crackDecal(x, y, R + 10); shake(6); }
      if (Math.random() < .5) game.parts.push({x:x + rand(-R, R)*.5, y:y + R*.6, vx:rand(-30,30), vy:-rand(20,60), life:.3, max:.3, col:pick(['#c9b98f','#8a6a3a']), size:rand(2,4)});
      return this.t < 1.6 && !struck; },
    ground(){ ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + R*.7, R, R*.4, 0, 0, TAU); ctx.fill(); },
    top(){ ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i=0;i<9;i++){ const aa = i/9*TAU, rr = R*(.85 + .2*Math.abs(Math.sin(i*2.3))); ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr); } ctx.closePath();
      const g = ctx.createLinearGradient(-R, -R, R, R); g.addColorStop(0, '#e0cfa0'); g.addColorStop(1, '#6e5a34'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3a2e18'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }});
}
// boule de feu qui explose en zone et laisse le sol en flammes (Canon Brûlant)
function fireCannonball(f, mv, a){
  let x = f.x + Math.cos(a)*f.r, y = f.y + Math.sin(a)*f.r, d = 0; const spd = 480, R = 55;
  const boom = () => { zoneHit(f, mv, x, y, R); shake(7); screenFlash('#ff8a2a', .15, .15); shockRing(x, y, R*1.4, '#ff8a2a', .35, 10); sparks(x, y, ['#fff3b0','#ffb43a','#ff6a1a'], 22, 260, 6); scorchDecal(x, y, R, 3);
    const fl = Array.from({length:8}, () => ({x:x + rand(-R, R)*.7, y:y + rand(-R, R)*.5, ph:Math.random()*6})); let tick = 0;
    spawnFx({update(dt){ tick -= dt; const e = foeOf(f); if (tick <= 0 && e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < R){ tick = .5; applyStatus(e, {burn:.3}); } return this.t < 2; },
      ground(){ const al = Math.min(1, (2 - this.t)/.4); for (const p of fl) drawFlame(p.x, p.y, 7 + 2*Math.sin(game.t*12 + p.ph), al*.85); }}); };   // Canon Brûlant
  spawnFx({update(dt){ x += Math.cos(a)*spd*dt; y += Math.sin(a)*spd*dt; d += spd*dt; danger(f, x, y, R); const e = foeOf(f);
      if ((e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < 22 + e.r*.6) || d > 300 || x < WALL || x > W - WALL || y < WALL || y > H - WALL){ boom(); return false; }
      return true; },
    top(){ drawGlow(x, y, 40, '#ff8a2a', .6); glowBall(x, y, 15, '#fff6c0', '#ffb43a', '#ff5a1a'); }});
}

Object.assign(SIG, {
  // Lokhlass : cône de givre, le sol gelé ralentit 2 s ; super efficace sur les types Eau
  lyophilisation(f, mv, a){
    const R = 220, half = .5, wind = .25, sx = f.x, sy = f.y; f.act = {n:'Charge', t:0, dur:wind};
    spawnFx({update(){ for (let k=1;k<=3;k++) danger(f, sx + Math.cos(a)*R*k/3.6, sy + Math.sin(a)*R*k/3.6, 30*k); return this.t < wind; },
      ground(){ const k = this.t/wind; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#bff3ff'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, R, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind) return true;
      f.act = {n:'Shoot', t:0, dur:.4}; frostScreen(.4); shake(6);
      const e = foeOf(f); if (inWedge(f, e, a, R, half)) hit(f, e, mv, 1);
      for (let i=0;i<60;i++){ const aa = a + rand(-half, half), v = rand(200, 460); game.parts.push({x:f.x, y:f.y, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.3,.6), max:.6, col:pick(['#ffffff','#dff8ff','#96D9D6']), size:rand(3,7), star:Math.random() < .3}); }
      for (let i=1;i<=4;i++){ const d = R*i/5; frostDecal(f.x + Math.cos(a)*d, f.y + Math.sin(a)*d, 30 + d*.25); }
      const ox = f.x, oy = f.y;
      spawnFx({update(){ const o = foeOf(f); if (o.hp > 0 && !o.buried && Math.hypot(o.x - ox, o.y - oy) < R && angDiff(Math.atan2(o.y - oy, o.x - ox), a) < half && !o.d.types.includes('Ice')){ if (o.slow <= 0 || o.slowF >= .55) o.slowF = .55; o.slow = Math.max(o.slow, .3); } return this.t < 2; }});
      return false; }};
  },
  // Mackogneur : rafale des 4 bras devant soi, puis un énorme poing en zone retardée qui étourdit 1 s
  dynamopoing(f, mv, a){
    const jab = sub(mv, {p:15}); let n = 0;
    f.script = {t:0, fists:[], update(dt){ this.t += dt; f.aimA = a;
      while (n < 4 && this.t >= n*.1){ n++; const lat = (n % 2 ? 1 : -1)*12, x = f.x + Math.cos(a)*(f.r + 26) - Math.sin(a)*lat, y = f.y + Math.sin(a)*(f.r + 26) + Math.cos(a)*lat, e = foeOf(f);
        f.act = {n:'Attack', t:0, dur:.15};
        if (e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < 40 + e.r*.6){ const ok = canHit(f, e, jab); hit(f, e, jab, 1); if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .2); e.dash = null; } }
        spawnFx({update(){ return this.t < .14; }, top(){ drawJab(x, y, a, 1.1, 1 - this.t/.14); }}); shake(2); }
      if (this.t < .45) return true;
      const zx = f.x + Math.cos(a)*90, zy = f.y + Math.sin(a)*90, z = clampArena(zx, zy, 20);
      delayedZone(f, z.x, z.y, 60, .4, '#C22E28', (x, y) => { const e = zoneHit(f, mv, x, y, 60); if (e && e.hp > 0){ e.stun = Math.max(e.stun, 1); e.dash = null; popText(e.x, e.y - 62, 'Étourdi !', '#ffb060', 14); }
        shake(14); zoomPunch(.05); hitstop(.07); crackDecal(x, y, 60); shockRing(x, y, 100, '#ffb060', .4, 12); sparks(x, y, ['#ffffff','#ffb060','#C22E28'], 26, 300, 6);
        spawnFx({update(){ return this.t < .3; }, top(){ drawFrontFist(x, y - 30, 1.4, 1 - this.t/.3, FIST_FIGHT); }}); });
      return false; }};
  },
  // Ectoplasma : Hypnose (zone qui endort 1,5 s) ; relancée sur un ennemi endormi, devient Dévorêve (gros dégâts, soigne)
  devoreve(f, mv, a, tx, ty, o){
    const e = foeOf(f);
    if (e.sleep > 0 && e.hp > 0 && dist(f, e) < 420){
      const eat = sub(mv, {p:110, fx:{drain:.5}}); hit(f, e, eat, 1); dimScreen(.5); screenFlash('#735797', .3, .25);
      spawnFx({update(){ return this.t < .5; }, top(){ const k = this.t/.5; ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#b48ae8'; ctx.lineWidth = 6*(1 - k) + 2; ctx.beginPath(); ctx.moveTo(e.x, e.y - 20);
        ctx.quadraticCurveTo((e.x + f.x)/2, Math.min(e.y, f.y) - 80, f.x, f.y - 20); ctx.stroke(); ctx.globalAlpha = 1; }});
      sparks(e.x, e.y, ['#735797','#c0a8e8','#ffffff'], 20, 200, 5); return;
    }
    const z = clampRange(f, tx, ty);
    delayedZone(f, z.x, z.y, 62, .5, '#a07bd0', (x, y) => { const t = foeIn(f, x, y, 62);
      if (t && canHit(f, t, mv)){ t.sleep = 1.5; t.dash = null; popText(t.x, t.y - 62, 'Endormi !', '#c9c3ef', 14); f.cds[o.slot] = .3; }   // Dévorêve disponible tout de suite
      for (let i=0;i<14;i++){ const aa = Math.random()*TAU; game.parts.push({x:x + Math.cos(aa)*40, y:y + Math.sin(aa)*40, vx:0, vy:-40, life:.6, max:.6, col:pick(['#c9c3ef','#a07bd0']), size:rand(3,6), star:1}); } },
      {ground(k){ const rot = game.t*3;   // bord net de la zone + spirale hypnotique
        ctx.save(); ctx.translate(z.x, z.y); ctx.globalAlpha = .55 + .45*k; ctx.strokeStyle = '#7b3fd6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.stroke();
        ctx.rotate(rot); ctx.setLineDash([10, 8]); ctx.strokeStyle = '#e6d8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 56, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = .35 + .4*k; ctx.strokeStyle = '#d2b8ff'; ctx.lineWidth = 3; ctx.beginPath(); for (let i=0;i<=60;i++){ const aa = i/60*TAU*2.2, rr = i/60*50; ctx.lineTo(Math.cos(aa)*rr, Math.sin(aa)*rr); } ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1; }});
  },
  // Tortank : deux jets parallèles qui repoussent loin ; Tortank recule
  hydroblast(f, mv, a){
    const wind = .25, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux; f.act = {n:'Charge', t:0, dur:wind};
    spawnFx({update(){ for (let d=40; d<520; d+=70) danger(f, f.x + ux*d, f.y + uy*d, 40); return this.t < wind; },
      ground(){ const k = this.t/wind; for (const s of [-1, 1]){ ctx.save(); ctx.translate(f.x + px*s*22, f.y + py*s*22); ctx.rotate(a); ctx.globalAlpha = .15 + .25*k; ctx.fillStyle = '#6390F0'; ctx.fillRect(f.r, -14, 500, 28); ctx.restore(); } ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind) return true;
      f.act = {n:'Shoot', t:0, dur:.4}; shake(8); screenFlash('#9ec0ff', .2, .2); f.kx -= ux*320; f.ky -= uy*320;
      const lanes = [-1, 1].map(s => { const sx = f.x + px*s*22 + ux*f.r*.6, sy = f.y + py*s*22 + uy*f.r*.6; let L = 520; for (let d=0; d<520; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL || x > W-WALL || y < WALL || y > H-WALL){ L = d; break; } } return {sx, sy, L}; });
      const e = foeOf(f), inL = l => { const rx = e.x - l.sx, ry = e.y - l.sy, al = rx*ux + ry*uy; return al > -10 && al < l.L + 10 && Math.abs(-rx*uy + ry*ux) < 16 + e.r*.6; };
      if (e.hp > 0 && !e.buried && lanes.some(inL)){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ e.kx += ux*480; e.ky += uy*480; } }
      spawnFx({update(){ return this.t < .35; }, top(){ const k = this.t/.35; ctx.lineCap = 'round';
        for (const l of lanes){ ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#3d6fe0'; ctx.lineWidth = 16*(1 - k) + 4; ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(l.sx + ux*l.L, l.sy + uy*l.L); ctx.stroke();
          ctx.strokeStyle = '#eaf2ff'; ctx.lineWidth = 6*(1 - k) + 1.5; ctx.stroke(); } ctx.globalAlpha = 1; }});
      return false; }};
  },
  // Xatu : marque une zone (discrète) qui explose 2 s plus tard
  prescience(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty);
    delayedZone(f, z.x, z.y, 70, 2, '#F95587', (x, y) => { zoneHit(f, mv, x, y, 70); shake(12); zoomPunch(.04); screenFlash('#ffd0e4', .3, .2); shockRing(x, y, 120, '#F95587', .45, 14);
      sparks(x, y, ['#ffffff','#ffa0c8','#F95587'], 30, 300, 6); crackDecal(x, y, 60); }, {faint:true, hidden:true});
  },
  // Nostenfer : trois charges très rapides qui se croisent ; empoisonne
  poisoncroix(f, mv, a){
    const m = sub(mv, {fx:{poison:.4}}); let n = 0;
    const go = () => { const base = n === 0 ? a : liveAimAngle(f), aa = base + [.4, -.8, .4][n]; n++;
      f.dash = {vx:Math.cos(aa)*1000, vy:Math.sin(aa)*1000, t:.14, mv:m, pierce:1, trail:'#A33EA1', onHit(e){ hit(f, e, m, 1); sparks(e.x, e.y, ['#A33EA1','#e0a0e0'], 10, 180, 4); },
        onEnd(){ if (n < 3) go(); }}; };
    go();
  },
  // Démolosse : cône de flammes noires, brûle et baisse l'Attaque
  hurlementinfernal(f, mv, a){
    const R = 200, half = .55, wind = .2, m = sub(mv, {fx:{burn:.5, atkDown:1}}); f.act = {n:'Charge', t:0, dur:wind}; dimScreen(.4);
    spawnFx({update(){ for (let k=1;k<=3;k++) danger(f, f.x + Math.cos(a)*R*k/3.6, f.y + Math.sin(a)*R*k/3.6, 30*k); return this.t < wind; },
      ground(){ const k = this.t/wind; ctx.globalAlpha = .15 + .25*k; ctx.fillStyle = '#2a1626'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }});
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind) return true;
      f.act = {n:'Shoot', t:0, dur:.45}; shake(10); screenFlash('#3a0a20', .3, .25);
      const e = foeOf(f); if (inWedge(f, e, a, R, half)) hit(f, e, m, 1);
      for (let i=0;i<90;i++){ const aa = a + rand(-half, half)*.95, v = rand(220, 520); game.parts.push({x:f.x + Math.cos(aa)*18, y:f.y + Math.sin(aa)*18, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.3,.6), max:.6, col:pick(['#140a18','#3a1a2a','#5a2a6a','#ff6a1a','#ffb43a']), size:rand(6,13), drag:.965}); }
      return false; }};
  },
  // Absol : recule en visant l'ennemi, puis disparaît et frappe plusieurs fois dans un long couloir ; réapparaît au bout
  coupefatale(f, mv, a){
    const back = .25, L = 300, half = 22, slash = sub(mv, {p:35}); let ax = a, sx, sy, hits = 0;
    f.act = {n:'Charge', t:0, dur:back};
    f.script = {t:0, update(dt){ this.t += dt;
      if (this.t < back){ ax = liveAimAngle(f); f.aimA = ax; const c = clampArena(f.x - Math.cos(ax)*240*dt, f.y - Math.sin(ax)*240*dt, f.r); f.x = c.x; f.y = c.y;
        for (let d=40; d<L; d+=60) danger(f, f.x + Math.cos(ax)*d, f.y + Math.sin(ax)*d, 30); return true; }
      if (sx === undefined){ sx = f.x; sy = f.y; f.vanish = 1; f.inv = Math.max(f.inv, .35); screenFlash('#2a0820', .25, .15); }
      const k = Math.min(1, (this.t - back)/.25), ux = Math.cos(ax), uy = Math.sin(ax), d = L*k, c = clampArena(sx + ux*d, sy + uy*d, f.r); f.x = c.x; f.y = c.y;
      while (hits < 3 && k >= (hits + 1)/3){ hits++; const e = foeOf(f), rx = e.x - sx, ry = e.y - sy, al = rx*ux + ry*uy;
        if (e.hp > 0 && !e.buried && al > -10 && al < L + 10 && Math.abs(-rx*uy + ry*ux) < half + e.r*.6){ hit(f, e, slash, 1); xSlashMini(e.x, e.y, ax + hits); } }
      if (k >= 1){ f.vanish = 0; f.act = {n:'Attack', t:0, dur:.3}; sparks(f.x, f.y, ['#2a1626','#c04a6a','#ffffff'], 14, 200, 4); return false; }
      return true; }};
    spawnFx({update(){ return this.t < back + .55; }, ground(){ if (this.t < back || sx === undefined) return; const al = Math.max(0, 1 - (this.t - back - .25)/.3);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ax); ctx.globalAlpha = .45*al; ctx.fillStyle = '#2a1626'; ctx.fillRect(0, -half, L, half*2); ctx.restore(); ctx.globalAlpha = 1; }});
  },
  // Noctunoir : une main géante sort du sol, saisit l'ennemi (immobilisé) puis l'écrase
  poingombre(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty);
    delayedZone(f, z.x, z.y, 55, .45, '#3a2458', (x, y) => { const e = foeIn(f, x, y, 55);
      if (e && canHit(f, e, mv)){ e.stun = Math.max(e.stun, .6); e.dash = null; popText(e.x, e.y - 62, 'Saisi !', '#b08ae8', 14);
        spawnFx({update(){ e.x += (x - e.x)*.2; e.y += (y - e.y)*.2; if (this.t >= .55){ hit(f, e, mv, 1); shake(14); zoomPunch(.05); hitstop(.07); crackDecal(x, y, 55); shockRing(x, y, 90, '#735797', .4, 12); return false; } return true; },
          top(){ drawFrontFist(x, y - 30 - Math.sin(Math.min(1, this.t/.2)*Math.PI/2)*20, 1.3, 1, FIST_GHOST); }});
      } else spawnFx({update(){ return this.t < .3; }, top(){ drawFrontFist(x, y - 30, 1.2, 1 - this.t/.3, FIST_GHOST); }}); });
  },
  // Kaimorse : énorme zone qui se fige pendant 1,5 s puis gèle tout (immobilise 1 s)
  glaciation(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty);
    delayedZone(f, z.x, z.y, 130, 1.5, '#bff3ff', (x, y) => { const e = zoneHit(f, mv, x, y, 130); if (e && e.hp > 0){ e.root = Math.max(e.root, 1); popText(e.x, e.y - 62, 'Gelé !', '#bff3ff', 15); }
      shake(16); zoomPunch(.05); frostScreen(.8); screenFlash('#e8fbff', .4, .3); frostDecal(x, y, 140); shockRing(x, y, 170, '#bff3ff', .5, 16); sparks(x, y, ['#ffffff','#dff8ff','#96D9D6'], 50, 360, 7); },
      {ground(k){ ctx.globalAlpha = .5*k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; for (let i=0;i<10;i++){ const aa = i/10*TAU; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(aa)*130*k, z.y + Math.sin(aa)*130*k); ctx.stroke(); } ctx.globalAlpha = 1; }});
  },
  // Drattak : s'envole (hors d'atteinte), puis pique en ligne droite dans des flammes bleues
  piquedraconique(f, mv, a){
    const up = .4, H = 140; let ax = a;
    f.act = {n:'Charge', t:0, dur:up};
    f.script = {t:0, update(dt){ this.t += dt; ax = liveAimAngle(f); f.aimA = ax; const k = Math.min(1, this.t/up); f.h = H*Math.sin(k*Math.PI/2); f.inv = Math.max(f.inv, .05);
      for (let d=40; d<340; d+=60) danger(f, f.x + Math.cos(ax)*d, f.y + Math.sin(ax)*d, 34);
      if (k < 1) return true;
      f.act = {n:'Attack', t:0, dur:.35};
      f.dash = {vx:Math.cos(ax)*1100, vy:Math.sin(ax)*1100, t:.3, mv, pierce:1, trail:'#6aa8ff',
        fx(){ f.h = Math.max(0, f.h - 1100*.016); for (let i=0;i<2;i++) game.parts.push({x:f.x + rand(-10,10), y:f.y - f.h + rand(-10,10), vx:-Math.cos(ax)*120, vy:-Math.sin(ax)*120 - 40, life:.3, max:.3, col:pick(['#9ad0ff','#4a7dff','#ffffff']), size:rand(4,8)}); },
        onHit(e){ hit(f, e, mv, 1); shake(10); sparks(e.x, e.y, ['#9ad0ff','#4a7dff','#ffffff'], 18, 240, 5); }, onEnd(){ f.h = 0; shake(6); crackDecal(f.x, f.y, 40); }};
      return false; }};
  },
  // Drascore : charge ; s'il touche, saisit l'ennemi entre ses pinces (immobilisé), le frappe 3 fois et l'empoisonne
  pincesvenimeuses(f, mv, a){
    const pinch = sub(mv, {fx:{poison:.5}});
    f.dash = {vx:Math.cos(a)*760, vy:Math.sin(a)*760, t:.32, mv, trail:'#A33EA1',
      onHit(e){ if (!canHit(f, e, mv)) return; let n = 0; popText(e.x, e.y - 62, 'Saisi !', '#c86ad0', 14);
        f.script = {t:0, update(dt){ this.t += dt; e.stun = Math.max(e.stun, .15); e.dash = null; const hx = f.x + Math.cos(a)*(f.r + e.r), hy = f.y + Math.sin(a)*(f.r + e.r); e.x += (hx - e.x)*.3; e.y += (hy - e.y)*.3;
          while (n < 3 && this.t >= .1 + n*.22){ n++; f.act = {n:'Attack', t:0, dur:.18}; hit(f, e, pinch, 1); jawFx(e.x, e.y, a + Math.PI/2, 'dark'); shake(4); }
          return n < 3 || this.t < .8; }}; }};
  },
  // Rhinastoc : lance 3 rochers de plus en plus gros qui roulent et rebondissent ; doit récupérer ensuite
  rocboulet(f, mv, a){
    let n = 0; const sizes = [16, 21, 27], pows = [45, 55, 70];
    f.script = {t:0, update(dt){ this.t += dt; const aa = n ? liveAimAngle(f) : a; f.aimA = aa;
      while (n < 3 && this.t >= n*.3){ f.act = {n:'Shoot', t:0, dur:.25}; rollingBoulder(f, mv, aa, sizes[n], pows[n]); shake(3 + n*2); n++; }
      if (this.t >= .75){ f.recharge = .8; return false; } return true; }};
  },
  // Maganon : 3 boules de feu en éventail qui explosent en zone et laissent le sol en flammes
  canonbrulant(f, mv, a){ f.act = {n:'Shoot', t:0, dur:.4}; shake(5); for (const da of [-.3, 0, .3]) fireCannonball(f, mv, a + da); },
  // Gallame : coupe en croix devant soi, puis une lame d'énergie projetée
  lamepsychique(f, mv, a){
    const cut = sub(mv, {p:80}), blade = sub(mv, {p:65, k:'proj', spd:520, r:16, life:.9, look:'psyblade'});
    const x = f.x + Math.cos(a)*(f.r + 40), y = f.y + Math.sin(a)*(f.r + 40);
    f.act = {n:'Attack', t:0, dur:.4}; zoneHit(f, cut, x, y, 55); xSlashMini(x, y, a, '#F95587'); shake(6);
    spawnFx({update(){ if (this.t >= .2){ spawnProj(f, blade, liveAimAngle(f), 1); return false; } return true; }});
  },
  // Coupe Psyko : charge qui traverse l'ennemi et l'immobilise très brièvement
  coupepsyko(f, mv, a){
    f.dash = {vx:Math.cos(a)*900, vy:Math.sin(a)*900, t:.28, mv, pierce:1, trail:'#F95587',
      onHit(e){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .2); e.dash = null; } xSlashMini(e.x, e.y, a, '#F95587'); }};
  },
  // Bombe Beurk : boule de poison lancée sur une zone ; dégâts, mare qui ralentit, chance d'empoisonner
  bombebeurk(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), sx = f.x, sy = f.y, R = 60, fly = .45;
    spawnFx({update(){ danger(f, z.x, z.y, R); if (this.t >= fly){ zoneHit(f, mv, z.x, z.y, R); shake(5); sparks(z.x, z.y, ['#A33EA1','#d58ad5','#5a2a5a'], 18, 220, 5);
        spawnFx({update(){ const e = foeOf(f); if (e.hp > 0 && !e.buried && Math.hypot(e.x - z.x, e.y - z.y) < R){ if (e.slow <= 0 || e.slowF >= .6) e.slowF = .6; e.slow = Math.max(e.slow, .3); } return this.t < 2.5; },
          ground(){ const al = Math.min(1, (2.5 - this.t)/.5); ctx.globalAlpha = .35*al; ctx.fillStyle = '#6a2a6a'; ctx.beginPath(); ctx.ellipse(z.x, z.y, R, R*.75, 0, 0, TAU); ctx.fill();
            ctx.globalAlpha = .6*al; ctx.fillStyle = '#d58ad5'; for (let i=0;i<4;i++){ const bx = z.x + Math.sin(game.t*2 + i*1.7)*R*.5, by = z.y + Math.cos(game.t*1.6 + i)*R*.35; ctx.beginPath(); ctx.arc(bx, by, 3 + 2*Math.sin(game.t*5 + i), 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }});
        return false; } return true; },
      top(){ const k = this.t/fly, x = sx + (z.x - sx)*k, y = sy + (z.y - sy)*k - Math.sin(Math.PI*k)*90; drawGlow(x, y, 30, '#A33EA1', .5); glowBall(x, y, 13, '#f0c0f0', '#c86ad0', '#6a2a6a'); }});
  },
});
// petite entaille en X (Coupe Fatale, Lame Psychique, Coupe Psyko)
function xSlashMini(x, y, a, col = '#c04a6a'){
  spawnFx({update(){ return this.t < .25; }, top(){ const k = Math.min(1, this.t/.08), fade = 1 - this.t/.25; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineCap = 'round'; ctx.globalAlpha = fade;
    for (const s of [-1, 1]){ ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-26, s*26); ctx.lineTo(-26 + 52*k, s*26 - s*52*k); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1; }});
}
const FIST_FIGHT = {fill:'#ffb060', stroke:'#a8400a', glow:'#ff7a1a', line:'#c8641a'};
const FIST_GHOST = {fill:'#2a1838', stroke:'#b08ae8', glow:'#735797', line:'#5a3a7a'};

// =====================================================================
// LIGUE — LOT 2 : les autres membres des Conseils
// =====================================================================
// rayon en plusieurs coups qui repousse, couleur au choix (Détricanon, Lance-Soleil)
function colorBeam(f, mv, a, o){
  const wind = o.wind, dur = .6, ux = Math.cos(a), uy = Math.sin(a), hw = o.hw || 26; let ticks = 0;
  f.act = {n:'Charge', t:0, dur:wind};
  f.script = {t:0, update(dt){ this.t += dt; f.aimA = a;
    if (this.t < wind){ for (let d=40; d<520; d+=70) danger(f, f.x + ux*d, f.y + uy*d, hw + 4); return true; }
    if (!this.started){ this.started = true; f.act = {n:'Shoot', t:0, dur}; screenFlash(o.c1, .15, .2); }
    const sx = f.x + ux*f.r*.6, sy = f.y + uy*f.r*.6; let L = 520; for (let d=0; d<520; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL || x > W-WALL || y < WALL || y > H-WALL){ L = d; break; } }
    this.sx = sx; this.sy = sy; this.L = L;
    while (ticks < 4 && this.t - wind >= ticks*.15){ ticks++; const e = foeOf(f), rx = e.x - sx, ry = e.y - sy, al = rx*ux + ry*uy;
      if (e.hp > 0 && !e.buried && al > -10 && al < L + 10 && Math.abs(-rx*uy + ry*ux) < hw + e.r*.6){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ e.kx += ux*(o.push || 240); e.ky += uy*(o.push || 240); } }
      shake(4); }
    for (let i=0;i<3;i++){ const d = rand(0, L), l = rand(-hw, hw); game.parts.push({x:sx + ux*d - uy*l, y:sy + uy*d + ux*l, vx:ux*180, vy:uy*180 - 40, life:.3, max:.3, col:pick(o.parts), size:rand(3,6)}); }
    return this.t < wind + dur; }};
  spawnFx({update(){ return this.t < wind + dur + .1 && f.hp > 0; },
    ground(){ if (this.t < wind){ ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a); ctx.globalAlpha = .15 + .25*this.t/wind; ctx.fillStyle = o.c0; ctx.fillRect(f.r, -hw, 520, hw*2); ctx.restore(); ctx.globalAlpha = 1; } },
    top(){ const sc = f.script; if (this.t < wind || !sc || sc.L == null) return; const fade = Math.min(1, (wind + dur + .1 - this.t)/.15);
      ctx.save(); ctx.translate(sc.sx, sc.sy); ctx.rotate(a); ctx.globalAlpha = fade; ctx.lineCap = 'round';
      ctx.strokeStyle = o.c0; ctx.lineWidth = hw*2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sc.L, 0); ctx.stroke();
      ctx.strokeStyle = o.c1; ctx.lineWidth = hw*.9; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }});
}
// zone de flammes au sol qui brûle (traînées de Pied Brûleur, Vitesse Extrême enflammée)
function flameTrail(f, pts, life = 2){
  const fl = pts.map(p => ({...p, ph:Math.random()*6})); let tick = 0;
  for (const p of pts) scorchDecal(p.x, p.y, 22, life + .5);
  spawnFx({update(dt){ tick -= dt; const e = foeOf(f); if (tick <= 0 && e.hp > 0 && !e.buried && fl.some(p => Math.hypot(e.x - p.x, e.y - p.y) < 24 + e.r*.5)){ tick = .5; applyStatus(e, {burn:.3}); } return this.t < life; },
    ground(){ const al = Math.min(1, (life - this.t)/.4); for (const p of fl) drawFlame(p.x, p.y, 6 + 2*Math.sin(game.t*12 + p.ph), al*.85); }});
}
// tornade (Vent Arrière) : se dirige vers le point visé en direct
function steeredTornado(f, mv, o){
  let x = f.x, y = f.y, n = 0, tick = 0;
  spawnFx({update(dt){ const z = liveAimPoint(f, o.slot, o.manual), dx = z.x - x, dy = z.y - y, m = Math.hypot(dx, dy) || 1, st = Math.min(m, 340*dt); x += dx/m*st; y += dy/m*st;
      danger(f, x, y, 46); tick -= dt; const e = foeOf(f);
      if (tick <= 0 && n < 3 && e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < 40 + e.r*.6){ tick = .3; n++; const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ e.kx += (x - e.x)*3; e.ky += (y - e.y)*3; } }
      if (Math.random() < .7) game.parts.push({x:x + rand(-20,20), y:y + rand(-6,6), vx:rand(-40,40), vy:-40 - Math.random()*60, life:.3, max:.3, col:pick(['#ffffff','#e8e2ff','#cbbcff']), size:rand(2,4)});
      return this.t < 1.1; },
    ground(){ ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 32, 11, 0, 0, TAU); ctx.fill(); },
    top(){ const al = Math.min(1, (1.1 - this.t)/.25);
      for (let i=0;i<7;i++){ const k = i/6, w = 32 - 15*k, yy = y - k*60, ph = game.t*16 + i*.8; ctx.globalAlpha = al*(.8 - k*.35);
        ctx.strokeStyle = i%2 ? '#ffffff' : '#cbbcff'; ctx.lineWidth = 5 - k*2.5; ctx.beginPath(); ctx.ellipse(x + Math.sin(ph*.4)*5, yy, w, w*.35, 0, ph % TAU, ph % TAU + 4.4); ctx.stroke(); }
      ctx.globalAlpha = 1; }});
}
// œuf qui tombe sur un point et explose (Bomb'Œuf)
function eggBomb(f, mv, x, y, delay){
  const sx = f.x, sy = f.y, R = 46;
  spawnFx({update(){ if (this.done) return false; danger(f, x, y, R); if (this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, R); shake(6); shockRing(x, y, R*1.4, '#ffe08a', .3, 8); sparks(x, y, ['#ffffff','#ffe08a','#7AC74C'], 16, 240, 5); scorchDecal(x, y, R*.8, 2); } return true; },
    ground(){ const k = Math.min(1, this.t/delay); ctx.globalAlpha = .12 + .3*k; ctx.fillStyle = '#7AC74C'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), ex = sx + (x - sx)*k, ey = sy + (y - sy)*k - Math.sin(Math.PI*k)*110; ctx.save(); ctx.translate(ex, ey); ctx.rotate(this.t*8);
      ctx.fillStyle = '#fff6e0'; ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8b040'; for (const [dx, dy] of [[-3,-4],[3,2],[-2,5]]){ ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, TAU); ctx.fill(); } ctx.restore(); }});
}

Object.assign(SIG, {
  // Crustabri : 5 stalactites en ligne, de plus en plus rapides, qui suivent la visée
  stalactite(f, mv, a){
    let n = 0; f.act = {n:'Shoot', t:0, dur:.6};
    spawnFx({update(){ while (n < 5 && this.t >= n*.12){ const aa = n ? liveAimAngle(f) : a; spawnProj(f, sub(mv, {k:'proj', spd:420 + n*70, r:10, life:1.2, look:'Ice'}), aa, 1); n++; } return n < 5 && f.hp > 0; }});
  },
  // Exuviation : Attaque, Atq. Spé. et Vitesse en hausse, défenses en baisse
  exuviation(f, mv){ f.buff = {atk:1.5, spa:1.5, spe:1.3, spd:1}; f.buffT = 8; f.defDown = f.spdDown = 8; popText(f.x, f.y - 62, 'Coquille brisée !', '#e6b84c', 14);
    sparks(f.x, f.y, ['#ffffff','#9ec0ff','#e6b84c'], 18, 200, 5); shockRing(f.x, f.y, 70, '#e6b84c', .35, 8); },
  // Lippoutou : baiser à courte portée qui endort 1,5 s
  grobisou(f, mv, a){
    const x = f.x + Math.cos(a)*(f.r + 30), y = f.y + Math.sin(a)*(f.r + 30); f.act = {n:'Attack', t:0, dur:.3}; kissFx(x, y);
    const e = foeOf(f); if (inWedge(f, e, a, f.r + 70, .7) && canHit(f, e, mv)){ e.sleep = 1.5; e.dash = null; popText(e.x, e.y - 62, 'Endormi !', '#c9c3ef', 14); }
  },
  // Lamantine : glisse en ligne droite et laisse une traînée glacée qui ralentit et fait des dégâts
  rueeglaciale(f, mv, a){
    const pts = [], trail = sub(mv, {p:15}); let tick = 0;
    f.dash = {vx:Math.cos(a)*800, vy:Math.sin(a)*800, t:.35, mv, pierce:1, trail:'#bff3ff', fx(){ if (!pts.length || Math.hypot(f.x - pts.at(-1).x, f.y - pts.at(-1).y) > 22){ pts.push({x:f.x, y:f.y}); frostDecal(f.x, f.y, 26); } }, onHit(e){ hit(f, e, mv, 1); }};
    spawnFx({update(dt){ tick -= dt; const e = foeOf(f); if (tick <= 0 && e.hp > 0 && !e.buried && pts.some(p => Math.hypot(e.x - p.x, e.y - p.y) < 24 + e.r*.5)){ tick = .5; hit(f, e, trail, 1); if (e.slow <= 0 || e.slowF >= .5) e.slowF = .5; e.slow = Math.max(e.slow, .6); } return this.t < 2.5; },
      ground(){ const al = Math.min(1, (2.5 - this.t)/.5); ctx.globalAlpha = .35*al; ctx.strokeStyle = '#dff8ff'; ctx.lineWidth = 34; ctx.lineCap = 'round'; if (pts.length > 1){ ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts) ctx.lineTo(p.x, p.y); ctx.stroke(); } ctx.globalAlpha = 1; }});
  },
  // Tygnon : courte charge ; au contact, combo de 3 poings (feu : brûle, glace : ralentit, éclair : étourdit)
  poingselementaires(f, mv, a){
    const combo = [sub(mv, {t:'Fire', fx:{burn:.5}}), sub(mv, {t:'Ice', fx:{slow:1}}), sub(mv, {t:'Electric', fx:{stun:1}})];
    f.dash = {vx:Math.cos(a)*800, vy:Math.sin(a)*800, t:.24, mv, trail:'#ffb060', onHit(e){ if (!canHit(f, e, mv)) return; let n = 0;
      f.script = {t:0, update(dt){ this.t += dt; e.stun = Math.max(e.stun, .12); e.dash = null;
        while (n < 3 && this.t >= n*.16){ const m = combo[n]; f.act = {n:'Attack', t:0, dur:.15}; hit(f, e, m, 1); punchFx(e.x - Math.cos(a)*e.r*.5, e.y - Math.sin(a)*e.r*.5, a, n === 0 ? 'fire' : 'ice');
          if (n === 2){ drawBoltBurst(e.x, e.y); electrify(.3); e.stun = Math.max(e.stun, .5); } n++; }
        return n < 3 || this.t < .55; }}; }};
  },
  // Kicklee : grand bond qui frappe très fort ; s'il rate, Kicklee s'écrase et perd des PV
  piedvoltige(f, mv, a, tx, ty){
    const z0 = clampTo(f, tx, ty, mv.range), z = clampArena(z0.x, z0.y, f.r), sx = f.x, sy = f.y, dur = .42, R = 66;
    f.act = {n:'Attack', t:0, dur};
    f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur);
      f.x = sx + (z.x - sx)*k; f.y = sy + (z.y - sy)*k; f.h = Math.sin(Math.PI*k)*90; danger(f, z.x, z.y, R);   // atterrit pile sur la zone visée
      if (k >= 1){ f.h = 0; const e = zoneHit(f, mv, z.x, z.y, R);
        if (e){ shake(12); hitstop(.07); shockRing(z.x, z.y, 80, '#C22E28', .35, 10); e.kx += Math.cos(a)*420; e.ky += Math.sin(a)*420; }
        else { const d = Math.round(f.max*.08); damage(f, d); popText(f.x, f.y - 40, 'Raté ! -' + d, '#ef5050', 15); shake(8); crackDecal(f.x, f.y, 40); f.stun = Math.max(f.stun, .2); }
        return false; }
      return true; }};
    spawnFx({update(){ return this.t < dur; }, ground(){ const k = this.t/dur; ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#C22E28'; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }});
  },
  // Pied Brûleur : charge pied en avant, brûle, laisse une traînée de flammes
  piedbruleur(f, mv, a){
    const pts = [];
    f.dash = {vx:Math.cos(a)*760, vy:Math.sin(a)*760, t:.3, mv, trail:'#ff8a2a', fx(){ if (!pts.length || Math.hypot(f.x - pts.at(-1).x, f.y - pts.at(-1).y) > 26) pts.push({x:f.x, y:f.y}); },
      onHit(e){ hit(f, e, mv, 1); punchFx(e.x, e.y, a, 'fire'); flameTrail(f, pts); }, onEnd(){ flameTrail(f, pts); }};
  },
  // Grolem : roule en boule, rebondit sur les murs et accélère à chaque rebond
  roulade(f, mv, a){
    let vx = Math.cos(a)*320, vy = Math.sin(a)*320, cool = 0, bounces = 0;
    f.act = {n:'Charge', t:0, dur:2};
    f.script = {t:0, update(dt){ this.t += dt; cool -= dt; f.x += vx*dt; f.y += vy*dt;
      if (f.x < WALL + f.r || f.x > W - WALL - f.r){ vx = -vx*1.12; vy *= 1.12; bounces++; shake(4); sparks(f.x, f.y, ['#c9b98f','#8a6a3a'], 8, 160, 4); }
      if (f.y < WALL + f.r || f.y > H - WALL - f.r){ vy = -vy*1.12; vx *= 1.12; bounces++; shake(4); sparks(f.x, f.y, ['#c9b98f','#8a6a3a'], 8, 160, 4); }
      const c = clampArena(f.x, f.y, f.r); f.x = c.x; f.y = c.y; f.aimA = Math.atan2(vy, vx); danger(f, f.x + vx*.15, f.y + vy*.15, 40);
      const e = foeOf(f);
      if (cool <= 0 && e.hp > 0 && !e.buried && dist(f, e) < f.r + e.r + 4){ cool = .4; const sp = Math.hypot(vx, vy), m = sub(mv, {p:Math.round(mv.p*(.7 + sp/600))}), ok = canHit(f, e, m); hit(f, e, m, 1); if (ok){ e.kx += vx*.8; e.ky += vy*.8; } vx = -vx*.6; vy = -vy*.6; }
      if (Math.random() < .6) game.parts.push({x:f.x + rand(-10,10), y:f.y + f.r*.6, vx:-vx*.2, vy:-rand(20,50), life:.3, max:.3, col:pick(['#c9b98f','#8a6a3a']), size:rand(2,4)});
      return this.t < 1.8 && bounces < 5; }};
  },
  // Arbok : s'enroule autour de l'ennemi : immobilisé et dégâts sur la durée
  ligotage(f, mv, a){
    const tickMv = sub(mv, {p:Math.round(mv.p/4)});
    f.dash = {vx:Math.cos(a)*720, vy:Math.sin(a)*720, t:.22, mv, trail:'#A33EA1', onHit(e){ if (!canHit(f, e, mv)) return; let n = 0; popText(e.x, e.y - 62, 'Ligoté !', '#c86ad0', 14);
      const ex = e.x, ey = e.y;   // la cible reste où elle a été attrapée (sinon Arbok la poussait jusqu'au mur)
      f.script = {t:0, update(dt){ this.t += dt; e.stun = Math.max(e.stun, .15); e.dash = null; e.x = ex; e.y = ey; e.kx = e.ky = 0; f.vx = f.vy = f.kx = f.ky = 0;
        while (n < 4 && this.t >= .15 + n*.3){ n++; hit(f, e, tickMv, 1); shake(3); }
        return this.t < 1.3; }};
      spawnFx({update(){ return f.script && this.t < 1.3; }, top(){ ctx.save(); ctx.strokeStyle = '#A33EA1'; ctx.lineWidth = 6; ctx.globalAlpha = .85;
        for (let i=0;i<3;i++){ const yy = e.y - 8 - i*12; ctx.beginPath(); ctx.ellipse(e.x, yy, e.r + 4, 6, 0, game.t*4 + i, game.t*4 + i + 4.5); ctx.stroke(); }
        ctx.strokeStyle = '#e8c870'; ctx.lineWidth = 2; for (let i=0;i<3;i++){ const yy = e.y - 8 - i*12; ctx.beginPath(); ctx.ellipse(e.x, yy, e.r + 4, 6, 0, game.t*4 + i, game.t*4 + i + 4.5); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; }}); }};
  },
  // Détricanon : comme Hydrocanon, en type Poison
  detricanon(f, mv, a){ colorBeam(f, mv, a, {wind:.3, c0:'rgba(163,62,161,.7)', c1:'#e0a0e0', parts:['#A33EA1','#e0a0e0','#5a2a5a']}); },
  // Regard Médusant : cône qui ralentit fortement
  regardmedusant(f, mv, a){
    const R = 190, half = .5; f.act = {n:'Charge', t:0, dur:.3};
    const e = foeOf(f); if (inWedge(f, e, a, R, half) && canHit(f, e, mv)){ e.slow = 2.5; e.slowF = .4; popText(e.x, e.y - 62, 'Paralysé de peur !', '#e8c870', 13); }
    spawnFx({update(){ return this.t < .35; }, ground(){ const k = this.t/.35; ctx.globalAlpha = .35*(1 - k); ctx.fillStyle = '#e8c870'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }});
  },
  // Ptéra : saisit l'ennemi, l'emporte dans les airs puis le lâche ; il est ralenti après la chute
  chutelibre(f, mv, a){
    f.dash = {vx:Math.cos(a)*820, vy:Math.sin(a)*820, t:.28, mv, trail:'#B6A136', onHit(e){ if (!canHit(f, e, mv)) return; const FH = 120, T = .8;
      e.dash = null; e.script = null; e.roll = null; popText(e.x, e.y - 62, 'Emporté !', '#d8c890', 14);
      e.air = {t:0, dur:T, h:k => Math.sin(Math.min(1, k*1.6)*Math.PI/2)*FH*(k < .85 ? 1 : (1 - k)/.15), onLand(){ hit(f, e, mv, 1); shake(12); crackDecal(e.x, e.y, 50); if (e.hp > 0){ e.slow = 1.5; e.slowF = .5; } }};
      f.script = {t:0, update(dt){ this.t += dt; const im = Math.hypot(f.inX || 0, f.inY || 0);   // on dirige le vol avec le déplacement
        if (im > .2 && this.t < T*.85){ const s = 300*dt/Math.max(1, im); e.x = Math.max(WALL + e.r, Math.min(W - WALL - e.r, e.x + f.inX*s)); e.y = Math.max(WALL + e.r, Math.min(H - WALL - e.r, e.y + f.inY*s)); }
        f.x = e.x; f.y = e.y - 4; f.h = e.h + 20; f.inv = Math.max(f.inv, .05); if (this.t >= T*.85){ f.h = 0; return false; } return true; }}; }};
  },
  // Roucarnage : ouragan qui suit la visée en direct pendant 1 s
  ventarriere(f, mv, a, tx, ty, o){ f.act = {n:'Shoot', t:0, dur:.5}; steeredTornado(f, mv, o); },
  // Rhinoféros : charge cornue qui repousse loin, brise les rochers et empale (projette en l'air)
  megacorne(f, mv, a){
    f.dash = {vx:Math.cos(a)*780, vy:Math.sin(a)*780, t:.32, mv, trail:'#A6B91A', onHit(e){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok && e.hp > 0){ launch(e, .5, 60); e.kx += Math.cos(a)*420; e.ky += Math.sin(a)*420; popText(e.x, e.y - 62, 'Empalé !', '#c8e050', 14); } shake(9); }};
  },
  // Arcanin : Vitesse Extrême enflammée (3 fois) qui laisse une traînée brûlante
  vitessefeu(f, mv, a, tx, ty, o){
    const sx = f.x, sy = f.y; SIG.vitesseextreme(f, mv, a, tx, ty, o);
    const pts = []; for (let k=0;k<=1;k+=.12) pts.push({x:sx + (f.x - sx)*k, y:sy + (f.y - sy)*k}); flameTrail(f, pts, .6);
  },
  // Noadkoko : 3 œufs qui explosent l'un après l'autre en zone
  bombeoeuf(f, mv, a, tx, ty){ const z = clampRange(f, tx, ty); f.act = {n:'Shoot', t:0, dur:.4}; tripleSpots(z, a).forEach((c, i) => eggBomb(f, mv, c.x, c.y, .45 + i*.15)); },
  // Giga-Sangsue : cône devant soi qui vole des PV
  gigasangsue(f, mv, a){
    const R = 160, half = .5; f.act = {n:'Shoot', t:0, dur:.35};
    const e = foeOf(f); if (inWedge(f, e, a, R, half)){ hit(f, e, mv, 1); for (let i=0;i<10;i++) game.parts.push({x:e.x, y:e.y, vx:(f.x - e.x)*2 + rand(-40,40), vy:(f.y - e.y)*2 + rand(-40,40), life:.5, max:.5, col:pick(['#7AC74C','#c8f0a0']), size:rand(3,5)}); }
    spawnFx({update(){ return this.t < .3; }, ground(){ ctx.globalAlpha = .3*(1 - this.t/.3); ctx.fillStyle = '#7AC74C'; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, R, a - half, a + half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }});
  },
  // Lance-Soleil : comme Hydrocanon, en type Plante, avec une préparation plus longue
  lancesoleil(f, mv, a){ colorBeam(f, mv, a, {wind:.55, hw:30, c0:'rgba(255,230,120,.7)', c1:'#fff6c0', parts:['#fff6c0','#ffe08a','#7AC74C'], push:180}); },
  // Flagadoss : s'immobilise pour récupérer beaucoup de PV ; renvoie les projectiles pendant ce temps
  flemme(f, mv){
    const T = 1.2, heal = f.max*.35; f.act = {n:'Charge', t:0, dur:T}; f.mirror = T; popText(f.x, f.y - 62, 'Flemme…', '#4fd17a', 14);
    f.script = {t:0, update(dt){ this.t += dt; f.hp = Math.min(f.max, f.hp + heal*dt/T); if (Math.random() < .4) burst(f.x + rand(-16,16), f.y + rand(-16,16), '#4fd17a', 1, 30, 3); return this.t < T; }};
  },
});

// =====================================================================
// LIGUE — LOT 3 : membres restants des Conseils
// =====================================================================
BEAMS.dragon = {tele:'#c0a8ff', glow:'#6F35FC', core:'#ffffff', ball:['#ffffff','#c0a8ff','#6F35FC'], flash:'#e0d8ff', sp:['#ffffff','#c0a8ff','#6F35FC']};
BEAMS.gem = {tele:'#ffe0f0', glow:'#e070b0', core:'#ffffff', ball:['#ffffff','#ffd0ea','#e070b0'], flash:'#fff0f8', sp:['#ffffff','#ffd0ea','#b6e8ff']};
// pièges au sol (Picots, Pics Toxik) : touchent l'ennemi qui marche dessus
function groundTraps(f, mv, z, poison){
  const traps = [0,1,2].map(j => { const c = clampArena(z.x + Math.cos(j*TAU/3 + .5)*42, z.y + Math.sin(j*TAU/3 + .5)*42, 10); return {x:c.x, y:c.y, on:true}; }), m = poison ? sub(mv, {fx:{poison:1}}) : mv;
  spawnFx({update(){ const e = foeOf(f);
      for (const t of traps) if (t.on && e.hp > 0 && !e.buried && !e.air && Math.hypot(e.x - t.x, e.y - t.y) < 18 + e.r*.5){ t.on = false; hit(f, e, m, 1); sparks(t.x, t.y, poison ? ['#A33EA1','#e0a0e0'] : ['#B7B7CE','#ffffff'], 10, 160, 4); }
      return this.t < 9 && traps.some(t => t.on); },
    ground(){ for (const t of traps) if (t.on){ ctx.fillStyle = poison ? '#A33EA1' : '#9a9ab4'; ctx.strokeStyle = poison ? '#e0a0e0' : '#ffffff'; ctx.lineWidth = 1.2;
      for (let i=0;i<3;i++){ const a = i*TAU/3 + .3; ctx.beginPath(); ctx.moveTo(t.x + Math.cos(a)*9, t.y + Math.sin(a)*5); ctx.lineTo(t.x + Math.cos(a + 1)*4, t.y + Math.sin(a + 1)*2 - 9); ctx.lineTo(t.x + Math.cos(a + 2)*9, t.y + Math.sin(a + 2)*5); ctx.closePath(); ctx.fill(); ctx.stroke(); } } }});
}
// tir de plusieurs lasers successifs qui suivent la visée (Rafale Psy)
function quickBeam(f, mv, a, col){
  const ux = Math.cos(a), uy = Math.sin(a), sx = f.x + ux*f.r*.6, sy = f.y + uy*f.r*.6; let L = 480; for (let d=0; d<480; d+=8){ const x = sx + ux*d, y = sy + uy*d; if (x < WALL || x > W-WALL || y < WALL || y > H-WALL){ L = d; break; } }
  const e = foeOf(f), rx = e.x - sx, ry = e.y - sy, al = rx*ux + ry*uy; if (e.hp > 0 && !e.buried && al > -10 && al < L + 10 && Math.abs(-rx*uy + ry*ux) < 12 + e.r*.6) hit(f, e, mv, 1);
  spawnFx({update(){ return this.t < .22; }, top(){ const k = this.t/.22; ctx.globalAlpha = 1 - k; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 10*(1 - k) + 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + ux*L, sy + uy*L); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3*(1 - k) + 1; ctx.stroke(); ctx.globalAlpha = 1; }});
}
// essaim / tourbillon qui suit l'ennemi et frappe plusieurs fois (Appel des Abeilles, Tempête de Sable)
function chaser(f, mv, o){
  let x = f.x + Math.cos(o.a)*30, y = f.y + Math.sin(o.a)*30, n = 0, tick = 0;
  spawnFx({update(dt){ const e = foeOf(f); if (e.hp > 0){ const dx = e.x - x, dy = e.y - y, m = Math.hypot(dx, dy) || 1, st = Math.min(m, o.spd*dt); x += dx/m*st; y += dy/m*st; }
      danger(f, x, y, o.r); tick -= dt;
      if (tick <= 0 && n < o.hits && e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < o.r + e.r*.5){ tick = o.every; n++; hit(f, e, mv, 1); }
      return this.t < o.life && n < o.hits; },
    top(){ const al = Math.min(1, (o.life - this.t)/.3); o.draw(x, y, al, this.t); }});
}

Object.assign(SIG, {
  // Migalos : toile lancée sur une zone, qui ralentit très fortement pendant 3 s
  toilegluante(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), R = 70;
    delayedZone(f, z.x, z.y, R, .35, '#e8e8f0', (x, y) => { zoneHit(f, mv, x, y, R); shake(4);
      spawnFx({update(){ const e = foeOf(f); if (e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < R){ e.slowF = .3; e.slow = Math.max(e.slow, .3); } return this.t < 3; },
        ground(){ const al = Math.min(1, (3 - this.t)/.5); ctx.globalAlpha = .7*al; ctx.strokeStyle = '#f4f4ff'; ctx.lineWidth = 1.5;
          for (let i=0;i<8;i++){ const aa = i/8*TAU; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa)*R, y + Math.sin(aa)*R); ctx.stroke(); }
          for (const rr of [R*.35, R*.65, R]){ ctx.beginPath(); for (let i=0;i<=8;i++){ const aa = i/8*TAU; ctx.lineTo(x + Math.cos(aa)*rr, y + Math.sin(aa)*rr); } ctx.stroke(); } ctx.globalAlpha = 1; }}); }, {after:.1});
  },
  // Ombre Portée : téléportation derrière l'ennemi (s'il est à portée), petit coup
  ombreportee(f, mv, a){
    const e = foeOf(f); if (e.hp <= 0 || dist(f, e) > 320){ popText(f.x, f.y - 30, 'Trop loin', '#a39bd0', 13, .6); return; }
    const ang = Math.atan2(e.y - f.y, e.x - f.x), c = clampArena(e.x + Math.cos(ang)*(e.r + f.r + 6), e.y + Math.sin(ang)*(e.r + f.r + 6), f.r);
    sparks(f.x, f.y, ['#2a1838','#735797'], 10, 140, 4); f.x = c.x; f.y = c.y; f.aimA = ang + Math.PI; hit(f, e, mv, 1); sparks(e.x, e.y, ['#2a1838','#735797','#ffffff'], 12, 180, 4);
  },
  // Foretress : se charge 1 s puis explose (énorme zone) en perdant la moitié de ses PV
  explosion(f, mv){
    const T = 1, R = 150; f.act = {n:'Charge', t:0, dur:T};
    f.script = {t:0, update(dt){ this.t += dt; danger(f, f.x, f.y, R); if (Math.random() < .5) sparks(f.x, f.y, ['#ffffff','#ffb347'], 2, 80, 3);
      if (this.t < T) return true;
      zoneHit(f, mv, f.x, f.y, R); const d = Math.round(f.max*.2); damage(f, d); f.recharge = 1; popText(f.x, f.y - 40, '-' + d, '#ef5050', 18);
      shake(22); zoomPunch(.08); hitstop(.1); screenFlash('#ffffff', .6, .35); shockRing(f.x, f.y, R*1.3, '#ffb347', .5, 18); crackDecal(f.x, f.y, R*.8); sparks(f.x, f.y, ['#ffffff','#ffd25a','#ff6a1a','#5a4a3a'], 60, 420, 8); return false; }};
    spawnFx({update(){ return this.t < T; }, ground(){ const k = this.t/T; ctx.globalAlpha = .1 + .3*k + (k > .8 ? .2*Math.sin(game.t*60) : 0); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }});
  },
  picots(f, mv, a, tx, ty){ groundTraps(f, mv, clampRange(f, tx, ty), false); },
  pikstoxik(f, mv, a, tx, ty){ groundTraps(f, mv, clampRange(f, tx, ty), true); },
  // Gyroballe : tourne sur lui-même en se déplaçant ; plus fort contre un ennemi rapide
  gyroballe(f, mv){
    const T = 1.2, R = 62; let n = 0; f.busy = T;
    spawnFx({update(){ if (f.hp <= 0) return false; while (n < 4 && this.t >= n*.3){ n++; const e = foeOf(f), k = Math.max(.6, Math.min(2.2, moveSpeed(e)/moveSpeed(f)));
        if (e.hp > 0 && !e.buried && dist(f, e) < R + e.r*.6){ const ok = canHit(f, e, sub(mv, {p:Math.round(mv.p*k)})); hit(f, e, sub(mv, {p:Math.round(mv.p*k)}), 1); if (ok){ const ang = Math.atan2(e.y - f.y, e.x - f.x); e.kx += Math.cos(ang)*260; e.ky += Math.sin(ang)*260; } } }
        danger(f, f.x, f.y, R); return this.t < T; },
      top(){ for (let i=0;i<3;i++){ const aa = game.t*14 + i*TAU/3; ctx.strokeStyle = i % 2 ? '#ffffff' : '#B7B7CE'; ctx.lineWidth = 4; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(f.x, f.y - 6, R*.8, aa, aa + 1.2); ctx.stroke(); } ctx.globalAlpha = 1; }});
  },
  // Kapoera : 3 charges courtes de plus en plus fortes
  triplepied(f, mv, a){
    let n = 0; const pw = [35, 45, 65];
    const go = () => { const aa = n ? liveAimAngle(f) : a, m = sub(mv, {p:pw[n]}); n++;
      f.dash = {vx:Math.cos(aa)*820, vy:Math.sin(aa)*820, t:.16, mv:m, trail:'#C22E28', onHit(e){ hit(f, e, m, 1); drawJabAt(e.x, e.y, aa); if (n < 3) setTimeout0(go); }, onEnd(){ if (n < 3) go(); }}; };
    go();
  },
  // Steelix : grand balayage de queue en arc, qui repousse
  queuedefer(f, mv, a){
    const R = f.r + 120, half = 1.25, wind = .2; f.act = {n:'Charge', t:0, dur:wind};
    f.script = {t:0, update(dt){ this.t += dt; f.aimA = a; if (this.t < wind){ danger(f, f.x + Math.cos(a)*70, f.y + Math.sin(a)*70, 90); return true; }
      f.act = {n:'Attack', t:0, dur:.35}; const e = foeOf(f); if (inWedge(f, e, a, R, half)){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ const ang = Math.atan2(e.y - f.y, e.x - f.x); e.kx += Math.cos(ang)*460; e.ky += Math.sin(ang)*460; } }
      bigSlash(f, a, R, half, '#B7B7CE'); shake(10); return false; }};
  },
  // Noctali : courte charge ; frappe avec l'Attaque de l'ennemi
  tricherie(f, mv, a){ f.dash = {vx:Math.cos(a)*800, vy:Math.sin(a)*800, t:.22, mv, trail:'#705746', onHit(e){ hit(f, e, mv, 1); jawFx(e.x, e.y, a, 'dark'); }}; },
  // Corboss : une nuée de corbeaux balaie une ligne devant lui
  nueecorbeaux(f, mv, a){
    const L = 380, ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y, crows = Array.from({length:12}, () => ({o:rand(-30, 30), d:rand(-60, 0), w:Math.random()*6})); let hits = 0, last = -1;
    f.act = {n:'Shoot', t:0, dur:.4};
    spawnFx({update(){ const head = this.t*700, e = foeOf(f), rx = e.x - sx, ry = e.y - sy, al = rx*ux + ry*uy;
        danger(f, sx + ux*Math.min(L, head + 60), sy + uy*Math.min(L, head + 60), 40);
        if (hits < 2 && this.t - last > .15 && e.hp > 0 && !e.buried && al < head && al > head - 120 && Math.abs(-rx*uy + ry*ux) < 36 + e.r*.6){ hits++; last = this.t; hit(f, e, mv, 1); }
        return head < L + 80; },
      top(){ const head = this.t*700; for (const c of crows){ const d = Math.min(L, head + c.d); if (d < 0) continue; const x = sx + ux*d - uy*c.o, y = sy + uy*d + ux*c.o, flap = Math.sin(game.t*30 + c.w)*5;
        ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.moveTo(x + ux*8, y + uy*8); ctx.lineTo(x - uy*10 - ux*4, y + ux*10 - uy*4 - flap); ctx.lineTo(x - ux*5, y - uy*5); ctx.lineTo(x + uy*10 - ux*4, y - ux*10 - uy*4 - flap); ctx.closePath(); ctx.fill(); } }});
  },
  // Hyporoi : pluie de météores sur une grande zone ; son Atq. Spé. baisse ensuite
  dracometeore(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty); f.act = {n:'Charge', t:0, dur:.5}; dimScreen(.6);
    for (let i=0;i<5;i++){ const aa = Math.random()*TAU, rr = i ? rand(40, 110) : 0, c = clampArena(z.x + Math.cos(aa)*rr, z.y + Math.sin(aa)*rr, 10); psyMeteorDragon(f, mv, c.x, c.y, .5 + i*.18); }
    spawnFx({update(){ if (this.t >= 1.3){ f.buff = {...f.buff, spa:Math.min(f.buff.spa, .7)}; f.buffT = Math.max(f.buffT, 6); popText(f.x, f.y - 62, 'Atq. Spé. −', '#c98a8a', 13); return false; } return true; }});
  },
  // Tengalice : rafale de feuilles tranchantes en cône
  tempeteverte(f, mv, a){
    const R = 200, half = .5; f.act = {n:'Shoot', t:0, dur:.4}; shake(5);
    const e = foeOf(f); if (inWedge(f, e, a, R, half)) hit(f, e, mv, 1);
    for (let i=0;i<50;i++){ const aa = a + rand(-half, half), v = rand(260, 520); game.parts.push({x:f.x, y:f.y, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.3,.5), max:.5, col:pick(['#7AC74C','#a8e07a','#3f7a24']), size:rand(3,6), star:Math.random() < .3}); }
  },
  // Cacturne : rafale d'aiguilles en éventail
  dardnuee(f, mv, a){ f.act = {n:'Shoot', t:0, dur:.35}; for (let j=0;j<7;j++) spawnProj(f, sub(mv, {k:'proj', spd:560, r:6, life:.7, look:'dart'}), a + (j - 3)*.12, 1); },
  // Colhomard : une pince géante s'abat sur une zone devant lui
  pincemasse(f, mv, a){
    const c = clampArena(f.x + Math.cos(a)*95, f.y + Math.sin(a)*95, 20); f.act = {n:'Attack', t:0, dur:.5};
    delayedZone(f, c.x, c.y, 60, .32, '#6390F0', (x, y) => { zoneHit(f, mv, x, y, 60); shake(13); hitstop(.06); crackDecal(x, y, 55); shockRing(x, y, 95, '#9ec0ff', .4, 12); sparks(x, y, ['#ffffff','#9ec0ff','#c04a6a'], 22, 260, 5);
      spawnFx({update(){ return this.t < .3; }, top(){ const al = 1 - this.t/.3; ctx.save(); ctx.translate(x, y - 20); ctx.globalAlpha = al; ctx.fillStyle = '#c03a3a'; ctx.strokeStyle = '#ffd0c0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 34, Math.PI*.15, Math.PI*.85, true); ctx.lineTo(-8, 4); ctx.arc(0, 10, 14, Math.PI*.9, Math.PI*.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }}); });
  },
  // Grahyèna : bond sur l'ennemi et morsure qui le retient un instant
  crocsfatals(f, mv, a){ f.dash = {vx:Math.cos(a)*880, vy:Math.sin(a)*880, t:.22, mv, trail:'#705746', fx(){ f.h = 20; }, onHit(e){ f.h = 0; const ok = canHit(f, e, mv); hit(f, e, mv, 1); jawFx(e.x, e.y, a, 'dark'); if (ok && e.hp > 0){ e.stun = Math.max(e.stun, .5); e.dash = null; } }, onEnd(){ f.h = 0; }}; },
  // Branette : pose une poupée qui absorbe les dégâts pendant 2 s
  poupeemaudite(f){
    f.doll = 2; popText(f.x, f.y - 62, 'Poupée maudite !', '#b08ae8', 14); sparks(f.x, f.y, ['#735797','#b08ae8'], 14, 150, 4);
    spawnFx({update(){ return f.doll > 0 && f.hp > 0; }, top(){ const x = f.x + 26, y = f.y - 18 + Math.sin(game.t*6)*3; ctx.fillStyle = '#4a3a5a'; ctx.strokeStyle = '#d0b8f0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y - 8, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y + 4, 6, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd25a'; ctx.fillRect(x - 3, y - 10, 2, 2); ctx.fillRect(x + 1, y - 10, 2, 2); }});
  },
  // Ténéfix : laser de cristal à longue portée
  rayongemme(f, mv, a){ beamAttack(f, mv, a, 'gem'); },
  // Dracosouffle : laser dragon, peut paralyser (étourdir)
  dracosouffle(f, mv, a){ beamAttack(f, mv, a, 'dragon'); },
  // Oniglali : coup de glace devant soi, deux fois plus fort si Oniglali vient d'être touché
  avalanche(f, mv, a){
    const angry = f.lastHit && game.t - f.lastHit < 1.5, m = angry ? sub(mv, {p:mv.p*2}) : mv; f.act = {n:'Attack', t:0, dur:.35};
    const e = foeOf(f); if (inWedge(f, e, a, f.r + 90, .9)) hit(f, e, m, 1);
    bigSlash(f, a, f.r + 90, .9, angry ? '#ffffff' : '#bff3ff'); frostDecal(f.x + Math.cos(a)*60, f.y + Math.sin(a)*60, 50); if (angry){ popText(f.x, f.y - 62, 'Avalanche ×2 !', '#bff3ff', 14); shake(10); }
  },
  // Libégon : tourbillon de sable qui suit l'ennemi
  tempetesable(f, mv, a){ f.act = {n:'Shoot', t:0, dur:.4}; chaser(f, mv, {a, spd:150, r:60, hits:5, every:.5, life:3, draw(x, y, al){ for (let i=0;i<8;i++){ const k = i/7, w = 60 - 25*k, yy = y - k*70, ph = game.t*10 + i;
    ctx.globalAlpha = al*(.55 - k*.25); ctx.strokeStyle = i % 2 ? '#e8d090' : '#c8a860'; ctx.lineWidth = 7 - k*3; ctx.beginPath(); ctx.ellipse(x, yy, w, w*.35, 0, ph % TAU, ph % TAU + 4.6); ctx.stroke(); } ctx.globalAlpha = 1; }}); },
  // Altaria : nuage protecteur qui soigne et réduit les dégâts reçus
  nuagedoux(f){
    const T = 3, heal = f.max*.3; f.shield = T; popText(f.x, f.y - 62, 'Nuage Doux', '#ffffff', 14);
    spawnFx({update(dt){ if (f.hp <= 0) return false; f.hp = Math.min(f.max, f.hp + heal*dt/T); return this.t < T; }, top(){ const al = Math.min(1, (T - this.t)/.4);
      for (let i=0;i<6;i++){ const aa = game.t*1.5 + i*TAU/6; ctx.globalAlpha = .55*al; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(f.x + Math.cos(aa)*28, f.y - 10 + Math.sin(aa)*12, 11, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }});
  },
  // Airmure : lance ses ailes d'acier comme un boomerang (aller et retour)
  ailedacier(f, mv, a){
    const sx = f.x, sy = f.y, out = 280;
    spawnFx({x:sx, y:sy, phase:0, hits:[false,false], rot:0, update(dt){ this.rot += dt*20;
        if (this.phase === 0){ const k = Math.min(1, this.t/.45), d = out*(1 - (1-k)*(1-k)), p = clampArena(sx + Math.cos(a)*d, sy + Math.sin(a)*d, 6); this.x = p.x; this.y = p.y; if (k >= 1) this.phase = 1; }
        else { const dx = f.x - this.x, dy = f.y - this.y, m = Math.hypot(dx, dy) || 1; this.x += dx/m*600*dt; this.y += dy/m*600*dt; if (m < 24 || f.hp <= 0 || this.t > 2) return false; }
        const e = foeOf(f); if (!this.hits[this.phase] && e.hp > 0 && !e.buried && Math.hypot(e.x - this.x, e.y - this.y) < e.r + 20){ this.hits[this.phase] = true; hit(f, e, mv, 1); }
        danger(f, this.x, this.y, 24); return true; },
      top(){ ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); const g = ctx.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8a8aa8');
        ctx.fillStyle = g; ctx.strokeStyle = '#4a4a5a'; ctx.lineWidth = 1.5; for (const s of [1, -1]){ ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s*14, -12, s*24, -2); ctx.lineTo(s*16, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.restore(); }});
  },
  // Galeking : charge énorme qui brise tout ; gros dégâts de recul
  fracasstete(f, mv, a){ f.dash = {vx:Math.cos(a)*820, vy:Math.sin(a)*820, t:.36, mv, trail:'#B6A136', onHit(e){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok){ e.kx += Math.cos(a)*520; e.ky += Math.sin(a)*520; } shake(16); zoomPunch(.05); hitstop(.08); crackDecal(e.x, e.y, 60); }, onEnd(){ shake(6); }}; },
  // Kaorine : plusieurs zones psychiques autour de l'ennemi
  extrasenseur(f, mv, a, tx, ty){ const z = clampRange(f, tx, ty); f.act = {n:'Shoot', t:0, dur:.4};
    [[0,0], ...[0,1,2,3].map(j => [Math.cos(j*TAU/4 + .4)*70, Math.sin(j*TAU/4 + .4)*70])].forEach(([dx, dy], i) => { const c = clampArena(z.x + dx, z.y + dy, 10); psyPulse(f, mv, c.x, c.y, .4 + i*.08); }); },
  // Vacilys : tentacules qui attirent l'ennemi vers lui
  ventouses(f, mv, a){
    const L = 300, ux = Math.cos(a), uy = Math.sin(a), sx = f.x, sy = f.y; f.act = {n:'Shoot', t:0, dur:.4}; let caught = false;
    const e = foeOf(f), rx = e.x - sx, ry = e.y - sy, al = rx*ux + ry*uy;
    if (e.hp > 0 && !e.buried && al > 0 && al < L + e.r && Math.abs(-rx*uy + ry*ux) < 26 + e.r*.6 && canHit(f, e, mv)){ caught = true; hit(f, e, mv, 1); e.kx = (f.x - e.x)*4; e.ky = (f.y - e.y)*4; e.stun = Math.max(e.stun, .3); }
    spawnFx({update(){ return this.t < .35; }, top(){ const k = this.t/.35, d = L*Math.sin(Math.min(1, k*2)*Math.PI/2)*(caught ? 1 - k*.6 : 1); ctx.globalAlpha = 1 - k*.5; ctx.lineCap = 'round';
      for (const o of [-10, 10]){ ctx.strokeStyle = '#7a5a8a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx - uy*o*.5, sy + ux*o*.5); ctx.quadraticCurveTo(sx + ux*d*.5 - uy*o, sy + uy*d*.5 + ux*o, sx + ux*d, sy + uy*d); ctx.stroke(); ctx.strokeStyle = '#e0a0d0'; ctx.lineWidth = 2.5; ctx.stroke(); } ctx.globalAlpha = 1; }});
  },
  // Pouvoir Antique : plusieurs pierres entourées d'un halo psychique, l'une après l'autre
  pouvoirantique(f, mv, a){ let n = 0; f.act = {n:'Shoot', t:0, dur:.5};
    spawnFx({update(){ while (n < 3 && this.t >= n*.15){ spawnProj(f, sub(mv, {k:'proj', spd:440, r:11, life:1.2}), (n ? liveAimAngle(f) : a) + (n - 1)*.1, 1); n++; } return n < 3; }}); },
  // Vampigraine : zone ; si elle touche, vole des PV sur la durée
  vampigraine(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty);
    delayedZone(f, z.x, z.y, 50, .4, '#7AC74C', (x, y) => { const e = foeIn(f, x, y, 50); if (!e || !canHit(f, e, mv)) return; popText(e.x, e.y - 62, 'Vampigraine !', '#7AC74C', 13); let n = 0;
      spawnFx({update(){ while (n < 5 && this.t >= n + .5){ n++; if (e.hp > 0 && f.hp > 0){ const d = Math.max(1, Math.round(e.max*.05)); damage(e, d); f.hp = Math.min(f.max, f.hp + d); popText(e.x, e.y - 30, '-' + d, '#7AC74C', 13); popText(f.x, f.y - 30, '+' + d, '#4fd17a', 13); } }
        return n < 5 && e.hp > 0 && sideOf(e).team[sideOf(e).active] === e; },
        top(){ ctx.fillStyle = '#7AC74C'; for (let i=0;i<3;i++){ const aa = game.t*3 + i*2.1; ctx.beginPath(); ctx.ellipse(e.x + Math.cos(aa)*16, e.y - 10 + Math.sin(aa)*6, 4, 2.5, aa, 0, TAU); ctx.fill(); } }}); });
  },
  // Armaldo : grande entaille en X devant soi
  plaiecroixsig(f, mv, a){ f.act = {n:'Attack', t:0, dur:.4}; xSlash(f, mv, f.x + Math.cos(a)*(f.r + 50), f.y + Math.sin(a)*(f.r + 50), a); },
  // Plaie-Croix : courte charge, petite entaille en X au bout
  plaiecroix(f, mv, a){ const slash = () => { const x = f.x + Math.cos(a)*(f.r + 22), y = f.y + Math.sin(a)*(f.r + 22); zoneHit(f, mv, x, y, 42); xSlashMini(x, y, a, '#A6B91A'); shake(5); };
    f.dash = {vx:Math.cos(a)*760, vy:Math.sin(a)*760, t:.2, mv, trail:'#A6B91A', onHit(){ slash(); }, onEnd(){ slash(); }}; },
  // Apireine : essaim d'abeilles qui suit l'ennemi et le pique plusieurs fois
  appelabeilles(f, mv, a){ f.act = {n:'Shoot', t:0, dur:.4}; chaser(f, mv, {a, spd:260, r:34, hits:6, every:.3, life:2.4, draw(x, y, al){ ctx.globalAlpha = al;
    for (let i=0;i<9;i++){ const aa = game.t*9 + i*.7, bx = x + Math.cos(aa*1.3)*18, by = y - 10 + Math.sin(aa)*12; ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.ellipse(bx, by, 4, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2010'; ctx.fillRect(bx - 1, by - 3, 2, 6); } ctx.globalAlpha = 1; }}); },
  ordredefense(f){ f.shield = 4; popText(f.x, f.y - 62, 'Ordre Défense', '#ffd25a', 14); shockRing(f.x, f.y, 60, '#ffd25a', .4, 8); },
  // Cizayox : rafale de coups de pinces ultra-rapides devant soi
  pincescanon(f, mv, a){
    let n = 0; f.busy = .65;
    spawnFx({update(){ if (f.hp <= 0) return false; const aa = liveAimAngle(f); f.aimA = aa;
        while (n < 7 && this.t >= n*.09){ n++; const x = f.x + Math.cos(aa)*(f.r + 22), y = f.y + Math.sin(aa)*(f.r + 22), e = foeOf(f); f.act = {n:'Attack', t:0, dur:.1};
          if (e.hp > 0 && !e.buried && Math.hypot(e.x - x, e.y - y) < 36 + e.r*.6){ const ok = canHit(f, e, mv); hit(f, e, mv, 1); if (ok && e.hp > 0 && n < 7){ e.stun = Math.max(e.stun, .14); e.dash = null; } }
          sparks(x, y, ['#ffffff','#B7B7CE','#c03a3a'], 4, 160, 3); }
        return n < 7; }});
  },
  // Charmillon : poudre scintillante en cône ; augmente parfois toutes ses stats
  ventargente(f, mv, a){
    const R = 170, half = .5; f.act = {n:'Shoot', t:0, dur:.35};
    const e = foeOf(f); if (inWedge(f, e, a, R, half)) hit(f, e, mv, 1);
    for (let i=0;i<40;i++){ const aa = a + rand(-half, half), v = rand(200, 420); game.parts.push({x:f.x, y:f.y, vx:Math.cos(aa)*v, vy:Math.sin(aa)*v, life:rand(.3,.6), max:.6, col:pick(['#ffffff','#e0e8ff','#c0d0f0']), size:rand(2,4), star:1}); }
    if (Math.random() < .3){ f.buff = {atk:1.2, spa:1.2, spe:1.2, spd:1.2}; f.buffT = 8; popText(f.x, f.y - 62, 'Tout augmente !', '#e6b84c', 14); }
  },
  // Hippodocus : projectile qui suit ; l'ennemi touché s'endort 2 s plus tard (sauf s'il change de Pokémon)
  baillement(f, mv, a){
    const e0 = foeOf(f); let x = f.x, y = f.y, done = false;
    spawnFx({update(dt){ if (!done){ const e = foeOf(f), dx = e.x - x, dy = e.y - y, m = Math.hypot(dx, dy) || 1; x += dx/m*320*dt; y += dy/m*320*dt;
          if (m < e.r + 10 && canHit(f, e, mv)){ done = true; this.tgt = e; this.t0 = this.t; popText(e.x, e.y - 62, 'Bâille…', '#c9c3ef', 13); } return this.t < 2; }
        const e = this.tgt; if (sideOf(e).team[sideOf(e).active] !== e || e.hp <= 0) return false;
        if (this.t - this.t0 >= 2){ e.sleep = Math.max(e.sleep, 1.5); e.dash = null; popText(e.x, e.y - 62, 'Endormi !', '#c9c3ef', 14); return false; } return true; },
      top(){ if (done){ const e = this.tgt; ctx.fillStyle = '#c9c3ef'; ctx.font = '700 13px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z', e.x + 16, e.y - 44 - (game.t*20 % 10)); return; }
        drawGlow(x, y, 26, '#c9c3ef', .6); glowBall(x, y, 9, '#ffffff', '#e0d8ff', '#8a7ac8'); }});
  },
  // Scorvol : plane au-dessus des attaques, puis pique l'ennemi avec sa pince
  volplane(f, mv, a, tx, ty){
    const z0 = clampTo(f, tx, ty, mv.range), z = clampArena(z0.x, z0.y, f.r), sx = f.x, sy = f.y, dur = .6, R = 50; f.act = {n:'Charge', t:0, dur};
    f.script = {t:0, update(dt){ this.t += dt; const k = Math.min(1, this.t/dur), e = foeOf(f);
      if (k < .6 && e.hp > 0 && !e.buried){ const w = clampTo({x:sx, y:sy}, e.x, e.y, mv.range), dx = w.x - z.x, dy = w.y - z.y, m = Math.hypot(dx, dy); if (m > 1){ const st = Math.min(m, 200*dt); z.x += dx/m*st; z.y += dy/m*st; } }
      f.x = sx + (z.x - sx)*k; f.y = sy + (z.y - sy)*k; f.h = Math.sin(Math.PI*k)*80; if (k < .9) f.inv = Math.max(f.inv, .04); danger(f, z.x, z.y, R);
      if (k >= 1){ f.h = 0; const t = zoneHit(f, mv, z.x, z.y, R); if (t) jawFx(t.x, t.y, a, 'dark'); shake(8); return false; } return true; }};
  },
  // Simiabraz : Mach Punch puis gros poing de feu qui repousse
  poingardent(f, mv, a){
    const jab = sub(mv, {p:30, t:'Fighting'});
    const fire = () => { const x = f.x + Math.cos(a)*(f.r + 30), y = f.y + Math.sin(a)*(f.r + 30), e = zoneHit(f, mv, x, y, 48); punchFx(x, y, a, 'fire'); if (e && e.hp > 0){ e.kx += Math.cos(a)*460; e.ky += Math.sin(a)*460; } shake(9); };
    f.dash = {vx:Math.cos(a)*950, vy:Math.sin(a)*950, t:.15, mv:jab, trail:'#ff8a2a', onHit(e){ hit(f, e, jab, 1); setTimeout0(fire, .12); }, onEnd(){ setTimeout0(fire, .05); }};
  },
  // Pyroli : charge en flammes très puissante ; dégâts de recul
  boutefeusig(f, mv, a){ f.dash = {vx:Math.cos(a)*880, vy:Math.sin(a)*880, t:.32, mv, trail:'#ff6a1a', fx(){ for (let i=0;i<2;i++) game.parts.push({x:f.x + rand(-12,12), y:f.y + rand(-12,12), vx:-Math.cos(a)*120, vy:-60, life:.35, max:.35, col:pick(['#fff3b0','#ffb43a','#ff6a1a']), size:rand(5,9)}); },
    onHit(e){ hit(f, e, mv, 1); punchFx(e.x, e.y, a, 'fire'); shake(12); }}; },
  // Mentali : 3 lasers psy successifs (redirigeables)
  rafalepsy(f, mv, a){ let n = 0; f.act = {n:'Shoot', t:0, dur:.6};
    spawnFx({update(){ while (n < 3 && this.t >= n*.2){ quickBeam(f, mv, n ? liveAimAngle(f) : a, '#F95587'); n++; } return n < 3 && f.hp > 0; }}); },
  // Archéodong : pendant 5 s, les Pokémon lents vont plus vite que les rapides
  distorsion(f){ game.trick = 5; popText(CX, CY - 60, 'Distorsion : les lents deviennent rapides !', '#F95587', 16, 1.6); screenFlash('#F95587', .25, .3); },
  // Spiritomb : les âmes tournent autour de lui puis s'écartent en zone
  amesserrantes(f, mv){
    const T = .9, R = 170; let struck = false; f.act = {n:'Charge', t:0, dur:T};
    spawnFx({update(){ const k = Math.min(1, this.t/T), r = 30 + (R - 30)*Math.max(0, (k - .35)/.65), e = foeOf(f); danger(f, f.x, f.y, r + 20);
        if (!struck && k > .35 && e.hp > 0 && !e.buried && Math.abs(dist(f, e) - r) < 28 + e.r*.5){ struck = true; hit(f, e, mv, 1); }
        return this.t < T; },
      top(){ const k = Math.min(1, this.t/T), r = 30 + (R - 30)*Math.max(0, (k - .35)/.65);
        for (let i=0;i<18;i++){ const aa = game.t*5 + i*TAU/18 + k*4, x = f.x + Math.cos(aa)*r, y = f.y - 10 + Math.sin(aa)*r*.6; ctx.globalAlpha = .8; drawGlow(x, y, 12, '#9a78c8', .5); ctx.fillStyle = '#d8c8ff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }});
  },
  // Roserade : pétales tranchants tout autour d'elle
  tempeteflorale(f, mv){
    const R = 110; let n = 0;
    spawnFx({update(){ while (n < 4 && this.t >= n*.25){ n++; zoneHit(f, mv, f.x, f.y, R); } danger(f, f.x, f.y, R); return this.t < 1; },
      top(){ for (let i=0;i<22;i++){ const aa = game.t*6 + i*TAU/22, rr = R*(.4 + .6*((i*7) % 10)/10), x = f.x + Math.cos(aa)*rr, y = f.y + Math.sin(aa)*rr*.7;
        ctx.fillStyle = i % 2 ? '#ff8ac4' : '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, 5, 2.5, aa, 0, TAU); ctx.fill(); } }});
  },
});
// petits utilitaires du lot 3
function setTimeout0(fn, delay = 0){ spawnFx({update(){ if (this.t >= delay){ fn(); return false; } return true; }}); }
function drawJabAt(x, y, a){ spawnFx({update(){ return this.t < .14; }, top(){ drawJab(x, y, a, 1, 1 - this.t/.14); }}); }
function psyMeteorDragon(f, mv, x, y, delay){
  const r = 46;
  spawnFx({update(){ if (this.done) return this.t < delay + .2; danger(f, x, y, r); if (this.t >= delay){ this.done = true; zoneHit(f, mv, x, y, r); shake(7); crackDecal(x, y, 36); shockRing(x, y, 70, '#8a5cff', .3, 8); sparks(x, y, ['#ffffff','#c0a8ff','#6F35FC','#ff8a2a'], 18, 260, 5); } return true; },
    ground(){ if (this.done) return; const k = Math.min(1, this.t/delay); ctx.globalAlpha = .12 + .3*k; ctx.fillStyle = '#6F35FC'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; },
    top(){ if (this.done) return; const k = Math.min(1, this.t/delay), yy = y - (1 - k*k)*360 - 10; ctx.globalAlpha = .5; ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 20, yy - 40); ctx.lineTo(x, yy); ctx.stroke(); ctx.globalAlpha = 1;
      glowBall(x, yy, 14, '#ffffff', '#c0a8ff', '#6F35FC'); }});
}

SIG.crochetvenin = (f, mv, a) => { const x = f.x + Math.cos(a)*(f.r + 26), y = f.y + Math.sin(a)*(f.r + 26); f.act = {n:'Attack', t:0, dur:.28}; jawFx(x, y, a, 'poison'); const e = foeOf(f); if (inWedge(f, e, a, f.r + 64, 1.1)) hit(f, e, mv, 1); };
