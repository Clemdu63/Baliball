# Simulation et audit du moteur

Ces scripts exécutent le **vrai** `js/game.js` sous Node, sans navigateur
(`harness.mjs` : DOM et canvas minimaux, horloge virtuelle à 30 i/s,
rendu coupé). Se lancer depuis ce dossier (`cd tools/sim`).

| Script | Rôle |
|---|---|
| `verify.mjs` | Non-régression des correctifs moteur (cascade, emprise du boss, invariants, déterminisme) — code de sortie 0/1 |
| `audit.mjs` | Audit physique tous modes (~180 parties) + déterminisme tournoi |
| `odyssey-sim.mjs` | Joue les 48 étapes de l'Odyssée (bot correct ×30, naïf ×12) → `ody-results.json` |
| `ody-calib.mjs` | Courbes de cumul par tir (briser/marquer) et victoire des boss selon la rafale → `ody-calib.json` |
| `ody-policy.mjs` | Transforme la calibration en objectifs/étoiles → `ody-proposal.json` |
| `ody-override.mjs`, `ody-final.mjs` | Arbitrages de design par-dessus la politique (rafales des boss, étoiles survivre, assouplissements) |
| `ody-generate.mjs` | Régénère le tableau `ODY_STAGES` de `js/odyssey.js` |

Les crochets de test du moteur sont dans `debugSet` (`fire`, `noDraw`,
`addBlocks`, `setBall`, `bossHp`, …) et `debugState`.
