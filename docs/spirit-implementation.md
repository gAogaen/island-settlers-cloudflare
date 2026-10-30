# Spirit Island implementation coverage

This remains a draft. Executable card programs and passing regression tests do not establish complete base-set rules.

| Component | Current implementation | Remaining work |
|---|---|---|
| Rooms | 1–4 players, host, tokens, rejoin, spectators, chat, private hands/drafts | disconnect policies |
| Fear | All 15 cards and 45 Terror-level effects; sequential choices, restrictions, health budgets, removal/destruction, earned order | browser layout verification; interactions with other pending actions |
| Unique cards | All 32 starting cards have programs, including Midnight's Major gain, forgetting itself, Energy and immediate play | complete audit of transferred Unique cards and spirit exceptions |
| Shared powers | All 36 Minor and 22 Major cards have metadata, target/element conditions, executable programs and dialogs; finite shared decks, four-card drafts, reshuffling and Major forgetting | finish combinations below; this is not a claim of complete rule coverage |
| Support/continued effects | Energy/elements/range, moving Ward defense, Constancy, Entwined drafts/gifts, paid Powerstorm repeats, immediate repeats, Vengeance action aggregation and non-recursive trigger ancestry | complete branch UI and timing audit, especially multiple destruction/damage instructions and Bringer |
| Spirit panels | Eight spirits, all 12 printed innate programs with tiers, permanent/Any track elements, River/Thunderspeaker track reclaim, Presence repositioning; Shadows paid range bypass; Green Growth regeneration; Thunderspeaker's Ravage Presence-loss choices | exact remaining Growth choices/order (especially Ocean/Green/Bringer), setup choices and remaining special-rule interactions |
| Island | A–D starting pieces, three coastal lands; physical Ocean nodes and board-local activation | exact terrains/topology and cross-board joins; Ocean setup coast selection |
| Invaders | Physical unique 3/4/5-stage deck with Coastal card; Explore/Build/Ravage, damage/counterattack, continuation after triggered choices | player-controlled counterattack damage allocation and other exceptions |
| Blight | Two cards/pools, flip, card choices; add Blight to the origin even when already blighted, then player-selected adjacent cascades | remaining timing and Ocean cleanup exceptions |
| Adversaries/scenarios | not implemented | three base adversaries and four scenarios |

## Known card interaction gaps

- Bringer's mandatory Push and once-per-Invader-per-Power destruction replacement need a complete audit across every damage/destruction instruction. Some current handlers still allow optional Push or do not expose every follow-up Push choice. This is a rule gap, not an omitted animation.
- The source and destination of individual wounded Invaders need full player control for every removal, replacement and move.
- Timing when a cascade changes Ocean activation during a multi-step Power needs verification.
- Infinite Vitality's Ocean cleanup and interactions with moving injured Dahan require further coverage.
- Several in-card follow-up target choices have DOM coverage for their default resolution, but not every combination of choices.
- Growth is still partly approximate. All 12 innate programs now use the printed threshold/effect data, but further interaction coverage is required.

## References

- Rules/Living FAQ: https://querki.net/u/darker/spirit-island-faq/
- Shared/Unique numeric card metadata cross-checked against SICK's publisher-supplied reference: https://github.com/oberien/spirit-island-card-katalog/blob/master/src/db.ts (reference blob `310d75c1af1655be1037d262d73296350937f6d1`). Descriptions are Japanese mechanical summaries; no card artwork or printed full text is bundled.
- Initial pieces: https://github.com/spirit-island/spirit-island-mod/tree/main/objects/BalancedMapBag
- Panel reference for the next implementation step: https://github.com/bfowle/spirit-island/tree/main/data/references/wiki (secondary transcription; cross-check unusual symbols against the original panel/FAQ).

## Verification

`npm test` runs the existing-game suites and `test:spirit`. Spirit tests cover 1–4 player rounds, privacy/rejoin, all 45 Fear stages, all 32 Unique dialogs, all 58 shared-power dialogs and all 12 innate dialogs at highest thresholds, tier-specific innate cases, finite-card conservation over repeated drafts/reshuffles, Major forgetting, Midnight, support effects, repeats, cascades and Vengeance/Ravage continuation. These are regression checks, not a completeness certification.

Real browser layout testing remains incomplete: Chromium download failed earlier in this environment. UI checks currently use DOM simulation.
