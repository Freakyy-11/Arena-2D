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
// Efficacité adoucie pour un jeu d'action (moins dépendant des types) : la table officielle (×0, ×¼, ×½, ×1, ×2, ×4)
// devient ×0,33 (immunité), ×0,5, ×0,75, ×1, ×1,33, ×1,66 ; et le bonus de type du lanceur passe de ×1,5 à ×1,25
const typeScale = raw => raw === 0 ? .33 : raw <= .25 ? .5 : raw < 1 ? .75 : raw >= 4 ? 1.66 : raw > 1 ? 1.33 : 1;
const typeEff = (t, defs, noImmune) => typeScale(effMult(t, defs, noImmune));
const STAB = 1.25;

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
  // Ligue — lot 3 (membres restants)
  toilegluante:{n:"Toile Gluante",t:'Bug',c:'sp',p:70,k:'sig',sig:'toilegluante',cd:6,range:380,shape:['zone',70],anim:'Attack',aiP:100,desc:"Toile lancée sur une zone : l'ennemi dedans est très fortement ralenti pendant 3 s."},
  ombreportee:{n:"Ombre Portée",t:'Ghost',c:'ph',p:40,k:'spec',sig:'ombreportee',cd:3,range:320,shape:['self',30],anim:'Attack',desc:"Se téléporte derrière l'ennemi s'il est à portée, et le frappe (faibles dégâts)."},
  crochetvenin:{n:"Crochet Venin",t:'Poison',c:'ph',p:80,k:'spec',sig:'crochetvenin',cd:2,range:70,shape:['wedge',90,1.1],anim:'Attack',fx:{poison:.5},close:1,desc:"Morsure qui empoisonne (50 %)."},
  explosion:{n:"Explosion",t:'Normal',c:'ph',p:170,k:'sig',sig:'explosion',cd:12,range:140,shape:['self',150],anim:'Attack',aiP:70,desc:"Se charge 1 s, puis explose sur une énorme zone ; Foretress perd 20 % de ses PV et doit récupérer 1 s."},
  picots:{n:"Picots",t:'Ground',c:'ph',p:45,k:'spec',sig:'picots',cd:8,range:380,shape:['zone3',18],anim:'Attack',desc:"Pose 3 pièges au sol : l'ennemi qui marche dessus est blessé."},
  pikstoxik:{n:"Pics Toxik",t:'Poison',c:'ph',p:20,k:'spec',sig:'pikstoxik',cd:8,range:380,shape:['zone3',18],anim:'Attack',desc:"Pose 3 pièges au sol : l'ennemi qui marche dessus est blessé et empoisonné."},
  gyroballe:{n:"Gyroballe",t:'Steel',c:'ph',p:42,k:'spec',sig:'gyroballe',cd:5,range:130,shape:['self',62],anim:'Attack',desc:"Petite charge, puis tourne sur lui-même pendant 1,6 s avec une vitesse ×1,6 : 5 coups autour de lui, d'autant plus forts que l'ennemi est plus rapide que lui (×0,7 à ×1,5)."},
  triplepied:{n:"Triple Pied",t:'Fighting',c:'ph',p:45,k:'sig',sig:'triplepied',cd:5,range:200,shape:['lane',140,24],anim:'Attack',aiP:100,close:1,per:1,desc:"3 charges courtes (redirigeables), de plus en plus fortes (35, 45, 65)."},
  machpunch:{n:'Mach Punch',t:'Fighting',c:'ph',p:55,k:'dash',spd:950,dur:.14,cd:2.2},
  aquajet:{n:'Aqua-Jet',t:'Water',c:'ph',p:55,k:'dash',spd:950,dur:.14,cd:2.2},
  clairdelune:{n:'Clair de Lune',t:'Fairy',c:'st',k:'heal',pct:.4,cd:22},
  ordresoin:{n:'Ordre Soin',t:'Bug',c:'st',k:'heal',pct:.4,cd:22},
  dansepapillon:{n:'Danse Papillon',t:'Bug',c:'st',k:'buff',buff:{spa:1.3,spd:1.3,spe:1.2},dur:10,cd:15},
  queuedefer:{n:"Queue de Fer",t:'Steel',c:'ph',p:100,k:'sig',sig:'queuedefer',cd:5,range:140,shape:['wedge',150,1.25],anim:'Attack',aiP:130,close:1,desc:"Grand balayage de queue en arc qui repousse."},
  tricherie:{n:"Tricherie",t:'Dark',c:'ph',p:95,k:'sig',sig:'tricherie',cd:4.5,range:200,shape:['lane',180,24],anim:'Attack',aiP:125,close:1,foulPlay:1,desc:"Courte charge : frappe avec l'Attaque de l'ennemi (plus il est fort, plus ça fait mal)."},
  nueecorbeaux:{n:"Nuée de Corbeaux",t:'Dark',c:'ph',p:55,k:'sig',sig:'nueecorbeaux',cd:5,range:380,shape:['lane',380,36],anim:'Attack',aiP:100,per:1,desc:"Une nuée de corbeaux balaie une ligne devant lui (jusqu'à 2 coups)."},
  dracometeore:{n:"Draco-Météore",t:'Dragon',c:'sp',p:55,k:'sig',sig:'dracometeore',cd:7,range:380,shape:['zone',130],anim:'Attack',aiP:100,per:1,desc:"Pluie de 5 météores sur une grande zone ; l'Atq. Spé. du lanceur baisse ensuite pendant 6 s."},
  tempeteverte:{n:"Tempête Verte",t:'Grass',c:'sp',p:110,k:'sig',sig:'tempeteverte',cd:5,range:200,shape:['wedge',200,.5],anim:'Attack',aiP:125,desc:"Rafale de feuilles tranchantes en cône."},
  dardnuee:{n:"Dard-Nuée",t:'Grass',c:'ph',p:28,k:'sig',sig:'dardnuee',cd:4.5,range:360,shape:['wedge',360,.4],anim:'Attack',aiP:100,per:1,desc:"Rafale de 7 aiguilles en éventail."},
  pincemasse:{n:"Pince-Masse",t:'Water',c:'ph',p:130,k:'sig',sig:'pincemasse',cd:5,range:130,shape:['lane',130,30],anim:'Attack',aiP:140,close:1,desc:"Une pince géante s'abat sur une zone devant lui."},
  crocsfatals:{n:"Crocs Fatals",t:'Dark',c:'ph',p:90,k:'sig',sig:'crocsfatals',cd:4.5,range:220,shape:['lane',200,24],anim:'Attack',aiP:120,close:1,desc:"Bond sur l'ennemi et morsure qui le retient 0,5 s."},
  poupeemaudite:{n:"Poupée Maudite",t:'Ghost',c:'st',k:'sig',sig:'poupeemaudite',cd:12,range:9999,shape:['self',36],anim:'Attack',aiP:70,desc:"Pose une poupée : les dégâts subis par Branette sont absorbés pendant 2 s."},
  rayongemme:{n:"Rayon Gemme",t:'Rock',c:'sp',p:100,k:'sig',sig:'rayongemme',cd:4.5,range:560,shape:['lane',560,18],anim:'Attack',aiP:130,beam:1,desc:"Après 0,2 s de visée, laser de cristal à longue portée."},
  dracosouffle:{n:"Dracosouffle",t:'Dragon',c:'sp',p:70,k:'spec',sig:'dracosouffle',cd:4,range:560,shape:['lane',560,18],anim:'Attack',beam:1,fx:{stun:.3},desc:"Après 0,2 s de visée, laser draconique : 30 % de chance d'étourdir."},
  avalanche:{n:"Avalanche",t:'Ice',c:'ph',p:80,k:'sig',sig:'avalanche',cd:3.5,range:110,shape:['wedge',114,.9],anim:'Attack',aiP:100,close:1,desc:"Coup de glace devant soi, deux fois plus fort si Oniglali vient d'être touché (1,5 s)."},
  tempetesable:{n:"Tempête de Sable",t:'Ground',c:'sp',p:25,k:'sig',sig:'tempetesable',cd:7,range:380,shape:['lane',200,40],anim:'Attack',aiP:100,per:1,desc:"Tourbillon de sable qui suit l'ennemi pendant 3 s (jusqu'à 5 coups)."},
  nuagedoux:{n:"Nuage Doux",t:'Fairy',c:'st',k:'sig',sig:'nuagedoux',cd:20,range:9999,shape:['self',40],anim:'Attack',aiP:70,desc:"Nuage protecteur pendant 3 s : soigne 30 % des PV et divise par deux les dégâts reçus."},
  ailedacier:{n:"Aile d'Acier",t:'Steel',c:'ph',p:55,k:'sig',sig:'ailedacier',cd:4,range:280,shape:['lane',280,22],anim:'Attack',aiP:100,per:1,desc:"Lance ses ailes d'acier comme un boomerang : touche à l'aller et au retour."},
  fracasstete:{n:"Fracass'Tête",t:'Rock',c:'ph',p:150,k:'sig',sig:'fracasstete',cd:6,range:300,shape:['lane',300,26],anim:'Attack',aiP:180,close:1,fx:{recoil:.5},desc:"Charge énorme qui brise tout et repousse ; gros dégâts de recul (la moitié)."},
  extrasenseur:{n:"Extrasenseur",t:'Psychic',c:'sp',p:55,k:'sig',sig:'extrasenseur',cd:5.5,range:380,shape:['zone',110],anim:'Attack',aiP:100,per:1,desc:"5 zones psychiques : sur la zone visée et tout autour."},
  ventouses:{n:"Ventouses",t:'Rock',c:'ph',p:70,k:'sig',sig:'ventouses',cd:4.5,range:300,shape:['lane',300,26],anim:'Attack',aiP:100,desc:"Lance ses tentacules : l'ennemi touché est attiré vers Vacilys."},
  pouvoirantique:{n:"Pouvoir Antique",t:'Rock',c:'sp',p:40,k:'spec',sig:'pouvoirantique',cd:4,range:520,shape:['lane',520,11],anim:'Attack',per:1,desc:"Lance 3 pierres entourées d'un halo psychique, l'une après l'autre."},
  vampigraine:{n:"Vampigraine",t:'Grass',c:'st',k:'spec',sig:'vampigraine',cd:8,range:380,shape:['zone',50],anim:'Attack',desc:"Zone : l'ennemi touché perd 5 % de ses PV par seconde pendant 5 s, et Vacilys les récupère."},
  plaiecroixsig:{n:"Plaie-Croix",t:'Bug',c:'ph',p:110,k:'sig',sig:'plaiecroixsig',cd:5,range:140,shape:['self',80],anim:'Attack',aiP:140,close:1,desc:"Grande entaille en X devant soi."},
  plaiecroix:{n:"Plaie-Croix",t:'Bug',c:'ph',p:80,k:'spec',sig:'plaiecroix',cd:3.5,range:200,shape:['lane',180,24],anim:'Attack',close:1,desc:"Courte charge, puis petite entaille en X au bout."},
  appelabeilles:{n:"Appel des Abeilles",t:'Bug',c:'ph',p:20,k:'sig',sig:'appelabeilles',cd:6,range:380,shape:['lane',200,34],anim:'Attack',aiP:100,per:1,desc:"Un essaim d'abeilles suit l'ennemi et le pique jusqu'à 6 fois."},
  ordredefense:{n:"Ordre Défense",t:'Bug',c:'st',k:'spec',sig:'ordredefense',cd:15,range:9999,shape:['self',40],anim:'Attack',desc:"Les abeilles protègent Apireine : dégâts reçus divisés par deux pendant 4 s."},
  pincescanon:{n:"Pinces-Canon",t:'Steel',c:'ph',p:16,k:'sig',sig:'pincescanon',cd:5,range:80,shape:['lane',90,30],anim:'Attack',aiP:100,close:1,per:1,desc:"Rafale de 7 coups de pinces ultra-rapides devant soi (redirigeable) ; l'ennemi reste pris."},
  ventargente:{n:"Vent Argenté",t:'Bug',c:'sp',p:85,k:'sig',sig:'ventargente',cd:4.5,range:170,shape:['wedge',170,.5],anim:'Attack',aiP:100,desc:"Poudre scintillante en cône ; 30 % de chance d'augmenter toutes ses stats pendant 8 s."},
  baillement:{n:"Bâillement",t:'Normal',c:'st',k:'sig',sig:'baillement',cd:8,range:380,shape:['lane',200,10],anim:'Attack',aiP:70,desc:"Projectile qui suit l'ennemi : s'il le touche, l'ennemi s'endort 2 s plus tard, sauf s'il change de Pokémon."},
  volplane:{n:"Vol Plané",t:'Flying',c:'ph',p:95,k:'sig',sig:'volplane',cd:5,range:300,shape:['leap',50],anim:'Attack',aiP:125,close:1,desc:"Plane au-dessus des attaques en suivant l'ennemi, puis pique avec sa pince."},
  poingardent:{n:"Poing Ardent",t:'Fire',c:'ph',p:105,k:'sig',sig:'poingardent',cd:4.5,range:220,shape:['lane',160,24],anim:'Attack',aiP:120,close:1,desc:"Mach Punch (puissance 30), puis gros poing de feu qui repousse."},
  boutefeusig:{n:"Boutefeu",t:'Fire',c:'ph',p:130,k:'sig',sig:'boutefeusig',cd:4.5,range:280,shape:['lane',280,24],anim:'Attack',aiP:160,close:1,fx:{recoil:.33,burn:.3},desc:"Charge en flammes très puissante : 30 % de chance de brûler, dégâts de recul (un tiers)."},
  rafalepsy:{n:"Rafale Psy",t:'Psychic',c:'sp',p:45,k:'sig',sig:'rafalepsy',cd:5,range:480,shape:['lane',480,12],anim:'Attack',aiP:100,per:1,desc:"3 lasers psy successifs, redirigeables entre chaque."},
  distorsion:{n:"Distorsion",t:'Psychic',c:'st',k:'sig',sig:'distorsion',cd:16,range:9999,shape:['self',40],anim:'Attack',aiP:35,desc:"Pendant 5 s, les Pokémon lents se déplacent plus vite que les rapides."},
  amesserrantes:{n:"Âmes Errantes",t:'Ghost',c:'sp',p:95,k:'sig',sig:'amesserrantes',cd:5.5,range:160,shape:['self',170],anim:'Attack',aiP:125,desc:"Les âmes tournent en spirale autour de Spiritomb, puis s'écartent en un grand cercle."},
  tempeteflorale:{n:"Tempête Florale",t:'Grass',c:'sp',p:30,k:'sig',sig:'tempeteflorale',cd:5,range:110,shape:['self',110],anim:'Attack',aiP:100,per:1,desc:"Pétales tranchants tout autour de Roserade pendant 1 s (4 coups)."},
  // Ligue — lot 2 (autres membres des Conseils)
  stalactite:{n:'Stalactite',t:'Ice',c:'ph',p:24,k:'sig',sig:'stalactite',cd:5,range:420,shape:['lane',420,12],anim:'Shoot',per:1,aiP:120,desc:"Rafale de 5 stalactites en ligne, de plus en plus rapides ; la visée suit l'ennemi."},
  exuviation:{n:'Exuviation',t:'Normal',c:'st',k:'spec',sig:'exuviation',cd:15,range:9999,shape:['self',40],anim:'Charge',aiP:60,desc:"Attaque, Atq. Spé. ×1,5 et Vitesse ×1,3 pendant 8 s, mais les défenses baissent pendant 8 s."},
  grobisou:{n:'Grobisou',t:'Normal',c:'sp',p:50,k:'spec',sig:'grobisou',cd:6,range:90,shape:['wedge',94,.7],anim:'Attack',close:1,aiP:90,desc:"Baiser à courte portée qui endort l'ennemi 1,5 s."},
  rueeglaciale:{n:'Ruée Glaciale',t:'Ice',c:'ph',p:70,k:'sig',sig:'rueeglaciale',cd:5,range:280,shape:['lane',280,24],anim:'Attack',close:1,aiP:120,desc:"Glisse sur la glace en ligne droite en traversant l'ennemi ; la traînée glacée ralentit et fait des dégâts pendant 2,5 s."},
  poingselementaires:{n:'Poings Élémentaires',t:'Fighting',c:'ph',p:32,k:'sig',sig:'poingselementaires',cd:5,range:200,shape:['lane',190,24],anim:'Attack',close:1,per:1,aiP:130,desc:"Courte charge ; au contact, combo de 3 poings : feu (brûle), glace (ralentit), éclair (étourdit)."},
  piedvoltige:{n:'Pied Voltige',t:'Fighting',c:'ph',p:140,k:'sig',sig:'piedvoltige',cd:5,range:300,shape:['leap',50],anim:'Attack',close:1,aiP:140,desc:"Grand bond sur la zone visée qui frappe très fort ; s'il rate, Kicklee s'écrase, perd 8 % de ses PV et reste étourdi un instant."},
  piedbruleur:{n:'Pied Brûleur',t:'Fire',c:'ph',p:85,k:'spec',sig:'piedbruleur',cd:3.5,range:240,shape:['lane',230,24],anim:'Attack',close:1,fx:{burn:.3},desc:"Charge pied en avant : 30 % de chance de brûler, et une traînée de flammes au sol."},
  roulade:{n:'Roulade',t:'Rock',c:'ph',p:55,k:'sig',sig:'roulade',cd:6,range:300,shape:['lane',300,26],anim:'Charge',close:1,aiP:120,desc:"Roule en boule, rebondit sur les murs et accélère à chaque rebond ; plus il va vite, plus il frappe fort."},
  ligotage:{n:'Ligotage',t:'Poison',c:'ph',p:110,k:'sig',sig:'ligotage',cd:6,range:200,shape:['lane',180,24],anim:'Attack',close:1,aiP:120,desc:"Courte charge ; au contact, s'enroule autour de l'ennemi : immobilisé 1,3 s et 4 coups sur la durée."},
  detricanon:{n:'Détricanon',t:'Poison',c:'sp',p:42,k:'spec',sig:'detricanon',cd:4.5,range:520,shape:['lane',520,26],anim:'Shoot',per:1,aiP:110,fx:{poison:.3},desc:"Après 0,3 s de visée, rayon de poison pendant 0,6 s : 4 coups qui repoussent, 30 % de chance d'empoisonner chacun."},
  regardmedusant:{n:'Regard Médusant',t:'Normal',c:'st',k:'spec',sig:'regardmedusant',cd:6,range:190,shape:['wedge',190,.5],anim:'Charge',aiP:70,desc:"Regard en cône : ralentit très fortement l'ennemi pendant 2,5 s."},
  chutelibre:{n:'Chute Libre',t:'Flying',c:'ph',p:100,k:'sig',sig:'chutelibre',cd:6,range:240,shape:['lane',230,24],anim:'Attack',close:1,aiP:130,desc:"Charge ; au contact, saisit l'ennemi et l'emporte dans les airs (on dirige le vol avec le déplacement) puis le lâche : il est ralenti après la chute."},
  ventarriere:{n:'Vent Arrière',t:'Flying',c:'sp',p:35,k:'sig',sig:'ventarriere',cd:6,range:380,shape:['zone',46],anim:'Shoot',per:1,aiP:120,desc:"Ouragan qui suit la visée en direct pendant 1 s et frappe jusqu'à 3 fois."},
  vitessefeu:{n:'Vitesse Extrême enflammée',t:'Fire',c:'ph',p:34,k:'sig',sig:'vitessefeu',cd:6,uses:3,per:1,range:280,shape:['lane',280,24],anim:'Attack',close:1,aiP:150,desc:"Traverse l'ennemi en un éclair de feu et laisse une traînée brûlante. Utilisable 3 fois : 2 s pour relancer après chaque utilisation."},
  crocsfeu:{n:'Crocs Feu',t:'Fire',c:'ph',p:70,k:'melee',reach:58,cd:2,jaw:'fire',fx:{burn:.2}},
  boutefeu:{n:'Boutefeu',t:'Fire',c:'ph',p:90,k:'dash',spd:860,dur:.3,cd:4.5,fx:{recoil:.33,burn:.1}},
  bombeoeuf:{n:"Bomb'Œuf",t:'Normal',c:'ph',p:60,k:'sig',sig:'bombeoeuf',cd:5,range:380,shape:['zone3',46],anim:'Shoot',per:1,aiP:120,desc:"Lance 3 œufs qui explosent l'un après l'autre autour du point visé."},
  gigasangsue:{n:'Giga-Sangsue',t:'Grass',c:'sp',p:75,k:'spec',sig:'gigasangsue',cd:4,range:160,shape:['wedge',160,.5],anim:'Shoot',fx:{drain:.5},desc:"Cône devant soi qui vole la moitié des dégâts en PV."},
  lancesoleil:{n:'Lance-Soleil',t:'Grass',c:'sp',p:42,k:'spec',sig:'lancesoleil',cd:5,range:520,shape:['lane',520,30],anim:'Shoot',per:1,aiP:120,desc:"Après 0,55 s de préparation, rayon de soleil pendant 0,6 s : 4 coups qui repoussent."},
  flemme:{n:'Flemme',t:'Psychic',c:'st',k:'sig',sig:'flemme',cd:24,range:9999,shape:['self',30],anim:'Charge',aiP:40,desc:"S'immobilise 1,2 s pour récupérer 35 % de ses PV ; renvoie les projectiles pendant ce temps."},
  bombebeurksig:{n:'Bombe Beurk',t:'Poison',c:'sp',p:90,k:'sig',sig:'bombebeurk',cd:4,range:380,shape:['zone',60],anim:'Shoot',fx:{poison:.3},aiP:120,desc:"Crache une boule de poison sur une zone : dégâts, 30 % de chance d'empoisonner, et une mare qui ralentit pendant 2,5 s."},
  // Ligue — lot 1 (aces des dresseurs)
  lyophilisation:{n:'Lyophilisation',t:'Ice',c:'sp',p:90,k:'sig',sig:'lyophilisation',freezeDry:1,cd:5.5,range:220,shape:['wedge',220,.5],anim:'Shoot',aiP:130,desc:"Cône de givre après une courte préparation : le sol gelé ralentit pendant 2 s. Super efficace sur les types Eau."},
  dynamopoing:{n:'Dynamopoing',t:'Fighting',c:'ph',p:75,k:'sig',sig:'dynamopoing',cd:6,range:140,shape:['lane',150,30],anim:'Attack',close:1,aiP:150,desc:"Rafale des 4 bras devant soi (4 coups qui bloquent), puis un énorme poing s'abat sur une zone devant le lanceur : étourdit 1 s."},
  devoreve:{n:'Hypnose / Dévorêve',t:'Psychic',c:'sp',p:110,k:'sig',sig:'devoreve',cd:6,range:380,shape:['zone',62],anim:'Shoot',aiP:130,desc:"Hypnose : zone qui endort 1,5 s. Sur un ennemi endormi, l'attaque devient Dévorêve (puissance 110) et rend la moitié des dégâts en PV ; elle est alors disponible tout de suite."},
  bombebeurk:{n:'Bombe Beurk',t:'Poison',c:'sp',p:80,k:'spec',sig:'bombebeurk',cd:4,range:380,shape:['zone',60],anim:'Shoot',fx:{poison:.3},desc:"Crache une boule de poison sur une zone : dégâts, 30 % de chance d'empoisonner, et une mare qui ralentit pendant 2,5 s."},
  hydroblast:{n:'Hydroblast',t:'Water',c:'sp',p:120,k:'sig',sig:'hydroblast',cd:6,range:500,shape:['lane',500,40],anim:'Shoot',aiP:150,desc:"Après une courte visée, les deux canons tirent deux jets parallèles qui repoussent loin. Tortank recule sous le recul."},
  prescience:{n:'Prescience',t:'Psychic',c:'sp',p:130,k:'sig',sig:'prescience',cd:6,range:380,shape:['zone',70],anim:'Charge',aiP:120,desc:"Marque discrètement une zone qui explose 2 s plus tard."},
  poisoncroix:{n:'Poison-Croix',t:'Poison',c:'ph',p:40,k:'sig',sig:'poisoncroix',cd:6,range:200,shape:['lane',150,24],anim:'Attack',close:1,per:1,aiP:130,desc:"Trois charges très rapides qui se croisent (redirigeables) ; chacune peut empoisonner (40 %)."},
  toxik:{n:'Toxik',t:'Poison',c:'sp',p:30,k:'proj',spd:430,r:11,life:1.2,cd:3,fx:{poison:1}},
  hurlementinfernal:{n:'Hurlement Infernal',t:'Dark',c:'sp',p:95,k:'sig',sig:'hurlementinfernal',cd:5.5,range:200,shape:['wedge',200,.55],anim:'Shoot',aiP:130,desc:"Cône de flammes noires : brûle (50 %) et baisse l'Attaque de l'ennemi."},
  coupefatale:{n:'Coupe Fatale',t:'Dark',c:'ph',p:35,k:'sig',sig:'coupefatale',cd:6,range:300,shape:['lane',300,22],anim:'Attack',close:1,per:1,aiP:140,desc:"Recule en suivant l'ennemi des yeux, puis disparaît et frappe 3 fois dans un long couloir devant soi ; réapparaît au bout."},
  coupbas:{n:'Coup Bas',t:'Dark',c:'ph',p:70,k:'dash',spd:950,dur:.14,cd:2.8},
  poingombre:{n:'Poing Ombre',t:'Ghost',c:'ph',p:110,k:'sig',sig:'poingombre',cd:6,range:380,shape:['zone',55],anim:'Attack',aiP:130,desc:"Une main géante sort du sol sur la zone visée, saisit l'ennemi (immobilisé) puis l'écrase."},
  glaciation:{n:'Glaciation',t:'Ice',c:'sp',p:120,k:'sig',sig:'glaciation',cd:9,range:380,shape:['zone',130],anim:'Charge',aiP:140,desc:"Énorme zone qui se fige pendant 1,5 s, puis gèle tout : très puissant, et l'ennemi est immobilisé 1 s."},
  piquedraconique:{n:'Piqué Draconique',t:'Dragon',c:'ph',p:120,k:'sig',sig:'piquedraconique',cd:6,range:340,shape:['lane',340,30],anim:'Attack',aiP:150,desc:"S'envole (hors d'atteinte, la visée suit) puis pique en ligne droite enveloppé de flammes bleues."},
  pincesvenimeuses:{n:'Pinces Venimeuses',t:'Poison',c:'ph',p:35,k:'sig',sig:'pincesvenimeuses',cd:6,range:250,shape:['lane',240,24],anim:'Attack',close:1,per:1,aiP:130,desc:"Charge ; si elle touche, saisit l'ennemi entre ses pinces (immobilisé), le frappe 3 fois et peut l'empoisonner."},
  rocboulet:{n:'Roc-Boulet',t:'Rock',c:'ph',p:55,k:'sig',sig:'rocboulet',cd:7,range:420,shape:['lane',420,26],anim:'Shoot',aiP:140,desc:"Lance 3 rochers de plus en plus gros (redirigeables) qui roulent et rebondissent sur les murs. Rhinastoc doit récupérer ensuite.",per:1},
  megacorne:{n:'Mégacorne',t:'Bug',c:'ph',p:100,k:'spec',sig:'megacorne',cd:4.5,range:250,shape:['lane',250,24],anim:'Attack',close:1,desc:"Charge cornue qui repousse loin, brise les rochers et empale l'ennemi (projeté en l'air)."},
  megacornesig:{n:'Mégacorne',t:'Bug',c:'ph',p:110,k:'sig',sig:'megacorne',cd:4.5,range:250,shape:['lane',250,24],anim:'Attack',close:1,aiP:140,desc:"Charge cornue qui repousse loin, brise les rochers et empale l'ennemi (projeté en l'air)."},
  canonbrulant:{n:'Canon Brûlant',t:'Fire',c:'sp',p:42,k:'sig',sig:'canonbrulant',cd:6,range:300,shape:['wedge',300,.35],anim:'Shoot',per:1,aiP:140,desc:"Tire 3 boules de feu en éventail qui explosent en zone et laissent le sol en flammes 2 s."},
  lamepsychique:{n:'Lame Psychique',t:'Psychic',c:'ph',p:80,k:'sig',sig:'lamepsychique',cd:5,range:300,shape:['lane',300,24],anim:'Attack',aiP:130,desc:"Coupe en croix devant soi, puis une lame d'énergie projetée (puissance 50)."},
  coupepsyko:{n:'Coupe Psyko',t:'Psychic',c:'ph',p:85,k:'spec',sig:'coupepsyko',cd:3.5,range:260,shape:['lane',250,24],anim:'Attack',close:1,desc:"Charge qui traverse l'ennemi et l'immobilise très brièvement."},
  // Légendaires
  frappepsy:{n:'Frappe Psy',t:'Psychic',c:'sp',p:34,k:'sig',sig:'frappepsy',vsDef:1,cd:7,range:380,shape:['zone',80],anim:'Charge',per:1,aiP:170,desc:"Mewtwo s'immobilise et fait tomber 5 météores psychiques l'un après l'autre sur la zone visée (ils suivent la visée). Le dernier, énorme (puissance 90), étourdit 0,5 s. Calculée sur la Défense de la cible, pas sur sa Déf. Spé."},
  sombreruade:{n:'Sombre Ruade',t:'Ghost',c:'sp',p:70,k:'sig',sig:'sombreruade',cd:7,range:360,shape:['lanes3',380,62],anim:'Attack',aiP:160,desc:"Après un court arrêt (les trois couloirs s'affichent), le lanceur se dédouble à gauche et à droite : les trois cavaliers chargent en ligne droite et traversent l'ennemi, qui est ralenti. Peu après, des branches maudites jaillissent du sol sur les trois couloirs (puissance 60) et la zone ralentit pendant 2 s."},
  machination:{n:'Machination',t:'Dark',c:'st',k:'buff',buff:{spa:1.6},dur:8,cd:15},
  vampibaiser:{n:'Vampibaiser',t:'Fairy',c:'sp',p:50,k:'spec',sig:'vampibaiser',cd:3.5,range:200,shape:['lane',190,24],anim:'Attack',close:1,fx:{drain:.75},desc:"Courte charge, puis un baiser qui vole 75 % des dégâts infligés en PV."},
  coupfulgurant:{n:'Coup Fulgurant',t:'Electric',c:'ph',p:50,k:'sig',sig:'coupfulgurant',uses:3,cd:6,range:260,shape:['lane',260,24],anim:'Attack',close:1,per:1,aiP:140,desc:"Utilisable 3 fois de suite (2 s pour enchaîner) : les deux premières fois, une charge fulgurante traverse l'ennemi ; la 3e, le lanceur bondit et s'écrase sur lui (puissance 85) en l'étourdissant 0,45 s."},
  rapace:{n:'Rapace',t:'Flying',c:'ph',p:120,k:'spec',sig:'rapace',cd:5,range:300,shape:['leap',60],anim:'Attack',close:1,fx:{recoil:.25},aiP:120,desc:"S'envole (hors d'atteinte), puis fonce en piqué sur la zone visée : étourdit 0,5 s. Le lanceur subit un quart des dégâts infligés."},
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
  dansedufeu:{n:'Danse du Feu',t:'Fire',c:'sp',p:32,k:'sig',sig:'dansedufeu',cd:5,range:380,shape:['lane',360,32],anim:'Charge',aiP:110,desc:"Tornade de flammes rapide qui file en ligne droite. Au contact, elle l'emporte avec elle (immobilisé) et le frappe 5 fois de suite, puis le relâche. 50 % de chance d'augmenter l'Atq. Spé.",per:1},
  chantflamboyant:{n:'Chant Flamboyant',t:'Fire',c:'sp',p:100,k:'sig',sig:'chantflamboyant',cd:4.5,range:420,shape:['lane',420,46],anim:'Shoot',aiP:130,desc:"Une large vague de flammes et de notes part droit devant (on peut l'esquiver sur le côté). Si elle touche : Atq. Spé. augmentée pendant 6 s."},
  // Vol
  ventviolent:{n:'Vent Violent',t:'Flying',c:'sp',p:50,k:'spec',sig:'ventviolent',cd:6,range:380,shape:['wedge',380,.58],anim:'Shoot',per:1,aiP:110,fx:{stun:.2},desc:"3 tornades : deux partent en V, une au centre. Chacune touche une fois (20 % de chance d'étourdir)."},
  atterrissage:{n:'Atterrissage',t:'Flying',c:'st',k:'heal',pct:.3,cd:22,roost:2,desc:"Soigne 30 % des PV en 2 s. Pendant ce temps, le lanceur perd le type Vol (les attaques Sol peuvent le toucher)."},
  lamedair:{n:"Lame d'Air",t:'Flying',c:'sp',p:45,k:'sig',sig:'lamedair',cd:3.6,range:260,shape:['wedge',260,.4],anim:'Shoot',aiP:110,desc:"3 lames de vent qui reviennent comme des boomerangs. Chacune touche à l'aller et au retour.",per:1},
  // Dragon
  dracochoc:{n:'Draco-Choc',t:'Dragon',c:'sp',p:95,k:'proj',spd:430,r:22,life:1.4,cd:3,look:'dragonpulse',fx:{spdDown:.2}},
  dracocharge:{n:'Draco-Charge',t:'Dragon',c:'ph',p:100,k:'dash',spd:740,dur:.42,cd:4,fx:{stun:.25}},
  dansedraco:{n:'Danse Draco',t:'Dragon',c:'st',k:'buff',buff:{atk:1.4,spe:1.25},dur:10,cd:15},
  dracofleches:{n:'Draco-Flèches',t:'Dragon',c:'ph',p:50,k:'sig',sig:'dracofleches',cd:4,range:450,shape:['lane',450,12],anim:'Shoot',aiP:105,desc:"Lance deux Fantyrm qui poursuivent l'ennemi.",per:1},
  colere:{n:'Colère',t:'Dragon',c:'ph',p:58,k:'sig',sig:'colere',cd:6,range:130,shape:['wedge',130,1],anim:'Attack',close:1,aiP:170,desc:"4 coups de griffes enchaînés, redirigeables entre chaque, de plus en plus larges : le lanceur bondit en avant à chaque coup et l'ennemi touché reste pris dans le combo. Le dernier frappe plus fort, fend le sol et repousse. Ensuite, le lanceur est épuisé (étourdi 0,5 s).",per:1},
  // Eau
  vibraqua:{n:'Vibraqua',t:'Water',c:'sp',p:75,k:'proj',spd:430,r:22,life:1.4,cd:3.5,look:'waterpulse',fx:{stun:.2}},
  hydrocanon:{n:'Hydrocanon',t:'Water',c:'sp',p:38,k:'spec',sig:'hydrocanon',cd:4.5,range:520,shape:['lane',520,30],anim:'Shoot',per:1,aiP:120,desc:"Après 0,25 s de visée, énorme rayon d'eau pendant 0,6 s : 4 coups qui repoussent l'ennemi. Le lanceur ne bouge pas pendant le tir."},
  anneauhydro:{n:'Anneau Hydro',t:'Water',c:'st',k:'ring',dur:6,cd:24},
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
  repos:{n:'Repos',t:'Psychic',c:'st',k:'rest',cd:34},
  psyko:{n:'Psyko',t:'Psychic',c:'sp',p:135,k:'sig',sig:'psyko',cd:5,range:380,shape:['zone',60],anim:'Shoot',desc:"Zone visée qui suit lentement l'ennemi pendant 0,5 s ; un anneau blanc se referme jusqu'au moment de l'impact. S'il est dedans quand elle se déclenche, il est soulevé (immobilisé) puis écrasé au sol. Un Dash permet d'y échapper."},
  // Fée
  eclatmagique:{n:'Éclat Magique',t:'Fairy',c:'sp',p:85,k:'quake',max:175,dur:.4,cd:4,ring:'stars'},
  pouvoirlunaire:{n:'Pouvoir Lunaire',t:'Fairy',c:'sp',p:130,k:'sig',sig:'pouvoirlunaire',cd:5,range:380,shape:['zone',76],anim:'Shoot',desc:"Une lune descend sur la zone visée (en 0,6 s, en suivant lentement l'ennemi) et explose."},
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
  lamederoc:{n:'Lame de Roc',t:'Rock',c:'ph',p:110,k:'sig',sig:'lamederoc',cd:5.5,range:300,shape:['lane',310,26],anim:'Attack',desc:"Ligne de piliers de roche qui jaillissent du sol les uns après les autres. Ils restent 1,5 s comme obstacles pour l'ennemi (le lanceur les traverse). L'ennemi touché est projeté en l'air."},
  // Glace
  poingglace:{n:'Poing Glace',t:'Ice',c:'ph',p:80,k:'spec',sig:'poingglace',cd:3.5,range:280,shape:['lane',266,24],anim:'Attack',close:1,fx:{slow:.3},desc:"Charge, puis coup de poing glacé à l'impact ou au bout de la course. 30 % de chance de ralentir."},
  crocsgivre:{n:'Crocs Givre',t:'Ice',c:'ph',p:70,k:'melee',reach:58,cd:2,jaw:'ice',fx:{slow:.3}},
  eclatsglace:{n:'Éclats Glace',t:'Ice',c:'ph',p:55,k:'homing',cnt:1,spd:360,turn:2.6,r:11,life:1.7,cd:3,look:'diamond',fx:{slow:1,slowT:.5}},
  laserglace:{n:'Laser Glace',t:'Ice',c:'sp',p:80,k:'spec',sig:'laserglace',beam:1,cd:4,range:560,shape:['lane',560,18],anim:'Shoot',fx:{slow:1},desc:"Après 0,2 s de visée, laser à longue portée. Ralentit à coup sûr, 10 % de chance d'immobiliser 1 s. Laisse une traînée de givre au sol pendant 3 s qui ralentit."},
  chuteglace:{n:'Chute Glace',t:'Ice',c:'ph',p:40,k:'sig',sig:'chuteglace',cd:5,range:380,shape:['zone',80],anim:'Shoot',aiP:135,desc:"5 stalactites tombent l'une après l'autre : la 1re sur la zone visée, les suivantes sur la position de l'ennemi (elles le suivent). La dernière, plus grosse, immobilise 0,4 s et reste plantée : la prochaine attaque du lanceur la fait exploser.",per:1},
  cavalerielourde:{n:'Cavalerie Lourde',t:'Ground',c:'ph',p:95,k:'spec',sig:'cavalerielourde',cd:4.5,range:280,shape:['lane',280,26],anim:'Attack',close:1,aiP:115,desc:"Charge, puis au bout de la course un petit bond en avant écrase une zone en cercle : l'ennemi touché est immobilisé 0,35 s."},
  blizzard:{n:'Blizzard',t:'Ice',c:'sp',p:40,k:'sig',sig:'blizzard',cd:6,range:230,shape:['wedge',235,.7],anim:'Shoot',aiP:115,desc:"Tempête de neige en cône pendant 1 s (4 coups, ralentit). Si les 4 coups touchent, l'ennemi est gelé 0,5 s. Le lanceur ne se déplace pas pendant ce temps.",per:1},
  // Normal
  gigaimpact:{n:'Giga Impact',t:'Normal',c:'ph',p:150,k:'dash',spd:820,dur:.48,cd:7,recharge:1.1},
  danselames:{n:'Danse-Lames',t:'Normal',c:'st',k:'buff',buff:{atk:1.5},dur:10,cd:15},
  paresse:{n:'Paresse',t:'Normal',c:'st',k:'heal',pct:.3,cd:22,lock:.6},
  vitesseextreme:{n:'Vitesse Extrême',t:'Normal',c:'ph',p:60,k:'sig',sig:'vitesseextreme',cd:6,uses:3,per:1,range:280,shape:['lane',280,24],anim:'Attack',close:1,desc:"Traverse l'ennemi en un éclair. Utilisable 3 fois : 2 s pour relancer après chaque utilisation."},
  plaquage:{n:'Plaquage',t:'Normal',c:'ph',p:130,k:'sig',sig:'plaquage',cd:3.5,range:270,shape:['leap',110],anim:'Attack',close:1,desc:"Saute sur la zone visée (en l'air, passe au-dessus des attaques) et retombe avec une onde de choc qui étourdit."},
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
  doubledard:{n:'Double Dard',t:'Poison',c:'sp',p:55,k:'sig',sig:'doubledard',cd:5.5,range:320,shape:['lane',340,14],anim:'Attack',aiP:120,desc:"Lance un dard (empoisonne à coup sûr) et charge en même temps. Si la charge touche : vole la moitié des dégâts en PV, étourdit 0,5 s, et le lanceur bondit en arrière.",per:1},
  // ---------- Unys (génération 5) ----------
  ecosphere:{n:'Éco-Sphère',t:'Grass',c:'sp',p:90,k:'proj',spd:400,r:20,life:1.5,cd:3.5,fx:{spdDown:.1}},
  feudames:{n:"Feu d'Âmes",t:'Ghost',c:'sp',p:85,k:'sig',sig:'feudames',spd:380,r:15,life:2,cd:5,range:420,shape:['self',40],anim:'Charge',aiP:130,fx:{burn:.35},desc:"Trois flammes spectrales tournent autour du lanceur puis partent l'une après l'autre sur l'ennemi (elles le suivent un peu). Peuvent brûler."},
  piegemental:{n:'Piège Mental',t:'Psychic',c:'sp',p:110,k:'sig',sig:'piegemental',cd:7,range:360,shape:['zone',85],anim:'Shoot',aiP:120,desc:"Zone visée : si l'ennemi est dedans, il ne peut plus en sortir pendant 2 s, puis la zone éclate."},
  rafalekungfu:{n:'Rafale de Kung-Fu',t:'Fighting',c:'ph',p:120,k:'sig',sig:'rafalekungfu',cd:5,range:200,shape:['lane',200,42],anim:'Attack',close:1,aiP:130,desc:"Avance en enchaînant 4 coups de pied tournoyants (dirigeables) ; le dernier repousse."},
  guillotine:{n:'Guillotine',t:'Dragon',c:'ph',p:150,k:'sig',sig:'guillotine',cd:6.5,range:150,shape:['wedge',150,.65],anim:'Attack',close:1,aiP:140,desc:"Courte préparation, puis une énorme entaille en croix devant le lanceur. Très puissante ; récupération courte ensuite."},
  sarcophage:{n:'Malédiction du Sarcophage',t:'Ghost',c:'sp',p:80,k:'sig',sig:'sarcophage',cd:7,range:340,shape:['zone',52],anim:'Shoot',aiP:120,desc:"Après un court délai, enferme l'ennemi de la zone visée dans un sarcophage : il est frappé et immobilisé 1 s."},
  tentacules:{n:"Tentacules d'Eau",t:'Water',c:'sp',p:90,k:'sig',sig:'tentacules',cd:6,range:270,shape:['lane',270,24],anim:'Shoot',aiP:120,desc:"Des tentacules saisissent l'ennemi dans le couloir et l'attirent, avec 3 coups sur la durée."},
  coupboulevoyou:{n:'Coup de Boule Voyou',t:'Dark',c:'ph',p:85,k:'sig',sig:'coupboulevoyou',cd:5,range:240,shape:['lane',230,24],anim:'Attack',close:1,aiP:120,desc:"Charge tête la première : repousse et baisse l'Attaque de l'ennemi pendant 5 s."},
  griffefurtive:{n:'Griffe Furtive',t:'Dark',c:'ph',p:80,k:'sig',sig:'griffefurtive',cd:4.5,range:360,shape:['self',30],anim:'Attack',aiP:120,desc:"Disparaît un instant puis réapparaît derrière l'ennemi (s'il est à portée) et le griffe."},
  machoiresable:{n:'Mâchoire de Sable',t:'Ground',c:'ph',p:100,k:'sig',sig:'machoiresable',cd:6,range:320,shape:['leap',55],anim:'Attack',close:1,aiP:125,desc:"S'enfouit, file sous le sol (intouchable) et surgit sous la zone visée en mordant ; l'ennemi est projeté en l'air."},
  brumereve:{n:'Brume de Rêve',t:'Psychic',c:'st',k:'sig',sig:'brumereve',cd:10,range:360,shape:['zone',95],anim:'Shoot',aiP:60,desc:"Nuage rose pendant 3 s : l'ennemi qui y reste près d'une seconde s'endort 1,6 s."},
  prisme:{n:'Prisme',t:'Psychic',c:'sp',p:85,k:'sig',sig:'prisme',cd:4.5,range:460,shape:['lane',460,14],anim:'Shoot',aiP:120,desc:"Rayon qui se divise en 3 au bout de sa course. Peut toucher deux fois (le second coup à moitié)."},
  membranepsy:{n:'Membrane Psy',t:'Psychic',c:'sp',p:95,k:'sig',sig:'membranepsy',cd:8,range:110,shape:['self',110],anim:'Charge',aiP:110,desc:"Bulle de 1,2 s qui renvoie les projectiles, puis explose autour du lanceur."},
  projection:{n:'Projection',t:'Fighting',c:'ph',p:100,k:'sig',sig:'projection',cd:5.5,range:210,shape:['lane',200,24],anim:'Attack',close:1,aiP:125,desc:"Courte charge ; au contact, saisit l'ennemi et le projette loin derrière lui (étourdi à l'atterrissage)."},
  brisegarde:{n:'Brise-Garde',t:'Fighting',c:'ph',p:95,k:'sig',sig:'brisegarde',cd:3.5,range:160,shape:['lane',160,24],anim:'Attack',close:1,aiP:120,desc:"Coup de karaté rapide qui traverse les boucliers et les poupées (et les détruit)."},
  piliersbeton:{n:'Piliers de Béton',t:'Fighting',c:'ph',p:120,k:'sig',sig:'piliersbeton',cd:7,range:150,shape:['wedge',150,.5],anim:'Attack',close:1,aiP:120,desc:"Plante deux piliers devant lui (obstacles pour l'ennemi) qui tombent en avant 1,1 s plus tard."},
  triplesouffle:{n:'Triple Souffle',t:'Dark',c:'sp',p:100,k:'sig',sig:'triplesouffle',spd:420,r:18,life:1.3,cd:4,range:440,shape:['lane',440,40],anim:'Shoot',aiP:125,desc:"Ses trois têtes tirent trois souffles en éventail, l'un après l'autre."},
  queuerageuse:{n:'Coup de Queue Rageur',t:'Dragon',c:'ph',p:90,k:'sig',sig:'queuerageuse',cd:5,range:130,shape:['wedge',130,1.35],anim:'Attack',close:1,aiP:120,desc:"Grand balayage de queue en arc devant le lanceur ; étourdit 0,5 s."},
  envolfossile:{n:'Envol Fossile',t:'Rock',c:'ph',p:95,k:'sig',sig:'envolfossile',cd:6,range:320,shape:['lane',320,34],anim:'Attack',aiP:125,desc:"S'envole (intouchable), puis pique en ligne droite en lâchant trois pierres sur son passage."},
  // ---------- Kalos (génération 6) ----------
  rapaceenflamme:{n:"Rapace Enflammé",t:'Fire',c:'ph',p:120,k:'sig',sig:'rapaceenflamme',fx:{recoil:.15},cd:6,range:330,shape:['lane',330,30],anim:'Attack',aiP:125,desc:"S'élève (intouchable) puis pique en flammes en ligne droite, en laissant une traînée de feu. Le lanceur subit un peu de recul."},
  poingsmultiples:{n:"Poings Multiples",t:'Rock',c:'ph',p:120,k:'sig',sig:'poingsmultiples',close:1,cd:5,range:105,shape:['wedge',120,.8],anim:'Attack',aiP:125,desc:"Ses bras frappent en rafale devant lui (6 coups) ; le dernier, en pierre, repousse."},
  bouclierroyal:{n:"Bouclier Royal",t:'Steel',c:'ph',p:130,k:'sig',sig:'bouclierroyal',close:1,cd:7,range:150,shape:['wedge',150,.7],anim:'Attack',aiP:125,desc:"Forme bouclier 0,8 s (dégâts reçus réduits de moitié, l'ennemi qui s'approche perd de l'Attaque), puis forme lame : grand coup d'épée devant lui."},
  ultrasondragon:{n:"Ultrason Dragon",t:'Dragon',c:'sp',p:90,k:'sig',sig:'ultrasondragon',cd:5,range:240,shape:['wedge',240,.5],anim:'Attack',aiP:125,desc:"Onde sonore en cône qui étourdit brièvement (0,4 s) et repousse."},
  rugissementardent:{n:"Rugissement Ardent",t:'Fire',c:'sp',p:85,k:'sig',sig:'rugissementardent',cd:5,range:200,shape:['wedge',200,.6],anim:'Attack',aiP:125,desc:"Rugissement en cône qui brûle (50 %) et repousse."},
  eruption:{n:"Éruption",t:'Fire',c:'sp',p:150,k:'sig',sig:'eruption',cd:7,range:180,shape:['self',180],anim:'Attack',aiP:125,desc:"Fait jaillir 7 colonnes de lave tout autour (une sous l'ennemi s'il est proche). Plus puissante quand le lanceur a tous ses PV."},
  canonpince:{n:"Canon Pince",t:'Water',c:'sp',p:110,k:'sig',sig:'canonpince',cd:6,range:520,shape:['lane',520,30],anim:'Attack',aiP:125,desc:"Après une courte charge, énorme jet d'eau depuis sa pince, très long, qui repousse."},
  etoilefilante:{n:"Étoile Filante",t:'Water',c:'sp',p:110,k:'sig',sig:'etoilefilante',cd:6,range:400,shape:['lane',400,30],anim:'Attack',aiP:125,desc:"Tourne en toupie et file en ricochant sur les murs pendant 0,9 s ; peut toucher plusieurs fois."},
  trousseau:{n:"Trousseau",t:'Steel',c:'sp',p:60,k:'sig',sig:'trousseau',cd:7,range:420,shape:['lane',420,16],anim:'Attack',aiP:125,desc:"Lance ses clés : l'ennemi touché ne peut plus attaquer pendant 2 s."},
  aimantgeant:{n:"Aimant Géant",t:'Steel',c:'sp',p:90,k:'sig',sig:'aimantgeant',cd:6,range:300,shape:['self',300],anim:'Attack',aiP:125,desc:"Attire l'ennemi vers lui pendant 0,6 s, puis le frappe s'il est au contact (et l'étourdit un instant)."},
  jettoxique:{n:"Jet Toxique",t:'Poison',c:'sp',p:90,k:'sig',sig:'jettoxique',cd:4.5,range:460,shape:['lane',460,14],anim:'Attack',aiP:125,desc:"Jet de poison draconique, suivi d'un second plus faible : empoisonne et ralentit 2 s."},
  mucusdragon:{n:"Mucus Dragon",t:'Dragon',c:'sp',p:70,k:'sig',sig:'mucusdragon',cd:8,range:360,shape:['zone',95],anim:'Attack',aiP:125,desc:"Flaque visqueuse 3,5 s qui ralentit fortement ; le lanceur encaisse deux fois moins pendant 2 s."},
  crocsroyaux:{n:"Crocs Royaux",t:'Dragon',c:'ph',p:110,k:'sig',sig:'crocsroyaux',close:1,cd:5.5,range:240,shape:['lane',230,24],anim:'Attack',aiP:125,desc:"Charge puis énorme morsure qui retient l'ennemi (immobilisé 0,6 s)."},
  aurorefossile:{n:"Aurore Fossile",t:'Ice',c:'sp',p:60,k:'sig',sig:'aurorefossile',cd:12,range:130,shape:['self',130],anim:'Attack',aiP:125,desc:"Voile d'aurore : dégâts reçus réduits de moitié pendant 4 s ; gèle le sol autour (dégâts et ralentit)."},
  priseaerienne:{n:"Prise Aérienne",t:'Fighting',c:'ph',p:110,k:'sig',sig:'priseaerienne',close:1,cd:5.5,range:300,shape:['leap',55],anim:'Attack',aiP:125,desc:"Bondit sur la zone visée depuis les airs et plaque l'ennemi au sol (immobilisé 0,6 s)."},
  citrouillehantee:{n:"Citrouille Hantée",t:'Ghost',c:'sp',p:110,k:'sig',sig:'citrouillehantee',cd:5.5,range:360,shape:['zone',70],anim:'Attack',aiP:125,desc:"Lance 3 citrouilles en cloche qui explosent en flammes spectrales ; peuvent brûler."},
  // ---------- Alola (génération 7) ----------
  poingglacegeant:{n:"Poing Glacé Géant",t:'Ice',c:'ph',p:130,k:'sig',sig:'poingglacegeant',close:1,cd:7,range:160,shape:['zone',70],anim:'Attack',aiP:125,desc:"Après une courte préparation, un énorme poing gelé s'abat devant lui : gèle le sol et immobilise 1 s."},
  crocderoc:{n:"Croc de Roc",t:'Rock',c:'ph',p:100,k:'sig',sig:'crocderoc',close:1,cd:5.5,range:300,shape:['leap',50],anim:'Attack',aiP:125,desc:"Bondit sur l'ennemi (s'il est à portée), le mord, et des pierres jaillissent tout autour."},
  chateausable:{n:"Château de Sable",t:'Ghost',c:'sp',p:100,k:'sig',sig:'chateausable',cd:9,range:150,shape:['self',150],anim:'Attack',aiP:125,desc:"Engloutit la zone autour de lui dans le sable pendant 2,5 s : ralentit, et chaque coup vole des PV."},
  beccanon:{n:"Bec-Canon",t:'Normal',c:'ph',p:140,k:'sig',sig:'beccanon',cd:7,range:480,shape:['lane',480,30],anim:'Attack',aiP:125,desc:"Charge son bec 1 s (l'ennemi qui le touche est brûlé), puis tire une rafale qui explose au contact ou en fin de course."},
  tisseombre:{n:"Tisse-Ombre",t:'Ghost',c:'ph',p:90,k:'sig',sig:'tisseombre',cd:5,range:560,shape:['lane',560,12],anim:'Attack',aiP:125,desc:"Flèche d'ombre rapide qui traverse et cloue l'ennemi sur place (il ne peut plus bouger pendant 1,5 s)."},
  pousseesumo:{n:"Poussée Sumo",t:'Fighting',c:'ph',p:100,k:'sig',sig:'pousseesumo',close:1,cd:6,range:220,shape:['lane',210,26],anim:'Attack',aiP:125,desc:"Courte charge ; au contact, pousse l'ennemi devant lui. S'il heurte un mur, le coup est 50 % plus fort."},
  furiesimiesque:{n:"Furie Simiesque",t:'Fighting',c:'ph',p:130,k:'sig',sig:'furiesimiesque',close:1,cd:6,range:105,shape:['wedge',120,.8],anim:'Attack',aiP:125,desc:"Cinq coups de plus en plus forts (dirigeables), puis s'épuise 0,8 s."},
  etreinteours:{n:"Étreinte d'Ours",t:'Fighting',c:'ph',p:110,k:'sig',sig:'etreinteours',close:1,cd:6.5,range:210,shape:['lane',200,24],anim:'Attack',aiP:125,desc:"Courte charge ; au contact, serre l'ennemi dans ses bras : immobilisé 1,2 s et 4 coups."},
  tourbillondeau:{n:"Tourbillon d'Eau",t:'Water',c:'sp',p:100,k:'sig',sig:'tourbillondeau',cd:7,range:360,shape:['zone',110],anim:'Attack',aiP:125,desc:"Tourbillon qui aspire l'ennemi vers son centre pendant 1,5 s, puis jaillit."},
  diamanteclat:{n:"Diamant Éclat",t:'Rock',c:'sp',p:110,k:'sig',sig:'diamanteclat',spd:480,r:12,life:1,cd:4,range:420,shape:['lane',420,40],anim:'Attack',aiP:125,desc:"Cinq éclats de diamant volent en éventail."},
  rocheelectrique:{n:"Roche Électrique",t:'Rock',c:'ph',p:110,k:'sig',sig:'rocheelectrique',cd:6,range:360,shape:['zone',55],anim:'Attack',aiP:125,desc:"Lance un rocher chargé en cloche ; la zone d'impact reste électrisée 2 s (petits coups qui peuvent étourdir)."},
  ballonhante:{n:"Ballon Hanté",t:'Ghost',c:'sp',p:100,k:'sig',sig:'ballonhante',cd:6.5,range:240,shape:['lane',230,24],anim:'Attack',aiP:125,desc:"Courte charge ; au contact, emporte l'ennemi dans les airs. Il est étourdi 0,6 s en retombant."},
  danseeveil:{n:"Danse Éveil",t:'Fire',c:'sp',p:100,k:'sig',sig:'danseeveil',spd:420,r:12,life:.8,cd:6,range:200,shape:['self',160],anim:'Attack',aiP:125,desc:"Danse un instant, puis envoie 10 plumes enflammées tout autour ; peuvent brûler."},
  piquecharognard:{n:"Piqué Charognard",t:'Dark',c:'ph',p:80,k:'sig',sig:'piquecharognard',cd:5.5,range:320,shape:['lane',320,30],anim:'Attack',aiP:125,desc:"S'élève puis pique sur l'ennemi : jusqu'à deux fois plus fort s'il est blessé."},
  voileaurore:{n:"Voile Aurore",t:'Ice',c:'sp',p:70,k:'sig',sig:'voileaurore',cd:15,range:160,shape:['self',160],anim:'Attack',aiP:120,desc:"Blizzard autour d'elle (dégâts), puis dégâts reçus réduits de moitié pendant 5 s ; la neige autour d'elle ralentit l'ennemi."},
  chargeheroique:{n:"Charge Héroïque",t:'Normal',c:'ph',p:140,k:'sig',sig:'chargeheroique',fx:{recoil:.25},cd:6,range:330,shape:['lane',330,30],anim:'Attack',aiP:125,desc:"Charge aérienne très puissante qui repousse ; le lanceur subit du recul."},
  champmagnetique:{n:"Champ Magnétique",t:'Electric',c:'sp',p:110,k:'sig',sig:'champmagnetique',cd:7,range:380,shape:['zone',120],anim:'Attack',aiP:125,desc:"Zone qui attire l'ennemi vers son centre pendant 1,2 s, puis l'électrise (étourdi 0,4 s)."},
  // ---------- Paldea (génération 9) ----------
  marecagetoxique:{n:"Marécage Toxique",t:'Poison',c:'ph',p:90,k:'sig',sig:'marecagetoxique',cd:10,range:140,shape:['self',140],anim:'Attack',aiP:125,desc:"Transforme la zone autour de lui en boue toxique pendant 4 s : ralentit, empoisonne, et frappe chaque seconde."},
  marteaugigaton:{n:"Marteau Gigaton",t:'Steel',c:'ph',p:160,k:'sig',sig:'marteaugigaton',close:1,cd:8,range:160,shape:['zone',78],anim:'Attack',aiP:125,desc:"Après une préparation de 0,5 s, énorme coup de marteau sur la zone devant elle. Longue recharge."},
  piedvoltigeaerien:{n:"Pied Voltige Aérien",t:'Fighting',c:'ph',p:110,k:'sig',sig:'piedvoltigeaerien',close:1,cd:5,range:300,shape:['leap',52],anim:'Attack',aiP:125,desc:"Bond aérien sur la zone visée et coup de pied qui repousse très loin."},
  lamesglacees:{n:"Lames Glacées",t:'Ice',c:'ph',p:120,k:'sig',sig:'lamesglacees',cd:6,range:260,shape:['wedge',260,.4],anim:'Attack',aiP:125,desc:"Tire ses 3 lames glacées en éventail ; elles reviennent comme des boomerangs (chacune peut toucher à l'aller et au retour)."},
  eclatstoxiques:{n:"Éclats Toxiques",t:'Poison',c:'sp',p:100,k:'sig',sig:'eclatstoxiques',cd:8,range:170,shape:['self',170],anim:'Attack',aiP:125,desc:"Fait pleuvoir 6 cristaux toxiques autour d'elle ; ils restent 4 s au sol comme pièges qui empoisonnent."},
  seismeaquatique:{n:"Séisme Aquatique",t:'Water',c:'ph',p:100,k:'sig',sig:'seismeaquatique',cd:6,range:150,shape:['self',150],anim:'Attack',aiP:125,desc:"Fait trembler le sol tout autour et jaillir de l'eau."},
  tunneltriple:{n:"Tunnel Triple",t:'Ground',c:'ph',p:120,k:'sig',sig:'tunneltriple',cd:7,range:9999,shape:['self',30],anim:'Attack',aiP:125,desc:"S'enfouit (intouchable) et surgit 3 fois sous l'ennemi, en le suivant."},
  trompeacier:{n:"Trompe d'Acier",t:'Steel',c:'ph',p:110,k:'sig',sig:'trompeacier',close:1,cd:5.5,range:140,shape:['wedge',140,1.1],anim:'Attack',aiP:125,desc:"Grand coup de trompe en arc qui repousse."},
  becacier:{n:"Bec Acier",t:'Steel',c:'ph',p:95,k:'sig',sig:'becacier',cd:5.5,range:320,shape:['lane',320,30],anim:'Attack',aiP:125,desc:"S'élève puis pique en ligne droite ; s'il touche, encaisse deux fois moins pendant 2 s."},
  bananes:{n:"Bananes",t:'Grass',c:'sp',p:90,k:'sig',sig:'bananes',cd:7,range:360,shape:['zone',70],anim:'Attack',aiP:125,desc:"Lance 3 bananes en cloche ; celles qui ratent restent au sol et soignent Tropius de 8 % s'il les ramasse."},
  pommeacide:{n:"Pomme Acide",t:'Grass',c:'sp',p:80,k:'sig',sig:'pommeacide',cd:4.5,range:380,shape:['zone',50],anim:'Attack',aiP:125,desc:"Lance une pomme acide en cloche qui baisse la Déf. Spé. de l'ennemi."},
  lumierelunaire:{n:"Lumière Lunaire",t:'Psychic',c:'sp',p:120,k:'sig',sig:'lumierelunaire',cd:6,range:480,shape:['lane',480,12],anim:'Attack',aiP:125,desc:"Cinq rayons psy pendant 1 s, qui suivent la visée."},
  chargecornue:{n:"Charge Cornue",t:'Grass',c:'ph',p:100,k:'sig',sig:'chargecornue',close:1,cd:5,range:280,shape:['lane',270,26],anim:'Attack',aiP:125,desc:"Charge en ligne qui repousse ; vole la moitié des dégâts en PV."},
  iceberg:{n:"Iceberg",t:'Ice',c:'ph',p:120,k:'sig',sig:'iceberg',cd:8,range:120,shape:['self',120],anim:'Attack',aiP:125,desc:"Se transforme en iceberg 1,2 s (dégâts reçus réduits de moitié, presque immobile), puis écrase tout autour."},
  // ---------- légendaires d'Alola et de Paldea ----------
  meteorayon:{n:'Météorayon',t:'Steel',c:'ph',p:130,k:'sig',sig:'meteorayon',close:1,cd:6,range:360,shape:['lane',360,30],anim:'Attack',aiP:140,desc:"Se charge un instant, puis fonce comme une comète d'acier en ligne droite : traverse et détruit boucliers et poupées, et explose à l'impact."},
  chocfrontal:{n:'Choc Frontal',t:'Fighting',c:'ph',p:140,k:'sig',sig:'chocfrontal',close:1,cd:6,range:340,shape:['lane',330,30],anim:'Attack',aiP:140,desc:"Charge très puissante qui repousse loin ; 30 % plus forte si l'attaque est super efficace. Courte récupération ensuite."},
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
  sylveroy:{name:'Sylveroy Effroi',id:10194,pmd:897,legend:1,ab:'SYL',types:['Psychic','Ghost'],base:[100,85,80,165,100,150],moves:['sombreruade','chocpsy','machination','vampibaiser']},
  electhorgalar:{name:'Électhor Galar',id:10170,pmd:'0145/0001',legend:1,ab:'ÉLG',types:['Fighting','Flying'],base:[90,125,90,85,90,100],moves:['coupfulgurant','rapace','closecombat','sabotage']},
  lokhlass:{name:'Lokhlass',id:131,types:['Water','Ice'],base:[130,85,80,85,95,60],moves:['lyophilisation','surf','laserglace','plenitude']},
  mackogneur:{name:'Mackogneur',id:68,types:['Fighting'],base:[90,130,80,65,85,55],moves:['dynamopoing','closecombat','eboulement','poingfeu']},
  ectoplasma:{name:'Ectoplasma',id:94,types:['Ghost','Poison'],base:[60,65,60,130,75,110],moves:['devoreve','ballombre','bombebeurk','exploforce']},
  tortank:{name:'Tortank',id:9,types:['Water'],base:[79,83,100,85,105,78],moves:['hydroblast','vibraqua','laserglace','aurasphere']},
  xatu:{name:'Xatu',id:178,types:['Psychic','Flying'],base:[65,75,70,95,70,95],moves:['prescience','lamedair','teleport','chocpsy']},
  nostenfer:{name:'Nostenfer',id:169,types:['Poison','Flying'],base:[85,90,80,70,80,130],moves:['poisoncroix','lamedair','demitour','toxik']},
  demolosse:{name:'Démolosse',id:229,types:['Dark','Fire'],base:[75,90,50,110,80,95],moves:['hurlementinfernal','lanceflammes','vibrobscur','machination']},
  absol:{name:'Absol',id:359,types:['Dark'],base:[65,130,60,75,60,75],moves:['coupefatale','danselames','sabotage','coupbas']},
  noctunoir:{name:'Noctunoir',id:477,types:['Ghost'],base:[45,100,135,65,135,45],moves:['poingombre','ballombre','hantise','feufollet']},
  kaimorse:{name:'Kaimorse',id:365,types:['Ice','Water'],base:[110,80,90,95,90,65],moves:['glaciation','surf','blizzard','repos']},
  drattak:{name:'Drattak',id:373,types:['Dragon','Flying'],base:[95,135,80,110,80,100],moves:['piquedraconique','dansedraco','dracocharge','seisme']},
  drascore:{name:'Drascore',id:452,types:['Poison','Dark'],base:[70,90,110,60,75,95],moves:['pincesvenimeuses','machouille','seisme','danselames']},
  rhinastoc:{name:'Rhinastoc',id:464,types:['Ground','Rock'],base:[115,140,130,55,55,40],moves:['rocboulet','seisme','megacorne','poingglace']},
  maganon:{name:'Maganon',id:467,types:['Fire'],base:[75,95,67,125,95,83],moves:['canonbrulant','lanceflammes','tonnerre','deflagration']},
  gallame:{name:'Gallame',id:475,types:['Psychic','Fighting'],base:[68,125,65,65,115,80],moves:['lamepsychique','closecombat','coupepsyko','danselames']},
  crustabri:{name:'Crustabri',id:91,types:['Water','Ice'],base:[50,95,180,85,45,70],moves:['stalactite','exuviation','hydrocanon','eclatsglace']},
  lippoutou:{name:'Lippoutou',id:124,types:['Ice','Psychic'],base:[65,50,35,115,95,95],moves:['grobisou','blizzard','chocpsy','ballombre']},
  lamantine:{name:'Lamantine',id:87,types:['Water','Ice'],base:[90,70,80,70,95,70],moves:['rueeglaciale','laserglace','surf','repos']},
  tygnon:{name:'Tygnon',id:107,types:['Fighting'],base:[50,105,79,35,110,76],moves:['poingselementaires','pistopoing','closecombat','demitour']},
  kicklee:{name:'Kicklee',id:106,types:['Fighting'],base:[50,120,53,35,110,87],moves:['piedvoltige','closecombat','piedbruleur','sabotage']},
  grolem:{name:'Grolem',id:76,types:['Rock','Ground'],base:[80,120,130,55,65,45],moves:['roulade','seisme','lamederoc','eboulement']},
  arbok:{name:'Arbok',id:24,types:['Poison'],base:[60,95,69,65,79,80],moves:['ligotage','detricanon','machouille','regardmedusant']},
  ptera:{name:'Ptéra',id:142,types:['Rock','Flying'],base:[80,105,65,60,75,130],moves:['chutelibre','lamederoc','machouille','eboulement']},
  roucarnage:{name:'Roucarnage',id:18,types:['Normal','Flying'],base:[83,80,75,70,70,101],moves:['ventarriere','lamedair','demitour','atterrissage']},
  rhinoferos:{name:'Rhinoféros',id:112,types:['Ground','Rock'],base:[105,130,120,45,45,40],moves:['megacornesig','seisme','eboulement','poingfeu']},
  arcanin:{name:'Arcanin',id:59,types:['Fire'],base:[90,110,80,100,80,95],moves:['vitessefeu','machouille','crocsfeu','boutefeu']},
  noadkoko:{name:'Noadkoko',id:103,types:['Grass','Psychic'],base:[95,95,85,125,75,55],moves:['bombeoeuf','chocpsy','gigasangsue','lancesoleil']},
  flagadoss:{name:'Flagadoss',id:80,types:['Water','Psychic'],base:[95,75,110,100,80,30],moves:['flemme','surf','psyko','laserglace']},
  grotadmorv:{name:'Grotadmorv',id:89,types:['Poison'],base:[105,105,75,65,100,50],moves:['bombebeurksig','poingglace','sabotage','paresse']},
  migalos:{name:'Migalos',id:168,types:['Bug','Poison'],base:[70,90,70,60,70,40],moves:['toilegluante','demitour','crochetvenin','ombreportee']},
  foretress:{name:'Foretress',id:205,types:['Bug','Steel'],base:[75,90,140,60,60,40],moves:['explosion','picots','tetedefer','gyroballe']},
  kapoera:{name:'Kapoera',id:237,types:['Fighting'],base:[50,95,95,35,110,70],moves:['triplepied','closecombat','machpunch','sabotage']},
  steelix:{name:'Steelix',id:208,types:['Steel','Ground'],base:[75,85,200,55,65,30],moves:['queuedefer','seisme','lamederoc','machouille']},
  noctali:{name:'Noctali',id:197,types:['Dark'],base:[95,65,110,60,130,65],moves:['tricherie','clairdelune','vibrobscur','toxik']},
  corboss:{name:'Corboss',id:430,types:['Dark','Flying'],base:[100,125,52,105,52,71],moves:['nueecorbeaux','rapace','machination','lamedair']},
  hyporoi:{name:'Hyporoi',id:230,types:['Water','Dragon'],base:[75,95,95,95,95,85],moves:['dracometeore','hydrocanon','dracochoc','surf']},
  tengalice:{name:'Tengalice',id:275,types:['Grass','Dark'],base:[90,100,60,90,60,80],moves:['tempeteverte','megafouet','sabotage','ventviolent']},
  cacturne:{name:'Cacturne',id:332,types:['Grass','Dark'],base:[70,115,60,115,60,55],moves:['dardnuee','sabotage','gigasangsue','coupbas']},
  colhomard:{name:'Colhomard',id:342,types:['Water','Dark'],base:[63,120,85,90,55,55],moves:['pincemasse','sabotage','danselames','aquajet']},
  grahyena:{name:'Grahyèna',id:262,types:['Dark'],base:[70,90,70,60,60,70],moves:['crocsfatals','machouille','crocsfeu','crocsgivre']},
  branette:{name:'Branette',id:354,types:['Ghost'],base:[64,115,65,83,63,65],moves:['poupeemaudite','ballombre','feufollet','sabotage']},
  tenefix:{name:'Ténéfix',id:302,types:['Dark','Ghost'],base:[50,75,75,65,65,50],moves:['rayongemme','feufollet','sabotage','ombreportee']},
  oniglali:{name:'Oniglali',id:362,types:['Ice'],base:[80,80,80,80,80,80],moves:['avalanche','crocsgivre','eclatsglace','seisme']},
  libegon:{name:'Libégon',id:330,types:['Ground','Dragon'],base:[80,100,80,80,80,100],moves:['tempetesable','seisme','dracogriffe','demitour']},
  altaria:{name:'Altaria',id:334,types:['Dragon','Flying'],base:[75,70,90,70,105,80],moves:['nuagedoux','pouvoirlunaire','ventviolent','dracosouffle']},
  airmure:{name:'Airmure',id:227,types:['Steel','Flying'],base:[65,80,140,40,70,70],moves:['ailedacier','rapace','picots','atterrissage']},
  galeking:{name:'Galeking',id:306,types:['Steel','Rock'],base:[70,110,180,60,60,50],moves:['fracasstete','tetedefer','seisme','lamederoc']},
  kaorine:{name:'Kaorine',id:344,types:['Ground','Psychic'],base:[60,70,105,70,120,75],moves:['extrasenseur','seisme','chocpsy','teleport']},
  vacilys:{name:'Vacilys',id:346,types:['Rock','Grass'],base:[86,81,97,81,107,43],moves:['ventouses','gigasangsue','pouvoirantique','vampigraine']},
  armaldo:{name:'Armaldo',id:348,types:['Rock','Bug'],base:[75,125,100,70,80,45],moves:['plaiecroixsig','eboulement','danselames','seisme']},
  scarhino:{name:'Scarhino',id:214,types:['Bug','Fighting'],base:[80,125,75,40,95,85],moves:['megacornesig','closecombat','lamederoc','sabotage']},
  apireine:{name:'Apireine',id:416,types:['Bug','Flying'],base:[70,80,102,80,102,40],moves:['appelabeilles','ordredefense','ordresoin','lamedair']},
  cizayox:{name:'Cizayox',id:212,types:['Bug','Steel'],base:[70,130,100,55,80,65],moves:['pincescanon','danselames','demitour','plaiecroix']},
  charmillon:{name:'Charmillon',id:267,types:['Bug','Flying'],base:[60,70,50,100,50,65],moves:['ventargente','lamedair','gigasangsue','dansepapillon']},
  hippodocus:{name:'Hippodocus',id:450,types:['Ground'],base:[108,112,118,68,72,47],moves:['baillement','seisme','lamederoc','paresse']},
  scorvol:{name:'Scorvol',id:472,types:['Ground','Flying'],base:[75,95,125,45,75,95],moves:['volplane','seisme','crocsgivre','demitour']},
  simiabraz:{name:'Simiabraz',id:392,types:['Fire','Fighting'],base:[76,104,71,104,71,108],moves:['poingardent','closecombat','demitour','machpunch']},
  pyroli:{name:'Pyroli',id:136,types:['Fire'],base:[65,130,60,95,110,65],moves:['boutefeusig','machouille','feufollet','lanceflammes']},
  mentali:{name:'Mentali',id:196,types:['Psychic'],base:[65,65,60,130,95,110],moves:['rafalepsy','ballombre','eclatmagique','machination']},
  archeodong:{name:'Archéodong',id:437,types:['Steel','Psychic'],base:[67,89,116,79,116,33],moves:['distorsion','gyroballe','seisme','chocpsy']},
  spiritomb:{name:'Spiritomb',id:442,types:['Ghost','Dark'],base:[50,92,108,92,108,35],moves:['amesserrantes','ballombre','vibrobscur','feufollet']},
  roserade:{name:'Roserade',id:407,types:['Grass','Poison'],base:[60,70,65,125,105,90],moves:['tempeteflorale','gigasangsue','bombebeurk','pikstoxik']},
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
  mammochon:{name:'Mammochon',id:473,types:['Ice','Ground'],base:[110,130,80,70,60,80],moves:['chuteglace','eclatsglace','cavalerielourde','eboulement']},
  momartik:{name:'Momartik',id:478,types:['Ice','Ghost'],base:[70,80,70,80,70,110],moves:['laserglace','ballombre','blizzard','feufollet']},
  flamigator:{name:'Flamigator',id:911,types:['Fire','Ghost'],base:[104,75,100,110,75,66],moves:['chantflamboyant','ballombre','telluriforce','paresse']},
  carchacrok:{name:'Carchacrok',id:445,types:['Dragon','Ground'],base:[108,130,95,80,85,102],moves:['colere','seisme','danselames','dracocharge']},
  sinistrail:{name:'Sinistrail',id:781,types:['Grass','Ghost'],base:[70,131,100,86,90,40],moves:['ancrage','megafouet','hantise','seisme']},
  amphinobi:{name:'Amphinobi',id:658,types:['Water','Dark'],base:[72,95,67,103,71,122],moves:['sheauriken','vibrobscur','laserglace','hydrocanon']},
  // ---------- Unys (génération 5) ----------
  lugulabre:{name:'Lugulabre',id:609,types:['Ghost','Fire'],base:[60,55,90,145,90,80],moves:['feudames','ballombre','lanceflammes','ecosphere']},
  siderella:{name:'Sidérella',id:576,types:['Psychic'],base:[70,55,95,95,110,65],moves:['piegemental','ballombre','chocpsy','machination']},
  kungfouine:{name:'Kungfouine',id:620,types:['Fighting'],base:[65,125,60,95,60,105],moves:['rafalekungfu','closecombat','demitour','piedvoltige']},
  tranchodon:{name:'Tranchodon',id:612,types:['Dragon'],base:[76,147,90,60,70,97],moves:['guillotine','dansedraco','dracogriffe','seisme']},
  tutankafer:{name:'Tutankafer',id:563,types:['Ghost'],base:[58,50,145,95,105,30],moves:['sarcophage','ballombre','feufollet','poupeemaudite']},
  moyade:{name:'Moyade',id:593,types:['Water','Ghost'],base:[100,60,70,85,105,60],moves:['tentacules','surf','ballombre','repos']},
  golemastoc:{name:'Golemastoc',id:623,types:['Ground','Ghost'],base:[89,124,80,55,80,55],moves:['poingombre','seisme','ballombre','megacorne']},
  baggaid:{name:'Baggaïd',id:560,types:['Dark','Fighting'],base:[65,90,115,45,115,58],moves:['coupboulevoyou','closecombat','sabotage','coupbas']},
  leopardus:{name:'Léopardus',id:510,types:['Dark'],base:[64,88,50,88,50,106],moves:['griffefurtive','coupbas','sabotage','ombreportee']},
  crocorible:{name:'Crocorible',id:553,types:['Ground','Dark'],base:[95,117,80,65,70,92],moves:['machoiresable','seisme','machouille','tunnel']},
  mushana:{name:'Mushana',id:518,types:['Psychic'],base:[116,55,85,107,95,29],moves:['brumereve','psyko','plenitude','ballombre']},
  cryptero:{name:'Cryptéro',id:561,types:['Psychic','Flying'],base:[72,58,80,103,80,97],moves:['prisme','lamedair','chocpsy','teleport']},
  symbios:{name:'Symbios',id:579,types:['Psychic'],base:[110,65,75,125,85,30],moves:['membranepsy','psyko','exploforce','flemme']},
  judokrak:{name:'Judokrak',id:538,types:['Fighting'],base:[120,100,85,30,85,45],moves:['projection','closecombat','ligotage','repos']},
  karaclee:{name:'Karaclée',id:539,types:['Fighting'],base:[75,125,75,30,75,85],moves:['brisegarde','closecombat','piedvoltige','sabotage']},
  betochef:{name:'Bétochef',id:534,types:['Fighting'],base:[105,140,95,55,65,45],moves:['piliersbeton','closecombat','lamederoc','machpunch']},
  trioxhydre:{name:'Trioxhydre',id:635,types:['Dark','Dragon'],base:[92,105,90,125,90,98],moves:['triplesouffle','vibrobscur','dracosouffle','lanceflammes']},
  drakkarmin:{name:'Drakkarmin',id:621,types:['Dragon'],base:[77,120,90,60,90,48],moves:['queuerageuse','dracogriffe','seisme','machouille']},
  aeropteryx:{name:'Aéroptéryx',id:567,types:['Rock','Flying'],base:[75,140,65,112,65,110],moves:['envolfossile','lamederoc','lamedair','demitour']},
  // ---------- Kalos (génération 6) ----------
  flambusard:{name:"Flambusard",id:663,types:['Fire','Flying'],base:[78,81,71,74,69,126],moves:['rapaceenflamme','lamedair','boutefeu','atterrissage']},
  golgopathe:{name:"Golgopathe",id:689,types:['Rock','Water'],base:[72,105,115,54,86,68],moves:['poingsmultiples','lamederoc','aquajet','danselames']},
  exagide:{name:"Exagide",id:681,types:['Steel','Ghost'],base:[60,50,140,50,140,60],moves:['bouclierroyal','ballombre','tetedefer','coupepsyko']},
  bruyverne:{name:"Bruyverne",id:715,types:['Flying','Dragon'],base:[85,70,80,97,80,123],moves:['ultrasondragon','lamedair','dracosouffle','demitour']},
  nemelios:{name:"Némélios",id:668,types:['Fire','Normal'],base:[86,68,72,109,66,106],moves:['rugissementardent','lanceflammes','machination','machouille']},
  chartor:{name:"Chartor",id:324,types:['Fire'],base:[70,85,140,85,70,20],moves:['eruption','lanceflammes','seisme','repos']},
  gamblast:{name:"Gamblast",id:693,types:['Water'],base:[71,73,88,120,89,59],moves:['canonpince','vibraqua','hydrocanon','aurasphere']},
  staross:{name:"Staross",id:121,types:['Water','Psychic'],base:[60,75,85,100,85,115],moves:['etoilefilante','surf','psyko','tonnerre']},
  trousselin:{name:"Trousselin",id:707,types:['Steel','Fairy'],base:[57,80,91,80,87,75],moves:['trousseau','eclatmagique','tetedefer','picots']},
  tarinorme:{name:"Tarinorme",id:476,types:['Rock','Steel'],base:[60,55,145,75,150,40],moves:['aimantgeant','lamederoc','tetedefer','tonnerre']},
  kravarech:{name:"Kravarech",id:691,types:['Poison','Dragon'],base:[65,75,90,97,123,44],moves:['jettoxique','dracosouffle','bombebeurk','hydrocanon']},
  muplodocus:{name:"Muplodocus",id:706,types:['Dragon'],base:[90,100,70,110,150,80],moves:['mucusdragon','dracosouffle','surf','tonnerre']},
  rexillius:{name:"Rexillius",id:697,types:['Rock','Dragon'],base:[82,121,119,69,59,71],moves:['crocsroyaux','lamederoc','dracogriffe','seisme']},
  amagara:{name:"Amagara",id:699,types:['Rock','Ice'],base:[123,77,72,99,92,58],moves:['aurorefossile','blizzard','pouvoirantique','laserglace']},
  brutalibre:{name:"Brutalibré",id:701,types:['Fighting','Flying'],base:[78,92,75,74,63,118],moves:['priseaerienne','closecombat','rapace','demitour']},
  banshitrouye:{name:"Banshitrouye",id:711,types:['Ghost','Grass'],base:[65,90,122,58,75,84],moves:['citrouillehantee','ballombre','vampigraine','feufollet']},
  // ---------- Alola (génération 7) ----------
  crabominable:{name:"Crabominable",id:740,types:['Fighting','Ice'],base:[97,132,77,62,67,43],moves:['poingglacegeant','closecombat','poingglace','avalanche']},
  lougaroc:{name:"Lougaroc",id:745,types:['Rock'],base:[75,115,65,55,65,112],moves:['crocderoc','lamederoc','machouille','coupbas']},
  trepassable:{name:"Trépassable",id:770,types:['Ghost','Ground'],base:[85,75,110,100,75,35],moves:['chateausable','ballombre','telluriforce','poupeemaudite']},
  bazoucan:{name:"Bazoucan",id:733,types:['Normal','Flying'],base:[80,120,75,75,75,60],moves:['beccanon','rapace','lamedair','roulade']},
  archeduc:{name:"Archéduc",id:724,types:['Grass','Ghost'],base:[78,107,75,100,100,70],moves:['tisseombre','lamedair','megafouet','ballombre']},
  hariyama:{name:"Hariyama",id:297,types:['Fighting'],base:[144,120,60,40,60,50],moves:['pousseesumo','closecombat','machpunch','repos']},
  colossinge:{name:"Colossinge",id:766,types:['Fighting'],base:[100,120,90,40,60,80],moves:['furiesimiesque','closecombat','demitour','sabotage']},
  chelours:{name:"Chelours",id:760,types:['Normal','Fighting'],base:[120,125,80,55,60,60],moves:['etreinteours','closecombat','plaquage','danselames']},
  tartard:{name:"Tartard",id:62,types:['Water','Fighting'],base:[90,95,95,70,90,70],moves:['tourbillondeau','closecombat','hydrocanon','repos']},
  strassie:{name:"Strassie",id:703,types:['Rock','Fairy'],base:[50,50,150,50,150,50],moves:['diamanteclat','pouvoirantique','eclatmagique','picots']},
  grolemalola:{name:"Grolem d'Alola",id:10111,pmd:'0076/0001',ab:'GRA',types:['Rock','Electric'],base:[80,120,130,55,65,45],moves:['rocheelectrique','roulade','tonnerre','seisme']},
  grodrive:{name:"Grodrive",id:426,types:['Ghost','Flying'],base:[150,80,44,90,54,80],moves:['ballonhante','ballombre','lamedair','ventarriere']},
  plumeline:{name:"Plumeline",id:741,types:['Fire','Flying'],base:[75,70,70,98,70,93],moves:['danseeveil','lamedair','lanceflammes','dansepapillon']},
  vaututrice:{name:"Vaututrice",id:630,types:['Dark','Flying'],base:[110,65,105,55,95,80],moves:['piquecharognard','rapace','vibrobscur','atterrissage']},
  feunardalola:{name:"Feunard d'Alola",id:10104,pmd:'0038/0001',ab:'FEA',types:['Ice','Fairy'],base:[73,67,75,81,100,109],moves:['voileaurore','blizzard','eclatmagique','laserglace']},
  gueriaigle:{name:"Gueriaigle",id:628,types:['Normal','Flying'],base:[100,123,75,57,75,80],moves:['chargeheroique','rapace','closecombat','demitour']},
  magnezone:{name:"Magnézone",id:462,types:['Electric','Steel'],base:[70,70,115,130,90,60],moves:['champmagnetique','tonnerre','luminocanon','fatalfoudre']},
  // ---------- Paldea (génération 9) ----------
  terraiste:{name:"Terraiste",id:980,types:['Poison','Ground'],base:[130,75,60,45,100,20],moves:['marecagetoxique','seisme','bombebeurk','repos']},
  forgelina:{name:"Forgelina",id:959,types:['Fairy','Steel'],base:[85,75,77,70,105,94],moves:['marteaugigaton','eclatmagique','tetedefer','danselames']},
  flamenroule:{name:"Flamenroule",id:973,types:['Flying','Fighting'],base:[82,115,74,75,64,90],moves:['piedvoltigeaerien','closecombat','rapace','demitour']},
  glaivodo:{name:"Glaivodo",id:998,types:['Dragon','Ice'],base:[115,145,92,75,86,87],moves:['lamesglacees','dansedraco','crocsgivre','seisme']},
  floreclat:{name:"Floréclat",id:970,types:['Rock','Poison'],base:[83,55,90,130,81,86],moves:['eclatstoxiques','pouvoirantique','bombebeurk','pikstoxik']},
  barbicha:{name:"Barbicha",id:340,types:['Water','Ground'],base:[110,78,73,76,71,60],moves:['seismeaquatique','seisme','surf','repos']},
  camerupt:{name:"Camérupt",id:323,types:['Fire','Ground'],base:[70,100,70,105,75,40],moves:['eruption','telluriforce','lanceflammes','seisme']},
  donphan:{name:"Donphan",id:232,types:['Ground'],base:[90,120,120,60,60,50],moves:['roulade','seisme','lamederoc','megacorne']},
  triopikeur:{name:"Triopikeur",id:51,types:['Ground'],base:[35,100,50,50,70,120],moves:['tunneltriple','seisme','lamederoc','coupbas']},
  pachyradjah:{name:"Pachyradjah",id:879,types:['Steel'],base:[122,130,69,80,69,30],moves:['trompeacier','tetedefer','seisme','closecombat']},
  corvaillus:{name:"Corvaillus",id:823,types:['Flying','Steel'],base:[98,87,105,53,85,67],moves:['becacier','rapace','ailedacier','atterrissage']},
  tropius:{name:"Tropius",id:357,types:['Grass','Flying'],base:[99,68,83,72,87,51],moves:['bananes','lamedair','gigasangsue','tempeteverte']},
  etouraptor:{name:"Étouraptor",id:398,types:['Normal','Flying'],base:[85,120,70,50,60,100],moves:['rapace','closecombat','demitour','lamedair']},
  pomdrapi:{name:"Pomdrapi",id:841,types:['Grass','Dragon'],base:[70,110,80,95,60,70],moves:['pommeacide','dracosouffle','lamedair','gigasangsue']},
  cleopsytra:{name:"Cléopsytra",id:956,types:['Psychic'],base:[95,60,60,101,60,105],moves:['lumierelunaire','psyko','eclatmagique','machination']},
  chevroum:{name:"Chevroum",id:673,types:['Grass'],base:[123,100,62,97,81,68],moves:['chargecornue','megafouet','seisme','lamederoc']},
  seracrawl:{name:"Séracrawl",id:713,types:['Ice'],base:[95,117,184,44,46,28],moves:['iceberg','avalanche','seisme','repos']},
  solgaleo:{name:'Solgaleo',id:791,legend:1,types:['Psychic','Steel'],base:[137,137,107,113,89,97],moves:['meteorayon','psykoudboul','seisme','machouille']},
  koraidon:{name:'Koraidon',id:1007,legend:1,types:['Fighting','Dragon'],base:[100,135,115,85,100,135],moves:['chocfrontal','dracogriffe','boutefeu','demitour']},
};
const TEAMS = [
  {id:'dracolosse',name:'Équipe Dracolosse',mons:['dracolosse','lucario','flamigator','leviator','zeraora','metalosse']},
  {id:'carchacrok',name:'Équipe Carchacrok',mons:['carchacrok','scalpereur','sinistrail','dracaufeu','mammochon','ronflex']},
  {id:'lanssorien',name:'Équipe Lanssorien',mons:['lanssorien','gardevoir','gorythmic','amphinobi','tyranocif','togekiss']},
  {id:'naganadel',name:'Équipe Naganadel',mons:['naganadel','momartik','minotaupe','alakazam','pyrax','milobellus']},
  // équipes légendaires (un légendaire chacune), équilibrées entre elles par des combats IA contre IA
  {id:'leg-mewtwo',name:'Équipe Mewtwo',legend:1,mons:['mewtwo','gardevoir','metalosse','alakazam','togekiss','tyranocif']},
  {id:'leg-groudon',name:'Équipe Groudon',legend:1,mons:['groudon','dracaufeu','amphinobi','lucario','flamigator','scalpereur']},
  {id:'leg-kyogre',name:'Équipe Kyogre',legend:1,mons:['kyogre','carchacrok','amphinobi','milobellus','zeraora','naganadel']},
  {id:'leg-shifours',name:'Équipe Shifours',legend:1,mons:['shifours','leviator','tyranocif','scalpereur','minotaupe','dracolosse']},
  {id:'leg-sylveroy',name:'Équipe Sylveroy Effroi',legend:1,mons:['sylveroy','momartik','sinistrail','lanssorien','mammochon','ronflex']},
  {id:'leg-electhorgalar',name:'Équipe Électhor Galar',legend:1,mons:['electhorgalar','mammochon','togekiss','pyrax','gorythmic','metalosse']},
  {id:'leg-solgaleo',name:'Équipe Solgaleo',legend:1,mons:['solgaleo','archeduc','crabominable','nemelios','tartard','lougaroc']},
  {id:'leg-koraidon',name:'Équipe Koraidon',legend:1,mons:['koraidon','floreclat','forgelina','cleopsytra','barbicha','flambusard']}
];
// Difficultés de l'IA, en paliers réguliers : react = chance de réagir (esquiver, contrer), think = délai entre deux décisions (s),
// lead = anticipation des déplacements, noise = hasard dans le choix des attaques, sw = changements de Pokémon,
// dash = usage du Dash pour esquiver, aimErr = erreur de visée, dmg = force de ses attaques
const DIFFS = {
  facile:{label:'Facile',react:.2,think:.85,lead:.1,noise:.5,mirror:false,sw:.1,dash:.08,aimErr:.33,dmg:.72},
  normal:{label:'Normal',react:.48,think:.52,lead:.42,noise:.27,mirror:true,sw:.38,dash:.32,aimErr:.16,dmg:.88},
  champion:{label:'Champion',react:.64,think:.46,lead:.6,noise:.17,mirror:true,sw:.55,dash:.48,aimErr:.09,dmg:.95},
  enfer:{label:'Enfer',react:.92,think:.32,lead:.9,noise:.06,mirror:true,sw:.85,dash:.85,aimErr:.02,dmg:1.25}   // réagit presque toujours, anticipe tes déplacements, frappe plus fort
};
const ARENA_LIST = [['stade','Stade Pokémon'],['pilier','Pilier Céleste'],['colonnes','Colonnes Lance'],['couronne','Mont Couronné'],['chateau','Château de Ghetsis'],['tourbillon','Îles Tourbillon']];
const STATUS = {atkDown:['Atq −','#c9a08a'],grounded:['Au sol','#E2BF65'],defDown:['Déf −','#c98a8a'],spdDown:['D.Spé −','#8a9ac9'],burn:['Brûlé','#EE8130'],poison:['Empois.','#A33EA1'],slow:['Ralenti','#96D9D6'],stun:['Étourdi','#F7D02C'],sleep:['Endormi','#a39bd0'],ring:['Anneau','#6390F0'],mirror:['Miroir','#F95587'],buffT:['Boost','#e6b84c']};
const SWITCH_CD = 4, INV_ON_SWITCH = .8;
// Dash : charges partagées par l'équipe, rechargées une par une
const DASH_MAX = 3, DASH_REGEN = 3, DASH_SPD = 760, DASH_DUR = .17, DASH_INV = .2;

const meleeCount = d => d.moves.filter(k => ['melee','dash'].includes(MOVES[k].k) || MOVES[k].close).length;
// Méga-évolutions (et Primo-Résurgences) : une par équipe et par combat, déclenchée librement
const MEGA = {
  dracaufeu:{name:'Méga-Dracaufeu X', types:['Fire','Dragon'], base:[78,130,111,130,85,100], pmd:'0006/0001'},
  tortank:{name:'Méga-Tortank', types:['Water'], base:[79,103,120,135,115,78]},
  alakazam:{name:'Méga-Alakazam', types:['Psychic'], base:[55,50,65,175,105,150], pmd:'0065/0001'},
  ectoplasma:{name:'Méga-Ectoplasma', types:['Ghost','Poison'], base:[60,65,80,170,95,130], pmd:'0094/0001'},
  leviator:{name:'Méga-Léviator', types:['Water','Dark'], base:[95,155,109,70,130,81]},
  ptera:{name:'Méga-Ptéra', types:['Rock','Flying'], base:[80,135,85,70,95,150], pmd:'0142/0001'},
  mewtwo:{name:'Méga-Mewtwo Y', types:['Psychic'], base:[106,150,70,194,120,140], pmd:'0150/0002'},
  tyranocif:{name:'Méga-Tyranocif', types:['Rock','Dark'], base:[100,164,150,95,120,71], pmd:'0248/0001'},
  scarhino:{name:'Méga-Scarhino', types:['Bug','Fighting'], base:[80,185,115,40,105,75]},
  demolosse:{name:'Méga-Démolosse', types:['Dark','Fire'], base:[75,90,90,140,90,115], pmd:'0229/0001'},
  absol:{name:'Méga-Absol', types:['Dark'], base:[65,150,60,115,60,115], pmd:'0359/0001'},
  gardevoir:{name:'Méga-Gardevoir', types:['Psychic','Fairy'], base:[68,85,65,165,135,100], pmd:'0282/0001'},
  gallame:{name:'Méga-Gallame', types:['Psychic','Fighting'], base:[68,165,95,65,115,110], pmd:'0475/0001'},
  metalosse:{name:'Méga-Métalosse', types:['Steel','Psychic'], base:[80,145,150,105,110,110]},
  drattak:{name:'Méga-Drattak', types:['Dragon','Flying'], base:[95,145,130,120,90,120]},
  galeking:{name:'Méga-Galeking', types:['Steel'], base:[70,140,230,60,80,50]},
  altaria:{name:'Méga-Altaria', types:['Dragon','Fairy'], base:[75,110,110,110,105,80], pmd:'0334/0001'},
  lucario:{name:'Méga-Lucario', types:['Fighting','Steel'], base:[70,145,88,140,70,112], pmd:'0448/0001'},
  carchacrok:{name:'Méga-Carchacrok', types:['Dragon','Ground'], base:[108,170,115,120,95,92]},
  cizayox:{name:'Méga-Cizayox', types:['Bug','Steel'], base:[70,150,140,65,100,75]},
  steelix:{name:'Méga-Steelix', types:['Steel','Ground'], base:[75,125,230,55,95,30], pmd:'0208/0001'},
  flagadoss:{name:'Méga-Flagadoss', types:['Water','Psychic'], base:[95,75,180,130,80,30]},
  branette:{name:'Méga-Branette', types:['Ghost'], base:[64,165,75,93,83,75], pmd:'0354/0001'},
  tenefix:{name:'Méga-Ténéfix', types:['Dark','Ghost'], base:[50,85,125,85,115,20], pmd:'0302/0001'},
  oniglali:{name:'Méga-Oniglali', types:['Ice'], base:[80,120,80,120,80,100], pmd:'0362/0001'},
  roucarnage:{name:'Méga-Roucarnage', types:['Normal','Flying'], base:[83,80,80,135,80,121]},
  groudon:{name:'Primo-Groudon', types:['Ground','Fire'], base:[100,180,160,150,90,90], pmd:'0383/0001'},
  kyogre:{name:'Primo-Kyogre', types:['Water'], base:[100,150,90,180,160,90], pmd:'0382/0001'},
};
// Équilibrage : les stats des Pokémon non légendaires sont rapprochées d'un total commun (540), en gardant leur profil
// (×0,9 à ×1,35) ; la Vitesse reste officielle (elle règle les déplacements). baseOfficial garde les stats d'origine.
const BST_TARGET = 540;
// corrections au cas par cas, d'après les simulations IA contre IA (total visé)
const BST_ADJUST = {arcanin:490, maganon:470, foretress:820, archeodong:750, arbok:705, noadkoko:610, zeraora:655, libegon:610, kicklee:565, naganadel:500, gardevoir:510, lucario:580, dracolosse:580, ronflex:465, gorythmic:570, lokhlass:570, xatu:585, nostenfer:595, kaimorse:500, drascore:585, gallame:575, crustabri:650, lippoutou:600, lamantine:495, rhinoferos:470, flagadoss:435, grotadmorv:570, migalos:590, kapoera:570, corboss:515, tengalice:590, cacturne:615, colhomard:570, tenefix:510, oniglali:650, airmure:465, galeking:515, kaorine:665, vacilys:600, scarhino:500, charmillon:575, hippodocus:575, scorvol:570, simiabraz:615, pyroli:580, roserade:600, milobellus:510, minotaupe:470, momartik:580, flamigator:455, carchacrok:515, amphinobi:610, lugulabre:445, kungfouine:690, tranchodon:640, moyade:430, baggaid:565, leopardus:580, crocorible:515, mushana:570, cryptero:510, trioxhydre:515, drakkarmin:585, golgopathe:570, nemelios:570, gamblast:515, trousselin:565, amagara:655, brutalibre:580, banshitrouye:570, colossinge:575, chelours:500, tartard:585, strassie:650, grolemalola:665, feunardalola:690, magnezone:485, forgelina:630, glaivodo:700, floreclat:570, barbicha:510, triopikeur:585, corvaillus:485, tropius:565, pomdrapi:650, cleopsytra:575, seracrawl:590};   // cibles ajustées par simulations IA contre IA (chaque Pokémon contre un panel de 24)
const LEGEND_ADJ = {mewtwo:0.979, groudon:0.919, kyogre:0.944, shifours:1.107, solgaleo:1.056, koraidon:1.072};   // légendaires : stats (hors Vitesse) multipliées
for (const k in MONS){ const m = MONS[k]; m.baseOfficial = m.base.slice(); if (m.legend){ const g = LEGEND_ADJ[k]; if (g){ m.base = m.base.map((v, i) => i === 5 ? v : Math.round(v*g)); if (MEGA[k]) MEGA[k].base = MEGA[k].base.map((v, i) => i === 5 ? v : Math.round(v*g)); } continue; }
  const bst = m.base.reduce((a,b)=>a+b,0), f = Math.max(.85, Math.min(1.5, (BST_ADJUST[k] || BST_TARGET)/bst));
  m.base = m.base.map((v, i) => i === 5 ? v : Math.round(v*f));
  if (MEGA[k]) MEGA[k].base = MEGA[k].base.map((v, i) => i === 5 ? v : Math.round(v*f)); }
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
  const o = PMD[k] = {st:'load', a:{}}, id = typeof dex === 'string' ? dex : String(dex).padStart(4,'0');   // une forme : '0145/0001'
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
for (const k in MONS) loadPmd(k, MONS[k].pmd || MONS[k].id);
for (const k in MEGA) if (MEGA[k].pmd) loadPmd('mega-' + k, MEGA[k].pmd);   // sprites animés des formes Méga   // pmd : sprite animé d'un autre Pokémon (Sylveroy Effroi → Spectreval)
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
// certaines animations (le sommeil) n'ont qu'une seule direction : on prend alors leur unique ligne
const pmdRow = (A, oct) => Math.round(A.img.height/A.fh) >= 8 ? DIR_ROW[oct] : 0;
function pmdFrame(A, tick, loop){
  tick = loop ? tick % A.total : Math.min(tick, A.total-1);
  let i = 0; while (i < A.d.length-1 && tick >= A.d[i]){ tick -= A.d[i]; i++; }
  return i;
}
