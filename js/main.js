/* Écrans, modes de jeu, boutique, tournoi, réglages et démarrage. */

import { settings, persistSettings, KEYS, loadJSON, store } from './storage.js';
import { setThemeMode, DECORS } from './theme.js';
import { initAudio, syncAmbience, sfx } from './audio.js';
import { LEVELS } from './levels.js';
import { netPublish, netSubscribe, netBeacon, myUid } from './net.js';
import * as game from './game.js';

const APP_VERSION = '3.5.2';

const $ = (id) => document.getElementById(id);
const SCREENS = ['screen-home', 'screen-welcome', 'screen-modes', 'screen-levels', 'screen-settings',
  'screen-over', 'screen-win', 'screen-shop', 'screen-progress', 'screen-legend',
  'screen-tournoi', 'screen-online-setup', 'screen-lobby', 'screen-standings',
  'screen-offline-menu', 'screen-tournoi-host', 'screen-tournoi-join',
  'screen-countdown', 'screen-confirm', 'screen-spectate'];

setThemeMode(settings.theme);

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btn-home').classList.add('hidden');
  $('btn-restart').classList.add('hidden');
}

function showGame() {
  for (const s of SCREENS) $(s).classList.add('hidden');
  $('btn-home').classList.remove('hidden');
  $('btn-restart').classList.remove('hidden');
  if (typeof syncEmojiButton === 'function') syncEmojiButton();
}

/* Derniers paramètres de partie : sert à REJOUER et à RECOMMENCER
   (indispensable pour rejouer la même graine en Défi du jour / Tournoi). */
let lastStart = { mode: 'classic', level: 0, seed: null };

function startGame(mode, level = 0, seed = null) {
  initAudio();
  lastStart = { mode, level, seed };
  game.newGame(mode, level, seed);
  showGame();
}

function refreshHome() {
  const best = game.getBest();
  const bestScore = game.getBestScore();
  const tideBest = parseInt(store.get(KEYS.TIDE_BEST) || '0', 10) || 0;
  const parts = [];
  if (best > 0) parts.push('Classique : manche ' + best + ' · ' + bestScore + ' pts');
  if (tideBest > 0) parts.push('Marée : ' + tideBest + ' pts');
  $('home-best').textContent = parts.join(' — ');

  const missions = game.getMissions();
  const doneCount = missions.filter((m) => m.done).length;
  $('home-missions').textContent = doneCount >= missions.length
    ? '📜 Missions du jour accomplies ! ✅'
    : '📜 Missions du jour : ' + doneCount + '/' + missions.length
      + ' — à suivre dans Progrès';

  const saved = game.savedMode();
  const resumeBtn = $('btn-resume');
  resumeBtn.style.display = saved ? '' : 'none';
  resumeBtn.textContent = saved === 'zen' ? 'REPRENDRE (PLAGE)' : 'REPRENDRE';

  // tournoi interrompu (déconnexion, fermeture) : proposer d'y retourner
  const tourSave = loadJSON(KEYS.TOUR_SAVE, null);
  const fresh = tourSave && tourSave.ts && Date.now() - tourSave.ts < 2 * 3600 * 1000;
  $('btn-rejoin').style.display = fresh ? '' : 'none';
}

// ---- accueil ----
$('btn-play').addEventListener('click', () => show('screen-modes'));

$('btn-resume').addEventListener('click', () => {
  initAudio();
  const saved = game.savedMode();
  if (saved && game.resumeGame(saved)) {
    lastStart = { mode: saved, level: 0, seed: null };
  } else {
    lastStart = { mode: 'classic', level: 0, seed: null };
    game.newGame('classic');
  }
  showGame();
});

$('btn-settings').addEventListener('click', () => show('screen-settings'));

// ---- choix du mode ----
function startOrResume(m) {
  initAudio();
  if (game.savedMode() === m && game.resumeGame(m)) {
    lastStart = { mode: m, level: 0, seed: null };
    showGame();
    return;
  }
  startGame(m);
}

$('btn-mode-classic').addEventListener('click', () => startOrResume('classic'));
$('btn-mode-tide').addEventListener('click', () => startGame('tide'));
$('btn-mode-zen').addEventListener('click', () => startOrResume('zen'));
$('btn-mode-puzzle').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-modes-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- défi du jour ----
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

$('btn-mode-daily').addEventListener('click', () => startGame('daily', 0, dailySeed()));

// ---- défi de la semaine (mutateur affiché sur la carte du mode) ----
$('btn-mode-weekly').addEventListener('click', () => startGame('weekly'));
{
  const wi = game.weeklyInfo();
  $('weekly-desc').textContent = 'Cette semaine : ' + wi.name + ' — ' + wi.desc
    + '. Même partie toute la semaine.';
}

// ---- tournoi entre amis : hors ligne (code) et en ligne (suivi direct) ----
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newTournoiCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function codeSeed(code) {
  let h = 2166136261;
  for (const ch of code) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function validCode(code) {
  return code.length === 4 && ![...code].some((c) => !CODE_ALPHABET.includes(c));
}

let counting = false;

function startCountdown(seed, opts) {
  if (counting) return;
  counting = true;
  initAudio();
  game.setTournamentOptions(opts || { fast: settings.fast, target: null });
  show('screen-countdown');
  let n = 3;
  $('countdown-num').textContent = String(n);
  sfx.newRow();
  const timer = setInterval(() => {
    n -= 1;
    if (n > 0) {
      $('countdown-num').textContent = String(n);
      sfx.newRow();
    } else {
      clearInterval(timer);
      counting = false;
      sfx.bonus();
      startGame('tournament', 0, seed);
      if (net) {
        net.opts = opts || null;
        store.set(KEYS.TOUR_NET, JSON.stringify({
          code: net.code, name: net.name, game: net.game,
          seed, opts: opts || null, ts: Date.now(),
          series: net.series
            ? { n: net.series.n, of: net.series.of, pts: net.series.pts }
            : null,
        }));
        tickerRefresh();
        syncEmojiButton();
      }
    }
  }, 1000);
}

$('btn-mode-tournoi').addEventListener('click', () => show('screen-tournoi'));
$('btn-tournoi-back').addEventListener('click', () => show('screen-modes'));

// -- hors ligne : un code = la même partie, comparaison à la fin --
let tournoiCode = null;

$('btn-tournoi-offline').addEventListener('click', () => show('screen-offline-menu'));
$('btn-offline-back').addEventListener('click', () => show('screen-tournoi'));
$('btn-offline-create').addEventListener('click', () => {
  tournoiCode = newTournoiCode();
  $('tournoi-code').textContent = tournoiCode;
  show('screen-tournoi-host');
});
$('btn-host-back').addEventListener('click', () => show('screen-offline-menu'));
$('btn-host-go').addEventListener('click', () => startCountdown(codeSeed(tournoiCode)));
$('btn-offline-join').addEventListener('click', () => {
  $('join-code').value = '';
  $('join-error').textContent = '';
  show('screen-tournoi-join');
});
$('btn-join-back').addEventListener('click', () => show('screen-offline-menu'));
$('btn-join-go').addEventListener('click', () => {
  const code = $('join-code').value.trim().toUpperCase();
  if (!validCode(code)) {
    $('join-error').textContent = 'Code invalide : 4 lettres/chiffres (sans I, L, O, 0, 1).';
    return;
  }
  startCountdown(codeSeed(code));
});

// -- en ligne : salon ntfy.sh, pseudos, scores en direct --
let net = null;          // {code, name, stop, game, roster:Map, lastPub, lastAnnounce, raceWinner, opts, series}
let lastLeaderUid = null;
let lobbyOpts = { target: null, fast: false, series: 1, sabotage: false, chaos: false };
let lastEmojiSent = 0;
let lastWaveSent = 0;

function teardownNet(announce) {
  if (net && announce) {
    netPublish(net.code, { t: 'leave', uid: myUid, name: net.name });
  }
  if (net && net.stop) net.stop();
  net = null;
  lastLeaderUid = null;
  spectateUid = null;
  syncSeriesButton();
  $('live-ticker').classList.add('hidden');
  $('live-toasts').innerHTML = '';
  syncEmojiButton();
}

/* Réactions émojis en direct pendant la partie. */
const EMOJIS = ['😂', '🔥', '🥥', '💀', '👏', '🤙', '😱'];

function syncEmojiButton() {
  const on = !!(net && net.game && game.getMode() === 'tournament' && game.isPlaying());
  $('btn-emoji').classList.toggle('hidden', !on);
  if (!on) $('emoji-bar').classList.add('hidden');
}

function spawnEmojiFloat(name, emoji) {
  const div = document.createElement('div');
  div.className = 'emoji-float';
  div.style.left = (15 + Math.random() * 60) + '%';
  div.innerHTML = '<span class="emoji-big">' + emoji + '</span><span class="emoji-who">'
    + name + '</span>';
  $('emoji-floats').appendChild(div);
  setTimeout(() => div.remove(), 2600);
}

function toast(text) {
  const box = $('live-toasts');
  while (box.children.length >= 3) box.removeChild(box.firstChild);
  const div = document.createElement('div');
  div.className = 'live-toast';
  div.textContent = text;
  box.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function upsert(uid, patch) {
  const cur = net.roster.get(uid) || { name: '?', score: 0, round: 0, over: false };
  Object.assign(cur, patch);
  net.roster.set(uid, cur);
  return cur;
}

function rosterSorted() {
  return [...net.roster.entries()].sort((a, b) => b[1].score - a[1].score);
}

function tickerRefresh() {
  if (!net || !net.game) return;
  const sorted = rosterSorted();
  if (!sorted.length) return;
  const [uid, lead] = sorted[0];
  const playing = [...net.roster.values()].filter((p) => !p.over).length;
  const ticker = $('live-ticker');
  ticker.textContent = '🥇 ' + (uid === myUid ? 'Toi' : lead.name) + ' · ' + lead.score
    + '   ·   ' + playing + ' 🎮';
  if (game.getMode() === 'tournament' && game.isPlaying()) ticker.classList.remove('hidden');
  if (uid !== lastLeaderUid && lastLeaderUid !== null && lead.score > 0) {
    toast(uid === myUid ? 'Tu passes en tête !' : '« ' + lead.name + ' » est en tête !');
  }
  lastLeaderUid = uid;
  if (!$('screen-standings').classList.contains('hidden')) renderStandings();
}

function renderLobby() {
  if (!net) return;
  $('lobby-players').innerHTML = [...net.roster.values()]
    .map((p) => '<div class="row"><span>' + (p.name === net.name ? p.name + ' (toi)' : p.name)
      + '</span><b>prêt</b></div>')
    .join('');
}

function renderStandings() {
  if (!net) return;
  const sorted = rosterSorted();
  const medals = ['🥇', '🥈', '🥉'];
  $('standings-list').innerHTML = sorted.map(([uid, p], i) => {
    const me = uid === myUid;
    const watch = !me && !p.over
      ? ' <button class="watch-btn" data-watch="' + uid + '">👁 regarder</button>'
      : '';
    const serie = net.series
      ? ' · soirée : ' + (net.series.pts[uid] || 0) + ' pt' + ((net.series.pts[uid] || 0) > 1 ? 's' : '')
      : '';
    return '<div class="row' + (me ? ' standing-row-me' : '') + '"><span>'
      + (medals[i] || (i + 1) + '.') + ' ' + p.name + (me ? ' (toi)' : '') + watch
      + '</span><b>' + p.score + ' pts · ' + (p.over ? 'terminé' : 'en jeu 🎮') + serie + '</b></div>';
  }).join('');
  const mine = net.roster.get(myUid);
  if (mine) {
    const prefix = net.series ? 'Manche ' + net.series.n + '/' + net.series.of + ' — ' : '';
    $('standings-me').textContent = prefix + 'Ton score : ' + mine.score + ' pts — manche ' + mine.round;
  }
  const banner = $('standings-banner');
  if (net.seriesWinner) {
    banner.textContent = '🏆 ' + (net.seriesWinner === 'Toi' ? 'Tu remportes' : '« ' + net.seriesWinner + ' » remporte') + ' la soirée !';
    banner.classList.remove('hidden');
  } else if (net.raceWinner) {
    banner.textContent = '🏆 ' + (net.raceWinner === 'Toi' ? 'Tu remportes' : '« ' + net.raceWinner + ' » remporte') + ' la course !';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
  syncSeriesButton();
}

/* Soirée en manches : quand tous les joueurs ont terminé la partie en
   cours, chacun attribue les points (3/2/1) — mêmes données, même calcul. */
function maybeCloseSeriesGame() {
  if (!net || !net.series || !net.game) return;
  net.series.closed = net.series.closed || {};
  if (net.series.closed[net.game]) return;
  const entries = [...net.roster.entries()];
  if (!entries.length || entries.some(([, p]) => !p.over)) return;
  net.series.closed[net.game] = true;
  // départage stable par identifiant : même classement sur tous les téléphones
  const ranked = entries.sort((a, b) => b[1].score - a[1].score
    || (a[0] < b[0] ? -1 : 1));
  ranked.forEach(([uid], i) => {
    const gain = i === 0 ? 3 : i === 1 ? 2 : 1;
    net.series.pts[uid] = (net.series.pts[uid] || 0) + gain;
  });
  if (net.series.n >= net.series.of) {
    const best = [...net.roster.keys()]
      .sort((a, b) => (net.series.pts[b] || 0) - (net.series.pts[a] || 0))[0];
    net.seriesWinner = best === myUid ? 'Toi' : (net.roster.get(best) || { name: '?' }).name;
    sfx.milestone();
  } else {
    toast('Manche ' + net.series.n + '/' + net.series.of + ' terminée !');
  }
  renderStandings();
}

/* Le bouton du classement change de rôle pendant une soirée en manches. */
function syncSeriesButton() {
  const btn = $('btn-standings-lobby');
  if (net && net.series && !net.seriesWinner) {
    const closed = net.series.closed && net.series.closed[net.game];
    btn.textContent = closed
      ? 'MANCHE SUIVANTE (' + (net.series.n + 1) + '/' + net.series.of + ') ▶'
      : 'EN ATTENTE DES AUTRES…';
    btn.disabled = !closed;
  } else {
    btn.textContent = 'RETOUR AU SALON';
    btn.disabled = false;
  }
}

function onNetMsg(d, age) {
  if (!net || !d || !d.t) return;
  if (d.t === 'join') {
    if (age > 300) return; // vieux message rejoué : joueur sûrement parti
    upsert(d.uid, { name: d.name });
    renderLobby();
    // se ré-annoncer pour que les arrivants voient tout le monde
    if (d.uid !== myUid && age < 10 && Date.now() - net.lastAnnounce > 15000) {
      net.lastAnnounce = Date.now();
      netPublish(net.code, { t: 'join', uid: myUid, name: net.name });
    }
  } else if (d.t === 'leave') {
    if (d.uid === myUid) return;
    if (net.roster.delete(d.uid)) {
      renderLobby();
      if (age < 20) toast('« ' + d.name + ' » a quitté le salon');
      tickerRefresh();
    }
  } else if (d.t === 'emoji') {
    if (d.uid !== myUid && age < 15 && EMOJIS.includes(d.e)) {
      spawnEmojiFloat(d.name, d.e);
      sfx.pearl();
    }
  } else if (d.t === 'start') {
    if (age < 20 && !counting && !(game.getMode() === 'tournament' && game.isPlaying())) {
      net.game = d.game;
      net.raceWinner = null;
      net.seriesWinner = null;
      net.series = d.series
        ? { n: d.series.n, of: d.series.of, pts: d.series.pts || {}, closed: {} }
        : null;
      for (const p of net.roster.values()) {
        p.score = 0; p.round = 0; p.over = false;
      }
      lastLeaderUid = null;
      startCountdown(d.seed, d.opts);
    }
  } else if (d.t === 'wave') {
    // sabotage amical : un combo adverse fait surgir une pierre blindée
    if (d.game === net.game && d.uid !== myUid && age < 15
      && game.getMode() === 'tournament' && game.isPlaying()) {
      game.dropSurpriseStone();
      toast('🌊 « ' + d.name + ' » t\'envoie une vague !');
    }
  } else if (d.t === 'score') {
    if (d.game !== net.game) return;
    upsert(d.uid, { name: d.name, score: d.score, round: d.round, board: d.board });
    tickerRefresh();
    if (spectateUid === d.uid) renderSpectate();
  } else if (d.t === 'over') {
    if (d.game !== net.game) return;
    upsert(d.uid, { name: d.name, score: d.score, round: d.round, over: true, board: d.board || (net.roster.get(d.uid) || {}).board });
    if (spectateUid === d.uid) {
      // le joueur observé vient de terminer : petit message puis retour au classement
      toast('« ' + d.name + ' » a terminé — retour au classement');
      spectateUid = null;
      renderStandings();
      show('screen-standings');
    }
    if (d.won && !net.raceWinner) {
      net.raceWinner = d.uid === myUid ? 'Toi' : d.name;
      if (age < 30) {
        toast('🏆 « ' + d.name + ' » remporte la course !');
        sfx.milestone();
      }
      // la course est finie : tout le monde s'arrête
      if (d.uid !== myUid && game.getMode() === 'tournament' && game.isPlaying()) {
        game.forceGameOver('caught');
      }
    } else if (d.uid !== myUid && age < 20) {
      toast('« ' + d.name + ' » a terminé : ' + d.score + ' pts');
      sfx.wall();
    }
    tickerRefresh();
    maybeCloseSeriesGame();
  }
}

function enterLobby(code, name) {
  teardownNet();
  net = {
    code, name, roster: new Map(), game: null,
    lastPub: 0, lastAnnounce: Date.now(), stop: null, raceWinner: null,
  };
  upsert(myUid, { name });
  $('lobby-code').textContent = code;
  $('lobby-status').textContent = 'Connexion au salon…';
  renderLobby();
  net.stop = netSubscribe(code, onNetMsg, (s) => {
    if (!net) return;
    if (!$('screen-lobby').classList.contains('hidden')) {
      $('lobby-status').textContent = s === 'ok'
        ? 'Connecté ! Dicte le code aux autres, puis lancez.'
        : 'Connexion au salon instable…';
    }
  });
  netPublish(code, { t: 'join', uid: myUid, name });
  show('screen-lobby');
}

$('btn-rejoin').addEventListener('click', () => {
  initAudio();
  const ctx = loadJSON(KEYS.TOUR_NET, null);
  if (ctx && ctx.code && Date.now() - (ctx.ts || 0) < 2 * 3600 * 1000) {
    // en ligne : on se réabonne au salon, l'historique du sujet reconstruit
    // le classement, et notre identité persistante évite les doublons
    teardownNet();
    net = {
      code: ctx.code, name: ctx.name, roster: new Map(), game: ctx.game,
      lastPub: 0, lastAnnounce: Date.now(), stop: null, raceWinner: null,
      opts: ctx.opts || null,
      series: ctx.series
        ? { n: ctx.series.n, of: ctx.series.of, pts: ctx.series.pts || {}, closed: {} }
        : null,
    };
    upsert(myUid, { name: ctx.name });
    net.stop = netSubscribe(ctx.code, onNetMsg, () => {});
    netPublish(ctx.code, { t: 'join', uid: myUid, name: ctx.name });
    game.setTournamentOptions(ctx.opts || { fast: false, target: null });
  }
  if (game.resumeGame('tournament')) {
    lastStart = { mode: 'tournament', level: 0, seed: null };
    showGame();
    if (net) {
      tickerRefresh();
      syncEmojiButton();
      toast('Te revoilà dans la course !');
    }
  } else {
    teardownNet();
    store.remove(KEYS.TOUR_SAVE);
    store.remove(KEYS.TOUR_NET);
    refreshHome();
  }
});

$('btn-tournoi-online').addEventListener('click', () => {
  $('player-name').value = store.get(KEYS.NAME) || '';
  $('online-error').textContent = '';
  show('screen-online-setup');
});
$('btn-online-back').addEventListener('click', () => {
  teardownNet(true);
  show('screen-tournoi');
});

function readName() {
  const name = $('player-name').value.trim().slice(0, 12);
  if (!name) {
    $('online-error').textContent = 'Choisis un pseudo !';
    return null;
  }
  store.set(KEYS.NAME, name);
  return name;
}

$('btn-online-create').addEventListener('click', () => {
  const name = readName();
  if (!name) return;
  enterLobby(newTournoiCode(), name);
});
$('btn-online-join').addEventListener('click', () => {
  const name = readName();
  if (!name) return;
  const code = $('online-code').value.trim().toUpperCase();
  if (!validCode(code)) {
    $('online-error').textContent = 'Code invalide : 4 lettres/chiffres (sans I, L, O, 0, 1).';
    return;
  }
  enterLobby(code, name);
});

function bindLobbyOpt(containerId, key, parse) {
  const box = $(containerId);
  const sync = () => {
    for (const btn of box.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === String(lobbyOpts[key]));
    }
  };
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    lobbyOpts[key] = parse(btn.dataset.value);
    sync();
  });
  sync();
}

bindLobbyOpt('seg-goal', 'target', (v) => (v === 'null' ? null : parseInt(v, 10)));
bindLobbyOpt('seg-tspeed', 'fast', (v) => v === 'true');
bindLobbyOpt('seg-series', 'series', (v) => parseInt(v, 10));
bindLobbyOpt('seg-sabotage', 'sabotage', (v) => v === 'true');
bindLobbyOpt('seg-chaos', 'chaos', (v) => v === 'true');

$('btn-lobby-start').addEventListener('click', () => {
  if (!net) return;
  netPublish(net.code, {
    t: 'start', uid: myUid,
    seed: Math.floor(Math.random() * 2 ** 31),
    game: Math.random().toString(36).slice(2, 8),
    opts: {
      fast: lobbyOpts.fast, target: lobbyOpts.target,
      sabotage: lobbyOpts.sabotage, chaos: lobbyOpts.chaos,
    },
    series: lobbyOpts.series > 1 ? { n: 1, of: lobbyOpts.series, pts: {} } : null,
  });
  $('lobby-status').textContent = 'Lancement…';
});

// ---- réactions émojis ----
function sendEmoji(emoji) {
  if (!net || !net.game) return;
  if (Date.now() - lastEmojiSent < 2500) return;
  lastEmojiSent = Date.now();
  spawnEmojiFloat('Toi', emoji);
  netPublish(net.code, { t: 'emoji', uid: myUid, name: net.name, e: emoji });
}

$('btn-emoji').addEventListener('click', () => {
  $('emoji-bar').classList.toggle('hidden');
});
$('emoji-bar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  $('emoji-bar').classList.add('hidden');
  sendEmoji(btn.dataset.e);
});
document.querySelector('.spectate-emojis').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) sendEmoji(btn.dataset.e);
});

// quitter la page en plein salon : on prévient les autres
window.addEventListener('pagehide', () => {
  if (net) netBeacon(net.code, { t: 'leave', uid: myUid, name: net.name });
});
$('btn-lobby-back').addEventListener('click', () => {
  teardownNet(true);
  show('screen-tournoi');
});

// ---- mode spectateur : observer un joueur encore en jeu ----
let spectateUid = null;

function renderSpectate() {
  if (!net || !spectateUid) return;
  const p = net.roster.get(spectateUid);
  if (!p) return;
  $('spectate-title').textContent = '👁 ' + p.name.toUpperCase();
  $('spectate-info').textContent = p.score + ' pts · manche ' + p.round
    + (p.board && p.board.balls ? ' · ' + p.board.balls + ' 🥥' : '')
    + ' — le plateau se met à jour à chaque tir';
  if (p.board) {
    game.drawBoardSnapshot($('spectate-canvas'), p.board);
  }
}

$('standings-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-watch]');
  if (!btn) return;
  spectateUid = btn.dataset.watch;
  renderSpectate();
  show('screen-spectate');
});

$('btn-spectate-back').addEventListener('click', () => {
  spectateUid = null;
  renderStandings();
  show('screen-standings');
});

$('btn-standings-lobby').addEventListener('click', () => {
  if (!net) { show('screen-tournoi'); return; }
  // soirée en cours : ce bouton lance la manche suivante pour tout le monde
  if (net.series && !net.seriesWinner && net.series.closed && net.series.closed[net.game]) {
    netPublish(net.code, {
      t: 'start', uid: myUid,
      seed: Math.floor(Math.random() * 2 ** 31),
      game: Math.random().toString(36).slice(2, 8),
      opts: net.opts || { fast: false, target: null },
      series: { n: net.series.n + 1, of: net.series.of, pts: net.series.pts },
    });
    return;
  }
  net.series = null;
  net.seriesWinner = null;
  $('lobby-status').textContent = 'Prêts pour une revanche ?';
  renderLobby();
  show('screen-lobby');
});
$('btn-standings-home').addEventListener('click', () => {
  teardownNet(true);
  refreshHome();
  show('screen-home');
});

// ---- niveaux du mode Temples ----
function renderLevels() {
  const prog = loadJSON(KEYS.PUZZLE, { unlocked: 1, stars: {} });
  const grid = $('levels-grid');
  grid.innerHTML = '';
  let earned = 0;
  LEVELS.forEach((def, i) => {
    const unlocked = i < (prog.unlocked || 1);
    const stars = prog.stars[i] || 0;
    earned += stars;
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (unlocked ? '' : ' locked');
    btn.disabled = !unlocked;
    btn.innerHTML = '<span class="level-num">' + (unlocked ? (i + 1) : '🔒') + '</span>'
      + '<span class="level-stars">' + '★'.repeat(stars) + '<span class="dim">'
      + '★'.repeat(unlocked ? 3 - stars : 0) + '</span></span>';
    if (unlocked) {
      btn.addEventListener('click', () => startGame('puzzle', i));
    }
    grid.appendChild(btn);
  });
  $('levels-progress').textContent = earned + ' ★ sur ' + LEVELS.length * 3;
}

$('btn-levels-back').addEventListener('click', () => show('screen-modes'));

// ---- boutique ----
const BALL_SKINS = {
  coco: { name: 'Noix de coco', emoji: '🥥', price: 0 },
  beachball: { name: 'Ballon de plage', emoji: '🏐', price: 50 },
  flower: { name: 'Frangipanier', emoji: '🌸', price: 80 },
  lantern: { name: 'Lampion', emoji: '🏮', price: 100 },
  durian: { name: 'Durian', emoji: '🍈', price: 120 },
  starfish: { name: 'Étoile de mer', emoji: '⭐', unlock: 2500 },
  shell: { name: 'Coquillage', emoji: '🐚', unlock: 5000 },
  turtle: { name: 'Carapace de tortue', emoji: '🐢', price: 150 },
  moon: { name: 'Pleine lune', emoji: '🌕', price: 200 },
  bubble: { name: 'Bulle du lagon', emoji: '🫧', price: 250 },
  lava: { name: 'Cœur de volcan', emoji: '🌋', unlock: 15000 },
};

const TRAIL_SKINS = {
  none: { name: 'Aucun sillage', emoji: '➖', price: 0 },
  petals: { name: 'Pétales de frangipanier', emoji: '🌸', price: 60 },
  embers: { name: 'Braises du volcan', emoji: '🔥', price: 100 },
  stars: { name: 'Poussière d\'étoiles', emoji: '✨', unlock: 10000 },
  foam: { name: 'Écume de mer', emoji: '🌊', price: 90 },
  gold: { name: 'Poussière d\'or', emoji: '🪙', price: 160 },
  esprit: { name: 'Esprits du panthéon', emoji: '🎭', bossUnlock: 9 },
};

let shop = loadJSON(KEYS.SHOP, {
  owned: ['coco', 'lagoon', 'none'], ball: 'coco', decor: 'lagoon', trail: 'none',
});
if (!shop.trail) shop.trail = 'none';
game.setCosmetics(shop);

function wallet() {
  return parseInt(store.get(KEYS.PEARLS) || '0', 10) || 0;
}

function cumulativeBestScore() {
  return loadJSON(KEYS.STATS, {}).bestScore || 0;
}

function persistShop() {
  store.set(KEYS.SHOP, JSON.stringify(shop));
  game.setCosmetics(shop);
}

function shopItem(id, def, kind) {
  const scoreUnlocked = def.unlock !== undefined && cumulativeBestScore() >= def.unlock;
  const bossUnlocked = def.bossUnlock !== undefined
    && Object.keys(loadJSON(KEYS.STATS, {}).bossKills || {}).length >= def.bossUnlock;
  const owned = shop.owned.includes(id) || scoreUnlocked || bossUnlocked || def.price === 0;
  const equipped = shop[kind] === id;
  const div = document.createElement('div');
  div.className = 'shop-item';
  const sub = equipped ? 'Équipé'
    : owned ? 'Possédé'
      : def.unlock !== undefined ? 'Se débloque à ' + def.unlock + ' pts en une partie'
        : def.bossUnlock !== undefined ? 'Succès « Panthéon du lagon » : vaincre les 9 boss'
          : '◉ ' + def.price;
  div.innerHTML = '<span class="shop-emoji">' + def.emoji + '</span>'
    + '<span class="shop-info"><span class="shop-name">' + def.name + '</span>'
    + '<span class="shop-sub">' + sub + '</span></span>';
  const btn = document.createElement('button');
  if (equipped) {
    btn.textContent = '✓ ÉQUIPÉ';
    btn.className = 'equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'CHOISIR';
    btn.className = 'owned';
    btn.addEventListener('click', () => {
      shop[kind] = id;
      persistShop();
      renderShop();
    });
  } else if (def.unlock !== undefined || def.bossUnlock !== undefined) {
    btn.textContent = '🔒';
    btn.className = 'owned';
    btn.disabled = true;
  } else {
    btn.textContent = 'ACHETER';
    btn.disabled = wallet() < def.price;
    btn.addEventListener('click', () => {
      if (wallet() < def.price) return;
      store.set(KEYS.PEARLS, String(wallet() - def.price));
      shop.owned.push(id);
      shop[kind] = id;
      persistShop();
      renderShop();
    });
  }
  div.appendChild(btn);
  return div;
}

function renderShop() {
  $('shop-wallet').textContent = '◉ ' + wallet() + ' perle' + (wallet() > 1 ? 's' : '')
    + ' — gagne des perles en jouant';
  const balls = $('shop-balls');
  balls.innerHTML = '';
  for (const [id, def] of Object.entries(BALL_SKINS)) {
    balls.appendChild(shopItem(id, def, 'ball'));
  }
  const decors = $('shop-decors');
  decors.innerHTML = '';
  for (const [id, def] of Object.entries(DECORS)) {
    decors.appendChild(shopItem(id, def, 'decor'));
  }
  const trails = $('shop-trails');
  trails.innerHTML = '';
  for (const [id, def] of Object.entries(TRAIL_SKINS)) {
    trails.appendChild(shopItem(id, def, 'trail'));
  }
}

$('btn-shop').addEventListener('click', () => {
  renderShop();
  show('screen-shop');
});
$('btn-shop-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- légende ----
const LEGEND_POWERUPS = [
  ['ball', '+1 noix de coco', 'Une noix de plus dans ta rafale, dès le tour suivant.'],
  ['sword', 'Espadon', 'File le long de sa ligne et détruit tout sur son passage.'],
  ['durian', 'Durian', 'Explose et blesse toutes les pierres voisines.'],
  ['chili', 'Piment', 'Dégâts doublés jusqu\'à la fin du tir.'],
  ['pearl', 'Perle', 'Monnaie de la boutique (skins et décors).'],
  ['flower', 'Frangipanier', 'Renvoie la noix qui la touche tout droit vers le haut.'],
  ['gecko', 'Gecko', 'Dédouble la noix qui le touche, pour le reste du tir.'],
  ['portal', 'Portails jumeaux', 'La noix qui entre dans l\'un ressort de l\'autre. Ils descendent avec la marée.'],
  ['lotus', 'Lotus-bouclier', 'Sauve la partie une fois : la pierre qui atteint la plage est engloutie (2 max).'],
  ['guide', 'Boussole marine', 'Rare : pendant 2 tirs, la visée révèle toute la trajectoire, rebonds sur les murs compris.'],
  ['gong', 'Gong', 'Résonne dans tout le lagon : TOUTES les pierres perdent 1 PV.'],
];

const LEGEND_STONES = [
  ['stone', 'Pierre de temple', 'Perd 1 PV par impact ; son style change avec sa solidité (grès, mousse, volcanique, dorée).'],
  ['tri', 'Toit de temple', 'Demi-pierre : l\'hypoténuse renvoie la noix en diagonale.'],
  ['armored', 'Pierre volcanique', 'Blindée : elle n\'encaisse qu\'1 dégât par seconde environ, même sous une pluie de noix.'],
  ['mystery', 'Pierre mystère', 'Révèle une surprise en se brisant : noix, perles, explosion ou points.'],
  ['wide', 'Pierre large', 'Deux colonnes d\'un bloc, très solide — apparaît à partir de 10 000 pts.'],
  ['round', 'Pierre ronde', 'Rebonds courbes imprévisibles — apparaît à partir de 30 000 pts.'],
  ['boss', 'Les boss', 'Toutes les 10 manches, un des 9 boss se dresse : 🎭 Barong (2 blindées), 👺 Rangda (se régénère), 🐉 Naga (mur), 🦅 Garuda (pierre large), 🔥 Léak (maudit des pierres), 🐒 Hanuman (chipe une noix), 🐢 Bedawang (séisme !), 🌊 Dewi Danu (brume), 👹 Raksasa (dévore les bonus). Le vaincre : 1 000 pts et 15 perles.'],
];

function legendRow([kind, name, desc]) {
  const div = document.createElement('div');
  div.className = 'legend-item';
  const cv = document.createElement('canvas');
  cv.width = 88;
  cv.height = 88;
  game.drawLegendIcon(cv, kind);
  div.appendChild(cv);
  const info = document.createElement('span');
  info.className = 'legend-info';
  info.innerHTML = '<div class="legend-name">' + name + '</div>'
    + '<div class="legend-desc">' + desc + '</div>';
  div.appendChild(info);
  return div;
}

function renderLegend() {
  const p = $('legend-powerups');
  p.innerHTML = '';
  for (const row of LEGEND_POWERUPS) p.appendChild(legendRow(row));
  const s = $('legend-stones');
  s.innerHTML = '';
  for (const row of LEGEND_STONES) s.appendChild(legendRow(row));
}

$('btn-legend').addEventListener('click', () => {
  renderLegend();
  show('screen-legend');
});
$('btn-legend-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- progrès & succès ----
const ACHIEVEMENTS = [
  { name: 'Casseur de cailloux', desc: 'Briser 100 pierres', test: (c) => (c.bricksBroken || 0) >= 100 },
  { name: 'Démolisseur de temple', desc: 'Briser 1 000 pierres', test: (c) => (c.bricksBroken || 0) >= 1000 },
  { name: 'Légende du lagon', desc: 'Briser 5 000 pierres', test: (c) => (c.bricksBroken || 0) >= 5000 },
  { name: 'Marée haute', desc: 'Atteindre la manche 10', test: (c) => (c.bestRound || 0) >= 10 },
  { name: 'Gardien du récif', desc: 'Atteindre la manche 20', test: (c) => (c.bestRound || 0) >= 20 },
  { name: 'Esprit de Bali', desc: 'Atteindre la manche 30', test: (c) => (c.bestRound || 0) >= 30 },
  { name: 'Grand marqueur', desc: '5 000 points en une partie', test: (c) => (c.bestScore || 0) >= 5000 },
  { name: 'Collier de perles', desc: 'Gagner 50 perles en tout', test: (c) => (c.pearlsEarned || 0) >= 50 },
  { name: 'Trésor de la baie', desc: 'Gagner 200 perles en tout', test: (c) => (c.pearlsEarned || 0) >= 200 },
  { name: 'Pèlerin des temples', desc: '12 ★ au mode Temples', test: (c, x) => x.stars >= 12 },
  { name: 'Libérateur des temples', desc: 'Toutes les étoiles des Temples', test: (c, x) => x.stars >= LEVELS.length * 3 },
  { name: 'Habitué de la plage', desc: 'Jouer 25 parties', test: (c) => (c.gamesPlayed || 0) >= 25 },
  { name: 'Chasseur de masques', desc: 'Vaincre un premier boss', test: (c) => Object.keys(c.bossKills || {}).length >= 1 },
  { name: 'Rescapé du séisme', desc: 'Survivre au séisme de Bedawang', test: (c) => !!c.quakeSurvived },
  { name: 'Panthéon du lagon', desc: 'Vaincre les 9 boss différents — débloque le sillage 🎭 Esprits du panthéon', test: (c) => Object.keys(c.bossKills || {}).length >= 9 },
];

const MODE_ICONS = {
  classic: '🥥', tide: '🌊', puzzle: '🛕', zen: '🏖', daily: '🌅',
  weekly: '🌀', tournament: '📡',
};
const MODE_NAMES = {
  classic: 'Classique', tide: 'Marée montante', puzzle: 'Temples',
  zen: 'Plage', daily: 'Défi du jour', weekly: 'Défi de la semaine',
  tournament: 'Tournoi',
};

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return 'il y a ' + m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return 'il y a ' + h + ' h';
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : 'il y a ' + d + ' j';
}

function renderMissions() {
  $('missions-list').innerHTML = game.getMissions().map((m) => {
    return '<div class="ach-item' + (m.done ? ' done' : '') + '">'
      + '<span class="ach-check">' + (m.done ? '✅' : '📜') + '</span>'
      + '<span class="ach-info"><div class="ach-name">' + m.name + ' — +' + m.reward + ' ◉</div>'
      + '<div class="ach-desc">' + (m.done ? 'Accomplie !' : m.progress + ' / ' + m.target) + '</div></span></div>';
  }).join('');
}

function renderHistory() {
  const h = loadJSON(KEYS.HISTORY, []);
  $('history-list').innerHTML = h.length === 0
    ? '<div class="ach-item done"><span class="ach-info"><div class="ach-desc">Aucune partie terminée pour l\'instant.</div></span></div>'
    : h.map((e) => {
      const what = e.mode === 'puzzle'
        ? 'Niveau ' + ((e.level || 0) + 1) + ' · ' + '★'.repeat(e.stars || 0)
        : e.score + ' pts · manche ' + (e.round || 1);
      return '<div class="ach-item done">'
        + '<span class="ach-check">' + (MODE_ICONS[e.mode] || '🥥') + '</span>'
        + '<span class="ach-info"><div class="ach-name">' + (MODE_NAMES[e.mode] || e.mode) + ' — ' + what + '</div>'
        + '<div class="ach-desc">' + timeAgo(e.ts || Date.now()) + '</div></span></div>';
    }).join('');
}

/* Courbe des 20 derniers scores (barres, du plus ancien au plus récent). */
function renderChart() {
  const entries = loadJSON(KEYS.HISTORY, []).slice(0, 20).reverse();
  const cv = $('prog-chart');
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  cv.style.display = entries.length >= 2 ? '' : 'none';
  if (entries.length < 2) return;
  const max = Math.max(1, ...entries.map((e) => e.score || 0));
  const pad = 14;
  const innerW = cv.width - pad * 2;
  const innerH = cv.height - pad * 2 - 16;
  const bw = Math.min(38, innerW / entries.length - 6);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#12a086';
  entries.forEach((e, i) => {
    const x = pad + (i + 0.5) * (innerW / entries.length) - bw / 2;
    const h = Math.max(3, ((e.score || 0) / max) * innerH);
    c.fillStyle = i === entries.length - 1 ? '#ffd34d' : accent;
    c.globalAlpha = 0.55 + 0.45 * ((e.score || 0) / max);
    c.beginPath();
    if (c.roundRect) c.roundRect(x, pad + 16 + innerH - h, bw, h, 4);
    else c.rect(x, pad + 16 + innerH - h, bw, h);
    c.fill();
  });
  c.globalAlpha = 1;
  c.fillStyle = getComputedStyle(document.body).color;
  c.font = '700 20px ' + getComputedStyle(document.body).fontFamily;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText('max ' + max.toLocaleString('fr-FR') + ' pts', pad, 6);
}

function renderProgress() {
  renderMissions();
  renderChart();
  renderHistory();
  const c = loadJSON(KEYS.STATS, {});
  const prog = loadJSON(KEYS.PUZZLE, { stars: {} });
  const stars = Object.values(prog.stars || {}).reduce((a, b) => a + b, 0);
  const rows = [
    ['Parties jouées', c.gamesPlayed || 0],
    ['Pierres brisées', c.bricksBroken || 0],
    ['Tirs', c.shotsFired || 0],
    ['Perles gagnées ◉', c.pearlsEarned || 0],
    ['Meilleure manche', c.bestRound || 0],
    ['Meilleur score', c.bestScore || 0],
    ['Étoiles des Temples ★', stars + ' / ' + LEVELS.length * 3],
  ];
  $('prog-stats').innerHTML = rows
    .map(([k, v]) => '<div class="row"><span>' + k + '</span><b>' + v + '</b></div>')
    .join('');
  // records par mode de jeu (depuis la v3.4 : cumulés partie par partie)
  const byMode = c.byMode || {};
  const modeOrder = ['classic', 'tide', 'puzzle', 'zen', 'daily', 'weekly', 'tournament'];
  $('prog-modes').innerHTML = modeOrder.filter((m) => byMode[m]).map((m) => {
    const s = byMode[m];
    const detail = m === 'puzzle'
      ? (s.wins || 0) + ' temple' + (s.wins > 1 ? 's' : '') + ' libéré' + (s.wins > 1 ? 's' : '')
      : m === 'zen'
        ? 'record ' + (s.score || 0) + ' pts'
        : 'record ' + (s.score || 0) + ' pts · manche ' + (s.round || 0);
    return '<div class="row"><span>' + (MODE_ICONS[m] || '🥥') + ' ' + (MODE_NAMES[m] || m)
      + ' — ' + s.games + ' partie' + (s.games > 1 ? 's' : '') + '</span><b>' + detail + '</b></div>';
  }).join('') || '<div class="row"><span>Termine une partie pour voir tes records par mode.</span></div>';
  const extra = { stars };
  $('ach-list').innerHTML = ACHIEVEMENTS.map((a) => {
    const done = a.test(c, extra);
    return '<div class="ach-item' + (done ? ' done' : '') + '">'
      + '<span class="ach-check">' + (done ? '🏆' : '·') + '</span>'
      + '<span class="ach-info"><div class="ach-name">' + a.name + '</div>'
      + '<div class="ach-desc">' + a.desc + '</div></span></div>';
  }).join('');
}

$('btn-progress').addEventListener('click', () => {
  renderProgress();
  show('screen-progress');
});
$('btn-progress-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- boutons accueil / recommencer en jeu ----
$('btn-home').addEventListener('click', () => {
  if (net && net.game && game.getMode() === 'tournament' && game.isPlaying()) {
    const st = game.debugState();
    netPublish(net.code, {
      t: 'over', uid: myUid, name: net.name, game: net.game,
      score: st.score, round: st.round,
    });
  }
  teardownNet();
  game.toMenu();
  refreshHome();
  show('screen-home');
});

$('btn-restart').addEventListener('click', () => show('screen-confirm'));
$('btn-confirm-no').addEventListener('click', () => showGame());
$('btn-confirm-yes').addEventListener('click', () => {
  game.newGame(lastStart.mode, lastStart.level, lastStart.seed);
  showGame();
});

// ---- fin de partie ----
const OVER_TITLES = {
  line: 'PARTIE TERMINÉE',
  time: 'TEMPS ÉCOULÉ',
  shots: 'PLUS DE TIRS',
};

/* Cosmétiques débloqués par un score en une partie. */
const SCORE_UNLOCKS = [
  { threshold: 2500, label: '⭐ Étoile de mer débloquée !' },
  { threshold: 5000, label: '🐚 Coquillage débloqué !' },
  { threshold: 8000, label: '🪼 Décor Bioluminescence débloqué !' },
];

let bestScoreAtStart = cumulativeBestScore();
let lastOver = null;

/* Le masque du boss qui a mis fin à la partie, sur l'écran de fin et la
   carte de partage. Chemins littéraux : la démo les remplace par des data URI. */
const OVER_BOSS_ART = {
  barong: 'art/boss-barong.webp',
  rangda: 'art/boss-rangda.webp',
  naga: 'art/boss-naga.webp',
  garuda: 'art/boss-garuda.webp',
  leyak: 'art/boss-leyak.webp',
  hanuman: 'art/boss-hanuman.webp',
  bedawang: 'art/boss-bedawang.webp',
  dewi: 'art/boss-dewi.webp',
  raksasa: 'art/boss-raksasa.webp',
};

function syncOverBoss(s) {
  const img = $('over-boss');
  if (s.bossKind && OVER_BOSS_ART[s.bossKind]) {
    $('over-title').textContent = 'TERRASSÉ PAR ' + (s.bossName || 'LE BOSS').toUpperCase();
    img.src = OVER_BOSS_ART[s.bossKind];
    img.classList.remove('hidden');
  } else {
    img.classList.add('hidden');
  }
}

/* ---- équipage : classement entre amis sur les défis du jour / semaine.
   Même code de 4 lettres dans les réglages de chaque téléphone : à la fin
   d'une partie, chacun publie son score sur ntfy.sh et l'écran de fin
   affiche le podium de l'équipage (meilleur score par personne). ---- */
let crewLive = null;   // {code, key, best:Map, stop}

function crewCode() {
  const c = (store.get(KEYS.CREW) || '').trim().toUpperCase();
  return validCode(c) ? c : null;
}

function teardownCrew() {
  if (crewLive && crewLive.stop) crewLive.stop();
  crewLive = null;
  $('crew-board').classList.add('hidden');
}

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function renderCrewBoard() {
  if (!crewLive) return;
  const rows = [...crewLive.best.values()].sort((a, b) => b.score - a.score).slice(0, 8);
  const medals = ['🥇', '🥈', '🥉'];
  $('crew-board').innerHTML = '<div class="crew-title">⚓ Équipage ' + crewLive.code
    + ' · ' + (crewLive.key[0] === 'd' ? 'défi du jour' : 'défi de la semaine') + '</div>'
    + rows.map((r, i) => '<div class="row"><span>' + (medals[i] || '&nbsp;' + (i + 1) + '.')
      + ' ' + escHtml(r.name) + (r.uid === myUid ? ' (toi)' : '') + '</span><b>'
      + r.score + '</b></div>').join('')
    + (rows.length <= 1 ? '<div class="row"><span class="dim">En attente des scores de l\'équipage…</span></div>' : '');
  $('crew-board').classList.remove('hidden');
}

function crewPublish(s) {
  teardownCrew();
  const code = crewCode();
  const key = s.mode === 'daily' ? 'd' + dailySeed()
    : s.mode === 'weekly' ? 'w' + game.weeklyInfo().seed : null;
  if (!code || !key) return;
  const name = (store.get(KEYS.NAME) || '').trim().slice(0, 12) || 'Sans nom';
  crewLive = { code, key, best: new Map(), stop: null };
  crewLive.best.set(myUid, { uid: myUid, name, score: s.score });
  netPublish('crew-' + code, { t: 'best', uid: myUid, name, key, score: s.score });
  // l'historique du sujet (12 h) ramène aussi les scores publiés plus tôt
  crewLive.stop = netSubscribe('crew-' + code, (m) => {
    if (!m || m.t !== 'best' || m.key !== crewLive.key || !m.uid) return;
    const prev = crewLive.best.get(m.uid);
    const sc = Math.max(0, m.score | 0);
    if (!prev || sc > prev.score) {
      crewLive.best.set(m.uid, {
        uid: m.uid, name: String(m.name || 'Sans nom').slice(0, 12), score: sc,
      });
      renderCrewBoard();
    }
  }, () => {}, '12h');
  renderCrewBoard();
}

game.initGame($('game'), {
  onTurnEnd(s) {
    if (!net || !net.game || s.mode !== 'tournament') return;
    upsert(myUid, { score: s.score, round: s.round });
    tickerRefresh();
    // sabotage amical : un combo ×5 envoie une vague chez les adversaires
    if (net.opts && net.opts.sabotage && s.combo >= 5
      && Date.now() - lastWaveSent > 15000) {
      lastWaveSent = Date.now();
      netPublish(net.code, { t: 'wave', uid: myUid, name: net.name, game: net.game });
      toast('😈 Combo ×' + s.combo + ' : tu envoies une vague !');
    }
    if (Date.now() - net.lastPub > 5000) {
      net.lastPub = Date.now();
      netPublish(net.code, {
        t: 'score', uid: myUid, name: net.name, game: net.game,
        score: s.score, round: s.round, board: game.getBoardSnapshot(),
      });
    }
  },
  onGameOver(s) {
    $('over-title').textContent = OVER_TITLES[s.reason] || 'PARTIE TERMINÉE';
    $('over-score').textContent = String(s.score);
    syncOverBoss(s);
    if (s.mode === 'daily' || s.mode === 'weekly') crewPublish(s);
    else teardownCrew();
    if (s.mode === 'tide') {
      $('over-best').textContent = 'Record marée : ' + s.tideBest + ' pts';
      $('stat-round-label').textContent = 'Manches jouées';
      $('stat-round').textContent = String(s.round);
    } else if (s.mode === 'tournament') {
      store.remove(KEYS.TOUR_NET);
      if (net && net.game) {
        // en ligne : publication du résultat + classement en direct
        upsert(myUid, { score: s.score, round: s.round, over: true });
        if (s.reason === 'race' && !net.raceWinner) net.raceWinner = 'Toi';
        netPublish(net.code, {
          t: 'over', uid: myUid, name: net.name, game: net.game,
          score: s.score, round: s.round, won: s.reason === 'race',
          board: game.getBoardSnapshot(),
        });
        syncEmojiButton();
        $('live-ticker').classList.add('hidden');
        maybeCloseSeriesGame();
        renderStandings();
        show('screen-standings');
        return;
      }
      $('over-best').textContent = '📡 Comparez vos scores !';
      $('stat-round-label').textContent = 'Manches atteintes';
      $('stat-round').textContent = String(s.round);
    } else if (s.mode === 'puzzle') {
      $('over-best').textContent = LEVELS[s.level] ? '« ' + LEVELS[s.level].name + ' »' : '';
      $('stat-round-label').textContent = 'Niveau';
      $('stat-round').textContent = String(s.level + 1);
    } else if (s.mode === 'daily') {
      $('over-best').textContent = '🌅 Défi du jour · meilleur aujourd\'hui : ' + s.dailyBest + ' pts';
      $('stat-round-label').textContent = 'Manche atteinte';
      $('stat-round').textContent = String(s.round);
    } else if (s.mode === 'weekly') {
      const wi = game.weeklyInfo();
      $('over-best').textContent = '🌀 ' + wi.name + ' · meilleur cette semaine : ' + s.weeklyBest + ' pts';
      $('stat-round-label').textContent = 'Manche atteinte';
      $('stat-round').textContent = String(s.round);
    } else {
      $('over-best').textContent = 'Record : manche ' + s.best + ' · ' + s.bestScore + ' pts';
      $('stat-round-label').textContent = 'Manche atteinte';
      $('stat-round').textContent = String(s.round);
    }
    // nouveaux cosmétiques débloqués par ce score ?
    const newUnlocks = SCORE_UNLOCKS
      .filter((u) => u.threshold > bestScoreAtStart && s.score >= u.threshold)
      .map((u) => u.label);
    if (newUnlocks.length) {
      $('over-best').textContent += ' — ' + newUnlocks.join(' · ');
    }
    bestScoreAtStart = cumulativeBestScore();
    $('stat-broken').textContent = String(s.broken);
    $('stat-pearls').textContent = String(s.pearls);
    $('stat-balls').textContent = String(s.balls);
    $('stat-shots').textContent = String(s.shots);
    lastOver = s;
    show('screen-over');
  },
  onPuzzleWin(s) {
    $('win-name').textContent = '« ' + s.name + ' » — niveau ' + (s.level + 1);
    $('win-stars').innerHTML = '★'.repeat(s.stars) + '<span class="dim">' + '★'.repeat(3 - s.stars) + '</span>';
    $('win-shots').textContent = s.shotsUsed + ' tir' + (s.shotsUsed > 1 ? 's' : '')
      + (s.pearls > 0 ? ' · ' + s.pearls + ' perle' + (s.pearls > 1 ? 's' : '') + ' ◉' : '');
    $('btn-win-next').style.display = s.hasNext ? '' : 'none';
    $('btn-win-next').dataset.next = String(s.level + 1);
    show('screen-win');
  },
});

$('btn-retry').addEventListener('click', () => {
  teardownCrew();
  if (lastStart.mode === 'tournament') {
    show(net ? 'screen-lobby' : 'screen-tournoi');
    return;
  }
  startGame(lastStart.mode, lastStart.level, lastStart.seed);
});

$('btn-over-home').addEventListener('click', () => {
  teardownCrew();
  refreshHome();
  show('screen-home');
});

$('btn-win-next').addEventListener('click', (e) => {
  const next = parseInt(e.currentTarget.dataset.next || '0', 10);
  startGame('puzzle', next);
});
$('btn-win-levels').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-win-home').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- partage du score (image générée hors ligne) ----
const MODE_LABELS = {
  classic: 'Mode classique', tide: 'Marée montante', puzzle: 'Temples',
  zen: 'Plage', daily: 'Défi du jour', weekly: 'Défi de la semaine',
  tournament: 'Tournoi entre amis',
};

function loadArt(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function shareCardBlob(s) {
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 900;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#bfe9ef');
  sky.addColorStop(1, '#eef9f0');
  x.fillStyle = sky;
  x.fillRect(0, 0, 720, 520);
  x.fillStyle = '#ffe9a8';
  x.beginPath();
  x.arc(570, 150, 70, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#3f7a6e';
  x.beginPath();
  x.moveTo(-40, 520); x.lineTo(200, 240); x.lineTo(290, 340);
  x.lineTo(340, 290); x.lineTo(560, 520);
  x.closePath();
  x.fill();
  const sea = x.createLinearGradient(0, 520, 0, 700);
  sea.addColorStop(0, '#2fae9f');
  sea.addColorStop(1, '#a7ecdc');
  x.fillStyle = sea;
  x.fillRect(0, 520, 720, 180);
  x.fillStyle = '#f0e0b6';
  x.fillRect(0, 700, 720, 200);
  x.fillStyle = 'rgba(255,255,255,0.8)';
  x.fillRect(0, 696, 720, 6);
  // le masque du boss vainqueur trône sur le lagon — sinon, la noix de coco
  const bossImg = s.bossKind && OVER_BOSS_ART[s.bossKind]
    ? await loadArt(OVER_BOSS_ART[s.bossKind]) : null;
  if (bossImg) {
    const w = 250;
    const h = w * (bossImg.height / bossImg.width);
    x.drawImage(bossImg, 360 - w / 2, 620 - h / 2, w, h);
  } else {
    x.fillStyle = '#7a5230';
    x.beginPath(); x.arc(360, 620, 46, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#55361c'; x.lineWidth = 6; x.stroke();
    x.fillStyle = '#a3794e';
    x.beginPath(); x.arc(344, 604, 18, 0, Math.PI * 2); x.fill();
  }
  x.textAlign = 'center';
  x.fillStyle = '#0d4b43';
  x.font = '800 64px -apple-system, sans-serif';
  x.fillText('BALIBALL', 360, 110);
  x.font = '700 30px -apple-system, sans-serif';
  x.fillStyle = '#305650';
  x.fillText(MODE_LABELS[s.mode] || '', 360, 170);
  x.font = '800 150px -apple-system, sans-serif';
  x.fillStyle = '#0d4b43';
  x.fillText(String(s.score), 360, 330);
  x.font = '700 34px -apple-system, sans-serif';
  x.fillStyle = '#305650';
  x.fillText(s.mode === 'puzzle' ? 'niveau ' + (s.level + 1) : 'manche ' + s.round, 360, 390);
  x.font = '600 27px -apple-system, sans-serif';
  x.fillStyle = '#33635a';
  x.fillText((s.broken || 0) + ' pierres brisées · ' + (s.pearls || 0) + ' perles ◉', 360, 432);
  if (bossImg && s.bossName) {
    x.font = '700 30px -apple-system, sans-serif';
    x.fillStyle = '#6b4a26';
    x.fillText('Terrassé par ' + s.bossName, 360, 745);
  }
  x.font = '600 26px -apple-system, sans-serif';
  x.fillStyle = '#8a6f4d';
  x.fillText(new Date().toLocaleDateString('fr-FR'), 360, 790);
  x.fillText('clemdu63.github.io/Baliball', 360, 830);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

$('btn-share').addEventListener('click', async () => {
  if (!lastOver) return;
  try {
    const blob = await shareCardBlob(lastOver);
    const file = new File([blob], 'baliball.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Baliball',
        text: 'Mon score sur Baliball 🥥',
      });
    } else if (navigator.share) {
      await navigator.share({
        title: 'Baliball',
        text: 'J\'ai fait ' + lastOver.score + ' pts sur Baliball 🥥 !',
      });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'baliball.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch (e) { /* partage annulé */ }
});

// ---- réglages ----
function bindSegmented(containerId, key, apply) {
  const box = $(containerId);
  const sync = () => {
    for (const btn of box.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === String(settings[key]));
    }
  };
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const v = btn.dataset.value;
    settings[key] = v === 'true' ? true : v === 'false' ? false : v;
    persistSettings();
    sync();
    if (apply) apply();
  });
  sync();
}

function applyAccessibility() {
  document.body.classList.toggle('lefty', !!settings.lefty);
  document.body.classList.toggle('calm', !!settings.calm);
}

bindSegmented('seg-theme', 'theme', () => setThemeMode(settings.theme));
bindSegmented('seg-sound', 'sound', syncAmbience);
bindSegmented('seg-ambience', 'ambience', syncAmbience);
bindSegmented('seg-speed', 'fast');
bindSegmented('seg-lefty', 'lefty', applyAccessibility);
bindSegmented('seg-calm', 'calm', applyAccessibility);
bindSegmented('seg-haptics', 'haptics');
bindSegmented('seg-haptics-bounce', 'hapticsBounce');

$('btn-haptic-test').addEventListener('click', () => {
  game.hapticTest();
  $('haptic-hint').textContent = 'Trois tics envoyés. Vibrations réelles sur '
    + 'Android ; sur iPhone, iOS bloque hélas les vibrations des apps web '
    + '(aucune API officielle) — si tu n\'as rien senti, ce n\'est pas un '
    + 'réglage du jeu.';
});
applyAccessibility();

// code d'équipage (classement entre amis sur les défis)
$('crew-code').value = store.get(KEYS.CREW) || '';
$('crew-code').addEventListener('input', () => {
  const v = $('crew-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  $('crew-code').value = v;
  if (v === '') {
    store.remove(KEYS.CREW);
    $('crew-status').textContent = 'Choisis un code avec tes amis : vos meilleurs scores '
      + 'du Défi du jour et de la semaine seront comparés à la fin de chaque partie.';
  } else if (validCode(v)) {
    store.set(KEYS.CREW, v);
    $('crew-status').textContent = '⚓ Équipage « ' + v + ' » enregistré — le podium '
      + 's\'affichera à la fin de tes défis (Internet requis à ce moment-là).';
  } else {
    $('crew-status').textContent = v.length < 4
      ? 'Encore ' + (4 - v.length) + ' caractère' + (4 - v.length > 1 ? 's' : '') + '…'
      : 'Code invalide : 4 lettres/chiffres, sans I, L, O, 0 ni 1.';
  }
});

// ---- sauvegarde & transfert : un code compact à copier sur l'autre tél ----
const EXPORT_KEYS = [KEYS.PEARLS, KEYS.SHOP, KEYS.STATS, KEYS.PUZZLE, KEYS.BEST,
  KEYS.BEST_SCORE, KEYS.TIDE_BEST, KEYS.NAME, KEYS.SETTINGS, KEYS.DAILY,
  KEYS.WEEKLY, KEYS.MISSIONS, KEYS.HISTORY, KEYS.CREW, KEYS.WELCOME];

function checksum(s) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) >>> 0;
  return sum.toString(36);
}

function exportCode() {
  const data = {};
  for (const k of EXPORT_KEYS) {
    const v = store.get(k);
    if (v !== null) data[k] = v;
  }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return 'BB1.' + checksum(b64) + '.' + b64;
}

function importCode(code) {
  try {
    const m = code.trim().match(/^BB1\.([a-z0-9]+)\.([A-Za-z0-9+/=]+)$/);
    if (!m) return 'format inconnu';
    if (checksum(m[2]) !== m[1]) return 'code abîmé (copie incomplète ?)';
    const data = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
    const valid = Object.values(KEYS);
    for (const [k, v] of Object.entries(data)) {
      if (valid.includes(k) && typeof v === 'string') store.set(k, v);
    }
    return 'ok';
  } catch (e) {
    return 'code illisible';
  }
}

$('btn-export').addEventListener('click', () => {
  $('transfer-code').value = exportCode();
  $('transfer-status').textContent =
    'Code généré ! Copie-le, envoie-le à ton autre téléphone, puis importe-le là-bas.';
});

$('btn-copy-code').addEventListener('click', async () => {
  if (!$('transfer-code').value.trim()) $('transfer-code').value = exportCode();
  const code = $('transfer-code').value.trim();
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Baliball — ma progression', text: code });
      $('transfer-status').textContent = 'Partagé !';
    } else {
      await navigator.clipboard.writeText(code);
      $('transfer-status').textContent = 'Copié dans le presse-papiers !';
    }
  } catch (e) {
    try {
      await navigator.clipboard.writeText(code);
      $('transfer-status').textContent = 'Copié dans le presse-papiers !';
    } catch (e2) {
      $('transfer-status').textContent = 'Sélectionne le code et copie-le à la main.';
    }
  }
});

let importArmedAt = 0;
$('btn-import').addEventListener('click', () => {
  const code = $('transfer-code').value.trim();
  if (!code) {
    $('transfer-status').textContent = 'Colle d\'abord un code dans la zone ci-dessus.';
    return;
  }
  if (Date.now() - importArmedAt > 6000) {
    importArmedAt = Date.now();
    $('transfer-status').textContent =
      '⚠️ Ceci écrase ta progression actuelle — appuie encore une fois pour confirmer.';
    return;
  }
  const r = importCode(code);
  if (r === 'ok') {
    $('transfer-status').textContent = 'Progression importée ! Rechargement…';
    setTimeout(() => location.reload(), 800);
  } else {
    $('transfer-status').textContent = 'Import impossible : ' + r + '.';
  }
});

$('btn-settings-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- bienvenue : trois diapos illustrées au tout premier lancement ----
const WELCOME_SLIDES = [
  {
    art: 'art/mode-classic.webp',
    title: 'BIENVENUE À BALI',
    text: 'Glisse le doigt pour viser, relâche pour lancer tes noix de coco '
      + 'sur les pierres du temple. À chaque manche tout descend d\'un cran — '
      + 'tiens bon le plus longtemps possible !',
  },
  {
    art: 'art/boss-barong.webp',
    title: 'NEUF BOSS LÉGENDAIRES',
    text: 'Toutes les 10 manches, un masque géant se dresse — Barong, Rangda, '
      + 'le Naga… Chacun a son pouvoir. Attrape les bonus du lagon pour les '
      + 'terrasser et remplis la jauge Gamelan pour la fièvre.',
  },
  {
    art: 'art/mode-tournoi.webp',
    title: 'DÉFIS & TOURNOIS',
    text: 'Défi du jour, défi de la semaine, tournois entre amis en direct… '
      + 'Gagne des perles ◉ et dépense-les à la boutique. Tout se joue '
      + 'hors ligne, même en avion. Selamat datang !',
  },
];
let welcomeStep = 0;

function renderWelcome() {
  const sl = WELCOME_SLIDES[welcomeStep];
  $('welcome-art').src = sl.art;
  $('welcome-title').textContent = sl.title;
  $('welcome-text').textContent = sl.text;
  $('welcome-dots').innerHTML = WELCOME_SLIDES
    .map((_, i) => '<span class="wdot' + (i === welcomeStep ? ' on' : '') + '"></span>').join('');
  $('btn-welcome-next').textContent =
    welcomeStep === WELCOME_SLIDES.length - 1 ? 'C\'EST PARTI !' : 'SUIVANT';
}

function closeWelcome() {
  store.set(KEYS.WELCOME, '1');
  refreshHome();
  show('screen-home');
}

$('btn-welcome-next').addEventListener('click', () => {
  if (welcomeStep >= WELCOME_SLIDES.length - 1) { closeWelcome(); return; }
  welcomeStep += 1;
  renderWelcome();
});
$('btn-welcome-skip').addEventListener('click', closeWelcome);

// ---- démarrage ----
document.querySelector('.version').textContent = 'v' + APP_VERSION;
$('settings-version').textContent = 'Baliball v' + APP_VERSION;
refreshHome();
/* Tout premier lancement (aucune trace de jeu ni d'accueil déjà vu) :
   les trois diapos de bienvenue, sinon l'accueil. */
if (!store.get(KEYS.WELCOME) && !store.get(KEYS.TUTO)) {
  renderWelcome();
  show('screen-welcome');
} else {
  show('screen-home');
}

// accès de debug pour les tests automatisés
window.baliball = game;
window.baliballNet = () => (net ? {
  code: net.code, game: net.game, raceWinner: net.raceWinner,
  series: net.series, seriesWinner: net.seriesWinner || null,
} : null);

// audio iOS : ne peut démarrer qu'après un geste
document.addEventListener('pointerdown', initAudio, { capture: true });

// service worker : hors ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      $('offline-badge').textContent = '✓ Disponible hors ligne';
      // prévenir quand une nouvelle version vient d'être téléchargée
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'activated' && navigator.serviceWorker.controller) {
            $('offline-badge').textContent = '🔄 Mise à jour prête — ferme et rouvre l\'app';
          }
        });
      });
    }).catch(() => { /* http:// local : le jeu marche quand même */ });
  });
}

// astuce d'installation iOS (Safari seulement, pas une fois installé)
(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !standalone) {
    $('install-hint').innerHTML =
      'Pour jouer hors ligne : bouton <strong>Partager</strong> ⬆︎ puis ' +
      '<strong>« Sur l\'écran d\'accueil »</strong>, et ouvre l\'app une première fois avec Internet.';
  }
})();
