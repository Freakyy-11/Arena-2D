# Arène Pokémon

Combats Pokémon 6 contre 6 en temps réel contre une IA, dans le navigateur.
Projet de fan non officiel et non commercial.

## Jouer

Ouvrir `index.html` dans un navigateur (une connexion internet est nécessaire pour les sprites PokéAPI ; sans eux, des jetons aux couleurs des types les remplacent).

- **Clavier** : ZQSD / WASD / flèches pour bouger, J K L M pour attaquer, 1 à 6 pour changer de Pokémon, Échap pour la pause. Garder une touche d'attaque enfoncée attaque dès que possible.
- **Téléphone** : joystick à gauche, attaques à droite, barre d'équipe au-dessus pour changer de Pokémon.

## Contenu

- 24 Pokémon avec leurs stats officielles et 4 attaques chacun.
- 4 équipes prêtes (Dracolosse, Carchacrok, Lanssorien, Naganadel) ou équipe composée.
- 3 difficultés d'IA (Facile, Normal, Champion) ; l'IA change de Pokémon quand son duel est mauvais.
- Changement de Pokémon en combat (4 s de recharge), mort subite après 3 minutes.

## Crédits

- Sprites animés en combat : [PMD SpriteCollab](https://sprites.pmdcollab.org), licence CC BY-NC 4.0 (crédits par sprite sur le site).
- Portraits du menu et de la barre d'équipe : [PokéAPI](https://github.com/PokeAPI/sprites).

## Code

Tout le jeu tient dans `index.html` : données (`MOVES`, `MONS`, `TEAMS`, `DIFFS`), menu, simulation, IA et rendu.
