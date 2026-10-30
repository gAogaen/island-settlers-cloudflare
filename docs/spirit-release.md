# Spirit Island basic-set early release

Build: `spirit-basic-beta-20261031`

Playable scope: 1–4 players on balanced A–D maps, eight spirits, 32 Unique cards, 36 Minor and 22 Major cards, 12 innate powers, Fear/Blight rules, all three base adversaries at levels 0–6 and four base scenarios.

This is an early release, not a claim of exhaustive rule verification. Optional thematic maps and the remaining compound-Power UI audit remain in the development draft. In particular, Bringer interactions involving pushes into a later area-damage target still need dedicated UI coverage.

Validation: `npm test` passed, including 440 scenario/adversary/level/player-count setup/round combinations, individual card/innate tests and modal tests. `npm run test:spirit:browser` passed with desktop/mobile Chromium, four-board layout, Growth, scenario setup and Ocean setup. `wrangler deploy --dry-run` packaged the Worker and assets successfully.

The development draft is kept separate from the public release branch.
