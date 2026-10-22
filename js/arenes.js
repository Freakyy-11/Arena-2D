// Arènes : décors dessinés, décor de fond, images, ambiance
// =====================================================================
// ARÈNES (décor uniquement)
// =====================================================================
// Vue de dessus « 3/4 » comme les jeux Pokémon 2D : chaque élément montre son dessus éclairé et sa face avant,
// lumière en haut à gauche, ombres vers le bas à droite. Le décor est peint une fois en basse résolution
// (1 pixel = BG_RES unités) puis agrandi sans lissage. paint(x, r) : x = contexte en coordonnées de l'arène, r = hasard reproductible.
const BG_RES = 2;
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rpick = (r, arr) => arr[Math.floor(r()*arr.length)];
const IN = {x0:WALL, y0:WALL, x1:W - WALL, y1:H - WALL, w:W - WALL*2, h:H - WALL*2};
function noise(x, r, n, cols, s=2, area=IN){ for (let i=0;i<n;i++){ x.fillStyle = rpick(r, cols); x.fillRect(area.x0 + Math.floor(r()*area.w/s)*s, area.y0 + Math.floor(r()*area.h/s)*s, s, s); } }
function shadowEll(x, cx, cy, rx, ry, a=.35){ x.fillStyle = `rgba(0,0,0,${a})`; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill(); }
function vgrad(x, y0, y1, stops){ const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach((c,i) => g.addColorStop(i/(stops.length-1), c)); return g; }
function hgrad(x, x0, x1, stops){ const g = x.createLinearGradient(x0, 0, x1, 0); stops.forEach((c,i) => g.addColorStop(i/(stops.length-1), c)); return g; }
function blob(x, cx, cy, R, r, col, n=9){ x.fillStyle = col; x.beginPath(); for (let i=0;i<n;i++){ const a = i/n*TAU, rr = R*(.7 + .45*r()); x.lineTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); } x.closePath(); x.fill(); }
function crackLine(x, r, px, py, len, col, w=2){ let a = r()*TAU; x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py);
  for (let s=0;s<5;s++){ a += (r()-.5)*1.1; px += Math.cos(a)*len/5; py += Math.sin(a)*len/5; x.lineTo(px, py); } x.stroke(); }
function cloudPuff(x, cx, cy, s, col){ x.fillStyle = col; for (const [dx, dy, rr] of [[0,0,1],[-.9,.2,.7],[.9,.25,.75],[-.4,-.45,.6],[.45,-.4,.65]]){ x.beginPath(); x.arc(cx + dx*s, cy + dy*s, rr*s, 0, TAU); x.fill(); } }
// colonne vue en 3/4 : base, fût éclairé à gauche, chapiteau ; broken = colonne brisée
function column(x, cx, by, rad, h, c, broken, r){
  shadowEll(x, cx + rad*.9, by + 2, rad*1.7, rad*.55);
  x.fillStyle = c.dark; x.fillRect(cx - rad*1.35, by - rad*.7, rad*2.7, rad*.7);
  x.fillStyle = c.light; x.fillRect(cx - rad*1.35, by - rad*.9, rad*2.7, rad*.25);
  x.fillStyle = hgrad(x, cx - rad, cx + rad, [c.light, c.mid, c.dark]); x.fillRect(cx - rad, by - h, rad*2, h - rad*.7);
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; for (let i=-1;i<=1;i++){ x.beginPath(); x.moveTo(cx + i*rad*.5, by - h + 6); x.lineTo(cx + i*rad*.5, by - rad*.9); x.stroke(); }
  if (broken){ x.fillStyle = c.top; x.beginPath(); x.moveTo(cx - rad, by - h); for (let i=0;i<=5;i++) x.lineTo(cx - rad + i*rad*.4, by - h - (i % 2 ? 8 + r()*8 : 0)); x.lineTo(cx + rad, by - h + 4); x.closePath(); x.fill(); }
  else { x.fillStyle = c.dark; x.fillRect(cx - rad*1.3, by - h - rad*.5, rad*2.6, rad*.6); x.fillStyle = c.top; x.beginPath(); x.ellipse(cx, by - h - rad*.5, rad*1.3, rad*.45, 0, 0, TAU); x.fill(); }
}
// rocher en 3/4 : masse sombre, dessus éclairé, neige éventuelle
function rockLump(x, cx, cy, s, c, r, snow){
  shadowEll(x, cx + s*.35, cy + s*.45, s*1.05, s*.45);
  const pts = []; for (let i=0;i<8;i++){ const a = i/8*TAU, rr = s*(.75 + .35*r()); pts.push([cx + Math.cos(a)*rr, cy + Math.sin(a)*rr*.8]); }
  x.fillStyle = c.dark; x.beginPath(); pts.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.fill();
  x.fillStyle = c.mid; x.beginPath(); pts.forEach(p => x.lineTo(p[0] - s*.08, p[1] - s*.14)); x.closePath(); x.fill();
  x.fillStyle = snow ? '#eef4f8' : c.light; x.beginPath(); pts.slice(3, 8).forEach(p => x.lineTo(p[0]*.82 + cx*.18 - s*.1, p[1]*.7 + cy*.3 - s*.3)); x.closePath(); x.fill();
}
// bande de falaise en haut de l'arène : strates qui descendent vers le sol jouable
function cliffTop(x, r, y1, cols, snow){
  const layers = 3, step = y1/layers;
  for (let l=0;l<layers;l++){ const y = l*step;
    x.fillStyle = cols[l % cols.length]; x.beginPath(); x.moveTo(0, y);
    for (let xx=0; xx<=W; xx+=16) x.lineTo(xx, y + step + (r() - .5)*8); x.lineTo(W, y); x.closePath(); x.fill();
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let xx=0; xx<W; xx+=16 + Math.floor(r()*20)) x.fillRect(xx, y + step*.35, 2, step*.55);
    if (snow){ x.fillStyle = '#e8f0f6'; for (let xx=0; xx<W; xx+=6) if (r() < .55) x.fillRect(xx, y + 2 + r()*3, 6, 3 + r()*3); }
  }
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y1, W, 8);
}

const ARENAS = {
  // ---------- Stade : pelouse, gradins avec foule, panneaux, projecteurs ----------
  stade:{name:'Stade Pokémon', line:'#ffffff',
    paint(x, r){
      x.fillStyle = '#1a2036'; x.fillRect(0, 0, W, H);
      // gradins : rangées vues du dessus, foule en pixels
      for (let d=0; d<WALL - 14; d+=6){ x.fillStyle = (d/6) % 2 ? '#2e3a5c' : '#27324f'; x.fillRect(d, d, W - d*2, H - d*2); }
      const crowd = ['#e85a5a','#5a8ae8','#e8d25a','#f0f0f0','#5ae88a','#e88ad2','#2a2a3a','#f0a050'];
      for (let i=0;i<4200;i++){ const px = Math.floor(r()*W/2)*2, py = Math.floor(r()*H/2)*2; if (px > WALL - 14 && px < W - WALL + 14 && py > WALL - 14 && py < H - WALL + 14) continue; if (r() < .7){ x.fillStyle = rpick(r, crowd); x.fillRect(px, py, 2, 2); } }
      // muret avec panneaux publicitaires : face avant visible en haut, dessus sur les côtés
      x.fillStyle = vgrad(x, WALL - 14, WALL, ['#4a5a8a','#2c3658']); x.fillRect(WALL - 14, WALL - 14, W - (WALL - 14)*2, 14);
      for (let xx = WALL; xx < W - WALL - 40; xx += 92){ x.fillStyle = rpick(r, ['#d84a4a','#3a7ad8','#e8c040','#3ab86a']); x.fillRect(xx + 6, WALL - 11, 78, 8); x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(xx + 14, WALL - 8, 30 + r()*30, 2); }
      x.fillStyle = '#3a4670'; x.fillRect(WALL - 14, WALL, 14, H - WALL*2 + 14); x.fillRect(W - WALL, WALL, 14, H - WALL*2 + 14); x.fillRect(WALL - 14, H - WALL, W - (WALL - 14)*2, 14);
      x.fillStyle = '#5a6a98'; x.fillRect(WALL - 14, WALL, 3, H - WALL*2); x.fillRect(W - WALL, WALL, 3, H - WALL*2); x.fillRect(WALL - 14, H - WALL, W - (WALL - 14)*2, 3);
      // pelouse tondue en bandes, brins d'herbe, ombre du muret
      for (let xx=WALL, i=0; xx<W-WALL; xx+=54, i++){ x.fillStyle = i % 2 ? '#3f8c3b' : '#367c34'; x.fillRect(xx, WALL, Math.min(54, W-WALL-xx), H - WALL*2); }
      noise(x, r, 5000, ['#2f6e2e','#4a9a44','#3a8436','#52a24a']);
      x.fillStyle = vgrad(x, WALL, WALL + 40, ['rgba(0,0,0,.35)','rgba(0,0,0,0)']); x.fillRect(WALL, WALL, W - WALL*2, 40);
      // lignes du terrain
      x.strokeStyle = '#eef4e6'; x.lineWidth = 4; x.strokeRect(WALL + 26, WALL + 26, W - WALL*2 - 52, H - WALL*2 - 52);
      x.beginPath(); x.moveTo(WALL + 26, CY); x.lineTo(W - WALL - 26, CY); x.stroke(); x.beginPath(); x.arc(CX, CY, 124, 0, TAU); x.stroke();
      for (const sy of [WALL + 26, H - WALL - 26]){ x.strokeRect(CX - 90, sy - (sy < CY ? 0 : 60), 180, 60); }
      // Poké Ball centrale avec un peu de relief
      shadowEll(x, CX + 4, CY + 6, 72, 72, .25);
      x.fillStyle = vgrad(x, CY - 70, CY, ['#f0545a','#c22e34']); x.beginPath(); x.arc(CX, CY, 70, Math.PI, 0); x.fill();
      x.fillStyle = vgrad(x, CY, CY + 70, ['#f4f4ee','#cfcfc6']); x.beginPath(); x.arc(CX, CY, 70, 0, Math.PI); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(CX - 30, CY - 40, 18, 9, -.6, 0, TAU); x.fill();
      x.fillStyle = '#1a1a22'; x.fillRect(CX - 70, CY - 6, 140, 12); x.beginPath(); x.arc(CX, CY, 23, 0, TAU); x.fill();
      x.fillStyle = '#f4f4ee'; x.beginPath(); x.arc(CX, CY, 14, 0, TAU); x.fill(); x.strokeStyle = '#1a1a22'; x.lineWidth = 6; x.beginPath(); x.arc(CX, CY, 70, 0, TAU); x.stroke();
      // pylônes de projecteurs aux 4 coins
      for (const [px, py] of [[16,16],[W-16,16],[16,H-16],[W-16,H-16]]){ shadowEll(x, px + 5, py + 6, 12, 5); x.fillStyle = '#5a6278'; x.fillRect(px - 4, py - 20, 8, 22);
        x.fillStyle = '#2a2e3a'; x.fillRect(px - 13, py - 30, 26, 14); x.fillStyle = '#fff8d8'; for (let i=0;i<3;i++) x.fillRect(px - 10 + i*7, py - 27, 5, 8); }
    },
    anim(t){
      // foule qui bouge, flashs, halo des projecteurs
      const s = Math.floor(t*8); ctx.fillStyle = '#ffffff';
      for (let i=0;i<5;i++){ const rr = rng(s*7 + i), side = Math.floor(rr()*4), u = rr()*(W - 20) + 10, v = rr()*(WALL - 20) + 4;
        const [fx, fy] = side === 0 ? [u, v] : side === 1 ? [u, H - v] : side === 2 ? [v, u] : [W - v, u];
        ctx.globalAlpha = .9 - ((t*8) % 1); starPath(fx, fy, 6, 2, 4, 0); ctx.fill(); }
      for (const [px, py, dx, dy] of [[16,16,1,1],[W-16,16,-1,1],[16,H-16,1,-1],[W-16,H-16,-1,-1]]){ ctx.globalAlpha = .07 + .02*Math.sin(t*2); ctx.fillStyle = '#fff4c0';
        ctx.beginPath(); ctx.moveTo(px, py - 22); ctx.lineTo(px + dx*260, py + dy*140); ctx.lineTo(px + dx*140, py + dy*260); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1; }},

  // ---------- Pilier Céleste : sommet du pilier, dalles anciennes au-dessus des nuages ----------
  pilier:{name:'Pilier Céleste', line:'#f2dcae',
    paint(x, r){
      x.fillStyle = vgrad(x, 0, H, ['#f2a860','#d87a7a','#9a68b8','#5a4aa0']); x.fillRect(0, 0, W, H);
      // mer de nuages en contrebas, tout autour
      for (let i=0;i<70;i++){ const px = r()*W, py = r()*H; if (px > WALL && px < W - WALL && py > WALL && py < H - WALL) continue; cloudPuff(x, px, py, 10 + r()*14, i % 3 ? 'rgba(255,236,230,.85)' : 'rgba(255,214,214,.75)'); }
      // tranche du plateau visible en bas et sur les côtés (blocs de pierre)
      const face = 20;
      x.fillStyle = vgrad(x, H - WALL, H - WALL + face, ['#7a7a68','#4e4c44']); x.fillRect(WALL - 6, H - WALL, W - (WALL - 6)*2, face);
      for (let xx = WALL - 6; xx < W - WALL + 6; xx += 24){ x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(xx, H - WALL, 2, face); x.fillRect(xx + 12, H - WALL + face/2, 2, face/2); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(WALL - 6, H - WALL + face/2, W - (WALL - 6)*2, 2);
      x.fillStyle = '#5c5a4e'; x.fillRect(WALL - 6, WALL - 6, 6, H - WALL*2 + 6); x.fillRect(W - WALL, WALL - 6, 6, H - WALL*2 + 6); x.fillRect(WALL - 6, WALL - 6, W - (WALL - 6)*2, 6);
      // dalles anciennes, joints, mousse, herbes dans les fissures
      for (let y=WALL, j=0; y<H-WALL; y+=46, j++) for (let xx=WALL - (j % 2)*23, i=0; xx<W-WALL; xx+=46, i++){
        const x0 = Math.max(WALL, xx), w = Math.min(xx + 46, W - WALL) - x0; if (w <= 0) continue;
        x.fillStyle = rpick(r, ['#8a9278','#828a70','#929a80','#7a8268']); x.fillRect(x0, y, w - 2, 44);
        x.fillStyle = 'rgba(255,255,240,.12)'; x.fillRect(x0, y, w - 2, 3); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(x0, y + 41, w - 2, 3); }
      noise(x, r, 3500, ['rgba(0,0,0,.12)','rgba(255,255,255,.08)','#6a7258']);
      for (let i=0;i<26;i++) blob(x, WALL + r()*IN.w, WALL + r()*IN.h, 10 + r()*22, r, rpick(r, ['rgba(80,118,60,.75)','rgba(98,136,70,.7)','rgba(66,100,52,.75)']));
      for (let i=0;i<30;i++) crackLine(x, r, WALL + r()*IN.w, WALL + r()*IN.h, 30 + r()*40, 'rgba(40,44,34,.7)');
      for (let i=0;i<60;i++){ const px = WALL + r()*IN.w, py = WALL + r()*IN.h; x.strokeStyle = rpick(r, ['#6aa048','#82b858']); x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 3, py - 7); x.moveTo(px, py); x.lineTo(px + 3, py - 8); x.moveTo(px, py); x.lineTo(px, py - 9); x.stroke(); }
      // marque gravée du dragon au centre
      x.strokeStyle = 'rgba(50,58,40,.8)'; x.lineWidth = 5; x.beginPath(); x.arc(CX, CY, 104, 0, TAU); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(CX, CY, 92, 0, TAU); x.stroke();
      x.lineWidth = 6; x.beginPath(); for (let i=0;i<=60;i++){ const a = i/60*TAU*1.6, rr = 20 + i*1.15; x.lineTo(CX + Math.cos(a)*rr, CY + Math.sin(a)*rr); } x.stroke();
      // piliers brisés aux quatre coins
      const stone = {light:'#b8b8a0', mid:'#8a8a78', dark:'#5a5a4c', top:'#c8c8b0'};
      for (const [px, py] of [[26, 46],[W - 26, 46],[26, H - 8],[W - 26, H - 8]]) column(x, px, py, 12, 34 + r()*12, stone, true, r);
    },
    anim(t){
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(WALL, WALL, W - WALL*2, H - WALL*2); ctx.clip('evenodd');
      for (let i=0;i<10;i++){ const x = ((t*16 + i*120) % (W + 160)) - 80, y = i % 2 ? 18 : H - 14; ctx.globalAlpha = .55; cloudPuff(ctx, x, y, 14, '#fff2ec'); }
      ctx.restore();
      ctx.fillStyle = '#ffffff'; for (let i=0;i<12;i++){ const rr = rng(i*41), y = WALL + rr()*IN.h, x = WALL + ((rr()*IN.w + t*90) % IN.w); ctx.globalAlpha = .25; ctx.fillRect(x, y, 10, 1.5); }
      ctx.globalAlpha = 1; }},

  // ---------- Colonnes Lance : marbre fissuré, estrade centrale, colonnes, ciel cosmique ----------
  colonnes:{name:'Colonnes Lance', line:'#e6dcff',
    paint(x, r){
      const g = x.createRadialGradient(CX, CY - 100, 80, CX, CY, W*.8); g.addColorStop(0, '#4a2a7a'); g.addColorStop(.6, '#24164a'); g.addColorStop(1, '#0c0820'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let i=0;i<260;i++){ x.fillStyle = rpick(r, ['#ffffff','#d8c8ff','#a8d0ff','#ffc8e8']); const s = r() < .1 ? 4 : 2; x.fillRect(Math.floor(r()*W/2)*2, Math.floor(r()*H/2)*2, s, s); }
      for (const [cx, cy, col] of [[120, 40, 'rgba(255,120,200,.25)'], [W - 140, H - 30, 'rgba(120,170,255,.25)']]){ const n = x.createRadialGradient(cx, cy, 0, cx, cy, 160); n.addColorStop(0, col); n.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = n; x.fillRect(0, 0, W, H); }
      // dalles de marbre avec veines
      for (let y=WALL, j=0; y<H-WALL; y+=82, j++) for (let xx=WALL, i=0; xx<W-WALL; xx+=82, i++){
        const w = Math.min(82, W - WALL - xx), h = Math.min(82, H - WALL - y);
        x.fillStyle = rpick(r, ['#9c9ab6','#a4a2bc','#9492ae','#aaa8c2']); x.fillRect(xx, y, w - 3, h - 3);
        x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(xx, y, w - 3, 3); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(xx + w - 6, y, 3, h - 3);
        x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(xx + r()*w, y); x.quadraticCurveTo(xx + r()*w, y + h/2, xx + r()*w, y + h); x.stroke(); }
      noise(x, r, 2600, ['rgba(0,0,0,.1)','rgba(255,255,255,.07)']);
      // dalles effondrées : on voit le vide cosmique, avec l'épaisseur de la dalle
      for (let i=0;i<7;i++){ const tx = WALL + Math.floor(r()*(IN.w/82))*82, ty = WALL + Math.floor(r()*(IN.h/82))*82; if (Math.hypot(tx + 41 - CX, ty + 41 - CY) < 200) continue;
        x.fillStyle = '#140c2c'; x.fillRect(tx, ty, 79, 79); x.fillStyle = '#5a5876'; x.fillRect(tx, ty, 79, 10); x.fillStyle = 'rgba(200,180,255,.6)'; x.fillRect(tx + 20 + r()*40, ty + 30 + r()*30, 2, 2); }
      for (let i=0;i<22;i++) crackLine(x, r, WALL + r()*IN.w, WALL + r()*IN.h, 50 + r()*50, 'rgba(50,46,80,.75)', 2);
      // estrade centrale à deux marches
      for (const [R, top, face] of [[150, '#b2b0c8', '#6e6c88'], [112, '#c0bed6', '#7a7896']]){ shadowEll(x, CX + 6, CY + 14, R + 4, R*.92 + 4, .3);
        x.fillStyle = face; x.beginPath(); x.ellipse(CX, CY + 10, R, R*.92, 0, 0, TAU); x.fill(); x.fillStyle = top; x.beginPath(); x.ellipse(CX, CY, R, R*.92, 0, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(214,150,230,.75)'; x.lineWidth = 4; x.beginPath(); x.ellipse(CX, CY, 84, 78, 0, 0, TAU); x.stroke(); x.beginPath(); x.ellipse(CX, CY, 50, 46, 0, 0, TAU); x.stroke();
      x.beginPath(); for (let i=0;i<8;i++){ const a = i/8*TAU; x.moveTo(CX + Math.cos(a)*50, CY + Math.sin(a)*46); x.lineTo(CX + Math.cos(a)*84, CY + Math.sin(a)*78); } x.stroke();
      // colonnes : rangée du fond (en haut) très hautes, colonnes brisées sur les côtés et en bas
      const marble = {light:'#e8e6f4', mid:'#bab8d0', dark:'#7e7c98', top:'#f4f2fc'};
      for (let i=0;i<7;i++){ const px = WALL + 30 + i*(IN.w - 60)/6; column(x, px, WALL - 2, 15, 70, marble, i === 2 || i === 5, r); }
      for (let i=0;i<5;i++){ const py = WALL + 90 + i*(IN.h - 120)/4; column(x, 26, py, 11, 28 + r()*16, marble, true, r); column(x, W - 26, py, 11, 28 + r()*16, marble, i % 2 === 0, r); }
      for (let i=0;i<6;i++) column(x, WALL + 50 + i*(IN.w - 100)/5, H - 10, 12, 18 + r()*10, marble, true, r);
    },
    anim(t){
      const k = (Math.sin(t*1.5) + 1)/2; ctx.globalAlpha = .18 + .22*k; ctx.strokeStyle = k > .5 ? '#ff8ad8' : '#8ab8ff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(CX, CY, 84, 78, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(CX, CY, 112, 103, 0, 0, TAU); ctx.stroke();
      for (let i=0;i<30;i++){ const rr = rng(i*13 + 1), x = WALL + rr()*IN.w, ph = (t*.12 + rr()) % 1, y = H - WALL - ph*IN.h;
        ctx.globalAlpha = Math.sin(ph*Math.PI)*.75; ctx.fillStyle = i % 2 ? '#ffc8f0' : '#c8e0ff'; ctx.fillRect(Math.floor(x/2)*2, Math.floor(y/2)*2, 3, 3); }
      ctx.globalAlpha = 1; }},

  // ---------- Mont Couronné : sentier rocheux, falaises en strates, rochers enneigés ----------
  couronne:{name:'Mont Couronné', line:'#e6eef4',
    paint(x, r){
      x.fillStyle = '#3a3430'; x.fillRect(0, 0, W, H);
      // sol de roche et gravier
      x.fillStyle = '#7a726a'; x.fillRect(WALL, WALL, IN.w, IN.h);
      noise(x, r, 9000, ['#6a645e','#837c74','#5e5852','#8e877e','#746d65']);
      for (let i=0;i<18;i++) blob(x, WALL + r()*IN.w, WALL + r()*IN.h, 22 + r()*34, r, rpick(r, ['rgba(96,88,80,.6)','rgba(120,112,104,.5)']), 11);
      for (let i=0;i<26;i++) crackLine(x, r, WALL + r()*IN.w, WALL + r()*IN.h, 40 + r()*40, 'rgba(46,40,36,.7)', 2);
      for (let i=0;i<90;i++){ const px = WALL + r()*IN.w, py = WALL + r()*IN.h, s = 2 + r()*3; x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + 1, py + 1, s*2, s); x.fillStyle = rpick(r, ['#a49c92','#8c857c']); x.fillRect(px, py, s*2, s); }
      // congères le long des bords (plus en haut, à l'ombre de la falaise)
      for (let i=0;i<34;i++){ const side = r(), along = r();
        const [sx, sy] = side < .4 ? [WALL + along*IN.w, WALL + r()*40] : side < .6 ? [WALL + r()*30, WALL + along*IN.h] : side < .8 ? [W - WALL - r()*30, WALL + along*IN.h] : [WALL + along*IN.w, H - WALL - r()*24];
        blob(x, sx, sy, 10 + r()*18, r, 'rgba(214,226,236,.8)'); blob(x, sx - 2, sy - 3, 6 + r()*10, r, 'rgba(244,248,251,.85)'); }
      x.fillStyle = vgrad(x, WALL, WALL + 70, ['rgba(20,24,40,.4)','rgba(20,24,40,0)']); x.fillRect(WALL, WALL, IN.w, 70);
      // falaise en strates en haut, parois sur les côtés et en bas
      cliffTop(x, r, WALL, ['#5a524a','#4a443e','#625a52'], true);
      const rock = {dark:'#3e3832', mid:'#5c544c', light:'#7c746a'};
      for (let y = WALL; y < H; y += 22){ rockLump(x, 18 + r()*12, y, 16 + r()*8, rock, r, r() < .45); rockLump(x, W - 18 - r()*12, y, 16 + r()*8, rock, r, r() < .45); }
      for (let xx = WALL; xx < W - WALL; xx += 26) rockLump(x, xx, H - 20 + r()*8, 15 + r()*8, rock, r, r() < .35);
    },
    anim(t){
      ctx.fillStyle = '#ffffff';
      for (let i=0;i<90;i++){ const rr = rng(i*31 + 7), sp = 28 + rr()*40, x = (rr()*W + Math.sin(t*.8 + i)*20 + W) % W, y = (rr()*H + t*sp) % H, s = rr() < .3 ? 4 : 2;
        ctx.globalAlpha = .55 + rr()*.4; ctx.fillRect(Math.floor(x/2)*2, Math.floor(y/2)*2, s, s); }
      for (let i=0;i<3;i++){ const x = ((t*14 + i*320) % (W + 440)) - 220, y = 180 + i*210; ctx.globalAlpha = .07; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, 240, 50, 0, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; }},

  // ---------- Château de Ghetsis : salle du trône, mur du fond, colonnes dorées, tapis ----------
  chateau:{name:'Château de Ghetsis', line:'#e6c060',
    paint(x, r){
      x.fillStyle = '#120e18'; x.fillRect(0, 0, W, H);
      // sol de marbre sombre en damier, avec reflets
      for (let y=WALL, j=0; y<H-WALL; y+=56, j++) for (let xx=WALL, i=0; xx<W-WALL; xx+=56, i++){ x.fillStyle = (i + j) % 2 ? '#3a3248' : '#2c2638'; x.fillRect(xx, y, Math.min(56, W - WALL - xx), Math.min(56, H - WALL - y)); }
      x.fillStyle = 'rgba(216,176,80,.35)'; for (let y=WALL; y<H-WALL; y+=56) x.fillRect(WALL, y, IN.w, 1.5); for (let xx=WALL; xx<W-WALL; xx+=56) x.fillRect(xx, WALL, 1.5, IN.h);
      noise(x, r, 2500, ['rgba(0,0,0,.18)','rgba(255,255,255,.05)']);
      for (let i=0;i<5;i++){ x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); const sx = WALL + r()*IN.w; x.moveTo(sx, WALL); x.lineTo(sx + 40, WALL); x.lineTo(sx - 120, H - WALL); x.lineTo(sx - 160, H - WALL); x.closePath(); x.fill(); }
      // tapis pourpre bordé d'or, motifs
      x.fillStyle = '#4e1020'; x.fillRect(CX - 76, WALL, 152, IN.h); x.fillStyle = vgrad(x, WALL, H - WALL, ['#8a2236','#6e1a2c']); x.fillRect(CX - 62, WALL, 124, IN.h);
      x.fillStyle = '#d8b050'; x.fillRect(CX - 76, WALL, 5, IN.h); x.fillRect(CX + 71, WALL, 5, IN.h); x.fillRect(CX - 58, WALL, 2, IN.h); x.fillRect(CX + 56, WALL, 2, IN.h);
      for (let y = WALL + 40; y < H - WALL; y += 64){ x.fillStyle = '#d8b050'; x.beginPath(); x.moveTo(CX, y - 12); x.lineTo(CX + 12, y); x.lineTo(CX, y + 12); x.lineTo(CX - 12, y); x.closePath(); x.fill(); x.fillStyle = '#6e1a2c'; x.fillRect(CX - 4, y - 4, 8, 8); }
      x.fillStyle = vgrad(x, WALL, WALL + 60, ['rgba(0,0,0,.45)','rgba(0,0,0,0)']); x.fillRect(WALL, WALL, IN.w, 60);
      // mur du fond : blocs de pierre, bannières, trône sur une estrade
      x.fillStyle = vgrad(x, 0, WALL, ['#1e1828','#2e2640']); x.fillRect(0, 0, W, WALL);
      for (let y=0; y<WALL; y+=12) for (let xx = (y/12) % 2 ? 0 : 20; xx < W; xx += 40){ x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(xx, y, 2, 12); x.fillRect(0, y + 10, W, 2); }
      for (const bx of [CX - 220, CX - 130, CX + 110, CX + 200]){ x.fillStyle = '#4a1a5e'; x.fillRect(bx, 2, 22, WALL - 8); x.beginPath(); x.moveTo(bx, WALL - 6); x.lineTo(bx + 11, WALL); x.lineTo(bx + 22, WALL - 6); x.fill();
        x.fillStyle = '#d8b050'; x.fillRect(bx, 2, 22, 3); x.beginPath(); x.arc(bx + 11, WALL/2, 5, 0, TAU); x.fill(); }
      x.fillStyle = '#5a4a2a'; x.fillRect(CX - 60, WALL - 10, 120, 12); x.fillStyle = '#7a6a3a'; x.fillRect(CX - 60, WALL - 12, 120, 3);
      x.fillStyle = vgrad(x, 0, WALL - 10, ['#f0d070','#a8842a']); x.beginPath(); x.moveTo(CX - 26, WALL - 10); x.lineTo(CX - 26, 10); x.quadraticCurveTo(CX, -6, CX + 26, 10); x.lineTo(CX + 26, WALL - 10); x.closePath(); x.fill();
      x.fillStyle = '#6a1a3a'; x.fillRect(CX - 16, 14, 32, WALL - 26);
      // murs latéraux et du bas, colonnes dorées
      x.fillStyle = '#1a1424'; x.fillRect(0, WALL, WALL, H - WALL); x.fillRect(W - WALL, WALL, WALL, H - WALL); x.fillRect(0, H - WALL, W, WALL);
      x.fillStyle = '#3a2e4a'; x.fillRect(WALL - 4, WALL, 4, IN.h); x.fillRect(W - WALL, WALL, 4, IN.h); x.fillRect(WALL, H - WALL, IN.w, 4);
      const pil = {light:'#6a5a80', mid:'#4a3e5c', dark:'#2a2236', top:'#d8b050'};
      for (let i=0;i<5;i++){ const py = WALL + 70 + i*(IN.h - 100)/4; column(x, 26, py, 12, 40, pil, false, r); column(x, W - 26, py, 12, 40, pil, false, r); }
    },
    anim(t){
      for (const p of TORCHES()){ ctx.globalAlpha = .55; glowBall(p.x, p.y, 16 + Math.sin(t*9 + p.x)*2, '#ffd890', '#ff9a40', '#ff6a1a'); ctx.globalAlpha = 1; drawFlame(p.x, p.y + 2, 5 + Math.sin(t*14 + p.y)*1.4, .95); }
      for (let i=0;i<20;i++){ const rr = rng(i*19 + 2), x = WALL + rr()*IN.w, y = WALL + ((rr()*IN.h - t*8) % IN.h + IN.h) % IN.h; ctx.globalAlpha = .25 + .2*Math.sin(t*2 + i); ctx.fillStyle = '#f0d890'; ctx.fillRect(x, y, 2, 2); }
      ctx.globalAlpha = 1; }},

  // ---------- Îles Tourbillon : grotte de Lugia, cascade, île de roche mouillée ----------
  tourbillon:{name:'Îles Tourbillon', line:'#cfe6ff',
    paint(x, r){
      x.fillStyle = '#0c2238'; x.fillRect(0, 0, W, H);
      // eau sombre autour de l'île
      for (let i=0;i<600;i++){ x.fillStyle = rpick(r, ['#103050','#0a1e34','#163a5e']); x.fillRect(Math.floor(r()*W/2)*2, Math.floor(r()*H/2)*2, 10, 2); }
      // falaise du fond avec la cascade
      cliffTop(x, r, WALL, ['#2e3a46','#26303a','#36424e'], false);
      x.fillStyle = vgrad(x, 0, WALL, ['#9ec4e8','#5a8ab8']); x.fillRect(CX - 120, 0, 240, WALL);
      x.fillStyle = 'rgba(255,255,255,.5)'; for (let xx = CX - 116; xx < CX + 116; xx += 8) x.fillRect(xx + r()*4, 0, 2, WALL);
      // île : bord de roche (face avant) puis dessus mouillé
      const isle = []; for (let i=0;i<48;i++){ const a = i/48*TAU, ca = Math.cos(a), sa = Math.sin(a), k = 1/Math.max(Math.abs(ca), Math.abs(sa))**.3;
        isle.push([CX + ca*(W/2 - WALL + 10)*Math.min(1.22, k)*(.97 + .05*r()), CY + sa*(H/2 - WALL + 10)*Math.min(1.22, k)*(.97 + .05*r())]); }
      x.fillStyle = '#1e262e'; x.beginPath(); isle.forEach(p => x.lineTo(p[0], p[1] + 14)); x.closePath(); x.fill();
      x.fillStyle = '#3e4a56'; x.beginPath(); isle.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.fill();
      x.save(); x.beginPath(); isle.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.clip();
      noise(x, r, 9000, ['#36424e','#465462','#303b46','#4e5c6a','#3a4652'], 2, {x0:0, y0:0, w:W, h:H});
      for (let i=0;i<14;i++) blob(x, WALL + r()*IN.w, WALL + r()*IN.h, 26 + r()*36, r, rpick(r, ['rgba(60,74,88,.6)','rgba(40,50,60,.5)']), 11);
      for (let i=0;i<20;i++) crackLine(x, r, WALL + r()*IN.w, WALL + r()*IN.h, 40 + r()*40, 'rgba(20,26,32,.7)', 2);
      for (let i=0;i<12;i++){ const px = WALL + 60 + r()*(IN.w - 120), py = WALL + 60 + r()*(IN.h - 120); blob(x, px, py, 16 + r()*22, r, '#1a4468'); blob(x, px - 3, py - 3, 9 + r()*12, r, '#24608e'); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px - 6, py - 6, 6, 2); }
      for (let i=0;i<20;i++) blob(x, WALL + r()*IN.w, WALL + r()*IN.h, 8 + r()*14, r, 'rgba(58,108,88,.5)');
      x.fillStyle = vgrad(x, WALL, WALL + 80, ['rgba(160,200,240,.18)','rgba(160,200,240,0)']); x.fillRect(0, WALL, W, 80);
      x.restore();
      x.strokeStyle = 'rgba(160,200,236,.55)'; x.lineWidth = 3; x.beginPath(); isle.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.stroke();
      // stalagmites dans les coins
      const st = {dark:'#1e262e', mid:'#3a4652', light:'#5a6a78'};
      for (const [px, py] of [[22, 70],[W - 22, 70],[24, H - 40],[W - 24, H - 40],[60, H - 18],[W - 60, H - 18]]){ shadowEll(x, px + 4, py + 2, 12, 4);
        x.fillStyle = hgrad(x, px - 10, px + 10, [st.light, st.mid, st.dark]); x.beginPath(); x.moveTo(px - 11, py); x.lineTo(px - 2, py - 40 - r()*16); x.lineTo(px + 11, py); x.closePath(); x.fill(); }
    },
    anim(t){
      for (let i=0;i<40;i++){ const rr = rng(i*17 + 3), x = CX - 116 + rr()*232, y = ((t*240 + rr()*200) % (WALL + 30)) - 12;
        ctx.globalAlpha = .75; ctx.fillStyle = i % 3 ? '#d8ecff' : '#ffffff'; ctx.fillRect(Math.floor(x/2)*2, Math.floor(y/2)*2, 3, 14); }
      ctx.globalAlpha = .16; ctx.fillStyle = '#ffffff'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.ellipse(CX - 125 + i*50, WALL + 12 + Math.sin(t*2 + i)*4, 54, 18, 0, 0, TAU); ctx.fill(); }
      for (let i=0;i<8;i++){ const rr = rng(i*5 + 11), x = rr() < .5 ? 12 + rr()*20 : W - 12 - rr()*20, y = 80 + rr()*(H - 160), ph = (t*.6 + rr()) % 1;
        ctx.globalAlpha = (1 - ph)*.6; ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 6 + ph*16, 3 + ph*7, 0, 0, TAU); ctx.stroke(); }
      for (let i=0;i<4;i++){ const rr = rng(i*23 + 9), x = WALL + 40 + rr()*(IN.w - 80), ph = (t*.5 + rr()) % 1, y = WALL + 40 + rr()*(IN.h - 80);
        if (ph < .15){ ctx.globalAlpha = .7; ctx.fillStyle = '#cfe6ff'; ctx.fillRect(x, y - 30 + ph*200, 2, 5); } else { ctx.globalAlpha = (1 - ph)*.5; ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, (ph - .15)*30, (ph - .15)*12, 0, 0, TAU); ctx.stroke(); } }
      ctx.globalAlpha = 1; }}
};
// supports de torches du Château (dans les murs, entre les colonnes)
const TORCHES = () => [...[1,2,3,4,5].map(i => ({x:26, y:WALL + 70 + (i - .5)*(H - WALL*2 - 100)/4})).filter(p => p.y < H - WALL - 10), ...[1,2,3,4].map(i => ({x:W - 26, y:WALL + 70 + (i - .5)*(H - WALL*2 - 100)/4}))];
// ---------- Décor de fond (au-dessus de l'arène, non jouable : y de -BACKDROP à 0) ----------
// Mise en scène comme une scène de théâtre : le haut de l'écran montre le fond de l'arène (gradins, trône, cascade…).
function stars(x, r, n, y0, y1){ for (let i=0;i<n;i++){ x.fillStyle = rpick(r, ['#ffffff','#d8c8ff','#a8d0ff','#ffc8e8']); x.fillRect(Math.floor(r()*W/2)*2, y0 + Math.floor(r()*(y1 - y0)/2)*2, r() < .1 ? 4 : 2, 2); } }
function peaks(x, r, base, h, col, snow, step=60){ x.fillStyle = col; x.beginPath(); x.moveTo(0, base); let xx = 0;
  const pts = []; while (xx <= W + step){ const py = base - h*(.45 + .55*r()); pts.push([xx, py]); x.lineTo(xx, py); xx += step*(.6 + .8*r()); }
  x.lineTo(W, base); x.closePath(); x.fill();
  if (snow){ x.fillStyle = snow; for (const [px, py] of pts){ x.beginPath(); x.moveTo(px - 14, py + 14); x.lineTo(px, py); x.lineTo(px + 14, py + 14); x.lineTo(px + 6, py + 10); x.lineTo(px, py + 16); x.lineTo(px - 6, py + 10); x.closePath(); x.fill(); } } }
const BACKDROPS = {
  stade(x, r){
    // tribune principale qui monte, foule, toit avec rampe de lumières, écran géant
    for (let y=-BACKDROP; y<WALL - 14; y+=7){ const k = (y + BACKDROP)/(BACKDROP + WALL); x.fillStyle = Math.floor(y/7) % 2 ? `rgb(${40+k*8},${50+k*10},${82+k*14})` : `rgb(${34+k*8},${44+k*10},${72+k*14})`; x.fillRect(0, y, W, 7); }
    const crowd = ['#e85a5a','#5a8ae8','#e8d25a','#f0f0f0','#5ae88a','#e88ad2','#2a2a3a','#f0a050'];
    for (let i=0;i<5200;i++){ const px = Math.floor(r()*W/2)*2, py = -BACKDROP + 26 + Math.floor(r()*(BACKDROP + WALL - 40)/2)*2; if (r() < .75){ x.fillStyle = rpick(r, crowd); x.fillRect(px, py, 2, 2); } }
    x.fillStyle = '#141a2c'; x.fillRect(0, -BACKDROP, W, 24); x.fillStyle = '#2a3250'; x.fillRect(0, -BACKDROP + 20, W, 4);
    for (let xx=10; xx<W; xx+=22){ x.fillStyle = '#fff4c8'; x.fillRect(xx, -BACKDROP + 8, 8, 6); }
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(CX - 106, -BACKDROP + 26, 212, 74); x.fillStyle = '#10141f'; x.fillRect(CX - 100, -BACKDROP + 22, 200, 70);
    x.strokeStyle = '#5a6a98'; x.lineWidth = 3; x.strokeRect(CX - 100, -BACKDROP + 22, 200, 70);
    x.fillStyle = '#2a7a3a'; x.fillRect(CX - 92, -BACKDROP + 30, 184, 54);
    x.fillStyle = '#e8f0e0'; x.fillRect(CX - 92, -BACKDROP + 56, 184, 2); x.fillStyle = '#d23a3a'; x.beginPath(); x.arc(CX, -BACKDROP + 57, 16, Math.PI, 0); x.fill();
    x.fillStyle = '#f0f0ea'; x.beginPath(); x.arc(CX, -BACKDROP + 57, 16, 0, Math.PI); x.fill(); x.fillStyle = '#1a1a22'; x.beginPath(); x.arc(CX, -BACKDROP + 57, 5, 0, TAU); x.fill();
  },
  pilier(x, r){
    x.fillStyle = vgrad(x, -BACKDROP, 0, ['#f8c890','#f2a860']); x.fillRect(0, -BACKDROP, W, BACKDROP);
    const sun = x.createRadialGradient(W*.72, -BACKDROP + 40, 0, W*.72, -BACKDROP + 40, 120); sun.addColorStop(0, 'rgba(255,250,220,.95)'); sun.addColorStop(.25, 'rgba(255,220,160,.5)'); sun.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = sun; x.fillRect(0, -BACKDROP, W, BACKDROP + WALL);
    // silhouette lointaine de Rayquaza dans les nuages
    x.strokeStyle = 'rgba(60,90,70,.35)'; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath();
    for (let i=0;i<=40;i++){ const k = i/40, px = 80 + k*300, py = -BACKDROP + 70 + Math.sin(k*TAU*1.4)*22; x.lineTo(px, py); } x.stroke();
    for (let i=0;i<34;i++) cloudPuff(x, r()*W, -BACKDROP + 60 + r()*(BACKDROP - 30), 14 + r()*22, i % 3 ? 'rgba(255,240,232,.9)' : 'rgba(255,216,206,.8)');
  },
  colonnes(x, r){
    const g = x.createLinearGradient(0, -BACKDROP, 0, WALL); g.addColorStop(0, '#0a0620'); g.addColorStop(1, '#24164a'); x.fillStyle = g; x.fillRect(0, -BACKDROP, W, BACKDROP);
    stars(x, r, 160, -BACKDROP, 0);
    // faille dimensionnelle au-dessus de l'estrade
    for (const [R, col] of [[90, 'rgba(255,120,200,.18)'], [60, 'rgba(140,170,255,.25)'], [30, 'rgba(255,255,255,.35)']]){ x.fillStyle = col; x.beginPath(); x.ellipse(CX, -BACKDROP + 54, R*1.5, R*.55, 0, 0, TAU); x.fill(); }
    // rangée de colonnes géantes au fond, certaines brisées, et blocs flottants
    const far = {light:'#c8c6dc', mid:'#9896b4', dark:'#5e5c7a', top:'#dcdaec'};
    for (let i=0;i<9;i++){ const px = 30 + i*(W - 60)/8; column(x, px, 2, 17, 96 + (i % 2)*12, far, i === 3 || i === 7, r); }
    for (let i=0;i<6;i++){ const px = 60 + r()*(W - 120), py = -BACKDROP + 20 + r()*40, s = 8 + r()*10; shadowEll(x, px + 3, py + s + 6, s, 3, .2); x.fillStyle = '#7e7c98'; x.fillRect(px - s, py, s*2, s); x.fillStyle = '#bab8d0'; x.fillRect(px - s, py - s*.5, s*2, s*.5); }
  },
  couronne(x, r){
    x.fillStyle = vgrad(x, -BACKDROP, 0, ['#5a6a8e','#9aa6be']); x.fillRect(0, -BACKDROP, W, BACKDROP);
    peaks(x, r, -20, 80, '#7a86a0', '#e8eef6', 70); peaks(x, r, 0, 60, '#5e6678', '#dfe6ee', 50);
    x.fillStyle = 'rgba(255,255,255,.25)'; for (let i=0;i<4;i++){ x.beginPath(); x.ellipse(r()*W, -BACKDROP + 60 + r()*40, 160, 14, 0, 0, TAU); x.fill(); }
  },
  chateau(x, r){
    // mur du fond très haut : blocs, deux vitraux, bannières, trône sur une estrade à marches
    x.fillStyle = vgrad(x, -BACKDROP, WALL, ['#141018','#2e2640']); x.fillRect(0, -BACKDROP, W, BACKDROP + WALL);
    for (let y=-BACKDROP; y<WALL; y+=14) for (let xx = (Math.floor(y/14) % 2) ? 0 : 22; xx < W; xx += 44){ x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(xx, y, 2, 14); x.fillRect(0, y + 12, W, 2); }
    for (const wx of [CX - 250, CX + 190]){ x.fillStyle = '#d8b050'; x.fillRect(wx - 4, -BACKDROP + 14, 68, 86); x.fillStyle = '#1a1424'; x.fillRect(wx, -BACKDROP + 18, 60, 78);
      for (let j=0;j<12;j++){ x.fillStyle = rpick(r, ['#6a2a8a','#a03a6a','#3a5aa8','#d8b050','#4a1a5e']); x.fillRect(wx + (j % 3)*20 + 1, -BACKDROP + 19 + Math.floor(j/3)*19, 18, 17); }
      x.fillStyle = 'rgba(255,220,160,.12)'; x.beginPath(); x.moveTo(wx, -BACKDROP + 96); x.lineTo(wx + 60, -BACKDROP + 96); x.lineTo(wx + 120, WALL + 120); x.lineTo(wx + 30, WALL + 120); x.closePath(); x.fill(); }
    for (const bx of [CX - 150, CX + 128]){ x.fillStyle = '#4a1a5e'; x.fillRect(bx, -BACKDROP + 10, 24, 96); x.beginPath(); x.moveTo(bx, -BACKDROP + 106); x.lineTo(bx + 12, -BACKDROP + 118); x.lineTo(bx + 24, -BACKDROP + 106); x.fill(); x.fillStyle = '#d8b050'; x.fillRect(bx, -BACKDROP + 10, 24, 4); x.beginPath(); x.arc(bx + 12, -BACKDROP + 54, 6, 0, TAU); x.fill(); }
    for (let s=0;s<4;s++){ const w = 220 - s*40, y = WALL - 8 - s*12; x.fillStyle = '#3a2e46'; x.fillRect(CX - w/2, y, w, 12); x.fillStyle = '#5a4a6e'; x.fillRect(CX - w/2, y, w, 3); x.fillStyle = '#7a1c30'; x.fillRect(CX - 30, y, 60, 12); }
    x.fillStyle = vgrad(x, -BACKDROP + 6, WALL - 50, ['#f0d070','#a8842a']); x.beginPath(); x.moveTo(CX - 34, WALL - 50); x.lineTo(CX - 34, -BACKDROP + 30); x.quadraticCurveTo(CX, -BACKDROP + 2, CX + 34, -BACKDROP + 30); x.lineTo(CX + 34, WALL - 50); x.closePath(); x.fill();
    x.fillStyle = '#6a1a3a'; x.fillRect(CX - 22, -BACKDROP + 36, 44, WALL - 50 + BACKDROP - 40); x.fillStyle = '#d8b050'; x.fillRect(CX - 40, WALL - 56, 80, 8);
  },
  tourbillon(x, r){
    // plafond de grotte avec stalactites, parois, et la grande cascade qui tombe dans le bassin
    x.fillStyle = vgrad(x, -BACKDROP, WALL, ['#05101c','#1c2a38']); x.fillRect(0, -BACKDROP, W, BACKDROP + WALL);
    for (let i=0;i<26;i++){ const px = r()*W, h = 20 + r()*40; x.fillStyle = hgrad(x, px - 8, px + 8, ['#3a4a5a','#1e2832']); x.beginPath(); x.moveTo(px - 9, -BACKDROP); x.lineTo(px, -BACKDROP + h); x.lineTo(px + 9, -BACKDROP); x.closePath(); x.fill(); }
    for (const side of [0, 1]){ x.fillStyle = '#26323e'; x.beginPath(); const sx = side ? W : 0, d = side ? -1 : 1; x.moveTo(sx, -BACKDROP); x.lineTo(sx + d*140, -BACKDROP); x.lineTo(sx + d*90, WALL); x.lineTo(sx, WALL); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,.06)'; for (let i=0;i<30;i++) x.fillRect(sx + d*r()*110, -BACKDROP + r()*(BACKDROP + WALL), 6, 2); }
    x.fillStyle = vgrad(x, -BACKDROP, WALL, ['#cfe6ff','#7aa6d6','#5a8ab8']); x.fillRect(CX - 120, -BACKDROP, 240, BACKDROP + WALL);
    x.fillStyle = 'rgba(255,255,255,.55)'; for (let xx = CX - 116; xx < CX + 116; xx += 7) x.fillRect(xx + r()*4, -BACKDROP, 2, BACKDROP + WALL);
    x.fillStyle = '#2e3a46'; x.fillRect(CX - 140, -BACKDROP, 22, BACKDROP + WALL - 10); x.fillRect(CX + 118, -BACKDROP, 22, BACKDROP + WALL - 10);
  }
};

// ---------- Images d'arène (facultatives) : arenes/<arène>.png | .jpg | .webp ----------
// Images d'arène présentes dans le dossier arenes/ (sinon le décor dessiné est utilisé).
// frame (facultatif) = zone de combat dans l'image, en pixels [gauche, haut, droite, bas] : le jeu étire l'image pour que ce
// rectangle tombe pile sur l'arène (murs exclus), et ce qui est au-dessus devient le décor de fond. Sans frame : l'image est
// ajustée à la largeur de l'arène et calée en bas (son carré du bas est l'arène).
// backdrop (facultatif) = hauteur du décor de fond affiché au-dessus de l'arène (110 par défaut), pour montrer plus du haut de l'image.
// shade (facultatif, 0 à 1) = voile sombre sur l'arène et ses murs, pour qu'un sol très clair laisse les attaques lisibles. Voir arenes/LISEZMOI.md.
const ARENA_IMAGES = {pilier:{file:'pilier.jpg', frame:[130, 556, 636, 1086]}, colonnes:{file:'colonnes.jpg', frame:[130, 556, 636, 1088], shade:.35}, chateau:{file:'chateau.jpg', frame:[94, 494, 754, 1189], backdrop:300}, tourbillon:{file:'tourbillon.jpg', frame:[168, 628, 602, 1080], backdrop:500, top:250}, couronne:{file:'couronne.webp', frame:[92, 427, 478, 808], backdrop:680}, stade:{file:'stade.webp', frame:[55, 375, 520, 905], shade:.25, backdrop:400}};
const ARENA_FRAME = Object.fromEntries(Object.entries(ARENA_IMAGES).filter(([k, v]) => v.frame).map(([k, v]) => [k, v.frame]));
const ARENA_IMG = {};
for (const [k, v] of Object.entries(ARENA_IMAGES)){ const img = new Image(); img.onload = () => { ARENA_IMG[k] = img; }; img.src = 'arenes/' + v.file; }

// ---------- Ambiance par arène (par-dessus le décor, image ou dessin) ----------
const AMBIENCE = {
  stade:{vignette:.22, kind:'motes', col:['#fff4c0'], n:14},
  pilier:{vignette:.18, kind:'wind', col:['#ffffff'], n:16},
  colonnes:{vignette:.35, kind:'rise', col:['#ffc8f0','#c8e0ff'], n:26},
  couronne:{vignette:.3, kind:'snow', col:['#ffffff'], n:80, fog:true},
  chateau:{vignette:.42, kind:'motes', col:['#f0d890'], n:22},
  tourbillon:{vignette:.38, kind:'mist', col:['#cfe6ff'], n:16, fog:true}
};
function drawAmbience(key, t, imageMode){
  const A = AMBIENCE[key]; if (!A) return;
  // en mode image, on ajoute les particules d'ambiance (le dessin a déjà les siennes)
  if (imageMode){
    for (let i=0;i<A.n;i++){ const rr = rng(i*31 + 7), col = A.col[i % A.col.length]; ctx.fillStyle = col;
      if (A.kind === 'snow'){ const x = (rr()*W + Math.sin(t*.8 + i)*20 + W) % W, y = -BACKDROP + (rr()*(H + BACKDROP) + t*(28 + rr()*40)) % (H + BACKDROP); ctx.globalAlpha = .55 + rr()*.4; ctx.fillRect(x, y, 3, 3); }
      else if (A.kind === 'rise'){ const ph = (t*.12 + rr()) % 1, x = rr()*W, y = H - ph*(H + BACKDROP); ctx.globalAlpha = Math.sin(ph*Math.PI)*.75; ctx.fillRect(x, y, 3, 3); }
      else if (A.kind === 'wind'){ const y = -BACKDROP + rr()*(H + BACKDROP), x = (rr()*W + t*120) % W; ctx.globalAlpha = .25; ctx.fillRect(x, y, 12, 1.5); }
      else if (A.kind === 'mist'){ const x = ((rr()*W + t*10) % (W + 200)) - 100, y = -BACKDROP + rr()*(H + BACKDROP); ctx.globalAlpha = .06; ctx.beginPath(); ctx.ellipse(x, y, 90, 26, 0, 0, TAU); ctx.fill(); }
      else { const x = rr()*W, y = -BACKDROP + ((rr()*(H + BACKDROP) - t*10) % (H + BACKDROP) + H + BACKDROP) % (H + BACKDROP); ctx.globalAlpha = .3 + .25*Math.sin(t*2 + i); ctx.fillRect(x, y, 2, 2); } }
    if (A.fog) for (let i=0;i<3;i++){ const x = ((t*14 + i*320) % (W + 440)) - 220, y = 120 + i*220; ctx.globalAlpha = .06; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, 240, 50, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // vignettage : les bords s'assombrissent, le centre de l'arène ressort
  const g = ctx.createRadialGradient(CX, CY, H*.32, CX, CY - BACKDROP/2, H*.82); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${A.vignette})`);
  ctx.fillStyle = g; ctx.fillRect(0, -BACKDROP, W, H + BACKDROP);
}
const BG_CACHE = {};
function arenaBg(key){
  if (BG_CACHE[key]) return BG_CACHE[key];
  const c = document.createElement('canvas'); c.width = W/BG_RES; c.height = (H + BACKDROP)/BG_RES;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(1/BG_RES, 1/BG_RES); x.translate(0, BACKDROP);
  const r = rng(key.length*977 + key.charCodeAt(0));
  ARENAS[key].paint(x, r); if (BACKDROPS[key]) BACKDROPS[key](x, r);
  return BG_CACHE[key] = c;
}
