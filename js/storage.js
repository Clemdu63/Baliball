/* Stockage : localStorage peut être bloqué (navigation privée, iframe…),
   le jeu doit toujours fonctionner sans. */

export const KEYS = {
  SAVE: 'baliball.save.v1',
  BEST: 'baliball.best.v1',
  SETTINGS: 'baliball.settings.v1',
};

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* pas de stockage */ } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { /* pas de stockage */ } },
};

const DEFAULTS = {
  theme: 'auto',   // auto | light | dark
  sound: true,
  fast: false,     // vitesse des balles
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
