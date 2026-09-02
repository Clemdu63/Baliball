# Baliball 🥥

Casse-briques balinais : des **noix de coco** contre des **pierres de
temple**, dans un lagon aux eaux claires. Écrit en JavaScript pur —
**jouable hors ligne sur iPhone** une fois installé. Les sons (gamelan,
ressac) sont générés en code ; depuis la v3.0, l'accueil, les cartes de
modes et les boss ont de **vraies illustrations peintes** (générées via
FLUX/Replicate avec `tools/generate-art.mjs`, retouchées et embarquées
en WebP dans `art/` — donc toujours 100 % hors ligne). Le rendu du
plateau reste dessiné en canvas, avec un repli vectoriel pour chaque
illustration.

## Comment jouer

- **Glisse le doigt** dans la direction du tir, **relâche** pour lancer les
  noix de coco. La ligne de visée **raccourcit au fil des manches** :
  viser devient un vrai talent en fin de partie.
- Chaque impact enlève 1 point de vie à une pierre ; à 0 elle vole en éclats.
- Les petites noix cerclées donnent **+1 noix de coco** pour les tours suivants.
- D'autres bonus flottent dans le lagon : l'**espadon** nettoie sa ligne, le
  **durian** explose les pierres voisines, le **piment** double les dégâts du
  tir, la **perle** se collectionne, la **fleur de frangipanier** renvoie la
  noix tout droit vers le haut, le **gecko** dédouble la noix qui le touche,
  les **portails jumeaux** téléportent les noix de l'un à l'autre — rares
  (une chance toutes les 7 manches), jamais côte à côte **ni sur la même
  ligne** : l'un reste en surface, l'autre plonge de 2 à 4 rangées, si
  bien qu'entrer par celui du bas catapulte la noix tout en haut du
  lagon, là où elle n'irait jamais toute seule ; au plus 6 voyages par
  noix et par tir, avec une légère déviation à la sortie —, le
  **lotus-bouclier** sauve la partie une fois quand une pierre atteint la
  plage, et la rare **boussole marine** révèle pendant 2 tirs la
  trajectoire complète, rebonds sur les murs compris.
- Les combos remplissent la **jauge Gamelan** : pleine, le prochain tir est
  une **fièvre** à dégâts doublés, traînée de braises comprise.
- Toutes les 10 manches, un des **neuf boss** se dresse — un masque peint
  géant sur deux rangées, dont la **zone de collision épouse le masque**
  (une noix qui passe visiblement à côté ne le touche pas ; la barre de
  vie sous le masque en montre la largeur exacte), avec un pouvoir toutes les 3 manches s'il
  survit : 🎭 le **Barong** (manche 10) appelle 2 pierres blindées,
  👺 **Rangda** (20) se régénère, 🐉 le **Naga** (30) fait surgir un mur
  de pierres, 🦅 **Garuda** (40) abat une pierre large, 🔥 le **Léak**
  (50) maudit des pierres normales en blindées, 🐒 **Hanuman** (60)
  chipe une noix de coco de ta rafale, 🐢 **Bedawang** (70) déclenche un
  **séisme** qui fait tout descendre d'un cran, 🌊 **Dewi Danu** (80)
  noie le lagon dans la brume, 👹 le **Raksasa** (90) **dévore tous les
  bonus** du plateau — puis le cycle recommence. Le vaincre rapporte
  1 000 pts et 15 perles. Chaque boss a sa **voix** (rugissement,
  grondement tellurique, cris d'aigle… tout en synthèse WebAudio) — et
  si l'un d'eux met fin à ta partie, son masque trône sur l'écran de fin
  et sur la carte de partage (« Terrassé par 🎭 Le Barong »).
- Le **lotus 🪷** protège tout un tour : si la Grande marée descend de deux
  crans ou si un séisme suit la marée, un seul lotus s'ouvre.
- La **boussole 🧭** trace la trajectoire avec la physique exacte du moteur
  (mêmes sous-pas, mêmes boîtes de collision, toits de temple et pierres
  rondes compris) jusqu'au premier contact — pierre, portail ou plage.
- Le **gong 🥁** (bonus rare) résonne dans tout le lagon : toutes les
  pierres perdent 1 PV d'un coup.
- Tous les 25 crans de manche, une pluie de perles (+10 ◉) célèbre le cap.
- Pierres spéciales : **toit de temple** (triangle, rebond en diagonale),
  **volcanique blindée** (1 dégât par seconde max), **mystère « ? »** (surprise
  à la casse).
- Le **score** grimpe avec des multiplicateurs de combo quand un même tir
  brise plusieurs pierres.
- Aux très gros scores, le lagon se déchaîne : **pierres larges** (2 colonnes)
  dès 10 000 pts, **pierres rondes** à rebonds courbes à 30 000, **Grande
  marée** à 50 000 (descente double toutes les 5 manches), **Tempête** à
  80 000 (une pierre de plus par rangée, toutes renforcées), **pierres
  ardentes** à 100 000 (tout durcit, blindées plus fréquentes) — chaque
  palier est annoncé d'une bannière. En Tournoi et Défi du jour, ces paliers
  arrivent à la manche pour préserver l'identité des grilles.
- À chaque manche, une nouvelle rangée apparaît et tout descend d'un cran :
  la partie est perdue quand une pierre atteint la plage.
- Le plateau fait **9 colonnes**, et un **couloir reste toujours libre**
  au-dessus de la rangée du haut : une noix bien visée peut y filer,
  rebondir entre le haut de l'écran et les pierres, et les pilonner par
  le dessus — les tirs en cloche valent souvent mieux que les tirs rasants.
- Pendant le vol, un bouton **▶▶ Accélérer** apparaît au bout de 8 secondes.
- En jeu : **📖** ouvre la légende (bonus et pierres) par-dessus la partie,
  moteur figé — on reprend exactement où on en était ; **⟲** recommence la
  partie (avec confirmation), **⌂** revient au
  menu, **🔊/🔇** coupe ou remet le son sans quitter ; l'écran **Légende**
  rappelle l'effet de chaque bonus et pierre.
- Sur **iPad, ordinateur ou écran couché** assez haut, le plateau garde ses
  proportions de téléphone et se centre avec des bandes latérales — le jeu
  reste jouable ; un téléphone couché met simplement la partie en pause.
- La partie en cours est sauvegardée automatiquement : tu peux fermer l'app
  (ou revenir au menu avec le bouton ⌂) et **reprendre** plus tard, même hors ligne.
- Au tout premier lancement, **trois diapos de bienvenue** illustrées
  présentent le jeu (visée, boss, défis) — passables d'un geste.
- Dans **Réglages** : thème jour/nuit/auto, sons, ressac d'ambiance,
  musique gamelan,
  vitesse des noix de coco, **mode gaucher** (boutons en jeu à gauche),
  **réduction des animations**, **vibrations** — coup de boss, défaite,
  et un tic à **chaque rebond sur une pierre** (réglage séparé) ; réelles
  sur Android via l'API standard (iOS bloque les vibrations des apps
  web : le jeu tente le retour haptique natif, sans garantie selon la
  version) —, le **code
  d'équipage** (voir Défis), et **sauvegarde & transfert** — un code
  compact à copier/partager (AirDrop, iMessage…) pour retrouver toute sa
  progression sur un autre téléphone, sans aucun serveur.

## Modes de jeu

- **🗺 L'Odyssée** — la campagne : 48 étapes réparties sur 6 îles de
  l'archipel (plage de Sanur, rizières d'Ubud, lagon de Nusa, falaises
  d'Uluwatu, volcan Batur, île des Esprits), chacune avec sa légende.
  Objectifs variés (survivre, briser, marquer en tirs limités) et un
  **boss de fin d'île** ; étoiles ★ à la clé, déblocage en chaîne,
  prime de perles à la première traversée de chaque étape. La rafale de
  départ grandit avec les îles (1 noix à Sanur, 6 sur l'île des Esprits ;
  4 à 10 face aux boss). Objectifs et seuils d'étoiles sont **calibrés
  par simulation** : le vrai moteur joue chaque étape des dizaines de
  fois sous Node (`tools/sim/`), et les seuils sont posés sur les
  quartiles des parties gagnées.
- **👑 Boss Rush** — les 9 masques défilent sans répit, de plus en plus
  coriaces, escortés de rangées légères ; record du nombre de boss
  terrassés en une partie.
- **🥥 Classique** — les pierres descendent, tiens bon le plus longtemps
  possible (sauvegarde et reprise automatiques).
- **🌊 Marée montante** — 90 secondes chrono, tirs enchaînés, la marée
  nettoie le bas du plateau.
- **🛕 Temples** — 48 grilles fixes à libérer en un nombre de tirs limité,
  1 à 3 étoiles par niveau — des Jumeaux au Panthéon.
- **🏖 Plage** — zen, sans défaite : idéal en avion. Chaque pierre brisée
  joue la **note suivante d'une mélodie de gamelan** : casser devient un
  morceau de musique.
- **🌅 Défi du jour** — la même partie pour tout le monde, une nouvelle
  chaque jour (graine de la date, donc jouable hors ligne) — avec un
  **fantôme** : en rejouant, le score de ton meilleur run du jour
  s'affiche manche par manche (vert si tu mènes, rouge sinon).
- **🌀 Défi de la semaine** — la même partie sept jours durant, avec un
  **mutateur** qui change les règles : brouillard sur le haut du lagon,
  tir miroir, pluie de bonus, pierres durcies ou noix rapides.
- **⚓ Équipage** — un code de 4 lettres choisi entre amis (dans
  Réglages) : à la fin d'un Défi du jour ou de la semaine, l'écran de
  fin affiche le **podium de l'équipage** (meilleur score de chacun, via
  ntfy.sh — Internet requis à ce moment-là seulement). Un bouton **⚓**
  sur l'accueil ouvre l'écran Équipage : les podiums du jour et de la
  semaine, consultables à tout moment.
- **📡 Tournoi entre amis** — chacun sur son téléphone, la même partie
  classique (infinie) pour tout le monde, en deux variantes :
  - **Événements communs** : toutes les 5 manches (hors manches à Barong),
    le lagon s'anime pour tout le monde en même temps — pluie de bonus,
    marée généreuse (+2 noix), brume, vent du volcan qui durcit les
    pierres. Dérivés de la graine : identiques pour tous, même hors ligne.
  - **En ligne** : salon avec pseudos et **suivi en direct** — bandeau
    « 🥇 Angel · 1 240 · 3 🎮 », toasts « Marvin a terminé : 890 pts » /
    « Angel passe en tête ! » / arrivées et départs du salon, **réactions
    émojis** qui flottent sur l'écran des autres, **réglages de salon**
    (course au premier à 2 000 ou 5 000 pts — la partie s'arrête pour tout
    le monde dès qu'un joueur gagne — ou survie ; vitesse commune ;
    **soirée en manches Best of 3** : points cumulés 3/2/1 à chaque
    manche, manche suivante lancée depuis le classement, podium final de
    la soirée ; **sabotage amical** : un combo ×5 envoie un effet
    surprise chez les adversaires — vague de pierre blindée, brume d'une
    manche ou singe voleur de noix ; **Versus ⚔️** : chaque combo
    attaque tous les adversaires — ×3 fait surgir une pierre, ×5 une
    blindée en plus, ×7 noie leur lagon dans la brume, avec bannière
    « ⚔️ Angel attaque ! » à la réception ; **Chaos 🌪** : un événement
    commun toutes les 3 manches au lieu de 5 ; **coup de pouce 🤝** : chaque
    joueur peut s'accorder +2 noix et un lotus, annoncé aux autres —
    idéal pour jouer avec un débutant), un **QR code de salon** à
    scanner pour rejoindre sans taper le code, des **messages rapides**
    💬 (« GG ! », « Encore une ? »…) en plus des émojis, les
    **rivalités 🤜🤛** mémorisées sur chaque téléphone (« Contre
    Marvin : 7–4 », affiché au salon), et en fin de partie un
    **générique de soirée** : courbes de score superposées manche par
    manche et mentions (Marathonien, Premier sur la plage,
    Remontada). Un retardataire qui rejoint le salon en pleine partie
    peut suivre le **classement en direct** et regarder les autres en
    spectateur, puis entre dans la manche suivante. Podium
    et bannière de victoire, classement en direct après sa défaite — avec
    **mode spectateur** : un éliminé peut observer le plateau de n'importe
    quel joueur encore en vie (👁 depuis le classement), mis à jour à
    chaque tir, et lui envoyer des émojis. Retour au salon pour la revanche. S'appuie sur le service public gratuit
    [ntfy.sh](https://ntfy.sh) (aucun compte) ; Internet requis pendant la
    partie.
  - **Hors ligne** : un code de 4 lettres = la même partie pour tous
    (QR à scanner là aussi), et on compare les scores à la fin. Zéro
    connexion.
  - **Reconnexion** : app fermée par erreur, page rechargée, réseau coupé ?
    Un bouton **🔁 Reprendre le tournoi** apparaît sur l'accueil (pendant
    2 h) et remet dans la partie exactement là où elle en était — même
    grille, même suite de rangées à venir. En ligne, le salon est
    retrouvé automatiquement : classement, suivi en direct et émojis
    reprennent comme si de rien n'était.

## Le lagon vivant

En thème **Auto**, le lagon suit l'heure réelle : **aube dorée** (6 h-8 h),
plein jour, **couchant embrasé** (17 h 30-19 h 30), nuit.
L'**accueil** change de tableau avec l'heure : quatre peintures (aube rosée,
plein jour, couchant pourpre, nuit à la lune) en fondu enchaîné, sous un
ciel vivant — halo du soleil ou de la lune, nappes de nuages qui dérivent,
étoiles qui scintillent, lucioles près du temple, nappe de brume ou rideau
de mousson selon la météo du jour — et une ligne discrète annonce l'heure
et le temps qu'il fait (« 🌅 Aube sur le lagon · brume »). Les teintes du
verre des boutons suivent la lumière. Tout se fige si « réduire les
animations » est actif. Une **météo du
jour**, tirée de la date (la même pour tout le monde, calculée hors
ligne), habille certains jours : **brume** sur le haut du lagon,
**mousson** et son rideau de pluie, **pleine lune** qui fait scintiller
la nuit. Purement cosmétique — le gameplay ne change jamais.
Une **musique de gamelan générative** (pentatonique, tout en synthèse
WebAudio) accompagne les parties : gong grave, basse lente, mélodie dont
la densité et le tempo suivent la partie — plus la manche est haute et
plus un boss rôde, plus elle s'anime. Le mode Plage garde sa propre
mélodie jouée pierre par pierre. Des **pétales de frangipanier** dérivent
sur l'écume et les pierres volent en **éclats anguleux** (adoucis si
« réduire les animations » est actif).

## Progression

L'accueil affiche le **🏆 Record du lagon** : le meilleur score de tous
les joueurs — avec la **manche** à laquelle il a été atteint —, propagé de téléphone en téléphone par un tam-tam ntfy.sh
(chaque app en ligne récupère le meilleur record connu au lancement, le
garde en cache — donc visible hors ligne — et republie le meilleur connu
une fois par jour ; battre le record le publie immédiatement, et
l'écran de fin le célèbre).
Chaque partie fait grimper ton **niveau de joueur** (XP dérivée des
statistiques cumulées, donc rétroactive) avec des **titres balinais** —
Pêcheur du lagon, Gardien du temple, Légende de Bali… — affichés sur
l'accueil, dans l'écran Progrès et à côté de ton pseudo dans les salons
de tournoi (⭐).
Chaque jour, **3 missions** tirées de la date (briser des pierres, faire
un combo ×6, vaincre un Barong…) rapportent des perles — suivi sur
l'accueil et dans l'écran Progrès, récompense créditée en pleine partie.
Les **perles ◉** gagnées en jeu s'échangent à la **Boutique** contre des
peaux de balle (ballon de plage, frangipanier, lampion, durian), des
décors du lagon (rizières, volcan au sable noir, Uluwatu au couchant) et
des **sillages** derrière les noix (pétales, braises, poussière
d'étoiles).
Le **🕉 Sanctuaire** (dans la Boutique) vend des **offrandes**
permanentes — canari du matin (+1 noix), boussole du pêcheur (2 tirs
guidés), piment séché (premier tir ×2), braise de gamelan (fièvre à
moitié), lotus d'avance (un bouclier), gong du temple (premier boss
−30 % PV). On en équipe **2 au plus** ; elles bénissent chaque partie
solo, jamais les modes à graine partagée (équité du tournoi et des
défis).
Le **🎭 Musée des masques** (écran Progrès) accroche le masque de chaque
boss vaincu avec son pouvoir et son nombre de victoires — touche un
masque conquis pour entendre sa voix ; les autres restent en silhouette.
L'écran **Progrès** liste **Mes parties récentes** (les 20 dernières :
mode, score, manche atteinte, il y a combien de temps), trace la
**courbe des scores**, et suit les statistiques cumulées — globales et
**par mode de jeu** (records et parties de chaque mode) — ainsi que
15 succès, dont le **panthéon des boss** : vaincre les 9 masques
différents débloque le sillage exclusif 🎭 **Esprits du panthéon**. Tous les
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

## Simulation et audit du moteur

`tools/sim/harness.mjs` exécute le **vrai** `js/game.js` sous Node sans
navigateur (DOM et canvas minimaux, horloge virtuelle à 30 i/s, rendu
coupé) : une partie complète se joue en une fraction de seconde. Deux
bots (« correct » et « naïf ») servent à l'équilibrage ; des
vérificateurs d'invariants (noix dans une pierre, hors du lagon, dérive
de vitesse, pierres superposées, bonus dans une pierre, exceptions)
auditent la physique sur des centaines de parties dans tous les modes.

- `node tools/sim/audit.mjs` — audit physique tous modes + déterminisme
  tournoi (deux joueurs, même graine → mêmes rangées).
- `node tools/sim/odyssey-sim.mjs` — joue les 48 étapes de l'Odyssée.
- `node tools/sim/ody-calib.mjs` puis `ody-policy.mjs` et
  `ody-generate.mjs` — recalibre objectifs et étoiles, régénère
  `js/odyssey.js`.

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
| `js/levels.js` | Les 48 niveaux du mode Temples |
| `js/odyssey.js` | Les 48 étapes et 6 îles de l'Odyssée |
| `js/theme.js` | Thèmes du plateau (couleurs canvas + CSS) |
| `js/net.js` | Tournoi en ligne : pub/sub minimal sur ntfy.sh |
| `js/qr.js` | Générateur de QR codes (salons à scanner), sans dépendance |
| `js/audio.js` | Sons générés en WebAudio |
| `js/storage.js` | Accès stockage et réglages |
| `sw.js` | Service worker : cache hors ligne |
| `manifest.webmanifest` | Manifest PWA (icône, plein écran, portrait) |
| `icons/` | Icônes d'app (générées par `tools/gen_icons.py`) |
| `tools/build-demo.mjs` | Assemble la démo mono-fichier (sans service worker) |
