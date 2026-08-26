/* Générateur de QR codes minimal — mode octets, correction M, versions
   1 à 4 (jusqu'à 62 caractères). 100 % hors ligne, aucune dépendance.
   Sert à rejoindre un salon de tournoi d'un simple scan. */

// ---- GF(256) et Reed-Solomon ----
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  return a && b ? EXP[LOG[a] + LOG[b]] : 0;
}

function rsEC(data, ecLen) {
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    // g(x) ← g(x) · (x + α^i), coefficients du degré fort au faible
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], EXP[i]);
    }
    gen = next;
  }
  const rem = new Array(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ rem.shift();
    rem.push(0);
    if (factor) {
      for (let j = 0; j < ecLen; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

// versions 1-4, correction M : [taille, blocs [total, données], capacité octets]
const VERSIONS = [
  { v: 1, blocks: [[26, 16]], cap: 14, align: null },
  { v: 2, blocks: [[44, 28]], cap: 26, align: 18 },
  { v: 3, blocks: [[70, 44]], cap: 42, align: 22 },
  { v: 4, blocks: [[50, 32], [50, 32]], cap: 60, align: 26 },
];

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/* Construit la matrice de modules (true = sombre) ou null si trop long.
   forceMask (0-7) ne sert qu'aux tests. */
export function qrMatrix(text, forceMask = null) {
  const bytes = [];
  for (const ch of new TextEncoder().encode(text)) bytes.push(ch);
  const spec = VERSIONS.find((s) => bytes.length <= s.cap);
  if (!spec) return null;
  const size = 17 + 4 * spec.v;

  // ---- flux de bits : mode octets + longueur + données + bourrage ----
  const bits = [];
  const push = (val, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(4, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const dataLen = spec.blocks.reduce((a, [t, d]) => a + d, 0);
  for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
  }
  const PAD = [0xec, 0x11];
  for (let i = 0; codewords.length < dataLen; i++) codewords.push(PAD[i % 2]);

  // ---- blocs + correction, puis entrelacement ----
  const dataBlocks = [];
  const ecBlocks = [];
  let at = 0;
  for (const [total, d] of spec.blocks) {
    const block = codewords.slice(at, at + d);
    at += d;
    dataBlocks.push(block);
    ecBlocks.push(rsEC(block, total - d));
  }
  const out = [];
  const maxD = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxD; i++) {
    for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  }
  const maxE = Math.max(...ecBlocks.map((b) => b.length));
  for (let i = 0; i < maxE; i++) {
    for (const b of ecBlocks) if (i < b.length) out.push(b[i]);
  }

  // ---- matrice : motifs fonctionnels ----
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fun = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    mod[y][x] = dark;
    fun[y][x] = true;
  };
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  for (let i = 8; i < size - 8; i++) {
    if (!fun[6][i]) set(i, 6, i % 2 === 0);
    if (!fun[i][6]) set(6, i, i % 2 === 0);
  }
  if (spec.align) {
    const c = spec.align;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
  // zones du format (réservées avant le placement des données)
  for (let i = 0; i <= 8; i++) {
    fun[8][i] = true;
    fun[i][8] = true;
    if (i < 8) {
      fun[8][size - 1 - i] = true;
      fun[size - 1 - i][8] = true;
    }
  }
  set(8, size - 8, true); // module sombre

  // ---- placement des données en zigzag ----
  let bi = 0;
  const cells = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fun[y][x] && bi < out.length * 8) {
          mod[y][x] = ((out[bi >> 3] >> (7 - (bi & 7))) & 1) === 1;
          cells.push([x, y]);
          bi++;
        }
      }
    }
  }

  // ---- choix du masque : pénalité simplifiée (séries + blocs 2×2) ----
  const fmtFor = (mask) => {
    const data = (0 << 3) | mask; // correction M = 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  };
  const drawFormat = (bits15) => {
    const b = (i) => ((bits15 >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, b(i));
    set(8, 7, b(6));
    set(8, 8, b(7));
    set(7, 8, b(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, b(i));
    set(8, size - 8, true);
  };
  const penalty = () => {
    let p = 0;
    for (let y = 0; y < size; y++) {
      let runC = mod[y][0];
      let runX = 1;
      let colC = mod[0][y];
      let colX = 1;
      for (let x = 1; x < size; x++) {
        if (mod[y][x] === runC) {
          runX++;
          if (runX === 5) p += 3;
          else if (runX > 5) p++;
        } else { runC = mod[y][x]; runX = 1; }
        if (mod[x][y] === colC) {
          colX++;
          if (colX === 5) p += 3;
          else if (colX > 5) p++;
        } else { colC = mod[x][y]; colX = 1; }
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
    }
    return p;
  };
  let best = forceMask;
  let bestP = Infinity;
  for (let m = 0; m < 8 && forceMask === null; m++) {
    for (const [x, y] of cells) if (MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    drawFormat(fmtFor(m));
    const p = penalty();
    if (p < bestP) {
      bestP = p;
      best = m;
    }
    for (const [x, y] of cells) if (MASKS[m](x, y)) mod[y][x] = !mod[y][x];
  }
  for (const [x, y] of cells) if (MASKS[best](x, y)) mod[y][x] = !mod[y][x];
  drawFormat(fmtFor(best));
  return mod;
}

/* Dessine le QR dans un canvas (zone calme de 4 modules, fond blanc). */
export function drawQR(canvas, text) {
  const mod = qrMatrix(text);
  const c = canvas.getContext('2d');
  if (!mod) {
    canvas.style.display = 'none';
    return false;
  }
  const size = mod.length;
  const quiet = 4;
  const scale = Math.max(2, Math.floor(canvas.width / (size + quiet * 2)));
  const px = (size + quiet * 2) * scale;
  canvas.width = px;
  canvas.height = px;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, px, px);
  c.fillStyle = '#111111';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mod[y][x]) c.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    }
  }
  return true;
}
