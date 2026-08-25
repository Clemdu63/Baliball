# Feuille de route Baliball 🌴

**Baliball = Bali.** Le thème unique du jeu, c'est Bali et l'Indonésie :
lagon aux eaux claires, noix de coco, temples, jungle, volcans, gamelan.
Chaque lot est livrable : à la fin du lot, le jeu est jouable, hors ligne,
et déployé (penser à incrémenter `CACHE_VERSION` dans `sw.js`).

Tous les visuels sont dessinés en code (canvas/SVG/CSS) : pas d'images à
télécharger, l'app reste minuscule et 100 % hors ligne.

---

## Déjà livré

- **v0.1 — Base** : jeu type Ballz complet (visée, balles multiples,
  briques qui descendent, +1 balle, sauvegarde/reprise, record), PWA
  installable et jouable hors ligne, déploiement GitHub Pages.
- **v0.2 — Fondations interface** : modules ES, écrans (accueil, réglages,
  fin de partie avec stats), mode sombre, sons WebAudio, vitesse réglable,
  bouton menu en jeu.

---

## Lot 1 — Identité Bali (v0.3) 🥥 (livré ✅)

Le lot le plus important : tout l'habillage passe au thème Bali.

**Plateau = lagon**
- Fond : dégradé d'eaux turquoise claires, reflets/caustiques animés
  discrets, sable clair en bas (la zone de lancement = la plage).
- Décor vivant : poissons qui traversent en fond, feuilles de palmier
  dans les coins, petites vagues sur la ligne de sable.
- Ligne de danger : ligne d'écume/marée plutôt que pointillés roses.

**Objets du jeu**
- La balle = **noix de coco** (dessinée : sphère brune, fibres, 3 yeux).
- Briques = **pierres de temple** balinais : pierre volcanique grise,
  mousse verte, sculptures ; la couleur/l'usure varie avec les PV
  (pierre claire → moussue → volcanique → dorée pour les grosses valeurs).
- Pastille +1 balle = petite noix de coco flottante (ou fleur d'hibiscus).
- Particules de casse : éclats de pierre + poussière.

**Ambiance**
- Thème clair = lagon en plein jour ; thème sombre = **coucher de soleil /
  nuit** (eau sombre, ciel orangé-violet, lampions) — le réglage existant
  bascule entre les deux.
- Sons retravaillés façon **gamelan** (percussions métalliques douces,
  pentatonique) + petit ressac en fond sonore (optionnel, coupable).
- Écran d'accueil : paysage balinais dessiné (silhouette de temple,
  palmiers, mer, volcan), logo « BALIBALL » avec la noix de coco qui
  rebondit dessus.
- Nouvelle icône d'app (noix de coco sur fond lagon + temple).

## Lot 2 — Bonus & briques spéciales (v0.4) 🌶️

Nouvelles cases sur le plateau, toutes dans le thème :

- **Espadon** ⟶ : traverse et détruit toute la ligne (ou la colonne).
- **Durian explosif** : inflige des dégâts à toutes les briques adjacentes
  (le fruit qui pique !).
- **Piment (sambal)** : les balles font dégâts ×2 jusqu'à la fin du tour.
- **Perles** : monnaie ramassée en jeu (dépensée au Lot 5).
- **Fleur de frangipanier** : la première balle qui la touche repart
  verticalement vers le haut (tir gratuit).

Briques spéciales :
- **Toit de temple** (triangle) : demi-brique, renvoie en diagonale.
- **Pierre volcanique** (blindée) : max 1 dégât par tour, quelle que soit
  la pluie de noix de coco.
- **Brique mystère** : contient un bonus aléatoire révélé à la casse.

Et un vrai **score en points** (distinct de la manche) : points par PV
enlevé, multiplicateur de combo quand un même tir casse beaucoup de
briques, affiché sur l'écran de fin + record de score.

## Lot 3 — Modes de jeu (v0.5) 🏝️

Sélecteur de mode sur l'accueil, records séparés par mode :

- **Classique** : le mode actuel.
- **Marée montante** (contre-la-montre) : 90 secondes, on retire
  l'attente — nouveau tir dès que la première balle retombe ; casser un
  max avant la fin.
- **Temples** (puzzle) : ~30 niveaux fixes dessinés à la main (formes de
  temples, statues, poissons), nombre de tirs limité, 1 à 3 étoiles.
- **Plage** (zen) : pas de game over, les briques du bas s'effacent —
  pour jouer détendu en avion ✈️.

## Lot 4 — Multijoueur local (v0.6) 🤝

Sur un seul iPhone (une PWA Safari n'a pas accès au Bluetooth/réseau
local : le 2-appareils hors ligne n'est pas possible en web — voir Notes) :

- **Duel de plage (tour par tour)** : 2 joueurs, même graine aléatoire →
  séquence de briques identique pour les deux ; chacun joue sa série,
  celui qui tient le plus de manches gagne. Écran de passage de téléphone
  entre les tours, tableau comparatif à la fin.
- **Duel écran partagé** (ensuite) : écran coupé en deux tête-bêche,
  temps de visée limité ; casser une grosse brique envoie une rangée
  chez l'adversaire.

## Lot 5 — Progression & boutique (v0.7) 🐚

- **Défi du jour** : partie générée par la graine du jour (déterministe,
  donc jouable hors ligne), même défi pour tout le monde.
- **Boutique aux perles** (les perles du Lot 2) :
  - skins de balle : noix de coco, ballon de plage, fleur, lampion, durian ;
  - décors de plateau : lagon, rizières en terrasses, volcan Agung,
    temple d'Uluwatu au coucher du soleil ;
  - traînées de balle (écume, pétales…).
- **Succès** (casser 1 000 briques, manche 50, 100 balles…) et
  statistiques cumulées.
- **Tutoriel** intégré à la première partie.

## Lot 6 — v1.0 ✨

- Peaufinage général : transitions, vibrations là où c'est possible,
  performances (beaucoup de balles + décor animé), accessibilité
  (contrastes, reduced motion).
- Partage du score en image générée (canvas → photo).
- Revue complète sur iPhone réel (encoche, safe areas, coupures d'app).
- Si l'envie d'aller sur l'App Store ou du multi 2-appareils se confirme :
  empaqueter le même code avec Capacitor (décision à ce moment-là).

---

## Notes techniques

- Pas de framework ni de build : HTML/CSS/JS natifs, modules ES.
- Tout fonctionne hors ligne : aucun fichier image/son externe, tout est
  dessiné et synthétisé en code.
- Sauvegarde versionnée (`baliball.save.v1`) : migrer les formats quand
  ils évoluent (score, perles, modes → nouvelles clés).
- Multijoueur 2 appareils : impossible proprement en PWA Safari ; passer
  par une app native (Capacitor) si on le veut un jour.
- Tests Playwright (parties automatiques + captures) avant chaque livraison.
