# Feuille de route Baliball

Chaque version est jouable, hors ligne, et déployée automatiquement.
Incrémenter `CACHE_VERSION` dans `sw.js` à chaque livraison.

## v0.1 — Base (livrée ✅)

Jeu type Ballz : visée au doigt, balles multiples, briques qui descendent,
pastilles +1 balle, sauvegarde/reprise, record, PWA installable hors ligne.

## v0.2 — Interface & thèmes (livrée ✅)

- **Mode sombre** : suivi automatique du réglage système + bascule manuelle
  dans un menu Réglages (choix mémorisé). Thème sombre = plateau anthracite,
  briques éclatantes, balle blanche ; thème clair = actuel.
- **Écran d'accueil retravaillé** : logo animé (balle qui rebondit sur les
  lettres), transitions entre écrans, écran de fin avec statistiques de la
  partie (briques cassées, balles accumulées, meilleure manche).
- **Menu Réglages** : thème, sons on/off, vitesse des balles (normal/rapide).
- **Sons** : générés en WebAudio (aucun fichier audio → toujours hors ligne,
  poids nul) — rebond, casse, bonus, game over.
- **Refactor technique** : découper `game.js` en modules ES natifs
  (moteur, rendu, écrans, stockage) — sans étape de build, la PWA reste
  servie telle quelle.

## v0.3 — Bonus & briques spéciales

Nouvelles cases sur le plateau (en plus de ○ +1 balle) :

- **⚡ Laser** : détruit toute la ligne ou la colonne au passage.
- **💣 Bombe** : inflige des dégâts aux briques adjacentes.
- **✚ Dégâts x2** : les balles font 2 dégâts pendant ce tour.
- **● Pièces** : monnaie accumulée (utilisée en v0.6).
- **Briques triangles** : demi-briques, rebond en diagonale.
- **Briques blindées** : n'encaissent qu'1 dégât par tour, quelle que soit
  la pluie de balles.

Score en points (distinct de la manche) : chaque PV enlevé rapporte,
multiplicateurs pour les gros combos d'un même tir.

## v0.4 — Modes de jeu

Choix du mode sur l'écran d'accueil, chacun avec son record :

- **Classique** : le mode actuel.
- **Contre-la-montre** : 90 secondes, tirs illimités sans attendre la fin du
  tour précédent, casser un max de briques.
- **Puzzle** : ~30 niveaux fixes conçus à la main, nombre de tirs limité,
  1 à 3 étoiles selon la performance.
- **Zen** : sans game over, les briques du bas disparaissent — pour jouer
  détendu (en avion ✈️).

## v0.5 — Multijoueur local

Sur un seul iPhone (une PWA Safari n'a pas accès au Bluetooth/réseau local,
donc le 2-appareils hors ligne n'est pas faisable en web — voir Notes) :

- **Tour par tour (d'abord)** : 2 joueurs, même graine aléatoire → séquence
  de briques identique pour les deux ; chacun joue sa partie, celui qui
  survit le plus de manches gagne. Simple, fidèle au gameplay, robuste.
- **Duel écran partagé (ensuite)** : écran coupé en deux tête-bêche, chacun
  vise depuis son bord avec un temps de visée limité ; casser une grosse
  brique envoie une rangée chez l'adversaire.

## v0.6 — Progression & finitions

- **Défis quotidiens** : partie générée par la graine du jour (déterministe →
  fonctionne hors ligne), comparaison du score au retour en ligne.
- **Boutique à pièces** : skins de balles, thèmes de couleurs supplémentaires.
- **Succès** et statistiques cumulées.
- **Tutoriel** intégré à la première partie.

## Notes techniques

- Pas de framework ni de build : HTML/CSS/JS natifs, modules ES.
- Tout doit fonctionner hors ligne : pas de police externe, pas de CDN,
  pas d'appel réseau requis en jeu.
- La sauvegarde (`localStorage`) est versionnée (`baliball.save.v1`) :
  prévoir la migration quand le format change.
- Multijoueur 2 appareils : impossible proprement en PWA Safari (pas de
  Web Bluetooth/réseau local). Si on le veut un jour, il faudra empaqueter
  le même code en app native (Capacitor) — décision à prendre plus tard.
- Tests : scripts Playwright (parties automatiques) à faire tourner avant
  chaque livraison.
