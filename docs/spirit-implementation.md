# Spirit Island implementation coverage

The game is still a draft. Passing round-trip tests does not establish base-set rule completeness.

| Component | Current implementation | Remaining work |
|---|---|---|
| Rooms | 1–4 players, host, tokens, rejoin, spectators, chat | disconnect policies |
| Fear | All 15 base cards, all 45 Terror-level effects; sequential player choices, mandatory and optional actions, different-land restrictions, removal versus destruction, damage allocation, turn-scoped effects, earned-order resolution | visual browser execution beyond DOM simulation |
| Starting Unique cards | 31 complete Unique programs; Midnight's Fear branch only | replace the Midnight's Major-gain branch; finish their special interactions |
| Minor/Major powers | 8 generic templates | 36 Minor and 22 Major cards, shared finite decks, draft/forget, thresholds, repeats, support effects |
| Spirit panels | 8 choices; Ocean income/track elements; finite Presence tracks and repositioning; simplified growth/innates | exact growth, remaining track elements/reclaim, all innate tiers and special-rule interactions |
| Island boards | A–D initial pieces and three coastal lands; actual Ocean nodes and board-local activation; grid topology | A–D exact terrain/coast/adjacency/setup and cross-board joins |
| Invader actions | Exact unique 3/4/5 deck with Coastal Lands; Explore/Build/Ravage, damage and Dahan counterattack, Fear action restrictions | player damage/cascade choices; remaining exceptions |
| Blight | 2 base cards, pool flip, start-of-Invader response | player-controlled cascades and remaining timing interactions |
| Adversaries/scenarios | not implemented | basic-set adversaries and scenarios |

## Rule data references

- Core rules and Living FAQ: https://querki.net/u/darker/spirit-island-faq/
- Card names, numerical metadata and mechanics cross-checked against SICK's publisher-supplied reference: https://github.com/oberien/spirit-island-card-katalog/blob/master/src/db.ts (reference blob `310d75c1af1655be1037d262d73296350937f6d1`). Card art and full card text are not bundled.
- Initial board pieces cross-check: https://github.com/spirit-island/spirit-island-mod/tree/main/objects/BalancedMapBag (reference only; not yet used for formal board topology).

## Checks

`npm run test:spirit` covers 1–4 player round transitions, room creation/rejoin, private projections, zero range, accelerated powers, per-spirit Sacred Sites, all 45 Fear stages, rule-specific cases and DOM interaction with 32 Fear choice dialogs and all 32 starting-power dialogs (Midnight Fear branch only). DOM simulation does not verify rendered layout or browser compatibility. Existing games are covered by `npm test`.
