# Arène Pokémon

Combats Pokémon 6 contre 6 en temps réel contre une IA ou à 2 joueurs, dans le navigateur.
Projet de fan non officiel et non commercial.

## Jouer

Servir le dossier avec n'importe quel serveur web local, ou ouvrir `index.html` directement (une connexion internet est nécessaire au premier lancement pour les sprites ; sans eux, des jetons aux couleurs des types les remplacent).

Le jeu s'installe comme une appli (icône sur l'écran d'accueil, plein écran) depuis le menu du navigateur : « Ajouter à l'écran d'accueil » sur téléphone, « Installer » sur ordinateur. Une fois chargé, il marche hors ligne, sprites compris.

- **Clavier + souris** : ZQSD pour bouger, la souris vise ; clic gauche, clic droit, A et E pour attaquer (Q et E en QWERTY), l'attaque part au relâchement ; Espace pour le Dash ; 1 à 6 pour changer de Pokémon ; Échap pour la pause.
- **Clavier seul** : J K L M attaquent en visée automatique.
- **Manette** : stick gauche pour bouger, stick droit pour viser (relâché = visée automatique) ; L1, L2, R1, R2 pour attaquer (l'attaque part au relâchement) ; ✕ pour le Dash ; flèches gauche/droite pour choisir un Pokémon, Triangle pour l'envoyer ; Options pour la pause.
- **Téléphone** : joystick à gauche ; toucher une attaque = visée automatique, glisser depuis le bouton = visée manuelle (repère au sol), l'attaque part au relâchement ; bouton Dash à droite.
- **2 joueurs** : le joueur 2 joue à la manette (mêmes boutons). Avec deux manettes, la 1re est au joueur 1 ; avec une seule, le joueur 1 joue au clavier et à la souris, ou au tactile. Les recharges et le Dash du joueur 2 s'affichent sous son Pokémon.

## Contenu

- **Ligue Pokémon** : Kanto, Johto, Hoenn, Sinnoh, Unys, Kalos, Alola et Paldea, chacune avec son Conseil 4 et son Maître, à affronter d'affilée avec la difficulté de ton choix : une seconde chance par Ligue, puis une défaite fait recommencer la Ligue. Chaque victoire débloque des Pokémon jouables dans tous les modes, des défis bonus débloquent des légendaires ; on choisit ses 10 Pokémon de départ. Progression gardée sur l'appareil (bouton « Tout débloquer » pour tester).
- **Tour de combat** (25 étages) : on commence en 2 contre 2 avec 2 Pokémon tirés au sort, dans la difficulté choisie pour toute la Tour ; tous les 5 étages, un gardien légendaire, puis un nouveau Pokémon à recruter (jusqu'à 6) ; le dernier étage est le Maître de la Tour, avec deux légendaires. Les PV sont gardés d'un étage à l'autre ; les dégâts rapportent de l'argent : un bonus gratuit après chaque étage, les autres s'achètent, de plus en plus cher. Record et Tours terminées (par difficulté) gardés sur l'appareil.
- **Tutoriel** guidé (déplacement, attaques, Dash, ★, changement, Méga-évolution), et un écran de fin avec les statistiques du combat et le meilleur Pokémon.
- 163 Pokémon avec leurs stats officielles et 4 attaques chacun, dont 8 légendaires ★ (Mewtwo, Groudon, Kyogre, Shifours Style Poing Final, Sylveroy Cavalier d'Effroi, Électhor de Galar, Solgaleo, Koraidon) : 1 au maximum dans une équipe composée.
- Une attaque emblématique ★ par Pokémon, avec son propre effet (Rafale Feu, Pouvoir Lunaire, Génusection, Poing Plasma, Tunnel, Surf…), et un rendu propre à chaque type pour les autres attaques.
- Effets de combat : tremblement et éclair d'écran, écran électrisé ou givré, gel d'image à l'impact, marques au sol, adversaire soulevé ou projeté en l'air.
- 4 équipes prêtes classiques (Dracolosse, Carchacrok, Lanssorien, Naganadel) et 6 équipes légendaires (une par légendaire), ou équipe composée ; avec « Aléatoire », l'adversaire est tiré dans la même catégorie que ton équipe ; le bouton « Attaques des Pokémon » du menu détaille les 4 attaques de chacun (puissance, recharge, effet).
- 6 arènes (Stade Pokémon, Pilier Céleste, Colonnes Lance, Mont Couronné, Château de Ghetsis, Îles Tourbillon), avec un décor de fond en haut de l'écran et des détails animés ; à choisir dans le menu ou au hasard. Une image peut remplacer le décor dessiné : voir [arenes/LISEZMOI.md](arenes/LISEZMOI.md).
- 4 difficultés d'IA (Facile, Normal, Champion, Enfer) ; l'IA change de Pokémon quand son duel est mauvais. En Enfer, elle réagit presque toujours, anticipe tes déplacements et frappe plus fort.
- Mode 2 joueurs en local.
- Sons et musiques synthétisés (une musique par arène), vibrations du téléphone et de la manette quand ton Pokémon encaisse ; réglables dans le menu et la pause.
- Types adoucis pour un jeu d'action : immunité ×0,33, double résistance ×0,5, résistance ×0,75, super efficace ×1,33, double faiblesse ×1,66 ; bonus de type du lanceur ×1,25.
- **Méga-évolutions** (et Primo-Résurgences de Groudon et Kyogre) pour 28 Pokémon : une par équipe et par combat, quand tu veux (R au clavier, flèche du haut à la manette, bouton Méga sur téléphone). Stats et types de la forme Méga, attaque ★ renforcée ; l'IA méga-évolue aussi (sauf en Facile).
- Stats des Pokémon non légendaires rapprochées d'un total commun pour l'équilibre (Vitesse officielle conservée).
- Dash : 3 charges partagées par l'équipe, une charge rendue toutes les 3 s, invulnérable pendant la ruée.
- Changement de Pokémon en combat (4 s de recharge), mort subite après 3 minutes.

## Crédits

- Sprites animés en combat : [PMD SpriteCollab](https://sprites.pmdcollab.org), licence CC BY-NC 4.0 (crédits par sprite sur le site).
- Musique du menu : [« Boss Theme » par remaxim](https://opengameart.org/content/boss-theme), licence CC BY-SA 3.0 (OpenGameArt).
- Musique des combats : [« Battle Theme A » par cynicmusic (The Cynic Project)](https://opengameart.org/content/battle-theme-a), domaine public (CC0, OpenGameArt).
- Musiques des combats : [« JRPG Music Pack #5 [Action] » par Juhani Junkala](https://opengameart.org/content/jrpg-pack-5-action), domaine public (CC0, OpenGameArt).
- Musique des combats : [« JRPG Epic Rock Battle Theme #1 » par HydroGene](https://opengameart.org/content/jrpg-epic-rock-battle-theme-1), domaine public (CC0, OpenGameArt).
- Bruitages : [Kenney](https://kenney.nl) (Impact Sounds, RPG Audio, Interface Sounds) et [« 80 CC0 RPG SFX » par rubberduck](https://opengameart.org/content/80-cc0-rpg-sfx), domaine public (CC0).
- Portraits du menu et de la barre d'équipe : [PokéAPI](https://github.com/PokeAPI/sprites).

## Code

Pas d'étape de construction : `index.html` charge `css/style.css` puis les scripts de `js/`, des scripts classiques qui partagent leurs variables globales (l'ordre de chargement compte).

| Fichier | Contenu |
|---|---|
| `js/donnees.js` | types, attaques (`MOVES`), Pokémon (`MONS`), équipes (`TEAMS`), difficultés (`DIFFS`), chargement des sprites |
| `js/menu.js` | menu et fiche des attaques |
| `js/jeu.js` | début de match, changements de Pokémon, HUD, commandes, lancement des attaques et dégâts |
| `js/attaques.js` | effets visuels et attaques emblématiques ★ (`SIG`) |
| `js/ia.js` | IA de l'adversaire |
| `js/simulation.js` | une image de jeu, K.O., fin de match |
| `js/audio.js` | sons, musiques, vibrations |
| `js/arenes.js` | décors des arènes et images |
| `js/rendu.js` | dessin du combat et boucle principale |
| `js/ligue.js` | Ligue Pokémon : dresseurs, déblocages, progression |

`manifest.webmanifest`, `sw.js` et `icons/` rendent le jeu installable et jouable hors ligne.
