/* Thèmes du plateau (canvas) + synchronisation du thème CSS (data-theme). */

export const THEMES = {
  light: {
    page: '#101014',
    board: '#e9e7df',
    hud: '#2b2b28',
    hudSub: '#8a8a85',
    ball: '#ffffff',
    ballStroke: 'rgba(0,0,0,0.15)',
    aimDot: '#ffffff',
    aimDotStroke: 'rgba(0,0,0,0.12)',
    danger: 'rgba(224,68,122,0.25)',
    blockText: '#ffffff',
    bonus: '#ffffff',
    bonusHalo: 'rgba(0,0,0,0.15)',
    floater: '#33a82e',
    ghost: 'rgba(43,43,40,0.5)',
    palette: ['#43b929', '#8bd52c', '#f0a63c', '#1f7fe0', '#7a4de0', '#e0447a'],
  },
  dark: {
    page: '#08080a',
    board: '#17171c',
    hud: '#e8e8e4',
    hudSub: '#6f6f76',
    ball: '#ffffff',
    ballStroke: 'rgba(255,255,255,0.14)',
    aimDot: '#e8e8e4',
    aimDotStroke: 'rgba(255,255,255,0.1)',
    danger: 'rgba(247,95,146,0.4)',
    blockText: '#ffffff',
    bonus: '#e8e8e4',
    bonusHalo: 'rgba(255,255,255,0.12)',
    floater: '#52d332',
    ghost: 'rgba(232,232,228,0.45)',
    palette: ['#52d332', '#a8e93e', '#ffb648', '#3b96f5', '#9a6ef5', '#f75f92'],
  },
};

let mode = 'auto';
let current = THEMES.light;
const mq = window.matchMedia('(prefers-color-scheme: dark)');

function resolved() {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return mq.matches ? 'dark' : 'light';
}

function apply() {
  const name = resolved();
  current = THEMES[name];
  document.documentElement.dataset.theme = name;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = current.page;
}

export function setThemeMode(m) {
  mode = m;
  apply();
}

export function getTheme() {
  return current;
}

mq.addEventListener('change', () => {
  if (mode === 'auto') apply();
});
