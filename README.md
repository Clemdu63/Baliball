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
- À chaque manche, une nouvelle rangée apparaît et tout descend d'un cran :
  la partie est perdue quand une pierre atteint la plage.
- Pendant le vol, **touche l'écran** pour accélérer.
- La partie en cours est sauvegardée automatiquement : tu peux fermer l'app
  (ou revenir au menu avec le bouton ⌂) et **reprendre** plus tard, même hors ligne.
- Dans **Réglages** : thème jour/nuit/auto, sons, ressac d'ambiance,
  vitesse des noix de coco.

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
| `js/main.js` | Écrans, réglages, démarrage |
| `js/game.js` | Moteur du jeu (physique, rendu canvas, sauvegarde) |
| `js/theme.js` | Thèmes du plateau (couleurs canvas + CSS) |
| `js/audio.js` | Sons générés en WebAudio |
| `js/storage.js` | Accès stockage et réglages |
| `sw.js` | Service worker : cache hors ligne |
| `manifest.webmanifest` | Manifest PWA (icône, plein écran, portrait) |
| `icons/` | Icônes d'app (générées par `tools/gen_icons.py`) |
| `tools/build-demo.mjs` | Assemble la démo mono-fichier (sans service worker) |
