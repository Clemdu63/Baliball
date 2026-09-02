/* Mode Odyssée : la traversée de l'archipel en 6 îles de 8 étapes.
   Chaque étape est une partie à graine fixe avec un objectif :
   - survive : tenir g manches (étoiles selon les noix accumulées)
   - break   : briser g pierres en s tirs max (étoiles selon les tirs)
   - score   : atteindre g points en s tirs max (étoiles selon les tirs)
   - boss    : terrasser un boss (étoiles selon la manche du coup fatal)
   stars = [seuil 3★, seuil 2★]. Chemins d'illustration littéraux :
   la démo mono-fichier les remplace par des data URI. */

export const ODY_ISLANDS = [
  {
    name: 'Plage de Sanur', emoji: '🏖', art: 'art/mode-zen.webp',
    legend: 'Tout commence sur le sable doux de Sanur. Les pêcheurs parlent '
      + 'd\'un masque qui rôde au large — apprends à lancer avant d\'y aller.',
  },
  {
    name: 'Rizières d\'Ubud', emoji: '🌾', art: 'art/mode-classic.webp',
    legend: 'Les terrasses d\'Ubud cachent des pierres têtues. Rangda y jette '
      + 'ses sorts depuis la lisière de la jungle.',
  },
  {
    name: 'Lagon de Nusa', emoji: '🌊', art: 'art/mode-tide.webp',
    legend: 'Les courants du lagon charrient des trésors… et le Naga, dont le '
      + 'mur d\'écailles barre la passe.',
  },
  {
    name: 'Falaises d\'Uluwatu', emoji: '🛕', art: 'art/mode-puzzle.webp',
    legend: 'Au sommet des falaises, Garuda déchaîne les vents. Les temples '
      + 'ne se libèrent qu\'au tir précis.',
  },
  {
    name: 'Volcan Batur', emoji: '🌋', art: 'art/mode-weekly.webp',
    legend: 'La terre gronde : Bedawang, la tortue du monde, remue sous le '
      + 'volcan. Chaque pas peut tout faire trembler.',
  },
  {
    name: 'Île des Esprits', emoji: '🌙', art: 'art/mode-daily.webp',
    legend: 'La dernière île n\'existe sur aucune carte. Le Raksasa y dévore '
      + 'tout — termine l\'Odyssée et deviens une légende du lagon.',
  },
];

export const ODY_STAGES = [
  // ---- Île 1 : Plage de Sanur (douce) ----
  { n: 'Premiers lancers', t: 'break', g: 6, s: 7, stars: [5, 6] },
  { n: 'La marée monte', t: 'survive', g: 3, stars: [4, 3] },
  { n: 'Collier de points', t: 'score', g: 300, s: 7, stars: [4, 7] },
  { n: 'Pluie de noix', t: 'survive', g: 4, stars: [4, 3] },
  { n: 'Le récif', t: 'break', g: 7, s: 8, stars: [5, 7] },
  { n: 'Offrande au lagon', t: 'score', g: 150, s: 8, stars: [5, 6] },
  { n: 'Veille de fête', t: 'survive', g: 5, stars: [5, 4] },
  { n: 'Le masque du large', t: 'boss', b: 'barong', hp: 0.6, balls: 4, stars: [7, 9] },
  // ---- Île 2 : Rizières d'Ubud ----
  { n: 'Terrasses hautes', t: 'break', g: 13, s: 8, balls: 2, stars: [6, 7] },
  { n: 'Le canal', t: 'score', g: 525, s: 8, balls: 2, stars: [6, 7] },
  { n: 'Saison des pluies', t: 'survive', g: 6, balls: 2, stars: [8, 7] },
  { n: 'Pierres moussues', t: 'break', g: 12, s: 9, balls: 2, stars: [7, 8] },
  { n: 'La récolte', t: 'score', g: 525, s: 9, balls: 2, stars: [7, 8] },
  { n: 'Nuit aux lampions', t: 'survive', g: 7, balls: 2, stars: [9, 7] },
  { n: 'L\'épouvantail', t: 'break', g: 14, s: 9, balls: 2, stars: [8, 9] },
  { n: 'La sorcière des bois', t: 'boss', b: 'rangda', hp: 0.8, balls: 6, stars: [8, 10] },
  // ---- Île 3 : Lagon de Nusa ----
  { n: 'La passe', t: 'score', g: 850, s: 9, balls: 3, stars: [7, 8] },
  { n: 'Bancs de sable', t: 'survive', g: 8, balls: 3, stars: [11, 10] },
  { n: 'Chasse aux coraux', t: 'break', g: 21, s: 10, balls: 3, stars: [8, 10] },
  { n: 'Courant traître', t: 'score', g: 1100, s: 10, balls: 3, stars: [8, 9] },
  { n: 'Îlots jumeaux', t: 'survive', g: 9, balls: 3, stars: [11, 10] },
  { n: 'Le grand bleu', t: 'break', g: 20, s: 10, balls: 3, stars: [9, 10] },
  { n: 'Marée d\'équinoxe', t: 'score', g: 3400, s: 11, balls: 3, stars: [10, 11] },
  { n: 'Le serpent des passes', t: 'boss', b: 'naga', hp: 1, balls: 8, stars: [6, 8] },
  // ---- Île 4 : Falaises d'Uluwatu ----
  { n: 'Sentier des singes', t: 'survive', g: 10, balls: 4, stars: [14, 13] },
  { n: 'Escalier de pierre', t: 'break', g: 19, s: 11, balls: 4, stars: [10, 11] },
  { n: 'Vents contraires', t: 'score', g: 1900, s: 11, balls: 4, stars: [9, 11] },
  { n: 'Corniche étroite', t: 'survive', g: 11, balls: 4, stars: [14, 13] },
  { n: 'Temple suspendu', t: 'break', g: 23, s: 11, balls: 4, stars: [10, 11] },
  { n: 'Danse du kecak', t: 'score', g: 3300, s: 12, balls: 4, stars: [10, 12] },
  { n: 'Falaise sud', t: 'break', g: 26, s: 12, balls: 4, stars: [11, 12] },
  { n: 'L\'aigle des falaises', t: 'boss', b: 'garuda', hp: 1.2, balls: 8, stars: [7, 9] },
  // ---- Île 5 : Volcan Batur ----
  { n: 'Cendres chaudes', t: 'survive', g: 12, balls: 5, stars: [18, 16] },
  { n: 'Coulée noire', t: 'break', g: 28, s: 12, balls: 5, stars: [11, 12] },
  { n: 'Fumerolles', t: 'score', g: 2350, s: 12, balls: 5, stars: [10, 12] },
  { n: 'Lac de cratère', t: 'survive', g: 13, balls: 5, stars: [19, 18] },
  { n: 'Roches ardentes', t: 'break', g: 28, s: 13, balls: 5, stars: [12, 13] },
  { n: 'L\'éruption', t: 'score', g: 3500, s: 13, balls: 5, stars: [12, 13] },
  { n: 'La grande secousse', t: 'survive', g: 14, balls: 5, stars: [20, 18] },
  { n: 'La tortue du monde', t: 'boss', b: 'bedawang', hp: 1.4, balls: 8, stars: [8, 10] },
  // ---- Île 6 : Île des Esprits ----
  { n: 'Brume éternelle', t: 'survive', g: 15, balls: 6, stars: [21, 19] },
  { n: 'Forêt d\'ombres', t: 'break', g: 28, s: 13, balls: 6, stars: [12, 13] },
  { n: 'Feux follets', t: 'score', g: 3600, s: 13, balls: 6, stars: [11, 13] },
  { n: 'Le gué des âmes', t: 'survive', g: 16, balls: 6, stars: [23, 21] },
  { n: 'Autel renversé', t: 'break', g: 33, s: 14, balls: 6, stars: [13, 14] },
  { n: 'La pleine lune', t: 'score', g: 4200, s: 14, balls: 6, stars: [13, 14] },
  { n: 'Veillée d\'armes', t: 'survive', g: 18, balls: 6, stars: [24, 23] },
  { n: 'Le dévoreur', t: 'boss', b: 'raksasa', hp: 1.7, balls: 8, stars: [10, 12] },
];

/* Graine fixe par étape : la même partie pour tous, rejouable à l'identique. */
export function odysseySeed(idx) {
  return (90101 + idx * 7919) >>> 0;
}

/* Libellé court de l'objectif, pour le HUD et les écrans. */
export function odysseyGoalText(def) {
  if (def.t === 'survive') return 'Tiens ' + def.g + ' manches';
  if (def.t === 'break') return 'Brise ' + def.g + ' pierres en ' + def.s + ' tirs';
  if (def.t === 'score') return def.g + ' pts en ' + def.s + ' tirs';
  return 'Terrasse le boss';
}
