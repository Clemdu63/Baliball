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
  /* ---- Temples 25-48 : la seconde vallee ---- */
  { name: 'Les jumeaux',
    grid: ['66...66', '66.o.66', '.......', '..8.8..', '...C...'],
    balls: 4, shots: 6, stars: [4, 5] },

  { name: 'Escalier celeste',
    grid: ['9......', '99.....', '999..o.', '9999...', '99999..'],
    balls: 5, shots: 7, stars: [5, 6] },

  { name: 'Le gong cache',
    grid: ['.XXXXX.', '.X...X.', '.X.?.X.', '.X...X.', '.XXXXX.'],
    balls: 4, shots: 8, stars: [6, 7] },

  { name: 'Maree de toits',
    grid: ['P.Q.P.Q', '.......', 'R.S.R.S', '...o...', 'P.Q.P.Q'],
    balls: 4, shots: 7, stars: [5, 6] },

  { name: 'Le sablier',
    grid: ['8888888', '.88888.', '..888..', '...8...', '..888..', '.8o8o8.'],
    balls: 6, shots: 8, stars: [6, 7] },

  { name: 'Croix du sud',
    grid: ['...a...', '...a...', 'aaaWaaa', '...a...', '...a...'],
    balls: 5, shots: 7, stars: [5, 6] },

  { name: 'La muraille',
    grid: ['ccccccc', '.......', '.o.D.o.', '.......', 'ccccccc'],
    balls: 6, shots: 8, stars: [6, 7] },

  { name: 'Oeil du volcan',
    grid: ['..YYY..', '.Y...Y.', 'Y..d..Y', '.Y...Y.', '..YYY..'],
    balls: 5, shots: 9, stars: [7, 8] },

  { name: 'Les rizieres',
    grid: ['7.7.7.7', '.6.6.6.', '7.7.7.7', '.6.6.6.', '...F...'],
    balls: 5, shots: 8, stars: [6, 7] },

  { name: 'Serpent de pierre',
    grid: ['ee.....', '.ee....', '..ee...', '...ee..', '....ee.', '..o..ee'],
    balls: 5, shots: 8, stars: [6, 7] },

  { name: 'La forteresse',
    grid: ['XfffffX', 'f.....f', 'f..o..f', 'f.....f', 'XfffffX'],
    balls: 6, shots: 9, stars: [7, 8] },

  { name: 'Trois freres',
    grid: ['.g.g.g.', '.g.g.g.', '.g.g.g.', '...C...'],
    balls: 6, shots: 8, stars: [6, 7] },

  { name: 'Le damier',
    grid: ['8.8.8.8', '.8.8.8.', '8.?.?.8', '.8.8.8.', '8.8.8.8'],
    balls: 6, shots: 9, stars: [7, 8] },

  { name: 'Lagune secrete',
    grid: ['hh...hh', 'h..*..h', '...h...', 'h..o..h', 'hh...hh'],
    balls: 6, shots: 8, stars: [6, 7] },

  { name: 'La cascade',
    grid: ['j.....j', 'jj...jj', 'jjj.jjj', '...W...', 'jj...jj'],
    balls: 7, shots: 9, stars: [7, 8] },

  { name: 'Temple englouti',
    grid: ['..PkQ..', '..kkk..', '.PkkkQ.', '.kkkkk.', '...D...'],
    balls: 7, shots: 9, stars: [7, 8] },

  { name: 'Les gardiens',
    grid: ['Y.....Y', 'Ym...mY', 'Ymm.mmY', '...o...', '..m.m..'],
    balls: 7, shots: 10, stars: [8, 9] },

  { name: 'Spirale',
    grid: ['nnnnnn.', 'n.....n', 'n.nnn.n', 'n.n.n.n', 'n.n...n', 'n.nnnnn'],
    balls: 8, shots: 11, stars: [9, 10] },

  { name: 'Pluie de perles',
    grid: ['p.*.*.p', '.p.p.p.', '*.p.p.*', '.p.p.p.', 'p.*.*.p'],
    balls: 7, shots: 9, stars: [7, 8] },

  { name: 'Le colosse',
    grid: ['..qqq..', '..qqq..', 'Y.qqq.Y', '..qqq..', '.o.C.o.'],
    balls: 8, shots: 10, stars: [8, 9] },

  { name: 'Archipel',
    grid: ['rr...rr', 'rr.o.rr', '...r...', '..rrr..', 'rr...rr', 'rr.F.rr'],
    balls: 8, shots: 11, stars: [9, 10] },

  { name: 'Les cloches',
    grid: ['.s.s.s.', 'sss.sss', '.s.s.s.', '...s...', '..sss..'],
    balls: 8, shots: 10, stars: [8, 9] },

  { name: 'Le labyrinthe',
    grid: ['ttttttt', '......t', 'ttttt.t', 't...t.t', 't.t.t.t', 't.t...t', 't.ttttt'],
    balls: 9, shots: 12, stars: [10, 11] },

  { name: 'Le pantheon',
    grid: ['YvYvYvY', 'v.....v', 'v..?..v', 'v.....v', 'YvvDvvY', '...o...'],
    balls: 9, shots: 12, stars: [10, 11] },
];
