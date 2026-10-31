# Spirit Island follow-up draft

The balanced-map beta was released in PR #2. This branch adds executable thematic-map play and compound-Power fixes, and remains draft PR #1. It is not deployed to the public game.

The earlier approximately 90% figure was an engineering estimate of feature scope, not measured test coverage. This draft does not claim a fully audited base set.

## Implemented

- The lobby has a host-only map selection modal. Thematic mode uses the recommended base-game sets: Northeast for 1 player; East/West for 2; East/West/Northeast for 3; all four for 4. The boards have 9 or 10 lands, printed terrain/coast/initial-piece data, within-board adjacency, cross-board joins, and schematic overview coordinates.
- All four base scenarios work with thematic mode. Guard the Isle's Heart uses land 7 for 1–2 players and the central corner lands for 3–4, then applies its extra Presence/cards, Town removal and round-two loss check.
- Initial Presence supports all eight spirits. Northeast has four coastal choices for Ocean and a choice between two Dahan-free Jungles for Green. Thunderspeaker retains its choices among the lands with the most Dahan.
- The printed Northeast Ocean/East land 1 adjacency is represented explicitly. It works for range, piece cleanup, Ocean Presence growth and Tidal Boon's Dahan rescue, including when Ocean has Presence on Northeast but not East.
- Ocean Gather reserves source Presence before moving anything. A single Presence on a coast shared by two Oceans cannot be counted twice. The modal permits choosing which Ocean receives it, shows an invalid assignment, and disables confirmation until the choices are consistent.
- Bringer shared-Power dialogs project dream pushes across the island before later area/moved-Dahan damage fields. Physical IDs and wounds are preserved, and already dreamed pieces do not acquire a second dream push. Secondary allocations and destinations survive recalculation when the physical piece list is unchanged.
- Damage sections show allocated/required totals and prevent incomplete or out-of-range confirmation.
- Dissolve the Bonds of Kinship projects ranked City/Town/Dahan replacements and subsequent damage. Bringer can choose destinations for replacement-created Explorers; the server binds these choices to real IDs after replacement and validates them before simultaneous damage. Invalid requests save no partial replacements or damage.

## Deliberate limits and remaining work

- Thematic topology is visually transcribed from board images. It has executable tests for symmetry, reachability, key special adjacencies and gameplay progression, but an independent geometric audit of every within-board boundary and cross-board join is still pending. The saved reference remains `verifiedForRelease: false`; this is the main evidence limit for thematic play.

- Continue full-game interaction auditing, including Ocean and scenario-triggered action trees. Setup/one-round combination checks are not complete-game proof.
- Real-browser visual QA of this draft remains unverified. The managed preview CLI failed while starting the existing Wrangler development command. DOM/API modal tests passed; no preview infrastructure workaround or production deployment was used.

## Validation

Validation passed: `npm test` (294 PASS output lines) and `npx wrangler deploy --dry-run`. The new thematic suite exercises all eight spirits across 1–4 players, Presence conservation, physical piece lists, connected/symmetric adjacency, initial setup choices, shared Ocean coast handling, host-only settings and thematic Heart setup/loss conditions. It also checks 440 thematic scenario/adversary/level/player-count combinations through setup and one idle round, in addition to the existing 440 balanced combinations.

The DOM/API suite selects the thematic map, completes Green's setup choice, reaches the nine-land overview and Growth modal, and reassigns a shared-coast Presence between two Ocean Gather controls.

## References

- Original board images and numeric setup data: pinned sources are listed per board in `drafts/spirit-island/thematic-setup-reference.json`. No board artwork is bundled.
- Official terrain clarification: https://querki.net/raw/darker/spirit-island-faq/Thematic%2Bmap
- Guard the Isle's Heart card reference: https://github.com/spirit-island/spirit-island-mod/blob/2655f6104cf1d267f4dbf4b182912fbeba1a565e/objects/04397d/object.json
- Official Northeast Ocean/East1 clarification: https://querki.net/raw/darker/spirit-island-faq/.7w4ghyo
