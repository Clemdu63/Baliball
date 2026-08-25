/* Génération des illustrations du jeu via l'API Replicate (FLUX 1.1 Pro).
   Inspiré du pipeline du projet Tablée (workflow « Illustration de l'île »).

   Usage :
     REPLICATE_API_TOKEN=... node tools/generate-art.mjs home boss modes icon
   (ou « all »). Chaque image coûte quelques centimes : rien ne se lance
   automatiquement. Les candidates atterrissent dans art/candidates/ ;
   on choisit, on détoure/compresse, et les retenues vont dans art/. */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const TOKEN = process.env.REPLICATE_API_TOKEN;
const OUT = join(process.cwd(), 'art', 'candidates');

const STYLE = 'vibrant painted game-art style, soft matte brushwork, clean bold '
  + 'shapes, rich detail, cohesive tropical palette (turquoise #2fae9f, teal '
  + '#12a086, pale sand #f0e0b6, sunset gold #ffb648), no text, no watermark, no UI';

const BOSS_STYLE = 'centered, perfectly symmetrical front view, whole subject '
  + 'fully visible with generous margins, isolated on a plain flat very dark '
  + 'teal background (#0c1f22), dramatic soft rim light, ' + STYLE;

const JOBS = {
  home: [
    {
      id: 'home-day', model: 'ultra', aspect: '9:16', n: 2, seed: 4100,
      prompt: 'Vertical mobile game menu background: a dreamy Bali lagoon paradise '
        + 'seen from the beach — crystal-clear turquoise lagoon water, pale golden '
        + 'sand in the immediate foreground, a majestic green volcano on the '
        + 'horizon, a Balinese meru temple silhouette with tiered pagoda roofs on '
        + 'one side, lush palm fronds framing the very top corners, gentle foam '
        + 'waves, bright tropical morning light, sparkling water, '
        + 'calm open sky and water in the middle of the frame (space for UI), '
        + STYLE,
    },
    {
      id: 'home-night', model: 'ultra', aspect: '9:16', n: 2, seed: 4200,
      prompt: 'Vertical mobile game menu background: a Bali lagoon at nightfall — '
        + 'deep indigo-violet starry sky (#241a4e), blazing warm sunset glow on the '
        + 'horizon (#ff8a5c, #ffb648), volcano and Balinese meru temple silhouettes, '
        + 'tiny warm lantern lights near the temple, dark teal sea with golden moon '
        + 'glints, pale sand foreground, palm fronds framing the very top corners, '
        + 'calm open sky and water in the middle of the frame (space for UI), '
        + STYLE,
    },
  ],
  board: [
    {
      id: 'board-day', model: 'ultra', aspect: '9:16', n: 2, seed: 8100,
      prompt: 'Vertical seamless game board background, seen from directly above: '
        + 'the sandy bottom of a crystal-clear turquoise lagoon, pale rippled sand '
        + 'under shallow water, delicate caustic light ripples, a few very subtle '
        + 'darker patches, EXTREMELY soft and low-contrast, almost uniform, dreamy '
        + 'and calm, no fish, no coral, no rocks, no objects, no border, gentle '
        + 'gradient from lighter at top to slightly deeper turquoise at bottom, '
        + STYLE,
    },
    {
      id: 'board-night', model: 'ultra', aspect: '9:16', n: 2, seed: 8200,
      prompt: 'Vertical seamless game board background, seen from directly above: '
        + 'the bottom of a tropical lagoon at night, deep teal and indigo water '
        + 'over dark sand, faint moonlight caustic ripples, a few tiny '
        + 'bioluminescent pale-cyan plankton glints, EXTREMELY soft and '
        + 'low-contrast, almost uniform, dreamy and calm, no fish, no coral, no '
        + 'rocks, no objects, no border, ' + STYLE,
    },
  ],
  boss: [
    {
      id: 'boss-barong', model: 'pro', aspect: '1:1', n: 2, seed: 5100,
      prompt: 'Ornate Balinese Barong lion mask, game boss portrait: deep red face, '
        + 'intricate gold filigree crown, huge bulging white eyes with black pupils, '
        + 'gold arched eyebrows, wide grinning mouth full of white fangs, '
        + 'red and gold mane flames, ' + BOSS_STYLE,
    },
    {
      id: 'boss-rangda', model: 'pro', aspect: '1:1', n: 2, seed: 5200,
      prompt: 'Terrifying Balinese Rangda witch mask, game boss portrait: bone-white '
        + 'face, wild pale hair mane, long curved white tusks, bulging eyes with red '
        + 'rims, protruding red tongue, dark gold headdress details, '
        + BOSS_STYLE,
    },
    {
      id: 'boss-naga', model: 'pro', aspect: '1:1', n: 2, seed: 5300,
      prompt: 'Majestic Balinese Naga dragon head, game boss portrait: emerald green '
        + 'scales, golden crown and long golden whiskers, fierce golden eyes, gold '
        + 'fins and jewels, front view, ' + BOSS_STYLE,
    },
  ],
  boss2: [
    {
      id: 'boss-garuda', model: 'pro', aspect: '1:1', n: 2, seed: 9100,
      prompt: 'Majestic Balinese Garuda eagle mask, game boss portrait: fierce white '
        + 'and gold bird of prey face, sharp golden curved beak, intense amber eyes, '
        + 'ornate gold crown, spread white-gold feather ruff, red accents, '
        + BOSS_STYLE,
    },
    {
      id: 'boss-leyak', model: 'pro', aspect: '1:1', n: 2, seed: 9200,
      prompt: 'Terrifying Balinese Leyak spirit head, game boss portrait: wild '
        + 'floating demon face with bulging eyes, long fangs, flaming hair of '
        + 'green and teal fire, protruding tongue, gold earrings, eerie glow, '
        + BOSS_STYLE,
    },
    {
      id: 'boss-hanuman', model: 'pro', aspect: '1:1', n: 2, seed: 9300,
      prompt: 'Balinese Hanuman white monkey mask, game boss portrait: noble white '
        + 'fur monkey face with red skin around fierce eyes, gold crown and '
        + 'jewelry, open mouth showing fangs, mischievous expression, '
        + BOSS_STYLE,
    },
  ],
  modes: [
    ['mode-classic', 'a shiny coconut smashing into a carved mossy temple stone above a turquoise lagoon, action moment, dynamic'],
    ['mode-tide', 'a big curling turquoise ocean wave with white foam, seen from the beach, powerful and fresh'],
    ['mode-puzzle', 'a tiered Balinese meru temple among tropical plants, golden hour'],
    ['mode-zen', 'a peaceful hammock between two palm trees on a quiet beach, turquoise water, total serenity'],
    ['mode-daily', 'a glorious sunrise over the lagoon horizon, sun path reflecting on calm water'],
    ['mode-weekly', 'a mysterious swirling turquoise and violet vortex of water and light above the lagoon'],
    ['mode-tournoi', 'a golden trophy cup planted in beach sand, palm leaves and festive Balinese penjor poles around'],
  ].map(([id, scene], i) => ({
    id, model: 'pro', aspect: '1:1', n: 1, seed: 6100 + i * 37,
    prompt: 'Small square game mode illustration: ' + scene + ', centered composition, '
      + 'readable at thumbnail size, ' + STYLE,
  })),
  icon: [
    {
      id: 'icon', model: 'pro', aspect: '1:1', n: 2, seed: 7100,
      prompt: 'Mobile game app icon: one glossy brown coconut ball with three dark '
        + 'dots, mid-bounce above a bright turquoise lagoon, small splash, sun and '
        + 'tiny volcano in the background, bold minimal centered composition, '
        + 'thick painterly shapes, instantly readable at small size, ' + STYLE,
    },
  ],
};

const ENDPOINT = {
  ultra: 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions',
  pro: 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
};

async function generate(job, variant) {
  const input = job.model === 'ultra'
    ? { prompt: job.prompt, aspect_ratio: job.aspect, output_format: 'png', raw: false, seed: job.seed + variant * 61 }
    : { prompt: job.prompt, aspect_ratio: job.aspect, output_format: 'png', output_quality: 95, seed: job.seed + variant * 61, safety_tolerance: 2 };
  let create = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    create = await fetch(ENDPOINT[job.model], {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({ input }),
    });
    if (create.status !== 429) break;
    // limite de débit (compte à petit crédit) : on attend et on réessaie
    const body = await create.json().catch(() => ({}));
    const wait = Math.min(60, (body.retry_after || 10) + 2);
    console.log(`… 429, nouvelle tentative dans ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  if (!create.ok) throw new Error(`Replicate ${create.status} : ${await create.text()}`);
  let p = await create.json();
  for (let t = 0; t < 60 && !['succeeded', 'failed', 'canceled'].includes(p.status); t++) {
    await new Promise((r) => setTimeout(r, 2000));
    p = await (await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })).json();
  }
  if (p.status !== 'succeeded') {
    throw new Error(`${job.id}-${variant + 1} : statut ${p.status} ${JSON.stringify(p.error ?? '')}`);
  }
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  const img = await fetch(url);
  const file = join(OUT, `${job.id}-${variant + 1}.png`);
  writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  console.log(`✓ ${job.id}-${variant + 1}`);
}

async function main() {
  if (!TOKEN) {
    console.error('REPLICATE_API_TOKEN absent.');
    process.exit(1);
  }
  const asked = process.argv.slice(2);
  const groups = asked.includes('all') || asked.length === 0 ? Object.keys(JOBS) : asked;
  mkdirSync(OUT, { recursive: true });
  let first = true;
  for (const g of groups) {
    for (const job of JOBS[g] || []) {
      for (let v = 0; v < job.n; v++) {
        // 6 requêtes/min max quand le crédit est bas : on espace
        if (!first) await new Promise((r) => setTimeout(r, 11000));
        first = false;
        await generate(job, v);
      }
    }
  }
  console.log('Terminé → art/candidates/');
}

main().catch((e) => { console.error(e); process.exit(1); });
