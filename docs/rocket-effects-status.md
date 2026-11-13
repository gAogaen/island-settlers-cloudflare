# Lv.1 / Lv.2 implementation status

Sources: user-supplied card faces, and the official FAQ (2026-11-12):
https://www.pokemon.co.jp/ex/omaroke/assets/pdf/faq.pdf

## Included
- All 30 supplied families have separate Lv.1 / Lv.2 images, printed HP and move data.
- Expert setup uses those 30 families. Unverified Lv.3 stages are not fabricated.
- Attack selection and supported weather-cost moves have authenticated server-side controls.
- Damage modifiers, two-hit attacks, drain, recoil, marker removal, defender,
  hand exchange, random discard, temporary hand exclusion, distribution of drawn cards,
  optional draw-step/end-step effects, repeat attacks and rescue restrictions are implemented.
- Existing rooms retain their stored roster. New expert rooms use the new roster.

## Not complete
This is not a complete implementation of the official game.
- Full poison/paralysis/flinch/confusion/sleep timing and recovery rules need the printed guide.
- Weather-triggered burn uses the confirmed fixed-one-damage rule; global weather replacement
  and all status/held-item interactions are not complete.
- Abilities absent from SUPPORTED_ABILITIES in src/rocket-effects.mjs are marked pending.
- Moves with pending/partial effectStatus retain explicit UI notices; their missing effects
  are not silently described as implemented.
- Lv.3 gameplay, complete held items, and replacement of the provisional play-card deck remain outstanding.
- The 108-card prototype deck still contains provisional quantities/weather fields outside
  the attack/dodge cards. Weather probabilities are therefore not verified official probabilities.

## Validation
- node --test tests/rocket-effects.test.mjs (20 behavior cases)
- node tests/rocket-effects-ui.test.cjs (DOM controls, ownership, spectator and load order)
- wrangler deploy --dry-run (Worker and all static assets compile)
- No interactive browser QA was performed in this change.
