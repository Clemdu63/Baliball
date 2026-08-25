/* Stockage : localStorage peut être bloqué (navigation privée, iframe…),
   le jeu doit toujours fonctionner sans. */

export const KEYS = {
  SAVE: 'baliball.save.v1',
  ZEN_SAVE: 'baliball.zensave.v1',
  BEST: 'baliball.best.v1',
  BEST_SCORE: 'baliball.bestscore.v1',
  TIDE_BEST: 'baliball.tidebest.v1',
  PUZZLE: 'baliball.puzzle.v1',
  PEARLS: 'baliball.pearls.v1',
  SHOP: 'baliball.shop.v1',
  STATS: 'baliball.stats.v1',
  DAILY: 'baliball.daily.v1',
  WEEKLY: 'baliball.weekly.v1',
  MISSIONS: 'baliball.missions.v1',
  TUTO: 'baliball.tuto.v1',
  NAME: 'baliball.name.v1',
  UID: 'baliball.uid.v1',
  TOUR_SAVE: 'baliball.toursave.v1',
  TOUR_NET: 'baliball.tournet.v1',
  HISTORY: 'baliball.history.v1',
  SETTINGS: 'baliball.settings.v1',
};

export function loadJSON(key, fallback) {
  try {
    const raw = store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* pas de stockage */ } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { /* pas de stockage */ } },
};

const DEFAULTS = {
  theme: 'auto',   // auto | light | dark
  sound: true,
  ambience: true,  // ressac en fond
  fast: false,     // vitesse des balles
  lefty: false,    // boutons en jeu à gauche
  calm: false,     // réduire les animations (en plus du réglage système)
};

function loadSettings() {
  try {
    const raw = store.get(KEYS.SETTINGS);
    return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

/* Objet partagé : les modules le lisent en direct, main.js le modifie. */
export const settings = loadSettings();

export function persistSettings() {
  store.set(KEYS.SETTINGS, JSON.stringify(settings));
}
