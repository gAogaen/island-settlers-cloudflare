# Spirit Island implementation coverage

This remains a draft. Executable card programs and passing regression tests do not establish complete base-set rules.

| Component | Current implementation | Remaining work |
|---|---|---|
| Rooms | 1–4 players, host, tokens, rejoin, spectators, chat, private hands/drafts | disconnect policies |
| Fear | All 15 cards and 45 Terror-level effects; sequential choices, restrictions, health budgets, removal/destruction, earned order | browser layout verification; interactions with other pending actions |
| Unique cards | All 32 starting cards have programs, including Midnight's Major gain, forgetting itself, Energy and immediate play | complete audit of transferred Unique cards and spirit exceptions |
| Shared powers | All 36 Minor and 22 Major cards have metadata, target/element conditions, executable programs and dialogs; finite shared decks, four-card drafts, reshuffling and Major forgetting | finish combinations below; this is not a claim of complete rule coverage |
| Support/continued effects | Energy/elements/range, moving Ward defense, Constancy, Entwined drafts/gifts, paid Powerstorm repeats, immediate repeats, Vengeance action aggregation and non-recursive trigger ancestry | complete branch UI and timing audit, especially multiple destruction/damage instructions and Bringer |
| Spirit panels | Eight spirits, all 12 printed innate programs with tiers, permanent/Any track elements, River/Thunderspeaker track reclaim, Presence repositioning; Shadows paid range bypass; Green Growth regeneration; Thunderspeaker's Ravage Presence-loss choices | setup choices and remaining special-rule interactions; all 25 Growth choices now have a stepwise, order-selectable implementation |
| Island | A–D printed terrain assignments, starting pieces, three coastal lands and exact within-board adjacency; land-details modal; physical Ocean nodes and board-local activation | standard multi-board joins/layouts (current joins are still approximate); Ocean setup coast selection |
| Invaders | Physical unique 3/4/5-stage deck with Coastal card; Explore/Build/Ravage, damage/counterattack, continuation after triggered choices | other timing/special-rule exceptions; counterattack damage is now player-allocated |
| Blight | Two cards/pools, flip, card choices; add Blight to the origin even when already blighted, then player-selected adjacent cascades | remaining timing and Ocean cleanup exceptions |
| Adversaries/scenarios | Prussia levels 0–6, host setup and Escalation choices | England, Sweden and four scenarios |

## Known card interaction gaps

- Bringer now uses stable physical Invader IDs, mandatory Push, and a per-Power once-only destruction replacement. Push preferences are optional inputs; unspecified destinations default to the first legal adjacent land. Follow-up UI prediction still needs further coverage when a multi-land Power pushes pieces into a land that will be damaged later in that Power.
- The source and destination of individual wounded Invaders need full player control for every removal, replacement and move.
- Timing when a cascade changes Ocean activation during a multi-step Power needs verification.
- Infinite Vitality's Ocean cleanup and interactions with moving injured Dahan require further coverage.
- Several in-card follow-up target choices have DOM coverage for their default resolution, but not every combination of choices.
- All 25 Growth choices and all 12 innate programs now use the printed panel effects. The UI resolves Growth effects one at a time in the player’s chosen order, including separate drafts and Ocean moves. Further rule-interaction coverage is required.

## References

- Rules/Living FAQ: https://querki.net/u/darker/spirit-island-faq/
- Shared/Unique numeric card metadata cross-checked against SICK's publisher-supplied reference: https://github.com/oberien/spirit-island-card-katalog/blob/master/src/db.ts (reference blob `310d75c1af1655be1037d262d73296350937f6d1`). Descriptions are Japanese mechanical summaries; no card artwork or printed full text is bundled.
- Initial pieces: https://github.com/spirit-island/spirit-island-mod/tree/main/objects/BalancedMapBag
- Panel reference for the next implementation step: https://github.com/bfowle/spirit-island/tree/main/data/references/wiki (secondary transcription; cross-check unusual symbols against the original panel/FAQ).

## Verification

`npm test` runs the existing-game suites and `test:spirit`. Spirit tests cover 1–4 player rounds, privacy/rejoin, all 45 Fear stages, all 32 Unique dialogs, all 58 shared-power dialogs and all 12 innate dialogs at highest thresholds, tier-specific innate cases, all 25 stepwise Growth dialogs, A–D terrain/adjacency, counterattack allocation, mandatory Bringer Push, physical piece identity and once-per-Power replacement, finite-card conservation over repeated drafts/reshuffles, Major forgetting, Midnight, support effects, repeats, cascades and Vengeance/Ravage continuation. These are regression checks, not a completeness certification.

Real browser layout testing remains incomplete: Chromium download failed earlier in this environment. UI checks currently use DOM simulation.

Board facts were checked visually against the reference images at `https://spiritislandweb.s3.eu-central-1.amazonaws.com/boards/Board{A,B,C,D}_big.png`; the images are not bundled in the application.

Prussia includes cumulative level setup, deck acceleration/shortening, variable Terror boundaries, physical Fear deck sizes, and per-board Stage-II Town placement chosen in a modal. The Coastal Stage-II card does not trigger Escalation. Tests cover all seven levels at 1–4 players, ownership, illegal settings and continuation without a duplicate Explore.
