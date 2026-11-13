# Rocket game card data handoff

The provisional data registry is `src/rocket-cards.mjs`. Replace placeholder rows there when the official card list, effects, and images are supplied. Keep `provisional: true` on unverified rows; set it to `false` only after the card has been checked.

## Play cards

Each `ROCKET_PLAY_CARDS` row supports:

- `id`: stable unique key used by game instances and save state.
- `name`, `kind`, `action`, `copies`: printed name, broad family, currently supported game action, and deck quantity.
- `text`: exact or summarized effect text for the UI.
- `effect`: structured effect data. Existing prototype resolvers use `attack`, `dodge`, `heal`, `draw`, and `revealRole`.
- `weather`: weather mark or `null`.
- `timing`, `target`, `targetMode`: play window, readable target description, and machine-readable target selector.
- `image`, `imageAlt`: optional image path or HTTPS URL. Prefer a local path such as `/assets/rocket/cards/<id>.webp`; set `image: null` when no image is available.
- `provisional`: whether the entry is temporary/unverified.

Suggested `kind` values: `attack`, `dodge`, `tool`, `item`, `event`. The exact game behavior belongs in `effect` and a server-side resolver; do not infer it from the card's display name.

## Pokémon cards

Each `ROCKET_POKEMON_CARDS` row supports `id`, `cardId`, `familyId`, `name`, `species`, `type`, `cardType` (printed role such as `ぼうがい型`), `level`, `hp`, `greenHp` (basic-rule green-heart HP), `redHp` (expert-rule red-heart HP), `attacks` (name, damage, printed text, weather, effect), `ability`, `abilityText`, `image` (Pokémon artwork), `cardImage` (full scan of the physical card), and `provisional`. Include `levels` as ordered records containing `level`, the correct expert-mode red-heart HP, and that level's name, image and attacks when those differ. `basicHp` may store the level 3 green-heart value independently of red-heart `hp`. The prototype models a Pokémon family as one row with a `levels` array so the same family can be selected and leveled up. A selection card should keep the scan visible and show these fields in readable text; when no scan or verified text exists, label the missing information rather than inventing it. `cardImage` can be opened full size in the selection view.

## Modes

- `basic`: draw 2 Pokémon candidates, choose 1, start at Lv.3.
- `expert`: draw 4 candidates, choose 2, start both at Lv.1, switch the active Pokémon, and optionally level up the active Pokémon at end of turn.
- Except for explicitly supplied scans/records, HP and attack values in the current registry are placeholders. Replace all levels with the supplied red-heart values and printed attacks before calling this an official rules implementation. Level-up is only offered when the next level exists in the card data. The current level-up HP change preserves missing HP while adding the increase in maximum HP; revise this if the supplied rules/cards specify another calculation.

## Role cards

`ROCKET_ROLE_CARDS` stores one row per role type with `copies`, `public`, and optional `image`. If the supplied material distinguishes physical copies, assign stable IDs to those copies and preserve their role mapping.

## Data needed to complete the official set

1. All 108 play-card names, quantities, families, text/effects, timing, targets, and weather marks.
2. All 60 Pokémon cards, including levels, HP, attacks, abilities, and evolution links.
3. The six role-card copies and player-count setup rules.
4. Matching image files or URLs, plus any status/equipment marker rules needed to resolve the effects.

## Reference materials

See [`rocket-card-reference-notes.md`](rocket-card-reference-notes.md) and [`references/rocket-card-overview-20261113.png`](references/rocket-card-overview-20261113.png) for the physical card overview photo. Use it alongside the individual card scans; do not infer exact effect text or copy counts from the overview photo.
