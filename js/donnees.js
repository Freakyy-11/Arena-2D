// Données : types, attaques, Pokémon, équipes, difficultés, chargement des sprites
// =====================================================================
// DONNÉES
// =====================================================================
const SPRITE_URL = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const TYPES = {
  Normal:['Normal','#A8A77A'], Fire:['Feu','#EE8130'], Water:['Eau','#6390F0'], Electric:['Électrik','#F7D02C'],
  Grass:['Plante','#7AC74C'], Ice:['Glace','#96D9D6'], Fighting:['Combat','#C22E28'], Poison:['Poison','#A33EA1'],
  Ground:['Sol','#E2BF65'], Flying:['Vol','#A98FF3'], Psychic:['Psy','#F95587'], Bug:['Insecte','#A6B91A'],
  Rock:['Roche','#B6A136'], Ghost:['Spectre','#735797'], Dragon:['Dragon','#6F35FC'], Dark:['Ténèbres','#705746'],
  Steel:['Acier','#B7B7CE'], Fairy:['Fée','#D685AD']
};
const CHART = {
  Normal:{Rock:.5,Ghost:0,Steel:.5},
  Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
  Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
  Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
  Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
  Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
  Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
  Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
  Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
  Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
  Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
  Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
  Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
  Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
  Dragon:{Dragon:2,Steel:.5,Fairy:0},
  Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
  Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
  Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}
};
// noImmune : une immunité de type compte comme une efficacité normale (×1), les autres types du défenseur comptent toujours
const effMult = (t, defs, noImmune) => defs.reduce((m,d)=> m * (((CHART[t]||{})[d] ?? 1) || (noImmune ? 1 : 0)), 1);

/* Types d'attaque (k) :
   proj    projectile droit            spread  éventail (cnt, ang)       homing  tête chercheuse (cnt)
   psy     zone retardée sur la cible   quake   onde autour du lanceur    dash    charge (inv = invulnérable)
   melee   coup au corps à corps        buff    boost (atk/spa/spe)       heal    soin immédiat (pct)
   ring    soin sur la durée            mirror  renvoie les projectiles   rest    soin total puis sommeil
   blink   téléportation                sig     ★ attaque emblématique : comportement propre dans SIG[sig]
   spec    attaque spéciale (non emblématique) avec un comportement propre, aussi dans SIG[sig]
   ring : rendu de l'onde (cracks, sound, stars) · selfDown : baisse les défenses du lanceur (s) · spdDown/defDown : chance de baisser la défense visée
   fx : burn, poison, slow, stun (chances) · drain, recoil (part des dégâts) · self (boost du lanceur)
   ★ : range = portée pour l'IA · shape = repère de visée · anim = animation PMD · close = corps à corps · aiP = puissance estimée pour l'IA */
const MOVES = {
  // Légendaires
  frappepsy:{n:'Frappe Psy',t:'Psychic',c:'sp',p:34,k:'sig',sig:'frappepsy',vsDef:1,cd:7,range:380,shape:['zone',80],anim:'Charge',per:1,aiP:170,desc:"Mewtwo s'immobilise et fait tomber 5 météores psychiques l'un après l'autre sur la zone visée (ils suivent la visée). Le dernier, énorme (puissance 90), étourdit 0,5 s. Calculée sur la Défense de la cible, pas sur sa Déf. Spé."},
  plenitude:{n:'Plénitude',t:'Psychic',c:'st',k:'buff',buff:{spa:1.3,spd:1.3},dur:10,cd:15},
  lamepangeenne:{n:'Lame Pangéenne',t:'Ground',c:'ph',p:120,k:'sig',sig:'lamepangeenne',cd:6.5,range:240,shape:['wedge',250,.55],anim:'Attack',hitsImmune:1,aiP:150,desc:"Après une courte préparation, des pieux de pierre jaillissent du sol dans un grand cône et empalent l'ennemi (projeté en l'air). Efficacité normale (×1) sur le type Vol."},
  poingfeu:{n:'Poing Feu',t:'Fire',c:'ph',p:80,k:'spec',sig:'poingfeu',cd:3.5,range:280,shape:['lane',266,24],anim:'Attack',close:1,fx:{burn:.3},desc:"Charge, puis coup de poing enflammé à l'impact ou au bout de la course. 30 % de chance de brûler."},
  dracogriffe:{n:'Draco-Griffe',t:'Dragon',c:'ph',p:80,k:'spec',sig:'dracogriffe',cd:3,range:170,shape:['lane',160,26],anim:'Attack',close:1,desc:"Courte charge, puis trois griffes bleu-mauve lacèrent la zone devant le lanceur."},
  ondeoriginelle:{n:'Onde Originelle',t:'Water',c:'sp',p:110,k:'sig',sig:'ondeoriginelle',cd:7,range:230,shape:['self',240],anim:'Charge',aiP:150,desc:"Une vague circulaire part de Kyogre et grandit : elle repousse l'ennemi et laisse une flaque qui ralentit pendant 2 s. 0,4 s plus tard, une vague plus fine revient vers le centre (puissance 50)."},
  fatalfoudre:{n:'Fatal-Foudre',t:'Electric',c:'sp',p:90,k:'spec',sig:'fatalfoudre',cd:5,range:380,shape:['zone',134],anim:'Shoot',aiP:110,desc:"Sur la zone visée, un éclair tombe au centre (30 % de chance d'étourdir), puis 5 éclairs tombent ensemble tout autour (puissance 54)."},
  poingobscur:{n:'Poing Obscur',t:'Dark',c:'ph',p:90,k:'sig',sig:'poingobscur',cd:5,range:300,shape:['obscur',280],anim:'Attack',close:1,aiP:150,desc:"Charge (puissance 40). Si elle touche, elle étourdit 0,5 s. Au bout de la charge, trois énormes poings noirs s'abattent sur trois zones côte à côte : celui du centre touche à coup sûr si la charge a touché. Coup critique."},
  // Feu
  lanceflammes:{n:'Lance-Flammes',t:'Fire',c:'sp',p:80,k:'spec',sig:'lanceflammes',beam:1,cd:4,range:560,shape:['lane',560,18],anim:'Shoot',fx:{burn:.3},desc:"Après 0,2 s de visée, jet de flammes à longue portée. 30 % de chance de brûler. Laisse une traînée de flammes au sol pendant 3 s qui peut brûler."},
  deflagration:{n:'Déflagration',t:'Fire',c:'sp',p:120,k:'spec',sig:'deflagration',cd:4.5,range:420,shape:['lane',420,30],anim:'Shoot',fx:{burn:.3},desc:"Un grand pentagramme de flammes avance. Le sol qu'il traverse reste en flammes 3 s : rester dedans peut brûler."},
  feufollet:{n:'Feu Follet',t:'Fire',c:'st',p:0,k:'homing',cnt:1,spd:200,turn:2.4,r:13,life:3,cd:6,look:'wisp',fx:{burn:1,atkDown:1}},
  rafalefeu:{n:'Rafale Feu',t:'Fire',c:'sp',p:140,k:'sig',sig:'rafalefeu',cd:6,range:230,shape:['wedge',240,.55],anim:'Shoot',desc:"Après une courte préparation, énorme cône de feu. Le sol reste en flammes 3 s et brûle ceux qui s'y trouvent."},
  dansedufeu:{n:'Danse du Feu',t:'Fire',c:'sp',p:32,k:'sig',sig:'dansedufeu',cd:5,range:380,shape:['lane',360,32],anim:'Charge',aiP:110,desc:"Tornade de flammes qui suit l'ennemi et le touche plusieurs fois (5 coups max). 50 % de chance d'augmenter l'Atq. Spé. pendant 6 s.",per:1},
  chantflamboyant:{n:'Chant Flamboyant',t:'Fire',c:'sp',p:100,k:'sig',sig:'chantflamboyant',cd:4.5,range:190,shape:['self',200],anim:'Charge',desc:"Onde de flammes en cercle qui part du lanceur et s'éloigne jusqu'à 200 px. Si elle touche : Atq. Spé. augmentée pendant 6 s."},
  // Vol
  ventviolent:{n:'Vent Violent',t:'Flying',c:'sp',p:50,k:'spec',sig:'ventviolent',cd:6,range:380,shape:['wedge',380,.58],anim:'Shoot',per:1,aiP:110,fx:{stun:.2},desc:"3 tornades : deux partent en V, une au centre. Chacune touche une fois (20 % de chance d'étourdir)."},
  atterrissage:{n:'Atterrissage',t:'Flying',c:'st',k:'heal',pct:.3,cd:16,roost:2,desc:"Soigne 30 % des PV en 2 s. Pendant ce temps, le lanceur perd le type Vol (les attaques Sol peuvent le toucher)."},
  lamedair:{n:"Lame d'Air",t:'Flying',c:'sp',p:45,k:'sig',sig:'lamedair',cd:3.6,range:260,shape:['wedge',260,.4],anim:'Shoot',aiP:110,desc:"3 lames de vent qui reviennent comme des boomerangs. Chacune touche à l'aller et au retour.",per:1},
  // Dragon
  dracochoc:{n:'Draco-Choc',t:'Dragon',c:'sp',p:95,k:'proj',spd:430,r:22,life:1.4,cd:3,look:'dragonpulse',fx:{spdDown:.2}},
  dracocharge:{n:'Draco-Charge',t:'Dragon',c:'ph',p:100,k:'dash',spd:740,dur:.42,cd:4,fx:{stun:.25}},
  dansedraco:{n:'Danse Draco',t:'Dragon',c:'st',k:'buff',buff:{atk:1.4,spe:1.25},dur:10,cd:15},
  dracofleches:{n:'Draco-Flèches',t:'Dragon',c:'ph',p:50,k:'sig',sig:'dracofleches',cd:4,range:450,shape:['lane',450,12],anim:'Shoot',aiP:105,desc:"Lance deux Fantyrm qui poursuivent l'ennemi.",per:1},
  colere:{n:'Colère',t:'Dragon',c:'ph',p:58,k:'sig',sig:'colere',cd:6,range:130,shape:['wedge',130,1],anim:'Attack',close:1,aiP:170,desc:"4 coups enchaînés, redirigeables entre chaque, de plus en plus larges. Le dernier frappe plus fort. Le lanceur ne se déplace pas pendant l'enchaînement.",per:1},
  // Eau
  vibraqua:{n:'Vibraqua',t:'Water',c:'sp',p:75,k:'proj',spd:430,r:22,life:1.4,cd:3.5,look:'waterpulse',fx:{stun:.2}},
  hydrocanon:{n:'Hydrocanon',t:'Water',c:'sp',p:38,k:'spec',sig:'hydrocanon',cd:4.5,range:520,shape:['lane',520,30],anim:'Shoot',per:1,aiP:120,desc:"Après 0,25 s de visée, énorme rayon d'eau pendant 0,6 s : 4 coups qui repoussent l'ennemi. Le lanceur ne bouge pas pendant le tir."},
  anneauhydro:{n:'Anneau Hydro',t:'Water',c:'st',k:'ring',dur:6,cd:18},
  surf:{n:'Surf',t:'Water',c:'sp',p:120,k:'sig',sig:'surf',cd:5,range:500,shape:['lane',520,115],anim:'Charge',desc:"Une vague traverse toute l'arène et emporte l'ennemi avec elle."},
  cascade:{n:'Cascade',t:'Water',c:'ph',p:85,k:'sig',sig:'cascade',cd:5,range:300,shape:['lane',300,24],anim:'Attack',close:1,desc:"Charge. À l'impact, le lanceur plonge et projette l'ennemi en l'air : il ne peut rien faire avant de retomber."},
  sheauriken:{n:'Sheauriken',t:'Water',c:'sp',p:40,k:'sig',sig:'sheauriken',cd:4,range:520,shape:['lanezone',560,10,55],anim:'Shoot',aiP:90,desc:"3 shurikens d'eau rapides qui rebondissent une fois sur les murs, et un grand shuriken qui retombe sur la zone visée, dans la même direction (60 de puissance, ralentit).",per:1},
  // Ténèbres
  vibrobscur:{n:'Vibrobscur',t:'Dark',c:'sp',p:90,k:'proj',spd:430,r:22,life:1.4,cd:3.5,look:'darkpulse',fx:{stun:.2}},
  machouille:{n:'Mâchouille',t:'Dark',c:'ph',p:85,k:'melee',reach:60,cd:2.2,jaw:'dark',fx:{defDown:.2}},
  sabotage:{n:'Sabotage',t:'Dark',c:'ph',p:70,k:'spec',sig:'sabotage',cd:2.8,range:170,shape:['lane',170,20],anim:'Attack',close:1,desc:"Claque sur une bande longue et étroite devant le lanceur."},
  genusection:{n:'Génusection',t:'Dark',c:'ph',p:125,k:'sig',sig:'genusection',cd:6.5,range:360,shape:['lane',360,24],anim:'Attack',close:1,desc:"L'écran s'assombrit, puis charge (plus longue qu'une charge classique). Attaque en X à l'impact, ou au bout de la course si elle ne touche personne."},
  // Spectre
  ballombre:{n:"Ball'Ombre",t:'Ghost',c:'sp',p:90,k:'proj',spd:340,r:22,life:1.8,cd:3,look:'shadowball',fx:{spdDown:.2}},
  hantise:{n:'Hantise',t:'Ghost',c:'ph',p:80,k:'spec',sig:'hantise',cd:5,range:300,shape:['lane',300,24],anim:'Attack',close:1,desc:"Charge invulnérable. Si elle touche, le lanceur traverse l'ennemi et redevient vulnérable derrière lui."},
  demitour:{n:'Demi-Tour',t:'Bug',c:'ph',p:80,k:'spec',sig:'demitour',cd:4,range:290,shape:['lane',260,24],anim:'Attack',close:1,desc:"Charge. Si elle touche, le lanceur bondit en arrière et se replace à distance (il évite les attaques pendant le saut)."},
  // Psy
  chocpsy:{n:'Choc Psy',t:'Psychic',c:'sp',p:60,k:'spec',sig:'chocpsy',cd:5.5,range:380,shape:['zone',52],anim:'Shoot',per:1,aiP:110,desc:"3 zones psychiques, une toutes les 0,3 s, qui éclatent 0,38 s après être apparues. Chacune se place là où tu vises à ce moment-là (sur l'ennemi en visée automatique)."},
  psykoudboul:{n:"Psykoud'Boul",t:'Psychic',c:'ph',p:75,k:'dash',spd:760,dur:.35,cd:2.8,aura:'#F95587',fx:{stun:.2}},
  voilemiroir:{n:'Voile Miroir',t:'Psychic',c:'st',k:'mirror',dur:.9,cd:5.5},
  teleport:{n:'Téléport',t:'Psychic',c:'st',k:'blink',cd:4},
  repos:{n:'Repos',t:'Psychic',c:'st',k:'rest',cd:28},
  psyko:{n:'Psyko',t:'Psychic',c:'sp',p:135,k:'sig',sig:'psyko',cd:5,range:380,shape:['zone',64],anim:'Shoot',desc:"Zone visée : si l'ennemi est dedans quand elle se déclenche, il est soulevé (immobilisé) puis écrasé au sol."},
  // Fée
  eclatmagique:{n:'Éclat Magique',t:'Fairy',c:'sp',p:85,k:'quake',max:140,dur:.35,cd:4,ring:'stars'},
  pouvoirlunaire:{n:'Pouvoir Lunaire',t:'Fairy',c:'sp',p:130,k:'sig',sig:'pouvoirlunaire',cd:5,range:380,shape:['zone',72],anim:'Shoot',desc:"Une lune descend sur la zone visée et explose."},
  // Combat
  closecombat:{n:'Close Combat',t:'Fighting',c:'ph',p:6,k:'spec',sig:'closecombat',cd:5,range:80,shape:['lane',90,30],anim:'Attack',close:1,per:1,selfDown:3,aiP:110,desc:"Pendant 1 s, rafale de coups de poing devant soi (le lanceur peut se déplacer). Chaque coup qui touche bloque l'ennemi un instant et le ramène devant les poings : il reste pris dans le combo tant que le lanceur ne s'éloigne pas trop. Le dernier coup, plus gros, inflige 40 de puissance et repousse. Baisse ensuite les défenses du lanceur pendant 3 s."},
  exploforce:{n:'Exploforce',t:'Fighting',c:'sp',p:120,k:'proj',spd:230,r:24,life:2.4,cd:4.5,look:'focusblast',fx:{spdDown:.1}},
  exploforce:{n:'Exploforce',t:'Fighting',c:'sp',p:120,k:'proj',spd:270,r:20,life:2,cd:4.5},
  aurasphere:{n:'Aurasphère',t:'Fighting',c:'sp',p:65,k:'sig',sig:'aurasphere',cd:4,range:500,shape:['lane',520,14],anim:'Shoot',aiP:105,desc:"Maintenir la touche pour charger : la sphère grossit et frappe plus fort (jusqu'à +50). Elle suit l'ennemi."},
  // Acier
  luminocanon:{n:'Luminocanon',t:'Steel',c:'sp',p:80,k:'spec',sig:'luminocanon',beam:1,cd:4,range:560,shape:['lane',560,18],anim:'Shoot',fx:{spdDown:.3},desc:"Après 0,2 s de visée, rayon d'acier à longue portée. 30 % de chance de baisser la Déf. Spé. pendant 4 s."},
  tetedefer:{n:'Tête de Fer',t:'Steel',c:'ph',p:85,k:'dash',spd:760,dur:.35,cd:3.5,fx:{stun:.3}},
  pistopoing:{n:'Pisto-Poing',t:'Steel',c:'ph',p:55,k:'dash',spd:900,dur:.2,cd:2.6},
  poingmeteore:{n:'Poing Météore',t:'Steel',c:'ph',p:80,k:'sig',sig:'poingmeteore',cd:5.5,range:320,shape:['lane',320,26],anim:'Attack',close:1,desc:"Charge comme un météore, cratère à l'impact qui ralentit pendant 2,5 s. 30 % de chance d'augmenter l'Attaque pendant 8 s."},
  ancrage:{n:'Ancrage',t:'Steel',c:'ph',p:95,k:'sig',sig:'ancrage',cd:4.5,range:360,shape:['lane',360,14],anim:'Attack',desc:"Lance l'ancre au bout de sa chaîne : si elle touche, l'ennemi est attiré jusqu'au corps à corps et immobilisé 0,5 s."},
  // Sol
  seisme:{n:'Séisme',t:'Ground',c:'ph',p:90,k:'quake',max:175,dur:.5,cd:5,ring:'cracks'},
  tunnelier:{n:'Tunnelier',t:'Ground',c:'ph',p:80,k:'dash',spd:760,dur:.4,cd:3.4},
  telluriforce:{n:'Telluriforce',t:'Ground',c:'sp',p:95,k:'psy',r:62,delay:.4,cd:3.6},
  tunnel:{n:'Tunnel',t:'Ground',c:'ph',p:120,k:'sig',sig:'tunnel',cd:5,range:320,shape:['leap',320,80],anim:'Attack',close:1,desc:"S'enterre (invulnérable) et avance sous terre, puis ressort sous la zone visée en projetant l'ennemi en l'air."},
  // Roche
  eboulement:{n:'Éboulement',t:'Rock',c:'ph',p:75,k:'spec',sig:'eboulement',cd:3.4,range:380,shape:['zone3',42],anim:'Shoot',fx:{stun:.25},desc:"3 zones en même temps autour du point visé : des rochers tombent du ciel. 25 % de chance d'étourdir."},
  lamederoc:{n:'Lame de Roc',t:'Rock',c:'ph',p:110,k:'sig',sig:'lamederoc',cd:5.5,range:300,shape:['lane',310,26],anim:'Attack',desc:"Ligne de piliers de roche qui jaillissent du sol les uns après les autres. Ils restent 1,5 s comme obstacles. L'ennemi touché est projeté en l'air."},
  // Glace
  poingglace:{n:'Poing Glace',t:'Ice',c:'ph',p:80,k:'spec',sig:'poingglace',cd:3.5,range:280,shape:['lane',266,24],anim:'Attack',close:1,fx:{slow:.3},desc:"Charge, puis coup de poing glacé à l'impact ou au bout de la course. 30 % de chance de ralentir."},
  crocsgivre:{n:'Crocs Givre',t:'Ice',c:'ph',p:70,k:'melee',reach:58,cd:2,jaw:'ice',fx:{slow:.3}},
  eclatsglace:{n:'Éclats Glace',t:'Ice',c:'ph',p:55,k:'homing',cnt:1,spd:360,turn:2.6,r:11,life:1.7,cd:3,look:'diamond',fx:{slow:1,slowT:.5}},
  laserglace:{n:'Laser Glace',t:'Ice',c:'sp',p:80,k:'spec',sig:'laserglace',beam:1,cd:4,range:560,shape:['lane',560,18],anim:'Shoot',fx:{slow:1},desc:"Après 0,2 s de visée, laser à longue portée. Ralentit à coup sûr, 10 % de chance d'immobiliser 1 s. Laisse une traînée de givre au sol pendant 3 s qui ralentit."},
  chuteglace:{n:'Chute Glace',t:'Ice',c:'ph',p:40,k:'sig',sig:'chuteglace',cd:5,range:380,shape:['zone',80],anim:'Shoot',aiP:135,desc:"Pluie de 5 stalactites sur la zone. La dernière ralentit très fortement et reste plantée : la prochaine attaque du lanceur la fait exploser.",per:1},
  blizzard:{n:'Blizzard',t:'Ice',c:'sp',p:40,k:'sig',sig:'blizzard',cd:6,range:230,shape:['wedge',235,.7],anim:'Shoot',aiP:115,desc:"Tempête de neige en cône pendant 1 s (4 coups, ralentit). Si les 4 coups touchent, l'ennemi est gelé 0,5 s. Le lanceur ne se déplace pas pendant ce temps.",per:1},
  // Normal
  gigaimpact:{n:'Giga Impact',t:'Normal',c:'ph',p:150,k:'dash',spd:820,dur:.48,cd:7,recharge:1.1},
  danselames:{n:'Danse-Lames',t:'Normal',c:'st',k:'buff',buff:{atk:1.5},dur:10,cd:15},
  paresse:{n:'Paresse',t:'Normal',c:'st',k:'heal',pct:.3,cd:16,lock:.6},
  vitesseextreme:{n:'Vitesse Extrême',t:'Normal',c:'ph',p:60,k:'sig',sig:'vitesseextreme',cd:6,uses:3,per:1,range:280,shape:['lane',280,24],anim:'Attack',close:1,desc:"Traverse l'ennemi en un éclair. Utilisable 3 fois : 2 s pour relancer après chaque utilisation."},
  plaquage:{n:'Plaquage',t:'Normal',c:'ph',p:130,k:'sig',sig:'plaquage',cd:3.5,range:330,shape:['leap',330,110],anim:'Attack',close:1,desc:"Saute sur la zone visée (en l'air, passe au-dessus des attaques) et retombe avec une onde de choc qui étourdit."},
  // Plante
  martobois:{n:'Martobois',t:'Grass',c:'ph',p:120,k:'melee',reach:64,cd:4,fx:{recoil:.33}},
  megafouet:{n:'Mégafouet',t:'Grass',c:'ph',p:120,k:'spec',sig:'megafouet',cd:4.2,range:170,shape:['lane',170,20],anim:'Attack',close:1,desc:"Une liane s'abat du haut vers le sol, sur une bande longue et étroite."},
  tambourbattant:{n:'Tambour Battant',t:'Grass',c:'ph',p:110,k:'sig',sig:'tambourbattant',cd:4.5,range:260,shape:['tambour'],anim:'Attack',aiP:150,desc:"3 coups de tambour : 1 zone, puis 2, puis 3 zones de racines, de plus en plus loin. Immobilise 1 s.",per:1},
  // Électrik
  eclairfou:{n:'Éclair Fou',t:'Electric',c:'ph',p:90,k:'dash',spd:800,dur:.35,cd:4,fx:{recoil:.25}},
  changeeclair:{n:'Change Éclair',t:'Electric',c:'ph',p:40,k:'spec',sig:'changeeclair',cd:5,uses:2,range:290,shape:['lane',270,24],anim:'Attack',close:1,per:1,aiP:95,desc:"Charge électrique qui traverse l'ennemi. Après la 1re charge, 2 s pour en lancer une 2e."},
  tonnerre:{n:'Tonnerre',t:'Electric',c:'sp',p:100,k:'proj',spd:560,r:10,life:1.1,cd:3,fx:{stun:.1}},
  coupdjus:{n:"Coup d'Jus",t:'Electric',c:'sp',p:33,k:'spec',sig:'coupdjus',cd:5,range:120,shape:['self',115],anim:'Charge',per:1,aiP:85,desc:"3 décharges d'éclairs tout autour du lanceur, l'une après l'autre. Ralentit les ennemis touchés."},
  poingplasma:{n:'Poing Plasma',t:'Electric',c:'ph',p:52,k:'sig',sig:'poingplasma',cd:5,range:300,shape:['plasma',300],anim:'Attack',close:1,hitsImmune:1,aiP:150,desc:"Charge. Si elle touche, étourdit 0,5 s. À l'impact, ou au bout de la course, des éclairs tombent sur 3 zones en V. Efficacité normale (×1) sur le type Sol.",per:1},
  // Insecte
  papillodanse:{n:'Papillodanse',t:'Bug',c:'st',k:'buff',buff:{spa:1.4,spe:1.2},dur:10,cd:15},
  bourdon:{n:'Bourdon',t:'Bug',c:'sp',p:90,k:'quake',max:160,dur:.45,cd:5,ring:'sound',fx:{spdDown:.2}},
  // Poison
  doubledard:{n:'Double Dard',t:'Poison',c:'sp',p:55,k:'sig',sig:'doubledard',cd:4,range:320,shape:['lane',340,14],anim:'Attack',aiP:120,desc:"Lance un dard (empoisonne à coup sûr) et charge en même temps. Si la charge touche : vole la moitié des dégâts en PV, étourdit 0,5 s, et le lanceur bondit en arrière.",per:1}
};

// base = [PV, Atq, Déf, AtqSpé, DéfSpé, Vit] (stats officielles)
const MONS = {
  dracaufeu:{name:'Dracaufeu',ab:'DFE',id:6,types:['Fire','Flying'],base:[78,84,78,109,85,100],moves:['lanceflammes','ventviolent','dracochoc','rafalefeu']},
  gardevoir:{name:'Gardevoir',id:282,types:['Psychic','Fairy'],base:[68,65,65,125,115,80],moves:['pouvoirlunaire','chocpsy','ballombre','eclatmagique']},
  lucario:{name:'Lucario',id:448,types:['Fighting','Steel'],base:[70,110,70,115,70,90],moves:['aurasphere','luminocanon','pistopoing','closecombat']},
  dracolosse:{name:'Dracolosse',ab:'DLS',id:149,types:['Dragon','Flying'],base:[91,134,95,100,100,80],moves:['vitesseextreme','ventviolent','dansedraco','poingglace']},
  tyranocif:{name:'Tyranocif',id:248,types:['Rock','Dark'],base:[100,134,110,95,100,61],moves:['lamederoc','machouille','seisme','eboulement']},
  metalosse:{name:'Métalosse',id:376,types:['Steel','Psychic'],base:[80,135,130,95,90,70],moves:['poingmeteore','psykoudboul','seisme','poingglace']},
  ronflex:{name:'Ronflex',id:143,types:['Normal'],base:[160,110,65,65,110,30],moves:['plaquage','gigaimpact','seisme','repos']},
  gorythmic:{name:'Gorythmic',id:812,types:['Grass'],base:[100,125,90,60,70,85],moves:['tambourbattant','megafouet','sabotage','closecombat']},
  mewtwo:{name:'Mewtwo',id:150,legend:1,types:['Psychic'],base:[106,110,90,154,90,130],moves:['frappepsy','exploforce','ballombre','plenitude']},
  groudon:{name:'Groudon',id:383,legend:1,types:['Ground'],base:[100,150,140,100,90,90],moves:['lamepangeenne','poingfeu','dracogriffe','lamederoc']},
  kyogre:{name:'Kyogre',id:382,legend:1,types:['Water'],base:[100,100,90,150,140,90],moves:['ondeoriginelle','fatalfoudre','laserglace','plenitude']},
  shifours:{name:'Shifours',id:892,legend:1,types:['Fighting','Dark'],base:[100,130,100,63,60,97],moves:['poingobscur','closecombat','demitour','poingglace']},
  zeraora:{name:'Zeraora',id:807,types:['Electric'],base:[88,112,75,102,80,143],moves:['poingplasma','changeeclair','closecombat','coupdjus']},
  togekiss:{name:'Togekiss',id:468,types:['Fairy','Flying'],base:[85,50,95,120,115,80],moves:['lamedair','vibraqua','eclatmagique','atterrissage']},
  pyrax:{name:'Pyrax',id:637,types:['Bug','Fire'],base:[85,60,65,135,105,100],moves:['papillodanse','dansedufeu','bourdon','ventviolent']},
  milobellus:{name:'Milobellus',id:350,types:['Water'],base:[95,60,79,100,125,81],moves:['surf','laserglace','voilemiroir','anneauhydro']},
  lanssorien:{name:'Lanssorien',id:887,types:['Dragon','Ghost'],base:[88,120,75,100,75,142],moves:['dracofleches','hantise','lanceflammes','demitour']},
  alakazam:{name:'Alakazam',id:65,types:['Psychic'],base:[55,50,45,135,95,120],moves:['psyko','ballombre','chocpsy','teleport']},
  scalpereur:{name:'Scalpereur',id:983,types:['Dark','Steel'],base:[100,135,120,60,85,50],moves:['tetedefer','genusection','danselames','machouille']},
  minotaupe:{name:'Minotaupe',id:530,types:['Ground','Steel'],base:[110,135,60,50,65,88],moves:['seisme','tunnel','tetedefer','eboulement']},
  leviator:{name:'Léviator',id:130,types:['Water','Flying'],base:[95,125,79,60,100,81],moves:['cascade','dansedraco','machouille','crocsgivre']},
  naganadel:{name:'Naganadel',id:804,types:['Poison','Dragon'],base:[73,73,73,127,73,121],moves:['dracochoc','doubledard','deflagration','vibrobscur']},
  mammochon:{name:'Mammochon',id:473,types:['Ice','Ground'],base:[110,130,80,70,60,80],moves:['chuteglace','eclatsglace','seisme','eboulement']},
  momartik:{name:'Momartik',id:478,types:['Ice','Ghost'],base:[70,80,70,80,70,110],moves:['laserglace','ballombre','blizzard','feufollet']},
  flamigator:{name:'Flamigator',id:911,types:['Fire','Ghost'],base:[104,75,100,110,75,66],moves:['chantflamboyant','ballombre','telluriforce','paresse']},
  carchacrok:{name:'Carchacrok',id:445,types:['Dragon','Ground'],base:[108,130,95,80,85,102],moves:['colere','seisme','danselames','dracocharge']},
  sinistrail:{name:'Sinistrail',id:781,types:['Grass','Ghost'],base:[70,131,100,86,90,40],moves:['ancrage','megafouet','hantise','seisme']},
  amphinobi:{name:'Amphinobi',id:658,types:['Water','Dark'],base:[72,95,67,103,71,122],moves:['sheauriken','vibrobscur','laserglace','hydrocanon']}
};
const TEAMS = [
  {id:'dracolosse',name:'Équipe Dracolosse',mons:['dracolosse','mammochon','flamigator','leviator','zeraora','metalosse']},
  {id:'carchacrok',name:'Équipe Carchacrok',mons:['carchacrok','scalpereur','sinistrail','dracaufeu','lucario','tyranocif']},
  {id:'lanssorien',name:'Équipe Lanssorien',mons:['lanssorien','gardevoir','gorythmic','amphinobi','ronflex','togekiss']},
  {id:'naganadel',name:'Équipe Naganadel',mons:['naganadel','momartik','minotaupe','alakazam','pyrax','milobellus']}
];
const DIFFS = {
  facile:{label:'Facile',react:.1,think:1.1,lead:0,noise:.6,mirror:false,sw:0,dash:0,aimErr:.4,dmg:.65},
  normal:{label:'Normal',react:.35,think:.6,lead:.25,noise:.35,mirror:true,sw:.25,dash:.2,aimErr:.25,dmg:.8},
  champion:{label:'Champion',react:.7,think:.45,lead:.65,noise:.15,mirror:true,sw:.6,dash:.55,aimErr:.07,dmg:1},
  enfer:{label:'Enfer',react:.92,think:.32,lead:.9,noise:.06,mirror:true,sw:.85,dash:.85,aimErr:.02,dmg:1.25}   // réagit presque toujours, anticipe tes déplacements, frappe plus fort
};
const ARENA_LIST = [['stade','Stade Pokémon'],['pilier','Pilier Céleste'],['colonnes','Colonnes Lance'],['couronne','Mont Couronné'],['chateau','Château de Ghetsis'],['tourbillon','Îles Tourbillon']];
const STATUS = {atkDown:['Atq −','#c9a08a'],grounded:['Au sol','#E2BF65'],defDown:['Déf −','#c98a8a'],spdDown:['D.Spé −','#8a9ac9'],burn:['Brûlé','#EE8130'],poison:['Empois.','#A33EA1'],slow:['Ralenti','#96D9D6'],stun:['Étourdi','#F7D02C'],sleep:['Endormi','#a39bd0'],ring:['Anneau','#6390F0'],mirror:['Miroir','#F95587'],buffT:['Boost','#e6b84c']};
const SWITCH_CD = 4, INV_ON_SWITCH = .8;
// Dash : charges partagées par l'équipe, rechargées une par une
const DASH_MAX = 3, DASH_REGEN = 2, DASH_SPD = 760, DASH_DUR = .17, DASH_INV = .2;

const meleeCount = d => d.moves.filter(k => ['melee','dash'].includes(MOVES[k].k) || MOVES[k].close).length;
for (const k in MONS){ const m = MONS[k]; m.key = k; m.ab = m.ab || m.name.slice(0,3).toUpperCase(); m.bst = m.base.reduce((a,b)=>a+b,0); m.pref = Math.max(70, 260 - 60*meleeCount(m)); }

// Sprites (jetons de couleur si le chargement échoue)
const SPR = {};
for (const k in MONS){ const img = new Image(); SPR[k] = {img, ok:false}; img.onload = () => SPR[k].ok = true; img.src = SPRITE_URL(MONS[k].id); }

// Sprites animés PMD SpriteCollab (Pokémon Donjon Mystère, 8 directions), même chargeur que Pokélite.
// Licence CC BY-NC 4.0, crédits par sprite sur https://sprites.pmdcollab.org
const PMD_BASE = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';
const PMD_WANT = ['Idle','Walk','Attack','Shoot','Hurt','Charge','Sleep'];
const PMD = {};
function loadPmd(k, dex = MONS[k].id){
  const o = PMD[k] = {st:'load', a:{}}, id = String(dex).padStart(4,'0');
  fetch(PMD_BASE+id+'/AnimData.xml').then(r => { if (!r.ok) throw 0; return r.text(); }).then(txt => {
    const doc = new DOMParser().parseFromString(txt,'text/xml'), raw = {};
    for (const a of doc.querySelectorAll('Anim')){
      const n = a.querySelector('Name').textContent, c = a.querySelector('CopyOf');
      raw[n] = c ? {copy:c.textContent} : {fw:+a.querySelector('FrameWidth').textContent, fh:+a.querySelector('FrameHeight').textContent, d:[...a.querySelectorAll('Duration')].map(x=>+x.textContent)};
    }
    const res = n => { let r = raw[n], i = 0; while (r && r.copy && i++ < 5){ n = r.copy; r = raw[n]; } return r && r.d ? {...r, file:n} : null; };
    let pending = 0;
    const done = () => { if (--pending === 0) o.st = o.a.Idle || o.a.Walk ? 'ok' : 'fail'; };
    for (const w of PMD_WANT){
      const r = res(w); if (!r) continue;
      r.total = r.d.reduce((a,b)=>a+b,0); r.img = new Image(); r.img.crossOrigin = 'anonymous'; pending++;
      r.img.onload = () => { if (w === 'Attack') pmdDrift(r); o.a[w] = r; done(); };
      r.img.onerror = done;
      r.img.src = PMD_BASE+id+'/'+r.file+'-Anim.png';
    }
    if (!pending) o.st = 'fail';
  }).catch(() => { o.st = 'fail'; });
}
for (const k in MONS) loadPmd(k);
loadPmd('fantyrm', 885);   // les Fantyrm lancés par Lanssorien (Draco-Flèches)
// déplacement du corps dans chaque image d'une animation (certaines attaques PMD font bondir le Pokémon) :
// dr[ligne][image] = décalage {x,y} du centre des pixels par rapport à la 1re image, pour pouvoir le compenser
function pmdDrift(A){ try{
  const c = document.createElement('canvas'); c.width = A.img.width; c.height = A.img.height;
  const x = c.getContext('2d',{willReadFrequently:true}); x.drawImage(A.img,0,0);
  const D = x.getImageData(0,0,c.width,c.height).data, nf = Math.round(c.width/A.fw), nr = Math.round(c.height/A.fh); A.dr = [];
  for (let r=0;r<nr;r++){ const row = [];
    for (let f=0;f<nf;f++){ let sx=0, sy=0, n=0;
      for (let py=r*A.fh;py<(r+1)*A.fh;py+=2) for (let px=f*A.fw;px<(f+1)*A.fw;px+=2) if (D[(py*c.width+px)*4+3] > 0){ sx += px-f*A.fw; sy += py-r*A.fh; n++; }
      row.push(n ? {x:sx/n, y:sy/n} : null); }
    const o = row[0] || {x:0,y:0}; A.dr.push(row.map(p => p ? {x:p.x-o.x, y:p.y-o.y} : {x:0,y:0})); }
}catch(e){} }
// octant de l'angle (0 = droite, sens horaire à l'écran) → ligne de la planche PMD (bas, bas-droite, droite…)
const DIR_ROW = [2,1,0,7,6,5,4,3];
function pmdFrame(A, tick, loop){
  tick = loop ? tick % A.total : Math.min(tick, A.total-1);
  let i = 0; while (i < A.d.length-1 && tick >= A.d[i]){ tick -= A.d[i]; i++; }
  return i;
}
