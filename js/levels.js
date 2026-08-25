/* Niveaux du mode « Temples » (puzzle) — 7 colonnes, rangées de haut en bas.
   Symboles de grille :
     .        vide
     1-9      pierre (PV = chiffre)
     a-v      pierre (PV = 10 à 31)
     X / Y    volcanique blindée (2 / 3 PV, 1 dégât max par tir)
     P Q R S  toit de temple (triangle, angle droit en bas-gauche,
              bas-droite, haut-gauche, haut-droite), 2 PV
     ?        pierre mystère (3 PV)
     o * F    bonus : +1 noix, perle, fleur
     D C W    bonus : durian, piment, espadon

   balls : noix de coco par tir · shots : tirs disponibles
   stars : [tirs max pour 3 étoiles, tirs max pour 2 étoiles] */

export const LEVELS = [
  { name: 'Premiers pas',
    grid: ['.......', '.1.1.1.', '.......', '...o...'],
    balls: 1, shots: 4, stars: [3, 4] },

  { name: 'La vague',
    grid: ['.......', '1.2.3..', '.2.3.2.', '..3.2.1'],
    balls: 2, shots: 5, stars: [3, 4] },

  { name: 'Petite pyramide',
    grid: ['...2...', '..232..', '.23432.'],
    balls: 3, shots: 5, stars: [3, 4] },

  { name: 'La porte',
    grid: ['.33333.', '.3...3.', '.3.o.3.', '.3...3.'],
    balls: 3, shots: 6, stars: [4, 5] },

  { name: 'Récif',
    grid: ['.......', '2.4.4.2', '..*.o..', '2.4.4.2'],
    balls: 3, shots: 6, stars: [4, 5] },

  { name: 'Premier toit',
    grid: ['..P.Q..', '..333..', '..3o3..'],
    balls: 3, shots: 5, stars: [3, 4] },

  { name: 'Le poisson',
    grid: ['..44...', '.4..4.3', '4.o..43', '.4..4.3', '..44...'],
    balls: 4, shots: 6, stars: [4, 5] },

  { name: 'Gardien de pierre',
    grid: ['...X...', '..343..', '.34543.', '...*...'],
    balls: 4, shots: 6, stars: [4, 5] },

  { name: 'Marée basse',
    grid: ['5.5.5.5', '.......', '4.4.4.4', '...F...'],
    balls: 4, shots: 7, stars: [5, 6] },

  { name: 'Temple meru',
    grid: ['...3...', '..PQR..', '..555..', '.P555Q.', '.55555.'],
    balls: 5, shots: 7, stars: [5, 6] },

  { name: 'Chambre secrète',
    grid: ['.55555.', '.5...5.', '.5.?.5.', '.5...5.', '.55555.'],
    balls: 5, shots: 8, stars: [5, 7] },

  { name: 'Deux tours',
    grid: ['.6...6.', '.6.o.6.', '.6...6.', '.6.W.6.', '.6...6.'],
    balls: 5, shots: 8, stars: [5, 7] },

  { name: 'Le damier',
    grid: ['5.5.5.5', '.5.5.5.', '5.5.5.5', '.5.5.5.'],
    balls: 6, shots: 8, stars: [6, 7] },

  { name: 'Volcan',
    grid: ['...X...', '..6.6..', '.6.D.6.', '6..6..6'],
    balls: 6, shots: 8, stars: [5, 7] },

  { name: 'Les terrasses',
    grid: ['7......', '77.....', '777....', '7777.C.', '77777..'],
    balls: 6, shots: 9, stars: [6, 8] },

  { name: 'Œil du lagon',
    grid: ['..777..', '.7...7.', '7..a..7', '.7...7.', '..777..'],
    balls: 7, shots: 9, stars: [6, 8] },

  { name: 'Forteresse',
    grid: ['XX.o.XX', '8.....8', '..888..', '..8?8..'],
    balls: 7, shots: 9, stars: [6, 8] },

  { name: 'Toits en pagode',
    grid: ['...P...', '..PQQ..', '.P888Q.', '..888..', '.R888S.'],
    balls: 7, shots: 9, stars: [6, 8] },

  { name: 'Grand huit',
    grid: ['.99.99.', '9..9..9', '9..9..9', '.99.99.', '...F...'],
    balls: 8, shots: 10, stars: [7, 9] },

  { name: 'Le serpent',
    grid: ['bbbbbb.', '......b', '.bbbbbb', 'b......', 'bbbbbb.'],
    balls: 8, shots: 11, stars: [8, 10] },

  { name: 'Sanctuaire blindé',
    grid: ['.Y...Y.', '..9?9..', '.9.c.9.', '..999..', '.Y...Y.'],
    balls: 9, shots: 11, stars: [8, 10] },

  { name: 'Pleine lune',
    grid: ['..ddd..', '.d...d.', 'd..W..d', '.d...d.', '..ddd..', '...o...'],
    balls: 9, shots: 11, stars: [8, 10] },

  { name: 'Mur des offrandes',
    grid: ['eeeeeee', '.o.*.F.', 'eeeeeee', '.D.C.W.', 'eeeeeee'],
    balls: 10, shots: 12, stars: [9, 11] },

  { name: 'Le grand temple',
    grid: ['...f...', '..PfQ..', '.PfffQ.', '.fffff.', '.fX?Xf.', '.fffff.'],
    balls: 10, shots: 13, stars: [10, 12] },
];
