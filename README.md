# Arène Pokémon

Combats Pokémon 6 contre 6 en temps réel contre une IA, dans le navigateur.
Projet de fan non officiel et non commercial.

## Jouer

Ouvrir `index.html` dans un navigateur (une connexion internet est nécessaire pour les sprites PokéAPI ; sans eux, des jetons aux couleurs des types les remplacent).

- **Clavier + souris** : ZQSD pour bouger, la souris vise ; clic gauche, clic droit, A et E pour attaquer (Q et E en QWERTY), l'attaque part au relâchement ; Espace pour le Dash ; 1 à 6 pour changer de Pokémon ; Échap pour la pause.
- **Clavier seul** : J K L M attaquent en visée automatique.
- **Manette** : stick gauche pour bouger, stick droit pour viser (relâché = visée automatique) ; L1, L2, R1, R2 pour attaquer (l'attaque part au relâchement) ; ✕ pour le Dash ; flèches gauche/droite pour choisir un Pokémon, Triangle pour l'envoyer ; Options pour la pause.
- **Téléphone** : joystick à gauche ; toucher une attaque = visée automatique, glisser depuis le bouton = visée manuelle (repère au sol), l'attaque part au relâchement ; bouton Dash à droite.

## Contenu

- 24 Pokémon avec leurs stats officielles et 4 attaques chacun.
- Une attaque emblématique ★ par Pokémon, avec son propre effet (Rafale Feu, Pouvoir Lunaire, Génusection, Poing Plasma, Tunnel, Surf…), et un rendu propre à chaque type pour les autres attaques.
- Effets de combat : tremblement et éclair d'écran, écran électrisé ou givré, gel d'image à l'impact, marques au sol, adversaire soulevé ou projeté en l'air.
- 4 équipes prêtes (Dracolosse, Carchacrok, Lanssorien, Naganadel) ou équipe composée ; le bouton « Attaques des Pokémon » du menu détaille les 4 attaques de chacun (puissance, recharge, effet).
- 6 arènes (Stade Pokémon, Pilier Céleste, Colonnes Lance, Mont Couronné, Château de Ghetsis, Îles Tourbillon), avec un décor de fond en haut de l'écran et des détails animés ; à choisir dans le menu ou au hasard. Une image peut remplacer le décor dessiné : voir [arenes/LISEZMOI.md](arenes/LISEZMOI.md).
- 3 difficultés d'IA (Facile, Normal, Champion) ; l'IA change de Pokémon quand son duel est mauvais.
- Dash : 3 charges partagées par l'équipe, une charge rendue toutes les 2 s, invulnérable pendant la ruée.
- Changement de Pokémon en combat (4 s de recharge), mort subite après 3 minutes.

## Crédits

- Sprites animés en combat : [PMD SpriteCollab](https://sprites.pmdcollab.org), licence CC BY-NC 4.0 (crédits par sprite sur le site).
- Portraits du menu et de la barre d'équipe : [PokéAPI](https://github.com/PokeAPI/sprites).

## Code

Tout le jeu tient dans `index.html` : données (`MOVES`, `MONS`, `TEAMS`, `DIFFS`), menu, simulation, IA et rendu.
