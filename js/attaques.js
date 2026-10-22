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
function canHit(f, e, mv){ return !!e && e.hp > 0 && e.inv <= 0 && !e.buried && (mv.hitsImmune || effMult(mv.t, typesOf(e)) > 0); }
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
// Impact d'un coup : petit gel, onde et étincelles du type
function impactFx(x, y, col, dmg, e){
  hitstop(Math.min(.09, .02 + dmg/450));
  shockRing(x, y, 26 + Math.min(40, dmg), '#ffffff', .2, 4);
  if (e > 1) screenFlash('#ffffff', .12, .12);
}
function drawPmdAt(pm, name, x, y, dirA, S){
  const A = pm.a[name] || pm.a.Walk || pm.a.Idle; if (!A) return;
  const i = pmdFrame(A, game.t*60, true), oct = ((Math.round(dirA/(Math.PI/4)) % 8) + 8) % 8, row = DIR_ROW[oct];
  ctx.imageSmoothingEnabled = false; ctx.drawImage(A.img, i*A.fw, row*A.fh, A.fw, A.fh, x - A.fw/2*S, y - A.fh/2*S, A.fw*S, A.fh*S);
}

// ---------- Rendu des projectiles selon leur type ----------
function drawProj(p){
  const look = p.mv.look || p.mv.t, a = Math.atan2(p.vy, p.vx), r = p.r, t = game.t, tr = p.trail || [], n = tr.length;
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
  const r = last ? 36 : 30;
  spawnFx({update(){ if (this.done) return false; danger(f, x, y, r);
      if (this.t >= delay){ this.done = true; const e = zoneHit(f, mv, x, y, r); shake(last ? 8 : 4); sparks(x, y, ['#ffffff','#dff8ff','#96D9D6'], 12, 220, 4); frostDecal(x, y, r + 6);
        if (last){ if (e && e.hp > 0){ e.slow = 3; e.slowF = .3; popText(e.x, e.y - 62, 'Très ralenti !', '#96D9D6', 13); } iceSpike(f, x, y); } }
      return true; },
    ground(){ const k = Math.min(1, this.t/delay); ctx.globalAlpha = .15 + .3*k; ctx.fillStyle = '#0a1a24'; ctx.beginPath(); ctx.ellipse(x, y, r*k, r*k*.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .6; ctx.strokeStyle = '#bfe9f5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    top(){ const k = Math.min(1, this.t/delay), yy = y - (1 - k*k)*340, w = last ? 13 : 10, h = last ? 50 : 40;
      const g = ctx.createLinearGradient(x, yy - h, x, yy); g.addColorStop(0, '#7fd0e0'); g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, yy - h); ctx.lineTo(x + w, yy - h); ctx.lineTo(x, yy); ctx.closePath(); ctx.fill(); }});
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
  if (manual){
    if (inputMode === 'mouse' && mouse.seen) return clampRange(f, mouse.x, mouse.y);
    if (inputMode === 'pad' && pad.aimOn){ const p = dirPoint(f, Math.cos(pad.aimA), Math.sin(pad.aimA), pad.aimMag, i); return clampRange(f, p.x, p.y); }
  }
  return clampRange(f, e.x, e.y);
}
// Direction visée en direct (pour les enchaînements comme Colère)
function liveAimAngle(f){
  const e = foeOf(f), toFoe = Math.atan2(e.y - f.y, e.x - f.x);
  if (f.isAI) return toFoe + (Math.random()*2-1)*game.diff.aimErr;
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
  const jaw = kind === 'ice' ? '#bfe9f5' : '#2a1626', edge = kind === 'ice' ? '#ffffff' : '#c04a6a', teeth = kind === 'ice' ? '#e8fbff' : '#ffffff';
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
function punchFx(x, y, a){
  sparks(x, y, ['#ffffff','#bfe9f5','#96D9D6'], 16, 220, 5); frostDecal(x, y, 30); shake(5);
  spawnFx({update(){ return this.t < .28; }, top(){ const k = Math.min(1, this.t/.08), fade = this.t > .12 ? 1 - (this.t - .12)/.16 : 1;
    ctx.save(); ctx.translate(x - Math.cos(a)*16*(1-k), y - Math.sin(a)*16*(1-k)); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    glowBall(0, 0, 18 + 8*k, '#ffffff', '#dff8ff', '#5fb8d0');
    ctx.fillStyle = '#eafcff'; ctx.strokeStyle = '#5fb8d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
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
    const z = clampRange(f, tx, ty), r = 72, delay = .75;
    spawnFx({update(){ if (!this.done){ danger(f, z.x, z.y, r);
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
    let vx = Math.cos(a)*280, vy = Math.sin(a)*280, tick = 0, n = 0;
    spawnFx({x:f.x + Math.cos(a)*30, y:f.y + Math.sin(a)*30, update(dt){ const e = foeOf(f);
        if (e.hp > 0){ const want = Math.atan2(e.y - this.y, e.x - this.x), cur = Math.atan2(vy, vx), d = Math.atan2(Math.sin(want-cur), Math.cos(want-cur)), c = cur + Math.max(-1.1*dt, Math.min(1.1*dt, d)); const sp = Math.hypot(e.x - this.x, e.y - this.y) < 50 ? 90 : 280; vx = Math.cos(c)*sp; vy = Math.sin(c)*sp; }
        this.x += vx*dt; this.y += vy*dt; const c = clampArena(this.x, this.y, 30); this.x = c.x; this.y = c.y;
        danger(f, this.x, this.y, 42); tick -= dt;
        if (tick <= 0 && n < 5 && e.hp > 0 && !e.buried && Math.hypot(e.x - this.x, e.y - this.y) < 36 + e.r*.6){ tick = .28; n++; hit(f, e, mv, 1); }
        for (let i=0;i<3;i++){ const aa = Math.random()*TAU, rr = rand(6, 30); game.parts.push({x:this.x + Math.cos(aa)*rr, y:this.y + Math.sin(aa)*rr*.4, vx:-Math.sin(aa)*150, vy:-70 - Math.random()*90, life:.4, max:.4, col:pick(['#ffd25a','#ff8a2a','#e8432a']), size:rand(4,8)}); }
        return this.t < 1.9; },
      ground(){ ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 30, 11, 0, 0, TAU); ctx.fill(); },
      top(){ const al = Math.min(1, (1.9 - this.t)/.3);
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
            if (e.inv <= 0 && effMult(mv.t, typesOf(e)) > 0){ e.kx = ux*spd*1.1; e.ky = uy*spd*1.1; } } }
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
    const z = clampRange(f, tx, ty), r = 64, delay = .55;
    spawnFx({update(){ if (!this.done){ danger(f, z.x, z.y, r);
          if (this.t >= delay){ this.done = true; const e = foeIn(f, z.x, z.y, r); shockRing(z.x, z.y, r*1.3, '#F95587', .35, 6);
            if (canHit(f, e, mv)) liftAndSlam(f, e, mv); else sparks(z.x, z.y, ['#F95587','#ffa0c8'], 14, 160, 4); } }
        return this.t < delay + .1; },
      ground(){ if (this.done) return; const k = this.t/delay; ctx.globalAlpha = .12 + .25*k; ctx.fillStyle = '#F95587'; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.fill();
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
  chuteglace(f, mv, a, tx, ty){
    const z = clampRange(f, tx, ty), R = 80, n = 5;
    for (let i=0;i<n;i++){ const last = i === n-1, aa = Math.random()*TAU, rr = last ? 0 : rand(22, R-10), p = clampArena(z.x + Math.cos(aa)*rr, z.y + Math.sin(aa)*rr, 10);
      icicle(f, mv, p.x, p.y, .45 + i*.14, last); }
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
  chantflamboyant(f, mv, a){
    const ox = f.x, oy = f.y, spd = 300, max = 200, band = 26; let struck = false;
    spawnFx({update(){ const r = this.t*spd, e = foeOf(f);
        if (!struck && e.hp > 0 && !e.buried && Math.abs(Math.hypot(e.x-ox, e.y-oy) - r) < band + e.r*.5){ struck = true; const ok = canHit(f, e, mv); hit(f, e, mv, 1);
          if (ok){ f.buff = {...f.buff, spa:Math.min(1.6, f.buff.spa*1.3)}; f.buffT = Math.max(f.buffT, 6); popText(f.x, f.y - 62, 'Atq. Spé. +', '#e6b84c', 14); } }
        return r < max; },
      ground(){ const r = this.t*spd, al = Math.max(0, 1 - r/max)*.9 + .1, N = Math.max(8, Math.floor(r/11));
        ctx.globalAlpha = al*.5; ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = band*.7; ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke();
        for (let i=0;i<N;i++){ const aa = i/N*TAU + this.t*.6; drawFlame(ox + Math.cos(aa)*r, oy + Math.sin(aa)*r, 6 + 2*Math.sin(game.t*14 + i), al); }
        ctx.globalAlpha = al; ctx.fillStyle = '#fff3c0'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i=0;i<6;i++){ const aa = i/6*TAU - this.t*1.2; ctx.fillText(i%2 ? '♪' : '♫', ox + Math.cos(aa)*(r - 18), oy + Math.sin(aa)*(r - 18)); }
        ctx.globalAlpha = 1; }});
  },
  // Carchacrok : 4 coups redirigeables, de plus en plus larges
  colere(f, mv, a){
    const reach = [60, 78, 98, 122], half = [.9, 1, 1.1, 1.25], times = [0, .3, .6, .92], last = sub(mv, {p:mv.p*1.4}); let n = 0;
    f.script = {t:0, update(dt){ this.t += dt;
      while (n < 4 && this.t >= times[n]){ const aa = n ? liveAimAngle(f) : a, R = f.r + reach[n]; f.aimA = aa; f.act = {n:'Attack', t:0, dur:.28};
        f.kx += Math.cos(aa)*220; f.ky += Math.sin(aa)*220;
        const e = foeOf(f); if (inWedge(f, e, aa, R, half[n])) hit(f, e, n === 3 ? last : mv, 1);
        bigSlash(f, aa, R, half[n], n === 3 ? '#9a6bff' : '#6F35FC'); shake(3 + n*3);
        if (n === 3){ screenFlash('#6F35FC', .25, .2); zoomPunch(.04); }
        n++; }
      return this.t < 1.15; }};
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
