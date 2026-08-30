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
  { n: 'Premiers lancers', t: 'break', g: 10, s: 7, stars: [4, 5] },
  { n: 'La marée monte', t: 'survive', g: 3, stars: [4, 3] },
  { n: 'Collier de points', t: 'score', g: 300, s: 7, stars: [4, 5] },
  { n: 'Pluie de noix', t: 'survive', g: 4, stars: [5, 4] },
  { n: 'Le récif', t: 'break', g: 18, s: 8, stars: [5, 6] },
  { n: 'Offrande au lagon', t: 'score', g: 600, s: 8, stars: [5, 6] },
  { n: 'Veille de fête', t: 'survive', g: 5, stars: [6, 4] },
  { n: 'Le masque du large', t: 'boss', b: 'barong', hp: 0.6, stars: [4, 6] },
  // ---- Île 2 : Rizières d'Ubud ----
  { n: 'Terrasses hautes', t: 'break', g: 22, s: 8, stars: [5, 6] },
  { n: 'Le canal', t: 'score', g: 900, s: 8, stars: [5, 6] },
  { n: 'Saison des pluies', t: 'survive', g: 6, stars: [7, 5] },
  { n: 'Pierres moussues', t: 'break', g: 28, s: 9, stars: [6, 7] },
  { n: 'La récolte', t: 'score', g: 1300, s: 9, stars: [6, 7] },
  { n: 'Nuit aux lampions', t: 'survive', g: 7, stars: [8, 6] },
  { n: 'L\'épouvantail', t: 'break', g: 34, s: 9, stars: [6, 8] },
  { n: 'La sorcière des bois', t: 'boss', b: 'rangda', hp: 0.8, stars: [5, 7] },
  // ---- Île 3 : Lagon de Nusa ----
  { n: 'La passe', t: 'score', g: 1700, s: 9, stars: [6, 7] },
  { n: 'Bancs de sable', t: 'survive', g: 8, stars: [9, 7] },
  { n: 'Chasse aux coraux', t: 'break', g: 40, s: 10, stars: [7, 8] },
  { n: 'Courant traître', t: 'score', g: 2200, s: 10, stars: [7, 8] },
  { n: 'Îlots jumeaux', t: 'survive', g: 9, stars: [10, 8] },
  { n: 'Le grand bleu', t: 'break', g: 46, s: 10, stars: [7, 9] },
  { n: 'Marée d\'équinoxe', t: 'score', g: 2800, s: 11, stars: [8, 9] },
  { n: 'Le serpent des passes', t: 'boss', b: 'naga', hp: 1, stars: [6, 8] },
  // ---- Île 4 : Falaises d'Uluwatu ----
  { n: 'Sentier des singes', t: 'survive', g: 10, stars: [11, 9] },
  { n: 'Escalier de pierre', t: 'break', g: 52, s: 11, stars: [8, 9] },
  { n: 'Vents contraires', t: 'score', g: 3400, s: 11, stars: [8, 10] },
  { n: 'Corniche étroite', t: 'survive', g: 11, stars: [12, 9] },
  { n: 'Temple suspendu', t: 'break', g: 58, s: 11, stars: [8, 10] },
  { n: 'Danse du kecak', t: 'score', g: 4000, s: 12, stars: [9, 10] },
  { n: 'Falaise sud', t: 'break', g: 64, s: 12, stars: [9, 11] },
  { n: 'L\'aigle des falaises', t: 'boss', b: 'garuda', hp: 1.2, stars: [6, 9] },
  // ---- Île 5 : Volcan Batur ----
  { n: 'Cendres chaudes', t: 'survive', g: 12, stars: [13, 10] },
  { n: 'Coulée noire', t: 'break', g: 70, s: 12, stars: [9, 11] },
  { n: 'Fumerolles', t: 'score', g: 4800, s: 12, stars: [9, 11] },
  { n: 'Lac de cratère', t: 'survive', g: 13, stars: [14, 11] },
  { n: 'Roches ardentes', t: 'break', g: 78, s: 13, stars: [10, 12] },
  { n: 'L\'éruption', t: 'score', g: 5600, s: 13, stars: [10, 12] },
  { n: 'La grande secousse', t: 'survive', g: 14, stars: [15, 12] },
  { n: 'La tortue du monde', t: 'boss', b: 'bedawang', hp: 1.4, stars: [7, 10] },
  // ---- Île 6 : Île des Esprits ----
  { n: 'Brume éternelle', t: 'survive', g: 15, stars: [16, 13] },
  { n: 'Forêt d\'ombres', t: 'break', g: 86, s: 13, stars: [10, 12] },
  { n: 'Feux follets', t: 'score', g: 6500, s: 13, stars: [10, 12] },
  { n: 'Le gué des âmes', t: 'survive', g: 16, stars: [17, 14] },
  { n: 'Autel renversé', t: 'break', g: 95, s: 14, stars: [11, 13] },
  { n: 'La pleine lune', t: 'score', g: 7500, s: 14, stars: [11, 13] },
  { n: 'Veillée d\'armes', t: 'survive', g: 18, stars: [18, 15] },
  { n: 'Le dévoreur', t: 'boss', b: 'raksasa', hp: 1.7, stars: [8, 11] },
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
