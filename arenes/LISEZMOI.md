# Images d'arène

Le jeu charge les images listées dans `ARENA_IMAGES` (dans `index.html`), par exemple
`pilier:{file:'pilier.jpg', frame:[130, 556, 636, 1086]}`. Pour une arène sans image, il garde le décor dessiné par le code.

| Arène | Nom du fichier |
|---|---|
| Stade Pokémon | `stade.png` |
| Pilier Céleste | `pilier.png` |
| Colonnes Lance | `colonnes.png` |
| Mont Couronné | `couronne.png` |
| Château de Ghetsis | `chateau.png` |
| Îles Tourbillon | `tourbillon.png` |

Les formats `.jpg` et `.webp` marchent aussi (par exemple `stade.jpg`).

## Format

- **Idéal : 1520 × 1740 px.** Voir `gabarit.png` :
  - bande bleue en haut (220 px) : le **décor de fond**, non jouable (gradins, trône, cascade, montagnes…) ;
  - bordure violette (104 px) : les **murs** de l'arène ;
  - damier entouré de rouge : la **zone de combat**, où les Pokémon se déplacent.
- **Tout autre format marche aussi.** L'image est ajustée à la largeur de l'arène et calée en bas :
  le **carré du bas de l'image est l'arène**, et tout ce qui dépasse au-dessus est le décor de fond.
  - Image **carrée** (1:1) : c'est l'arène seule ; le jeu ajoute son décor dessiné au-dessus.
  - Image en **4:5** ou **3:4** (plus haute que large) : le haut sert de décor de fond (rogné s'il est trop haut).
- La zone de combat doit rester **assez simple et pas trop claire** : les attaques et les Pokémon doivent rester lisibles par-dessus.
- **Pas de personnages, pas de Pokémon, pas de texte** dans l'image.

## Calage d'une image qui ne suit pas le format

Une image peut aussi avoir n'importe quelle composition (par exemple très haute, avec la zone de combat au milieu).
Il suffit d'indiquer dans `index.html`, dans le `frame` de `ARENA_IMAGES`, où se trouve la zone de combat dans l'image,
en pixels : `[gauche, haut, droite, bas]`. Le jeu étire l'image pour que ce rectangle tombe pile sur l'arène
(murs exclus), et tout ce qui est au-dessus devient le décor de fond.

Exemple : `pilier.jpg` (768 × 1376) a sa zone de combat de x = 130 à 636 et de y = 556 à 1086,
d'où `pilier:[130, 556, 636, 1086]`.

Si le sol est très clair, ajoute `shade` (0 à 1) : un voile sombre posé sur l'arène et ses murs, qui garde
le décor de fond intact. Exemple : `colonnes:{file:'colonnes.jpg', frame:[130, 556, 636, 1088], shade:.35}`.

Si le haut de l'image est important (un trône, une cascade…), ajoute `backdrop` : la hauteur du décor de fond
affiché au-dessus de l'arène (110 par défaut). Exemple : `chateau:{file:'chateau.jpg', frame:[94, 494, 754, 1189], backdrop:300}`.
Le zoom reste le même dans toutes les arènes : ce décor en plus n'est montré que s'il reste de la place à l'écran
(en entier sur téléphone, en partie ou pas du tout sur un écran large).

Pour couper le haut de l'image (un plafond, du ciel en trop…), ajoute `top` : le nombre de lignes de pixels du haut
de l'image à ne jamais afficher. Exemple : `tourbillon:{file:'tourbillon.jpg', frame:[168, 628, 602, 1080], backdrop:500, top:250}`.

## IA gratuites

- **Google Gemini** (gemini.google.com) : la plus simple, limite quotidienne gratuite.
- **Leonardo AI** (leonardo.ai) : environ 150 crédits par jour, les images gratuites sont publiques.
- **Dreamina** (dreamina.capcut.com) : crédits quotidiens, bonnes retouches.
- **Microsoft Designer / Bing Image Creator** : gratuit avec un compte Microsoft.

Astuce : donne **`gabarit.png` en image de référence** si l'IA le permet, et demande de « respecter la disposition ».

## Textes à copier (en anglais, les IA comprennent mieux)

Début commun à mettre devant chaque description :

> High-detail pixel art game background, top-down 3/4 view like HD Pokémon fan games, battle arena seen from above at a slight angle. Tall portrait image. The upper 15 % of the image shows the background scenery (not walkable). Below it, a large square, flat, open floor area for the battle, with a simple readable texture, slightly darker than mid-tone, nothing in the middle. Walls or edges frame the square. Soft lighting, rich colors, no characters, no Pokémon, no text, no UI.

### Stade Pokémon (`stade.png`)
> Pokémon league stadium: green grass battle field with white lines and a big Poké Ball emblem in the center, low blue walls with advertising boards, a huge crowd in the stands at the top with a giant screen, floodlights in the corners, evening light.

### Pilier Céleste (`pilier.png`)
> Top of the Sky Pillar, an ancient ruined tower above the clouds at sunset: cracked mossy stone tiles with grass growing between them, broken pillars on the edges, a carved dragon spiral in the floor, a sea of orange and pink clouds below, the silhouette of a green sky dragon far in the sky at the top.

### Colonnes Lance (`colonnes.png`)
> Spear Pillar, ancient temple at the summit of a sacred mountain: white and lavender marble floor with cracks and some missing slabs showing a cosmic void, a round two-step stone dais with a glowing rune in the center, rows of tall broken marble columns, a pink and blue dimensional rift in a starry purple sky at the top.

### Mont Couronné (`couronne.png`)
> Mount Coronet mountain path: rocky grey-brown ground with gravel and snow patches, layered rocky cliffs with snow on the ledges, snowy boulders along the edges, distant snowy mountain peaks under a cold blue sky at the top, light snowfall.

### Château de Ghetsis (`chateau.png`)
> Throne room of a dark royal castle (Team Plasma style): dark polished marble checkered floor with gold lines, a long purple-red carpet with gold borders down the middle, golden pillars and wall torches on the sides, at the top a high stone wall with purple banners, stained glass windows casting light beams, and a golden throne on a stepped dais.

### Îles Tourbillon (`tourbillon.png`)
> Lugia's chamber deep in the Whirl Islands: a dark sea cave with a flat wet rock island in the middle with small shallow pools and seaweed, deep blue water around it, stalagmites in the corners, at the top a huge waterfall falling from the cave ceiling into the water with mist, stalactites, faint blue light.

## Licence

Vérifie les conditions d'utilisation de l'IA choisie avant de publier le jeu (certaines offres gratuites rendent les images publiques ou interdisent l'usage commercial ; pour un projet de fan non commercial, c'est en général sans problème).
