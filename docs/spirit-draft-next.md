# Spirit Island development draft

The playable balanced-map basic-set beta was merged into `main` in PR #2. Follow-up work stays in draft PR #1; it is not deployed by this branch.

The reported approximately 90% is an engineering estimate of implemented feature scope, not measured test coverage. Eight spirits, 32 Unique cards, 58 shared cards, 12 innates, all three adversaries and four scenarios have executable programs and focused tests. This draft does not claim a fully audited base set.

## Implemented since the early release

- Shared-Power dialogs now project Bringer's dream pushes across the full island before constructing later damage fields. Incoming physical Invaders retain their identity and existing wounds. Pieces already dreamed by this Power remain available for damage allocation without acquiring a second push choice.
- Later area-damage and moved-Dahan damage use the updated piece list. Later dream destinations can be selected for resident Invaders; submitted preferences bind to their original identities on the server. Unchanged secondary allocations and destinations survive recalculation.
- Damage sections show allocated/required amounts and disable confirmation for incomplete or out-of-range allocations.
- Integrated DOM/API regression cases cover chained Tsunami coastal pushes at both normal and England building health, moved-Dahan damage from Vigor of the Breaking Dawn, wound preservation, changed allocations, preserved destinations, and once-per-Power Fear. The all-58-Bringer-dialog fixture now creates complete physical identities, matching real server states.
- Thematic reference data now includes terrain and coastal flags for NE/NW/E/W, recommended 1–4 board sets, and pinned source provenance. Counts were checked again against the source pieceMap; the original and recolored board images were visually compared. These facts are saved as preparation for integration; they do not enable thematic play.

## Remaining work

- Optional thematic maps: within-board adjacency, corner contacts, cross-board joins, spirit starting Presence, adversary setup and scenario compatibility require implementation and validation.
- Continue compound-Power auditing, especially Dissolve the Bonds of Kinship: replacement-generated pieces and selected wounded pieces need dedicated interaction coverage.
- Expand end-to-end rule interaction testing, including action-tree timing, Ocean cleanup and modified printed costs in Blitz.

## Validation and limits

The focused all-58 Bringer modal suite and all-58 shared/all-12 innate modal suite passed after these changes. Full npm test passed (284 PASS output lines), including the 440 setup/one-round combinations. These are executable DOM/API checks, not a new real-browser visual pass. Reference map data is explicitly `verifiedForRelease: false` and is not loaded by the public game. No board artwork is bundled in this draft.
