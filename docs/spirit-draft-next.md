# Spirit Island development draft

The playable balanced-map basic-set beta was merged into `main` in PR #2. Follow-up work stays in draft PR #1; it is not deployed by this branch.

The reported approximately 90% is an engineering estimate of implemented feature scope, not measured test coverage. Eight spirits, 32 Unique cards, 58 shared cards, 12 innates, all three adversaries and four scenarios have executable programs and focused tests. This draft does not claim a fully audited base set.

## Implemented since the early release

- Shared-Power dialogs now project Bringer's dream pushes across the full island before constructing later damage fields. Incoming physical Invaders retain their identity and existing wounds. Pieces already dreamed by this Power remain available for damage allocation without acquiring a second push choice.
- Later area-damage and moved-Dahan damage use the updated piece list. Later dream destinations can be selected for resident Invaders; submitted preferences bind to their original identities on the server. Unchanged secondary allocations and destinations survive recalculation.
- Damage sections show allocated/required amounts and disable confirmation for incomplete or out-of-range allocations.
- Integrated DOM/API regression cases cover chained Tsunami coastal pushes at both normal and England building health, moved-Dahan damage from Vigor of the Breaking Dawn, wound preservation, changed allocations, preserved destinations, and once-per-Power Fear. The all-58-Bringer-dialog fixture now creates complete physical identities, matching real server states.
- Thematic reference data now includes terrain and coastal flags for NE/NW/E/W, recommended 1–4 board sets, and pinned source provenance. Counts were checked again against the source pieceMap; the original and recolored board images were visually compared. These facts are saved as preparation for integration; they do not enable thematic play.

- Dissolve the Bonds of Kinship now projects the selected physical City/Town/Dahan replacements, including wound arrays and identity lists. Changing the replacement priority rebuilds the later damage allocation. The Dahan replacement also respects the selected priority on the server.
- Bringer can choose dream destinations for Explorers created by Kinship. Those choices are bound to real piece identities after replacement and before simultaneous damage, so the client does not submit invented physical IDs. Original and newly created Explorers then share the normal once-per-Power dream context.
- A dedicated DOM/API suite covers normal and England building health, threshold on/off, ordinary spirits and Bringer, ranked healthy/wounded replacements, created-Explorer destinations, simultaneous return attacks, and rejection of malformed, duplicate or nonadjacent choices without saving partial state.

## Remaining work

- Optional thematic maps: within-board adjacency, corner contacts, cross-board joins, spirit starting Presence, adversary setup and scenario compatibility require implementation and validation.
- Continue compound-Power and action-tree auditing beyond the newly covered Kinship cases, including Ocean and triggered scenario interactions.
- Expand end-to-end rule interaction testing, including action-tree timing, Ocean cleanup and modified printed costs in Blitz.

## Validation and limits

The focused all-58 Bringer modal suite and all-58 shared/all-12 innate modal suite passed after these changes. Full npm test passed (285 PASS output lines), including the 440 setup/one-round combinations. These are executable DOM/API checks, not a new real-browser visual pass. Reference map data is explicitly `verifiedForRelease: false` and is not loaded by the public game. No board artwork is bundled in this draft.
