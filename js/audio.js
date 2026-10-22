// Sons, musiques et vibrations
// =====================================================================
// SONS, MUSIQUE ET VIBRATIONS (synthétisés avec Web Audio : aucun fichier à charger)
// =====================================================================
const AUDIO = (() => {
  const pref = {sfx:true, music:true, vibe:true};
  try { Object.assign(pref, JSON.parse(localStorage.getItem('arene-son') || '{}')); } catch(e){}
  const savePref = () => { try { localStorage.setItem('arene-son', JSON.stringify(pref)); } catch(e){} };
  const SFX_VOL = .55, MUS_VOL = .15;
  let ac = null, sfxBus, musBus, noiseBuf, mus = null, wantMusic = null, ducked = false;
  const last = {};
  const mtof = m => 440*Math.pow(2, (m - 69)/12);

  // le navigateur n'autorise le son qu'après un geste (clic, touche, toucher)
  function unlock(){
    if (!ac){
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC();
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = pref.sfx ? SFX_VOL : 0; sfxBus.connect(comp);
      musBus = ac.createGain(); musBus.gain.value = pref.music ? MUS_VOL : 0; musBus.connect(comp);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    if (wantMusic && !mus) startMusic(wantMusic);
  }
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, {capture:true, passive:true});
  const on = () => ac && ac.state === 'running' && pref.sfx;
  const gate = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };   // évite d'empiler un même son

  function tone({f=440, f2, dur=.15, type='square', vol=.3, at=0, bus, attack=.005}){
    const t = ac.currentTime + Math.max(0, at), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + .03);
  }
  function noise({dur=.2, vol=.3, freq=1200, freq2, q=1, type='lowpass', at=0, bus}){
    const t = ac.currentTime + Math.max(0, at), s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(freq, t); if (freq2) fl.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random()*.5); s.stop(t + dur + .03);
  }

  // couleur sonore de chaque type, à l'impact
  const FLAVOR = {
    Fire:     k => noise({dur:.3, vol:.32*k, freq:1400, freq2:250}),
    Water:    k => { tone({f:700, f2:160, dur:.2, type:'sine', vol:.32*k}); noise({dur:.14, vol:.12*k, freq:2600, type:'highpass'}); },
    Electric: k => { for (let i=0;i<4;i++) tone({f:900 + Math.random()*1100, dur:.045, type:'square', vol:.1*k, at:i*.03}); },
    Grass:    k => noise({dur:.2, vol:.26*k, freq:3200, type:'bandpass', q:2}),
    Ice:      k => { tone({f:1900, dur:.28, type:'triangle', vol:.16*k}); tone({f:2850, dur:.22, type:'triangle', vol:.09*k, at:.03}); },
    Fighting: k => noise({dur:.12, vol:.4*k, freq:900, freq2:200}),
    Poison:   k => { tone({f:260, f2:520, dur:.16, type:'sine', vol:.2*k}); tone({f:390, f2:700, dur:.12, type:'sine', vol:.14*k, at:.06}); },
    Ground:   k => noise({dur:.35, vol:.42*k, freq:420, freq2:110}),
    Flying:   k => noise({dur:.22, vol:.25*k, freq:1800, freq2:600, type:'bandpass', q:1.5}),
    Psychic:  k => tone({f:480, f2:1250, dur:.24, type:'sine', vol:.24*k}),
    Bug:      k => { for (let i=0;i<3;i++) tone({f:700 + i*90, dur:.05, type:'sawtooth', vol:.08*k, at:i*.035}); },
    Rock:     k => { noise({dur:.28, vol:.4*k, freq:600, freq2:140}); noise({dur:.08, vol:.2*k, freq:2200, type:'bandpass', at:.05}); },
    Ghost:    k => tone({f:330, f2:140, dur:.34, type:'triangle', vol:.24*k}),
    Dragon:   k => { tone({f:120, f2:55, dur:.32, type:'sawtooth', vol:.22*k}); noise({dur:.22, vol:.22*k, freq:700}); },
    Dark:     k => { tone({f:200, f2:90, dur:.22, type:'square', vol:.12*k}); noise({dur:.15, vol:.22*k, freq:500}); },
    Steel:    k => { tone({f:1250, dur:.32, type:'square', vol:.07*k}); tone({f:1680, dur:.26, type:'square', vol:.05*k}); },
    Fairy:    k => [1320, 1760, 2200].forEach((f, i) => tone({f, dur:.18, type:'sine', vol:.13*k, at:i*.045})),
    Normal:   k => noise({dur:.14, vol:.3*k, freq:1000, freq2:300}),
  };

  const S = {
    hit(type, dmg, eff){ if (!on() || !gate('hit', 35)) return;
      const k = Math.min(1.3, .55 + dmg/40);
      tone({f:170, f2:45, dur:.14, type:'sine', vol:.45*k});   // impact sourd commun
      (FLAVOR[type] || FLAVOR.Normal)(k);
      if (eff > 1) [880, 1320].forEach((f, i) => tone({f, dur:.12, type:'square', vol:.06, at:.04 + i*.06}));
      else if (eff < 1) tone({f:220, f2:160, dur:.12, type:'triangle', vol:.1, at:.03}); },
    immune(){ if (on() && gate('imm', 80)) tone({f:300, f2:200, dur:.14, type:'triangle', vol:.12}); },
    cast(mv){ if (!on() || !gate('cast', 30)) return;
      if (mv.k === 'sig'){ const b = mtof(64 + Math.floor(Math.random()*3)); [1, 1.25, 1.5, 2].forEach((m, i) => tone({f:b*m, dur:.16, type:'square', vol:.07, at:i*.045})); noise({dur:.3, vol:.12, freq:600, freq2:4000, type:'bandpass', q:1.2}); return; }
      if (['buff', 'heal', 'rest'].includes(mv.k)){ tone({f:520, f2:1040, dur:.25, type:'triangle', vol:.12}); return; }
      noise({dur:.12, vol:.12, freq:900, freq2:2600, type:'bandpass', q:1.4}); },
    dash(){ if (on() && gate('dash', 40)) noise({dur:.18, vol:.2, freq:500, freq2:2400, type:'bandpass', q:1.8}); },
    swap(){ if (!on()) return; tone({f:660, dur:.08, type:'square', vol:.08}); tone({f:990, dur:.12, type:'square', vol:.08, at:.07}); },
    ko(){ if (!on()) return; tone({f:520, f2:70, dur:.7, type:'square', vol:.12}); noise({dur:.5, vol:.3, freq:800, freq2:100}); },
    count(go){ if (!on()) return; tone({f:go ? 1047 : 523, dur:go ? .35 : .12, type:'square', vol:.1}); if (go) tone({f:1568, dur:.3, type:'square', vol:.05, at:.02}); },
    ui(){ if (on() && gate('ui', 40)) tone({f:900, dur:.04, type:'square', vol:.05}); },
    end(win){ if (!on()) return; const seq = win ? [72, 76, 79, 84] : [67, 63, 60, 55];
      seq.forEach((m, i) => tone({f:mtof(m), dur:i === 3 ? .6 : .16, type:'square', vol:.1, at:i*.15})); }
  };

  // ---------- musique : une boucle par arène, générée à partir d'une graine ----------
  const THEMES = {
    stade:      {bpm:138, root:60, scale:[0,2,4,5,7,9,11], prog:[0,4,5,3], lead:'square',   seed:11},
    pilier:     {bpm:116, root:62, scale:[0,2,3,5,7,9,10], prog:[0,6,5,6], lead:'square',   seed:7},
    colonnes:   {bpm:104, root:64, scale:[0,1,3,5,7,8,10], prog:[0,5,6,4], lead:'triangle', seed:23},
    couronne:   {bpm:124, root:57, scale:[0,2,3,5,7,8,10], prog:[0,5,2,6], lead:'square',   seed:5},
    chateau:    {bpm:100, root:60, scale:[0,2,3,5,7,8,11], prog:[0,5,3,4], lead:'sawtooth', seed:31},
    tourbillon: {bpm:92,  root:65, scale:[0,2,4,6,7,9,11], prog:[0,1,5,4], lead:'triangle', seed:17},
  };
  function rng(seed){ let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
  function startMusic(key){
    const T = THEMES[key] || THEMES.stade, r = rng(T.seed), step = 60/T.bpm/2;
    const note = (deg, oct = 0) => T.root + T.scale[((deg % 7) + 7) % 7] + 12*(Math.floor(deg/7) + oct);
    // mélodie de 4 mesures (8 croches chacune), et une variante pour le pont
    const melody = () => { const m = []; for (let c=0;c<4;c++) for (let s=0;s<8;s++){ const ch = T.prog[c];
      let v = (s % 2 === 0 || r() < .4) ? (r() < .65 ? ch + [0,2,4][Math.floor(r()*3)] : ch + Math.floor(r()*7)) : null;
      if (s === 7 && r() < .5) v = null; m.push(v); } return m; };
    const A = melody(), B = melody();
    mus = {i:0, next:ac.currentTime + .12};
    const play = (i, t) => {
      const at = t - ac.currentTime, s = i % 8, bar = Math.floor(i/8) % 4, part = Math.floor(i/32) % 4, ch = T.prog[bar], b = musBus;
      if ([0, 3, 4, 6].includes(s)) tone({f:mtof(note(s === 4 ? ch + 4 : ch, -2)), dur:step*1.6, type:'triangle', vol:.5, at, bus:b});   // basse
      if (part > 0) tone({f:mtof(note(ch + [0,2,4,2][s % 4], 0)), dur:step*.9, type:'square', vol:.07, at, bus:b});                         // arpège
      const mel = part === 2 ? B : A, v = mel[i % 32];
      if (part !== 0 && v !== null) tone({f:mtof(note(v, 1)), dur:step*1.8, type:T.lead, vol:T.lead === 'sawtooth' ? .09 : .13, at, bus:b}); // mélodie
      if (s === 0 || s === 4) tone({f:150, f2:45, dur:.16, type:'sine', vol:.6, at, bus:b});                                              // grosse caisse
      if (s === 2 || s === 6) noise({dur:.12, vol:.22, freq:1800, type:'bandpass', q:.8, at, bus:b});                                     // caisse claire
      noise({dur:s % 2 ? .06 : .03, vol:.08, freq:7000, type:'highpass', at, bus:b});                                                       // charleston
    };
    mus.timer = setInterval(() => { if (!mus) return; while (mus.next < ac.currentTime + .15){ play(mus.i, mus.next); mus.i++; mus.next += step; }
      if (mus.next < ac.currentTime) mus.next = ac.currentTime + .05; }, 25);
  }
  function stopMusic(){ if (mus){ clearInterval(mus.timer); mus = null; } }
  S.music = key => { wantMusic = key; stopMusic(); if (ac && ac.state === 'running') startMusic(key); };
  S.stopMusic = () => { wantMusic = null; stopMusic(); };
  const musGain = () => pref.music ? MUS_VOL*(ducked ? .35 : 1) : 0;
  S.duck = v => { ducked = v; if (ac) musBus.gain.setTargetAtTime(musGain(), ac.currentTime, .08); };   // musique plus basse pendant la pause

  // ---------- vibrations : téléphone et manette, quand ton Pokémon encaisse ----------
  // only : une manette précise (2 joueurs), false = téléphone seulement, absent = téléphone et toutes les manettes
  S.rumble = (strength, ms, only) => {
    if (!pref.vibe) return;
    try { if (!only && navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(ms); } catch(e){}
    if (only === false) return;
    try { for (const gp of only ? [only] : navigator.getGamepads ? navigator.getGamepads() : []) if (gp && gp.vibrationActuator)
      gp.vibrationActuator.playEffect('dual-rumble', {duration:ms, strongMagnitude:Math.min(1, strength), weakMagnitude:Math.min(1, strength*1.3)}).catch(() => {}); } catch(e){}
  };

  S.pref = pref;
  S.toggle = k => { pref[k] = !pref[k]; savePref();
    if (ac){ if (k === 'sfx') sfxBus.gain.value = pref.sfx ? SFX_VOL : 0; if (k === 'music') musBus.gain.value = musGain(); }
    if (k === 'vibe' && pref.vibe) S.rumble(.5, 80); };
  return S;
})();
// boutons Effets / Musique / Vibrations (menu et pause)
const SOUND_OPTS = [['sfx', 'Effets sonores'], ['music', 'Musique'], ['vibe', 'Vibrations']];
function renderSoundOpts(){ for (const id of ['pickS', 'pauseS']){ const el = $(id); if (el) el.innerHTML = SOUND_OPTS.map(([k, l]) => `<button class="pill" data-snd="${k}" aria-pressed="${AUDIO.pref[k]}">${l}</button>`).join(''); } }
document.addEventListener('click', e => { const b = e.target.closest('[data-snd]'); if (!b) return; AUDIO.toggle(b.dataset.snd); renderSoundOpts(); AUDIO.ui(); });
document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('[data-snd]')) AUDIO.ui(); });
renderSoundOpts();
