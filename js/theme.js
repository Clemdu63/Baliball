/* Thèmes Bali : lagon en plein jour (clair) et coucher de soleil/nuit (sombre).
   Les couleurs du plateau canvas vivent ici ; les écrans HTML suivent via
   data-theme sur <html> (voir style.css). */

export const THEMES = {
  day: {
    name: 'day',
    page: '#0c1f22',                    // contour de l'écran
    waterTop: '#2fae9f',                // eau au loin
    waterBottom: '#a7ecdc',             // eau claire près de la plage
    waterGlow: null,
    caustic: 'rgba(255,255,255,0.13)',
    sparkle: 'rgba(255,255,255,0.55)',
    sand: '#f0e0b6',
    sandDark: '#e0cc97',
    sandText: '#8a6f4d',
    foam: 'rgba(255,255,255,0.85)',
    tideFoam: 'rgba(255,255,255,0.5)',
    fish: 'rgba(13,74,82,0.22)',
    palm: 'rgba(12,80,64,0.28)',
    hud: '#f4ead0',
    hudSub: 'rgba(244,234,208,0.55)',
    blockText: '#ffffff',
    blockTextHalo: 'rgba(40,30,10,0.45)',
    floater: '#ffffff',
    ghost: 'rgba(80,52,26,0.4)',
    aimDot: '#ffffff',
    aimDotStroke: 'rgba(0,60,60,0.15)',
    coconut: { base: '#7a5230', dark: '#55361c', light: '#a3794e' },
    stones: [
      { kind: 'sand', base: '#dccfae', edge: '#ac9b72', groove: 'rgba(90,75,45,0.22)' },
      { kind: 'moss', base: '#c9c096', edge: '#968c62', groove: 'rgba(70,70,35,0.22)', moss: '#63a84b' },
      { kind: 'volcanic', base: '#6e6a66', edge: '#454140', groove: 'rgba(0,0,0,0.25)', speck: '#383532' },
      { kind: 'gold', base: '#e2b451', edge: '#a87f28', groove: 'rgba(120,80,10,0.25)', shine: 'rgba(255,255,255,0.4)' },
    ],
    armor: { base: '#b03a28', edge: '#6e1c10', groove: 'rgba(0,0,0,0.3)', speck: '#4a140b', crack: '#ffab52' },
  },
  night: {
    name: 'night',
    page: '#070a12',
    waterTop: '#123047',
    waterBottom: '#2c7a80',
    waterGlow: 'rgba(255,138,92,0.16)',  // reflet du couchant en haut de l'eau
    caustic: 'rgba(255,255,255,0.06)',
    sparkle: 'rgba(255,236,190,0.7)',    // reflets de lune
    sand: '#8d7c5c',
    sandDark: '#77684c',
    sandText: '#e8d9b0',
    foam: 'rgba(255,255,255,0.55)',
    tideFoam: 'rgba(255,255,255,0.35)',
    fish: 'rgba(190,225,235,0.14)',
    palm: 'rgba(0,0,0,0.35)',
    hud: '#f4e6c8',
    hudSub: 'rgba(244,230,200,0.5)',
    blockText: '#ffffff',
    blockTextHalo: 'rgba(0,0,0,0.5)',
    floater: '#ffe9b8',
    ghost: 'rgba(255,240,210,0.45)',
    aimDot: '#f2ead2',
    aimDotStroke: 'rgba(0,0,0,0.2)',
    coconut: { base: '#6b4527', dark: '#472c15', light: '#8f6a42' },
    stones: [
      { kind: 'sand', base: '#b2a17b', edge: '#84744f', groove: 'rgba(60,48,25,0.3)' },
      { kind: 'moss', base: '#9aa06f', edge: '#6a7448', groove: 'rgba(40,50,20,0.3)', moss: '#4f9040' },
      { kind: 'volcanic', base: '#55514d', edge: '#33302d', groove: 'rgba(0,0,0,0.3)', speck: '#262421' },
      { kind: 'gold', base: '#d3a13c', edge: '#96701f', groove: 'rgba(110,70,5,0.3)', shine: 'rgba(255,255,255,0.35)' },
    ],
    armor: { base: '#93291a', edge: '#54120a', groove: 'rgba(0,0,0,0.35)', speck: '#3d0d06', crack: '#ff8c3d' },
  },
};

/* Décors achetables : chacun surcharge quelques couleurs du lagon. */
export const DECORS = {
  lagoon: { name: 'Lagon', emoji: '🌊', price: 0, overrides: null },
  rizieres: {
    name: 'Rizières', emoji: '🌾', price: 150,
    overrides: {
      waterTop: '#5f9e4a', waterBottom: '#c3e296',
      sand: '#caa96f', sandDark: '#b8945a', sandText: '#6b5230',
      fish: 'rgba(40,70,30,0.18)', caustic: 'rgba(255,255,255,0.10)',
    },
  },
  volcan: {
    name: 'Volcan', emoji: '🌋', price: 200,
    overrides: {
      // cendre chaude : nettement distinct du bleu d'orage de la Mousson
      waterTop: '#2f2823', waterBottom: '#7a6152',
      sand: '#454247', sandDark: '#39363b', sandText: '#d8cfc2',
      foam: 'rgba(255,255,255,0.5)', sparkle: 'rgba(255,150,60,0.85)',
      fish: 'rgba(230,240,250,0.14)',
    },
  },
  uluwatu: {
    name: 'Uluwatu', emoji: '🌅', price: 250,
    overrides: {
      waterTop: '#274a7c', waterBottom: '#8fc0d4',
      waterGlow: 'rgba(255,138,92,0.28)',
      sand: '#e8c98e', sandDark: '#d5b273', sandText: '#7c5f36',
    },
  },
  biolum: {
    name: 'Bioluminescence', emoji: '🪼', unlock: 8000,
    overrides: {
      waterTop: '#04202c', waterBottom: '#0d4a52',
      caustic: 'rgba(80,255,220,0.08)', sparkle: 'rgba(110,255,225,0.9)',
      sand: '#24343c', sandDark: '#1b2930', sandText: '#bfe8dc',
      fish: 'rgba(140,255,230,0.25)',
      foam: 'rgba(160,255,235,0.55)', tideFoam: 'rgba(160,255,235,0.35)',
    },
  },
  recif: {
    name: 'Récif corail', emoji: '🪸', price: 180,
    overrides: {
      waterTop: '#c96a8d', waterBottom: '#f3b7c0',
      caustic: 'rgba(255,255,255,0.14)', sparkle: 'rgba(255,240,250,0.95)',
      sand: '#f6e3cb', sandDark: '#e3caab', sandText: '#8a5a52',
      fish: 'rgba(120,30,60,0.16)',
    },
  },
  lampions: {
    name: 'Nuit des lampions', emoji: '🏮', price: 220,
    overrides: {
      waterTop: '#1b1030', waterBottom: '#4a2a52',
      waterGlow: 'rgba(255,170,80,0.25)',
      caustic: 'rgba(255,190,120,0.09)', sparkle: 'rgba(255,200,120,0.95)',
      sand: '#3a2a33', sandDark: '#2c2028', sandText: '#f0d8b8',
      foam: 'rgba(255,210,150,0.5)',
    },
  },
  mousson: {
    name: 'Mousson', emoji: '⛈', unlock: 20000,
    overrides: {
      waterTop: '#2c3e46', waterBottom: '#5c7681',
      caustic: 'rgba(255,255,255,0.12)', sparkle: 'rgba(210,235,255,0.9)',
      sand: '#6b6a5e', sandDark: '#585749', sandText: '#e6e2d2',
      fish: 'rgba(20,40,50,0.2)', foam: 'rgba(255,255,255,0.65)',
    },
  },
};

let themeMode = 'auto';
let current = THEMES.day;
let currentPhase = 'jour';
const mq = window.matchMedia('(prefers-color-scheme: dark)');

/* ---- le lagon vivant : phases du jour réelles + météo du jour ----
   En thème Auto, le lagon suit l'heure locale : aube dorée, plein jour,
   couchant embrasé, nuit. Une météo cosmétique, tirée de la date (la
   même pour tous, hors ligne), habille certains jours : brume, mousson,
   pleine lune. Purement visuel — le gameplay ne change jamais. */
export function phaseFor(h) {
  if (h >= 6 && h < 8) return 'aube';
  if (h >= 8 && h < 17.5) return 'jour';
  if (h >= 17.5 && h < 19.5) return 'couchant';
  return 'nuit';
}

const PHASE_BASE = { aube: 'day', jour: 'day', couchant: 'night', nuit: 'night' };

const PHASE_OVERRIDES = {
  aube: {
    page: '#12262b',
    waterTop: '#4b9aa6', waterBottom: '#ffd9bd',
    waterGlow: 'rgba(255,190,140,0.25)',
    sparkle: 'rgba(255,225,185,0.75)',
    caustic: 'rgba(255,235,210,0.14)',
    sand: '#f4debb', sandDark: '#e2c993',
  },
  couchant: {
    page: '#180f16',
    waterTop: '#3c3a63', waterBottom: '#e08a52',
    waterGlow: 'rgba(255,140,60,0.4)',
    sparkle: 'rgba(255,196,120,0.9)',
    caustic: 'rgba(255,200,140,0.10)',
    sand: '#c59c68', sandDark: '#ab8654', sandText: '#5c3f22',
    fish: 'rgba(40,20,30,0.2)',
  },
};

export function weatherFor(d) {
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 2246822507) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
  const r = ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  if (r < 0.12) return 'mousson';
  if (r < 0.28) return 'brume';
  if (r < 0.40) return 'lune';
  return 'clair';
}

export function getWeather() {
  if (window.BALIBALL_FORCE_WEATHER) return window.BALIBALL_FORCE_WEATHER;
  return weatherFor(new Date());
}

export function getPhase() {
  return currentPhase;
}

function resolved() {
  if (themeMode === 'dark') return 'nuit';
  if (themeMode === 'light') return 'jour';
  if (window.BALIBALL_FORCE_PHASE && PHASE_BASE[window.BALIBALL_FORCE_PHASE]) {
    return window.BALIBALL_FORCE_PHASE;
  }
  const d = new Date();
  return phaseFor(d.getHours() + d.getMinutes() / 60);
}

function apply() {
  const phase = resolved();
  currentPhase = phase;
  const base = THEMES[PHASE_BASE[phase]];
  const po = PHASE_OVERRIDES[phase];
  let T = po ? Object.assign({}, base, po) : base;
  // pleine lune : le lagon scintille davantage la nuit
  if (phase === 'nuit' && getWeather() === 'lune') {
    T = Object.assign({}, T, { sparkle: 'rgba(255,240,200,0.95)' });
  }
  current = T;
  document.documentElement.dataset.theme = PHASE_BASE[phase] === 'night' ? 'dark' : 'light';
  // l'accueil choisit son fond et ses calques de ciel sur ces deux attributs
  document.documentElement.dataset.phase = phase;
  document.documentElement.dataset.weather = getWeather();
  try {
    document.dispatchEvent(new CustomEvent('baliball:sky', { detail: { phase, weather: getWeather() } }));
  } catch (e) { /* environnement sans CustomEvent */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = current.page;
}

// la phase se réévalue toute seule : le couchant arrive en pleine partie
setInterval(() => {
  if (themeMode === 'auto') apply();
}, 60000);

export function setThemeMode(m) {
  themeMode = m;
  apply();
}

export function getTheme() {
  return current;
}

/* Palier de pierre selon les PV : grès clair → moussue → volcanique → dorée,
   puis le cycle recommence pour les très grosses valeurs. */
export function stoneStyle(hp) {
  const stones = current.stones;
  return stones[Math.floor((hp - 1) / 4) % stones.length];
}

mq.addEventListener('change', () => {
  if (themeMode === 'auto') apply();
});
