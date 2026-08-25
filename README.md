# Baliball 🎮

Casse-briques à balles multiples (inspiré des jeux type « Ballz »), écrit en
JavaScript pur — **jouable hors ligne sur iPhone** une fois installé.

## Comment jouer

- **Glisse le doigt** dans la direction du tir, **relâche** pour lancer les balles.
- Chaque impact enlève 1 point de vie à une brique ; à 0 elle explose.
- Les pastilles **○** donnent **+1 balle** pour les tours suivants.
- À chaque manche, une nouvelle rangée apparaît et tout descend d'un cran :
  la partie est perdue quand une brique atteint la ligne du bas.
- Pendant le vol des balles, **touche l'écran** pour accélérer.
- La partie en cours est sauvegardée automatiquement : tu peux fermer l'app
  et **reprendre** plus tard, même hors ligne.

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
| `index.html` | Page, écrans de menu/fin, réglages iOS plein écran |
| `game.js` | Tout le jeu (physique, rendu canvas, sauvegarde) |
| `sw.js` | Service worker : cache hors ligne |
| `manifest.webmanifest` | Manifest PWA (icône, plein écran, portrait) |
| `icons/` | Icônes d'app (générées par `tools/gen_icons.py`) |
