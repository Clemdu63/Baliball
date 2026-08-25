# Baliball 🥥

Casse-briques balinais : des **noix de coco** contre des **pierres de
temple**, dans un lagon aux eaux claires. Écrit en JavaScript pur —
**jouable hors ligne sur iPhone** une fois installé. Tous les visuels et
les sons (gamelan, ressac) sont générés en code : aucune image, aucun
fichier audio.

## Comment jouer

- **Glisse le doigt** dans la direction du tir, **relâche** pour lancer les
  noix de coco.
- Chaque impact enlève 1 point de vie à une pierre ; à 0 elle vole en éclats.
- Les petites noix cerclées donnent **+1 noix de coco** pour les tours suivants.
- D'autres bonus flottent dans le lagon : l'**espadon** nettoie sa ligne, le
  **durian** explose les pierres voisines, le **piment** double les dégâts du
  tir, la **perle** se collectionne, la **fleur de frangipanier** renvoie la
  noix tout droit vers le haut.
- Pierres spéciales : **toit de temple** (triangle, rebond en diagonale),
  **volcanique blindée** (1 dégât max par tir), **mystère « ? »** (surprise
  à la casse).
- Le **score** grimpe avec des multiplicateurs de combo quand un même tir
  brise plusieurs pierres.
- À chaque manche, une nouvelle rangée apparaît et tout descend d'un cran :
  la partie est perdue quand une pierre atteint la plage.
- Pendant le vol, un bouton **▶▶ Accélérer** apparaît au bout de 8 secondes.
- En jeu : **⟲** recommence la partie (avec confirmation), **⌂** revient au
  menu ; l'écran **Légende** rappelle l'effet de chaque bonus et pierre.
- La partie en cours est sauvegardée automatiquement : tu peux fermer l'app
  (ou revenir au menu avec le bouton ⌂) et **reprendre** plus tard, même hors ligne.
- Dans **Réglages** : thème jour/nuit/auto, sons, ressac d'ambiance,
  vitesse des noix de coco.

## Modes de jeu

- **🥥 Classique** — les pierres descendent, tiens bon le plus longtemps
  possible (sauvegarde et reprise automatiques).
- **🌊 Marée montante** — 90 secondes chrono, tirs enchaînés, la marée
  nettoie le bas du plateau.
- **🛕 Temples** — 24 grilles fixes à libérer en un nombre de tirs limité,
  1 à 3 étoiles par niveau.
- **🏖 Plage** — zen, sans défaite : idéal en avion.
- **🌅 Défi du jour** — la même partie pour tout le monde, une nouvelle
  chaque jour (graine de la date, donc jouable hors ligne).
- **📡 Tournoi entre amis** — 2 à 10 téléphones : un code de 4 lettres à
  partager, tout le monde lance le décompte en même temps et joue
  exactement la même partie de 90 secondes, puis on compare les scores.
  Aucune connexion nécessaire (une PWA Safari n'a pas accès au
  Bluetooth/réseau local, le code partagé remplace la synchronisation).

## Progression

Les **perles ◉** gagnées en jeu s'échangent à la **Boutique** contre des
peaux de balle (ballon de plage, frangipanier, lampion, durian) et des
décors du lagon (rizières, volcan au sable noir, Uluwatu au couchant).
L'écran **Progrès** suit les statistiques cumulées et 12 succès. Tous les
1 000 points, une célébration marque le palier — et certains cosmétiques
se **débloquent au score** (étoile de mer à 2 500, coquillage à 5 000,
décor Bioluminescence à 8 000). Le score d'une partie se **partage en
image** générée hors ligne.

## Installation sur iPhone (jeu hors ligne)

Le jeu est une PWA (Progressive Web App) : il doit être servi en **HTTPS**
une seule fois, ensuite il fonctionne sans aucune connexion.

1. Héberge le dépôt (le plus simple : GitHub Pages, voir ci-dessous) et ouvre
   l'URL du jeu dans **Safari** sur l'iPhone, **en Wi-Fi**.
2. Touche le bouton **Partager** (carré avec flèche ⬆︎).
3. Choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Ouvre l'app une première fois avec Internet : le service worker met tout
   le jeu en cache (~30 Ko).
5. C'est tout — l'app se lance ensuite **en plein écran et hors ligne**
   (mode avion compris ✈️).

## Hébergement avec GitHub Pages

Un workflow GitHub Actions (`.github/workflows/pages.yml`) déploie
automatiquement le jeu à chaque push. Si le déploiement ne se lance pas tout
seul : onglet **Settings → Pages** du dépôt, et choisir **GitHub Actions**
comme source. Le jeu sera servi sur :

```
https://clemdu63.github.io/Baliball/
```

## Développement local

Aucune dépendance, aucun build :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Le service worker met les fichiers en cache : après une modification,
incrémenter `CACHE_VERSION` dans `sw.js` pour que les joueurs reçoivent la
mise à jour.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page et écrans (accueil, réglages, fin de partie) |
| `style.css` | Styles, thèmes clair/sombre, animations |
| `js/main.js` | Écrans, modes, boutique, réglages, démarrage |
| `js/game.js` | Moteur du jeu (physique, rendu canvas, sauvegarde) |
| `js/levels.js` | Les 24 niveaux du mode Temples |
| `js/theme.js` | Thèmes du plateau (couleurs canvas + CSS) |
| `js/audio.js` | Sons générés en WebAudio |
| `js/storage.js` | Accès stockage et réglages |
| `sw.js` | Service worker : cache hors ligne |
| `manifest.webmanifest` | Manifest PWA (icône, plein écran, portrait) |
| `icons/` | Icônes d'app (générées par `tools/gen_icons.py`) |
| `tools/build-demo.mjs` | Assemble la démo mono-fichier (sans service worker) |
