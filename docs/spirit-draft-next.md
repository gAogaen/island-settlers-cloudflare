# Spirit Island development draft

The playable balanced-map basic-set beta is separated onto `release/spirit-basic-beta`. This document and `drafts/spirit-island/` belong to the follow-up draft and are not loaded by the public game.

The reported approximately 90% is an engineering estimate of implemented feature scope, not a measured test-coverage percentage. Eight spirits, 32 Unique cards, 58 shared cards, 12 innates, all three adversaries and four scenarios have executable programs and focused tests.

## Remaining work

- Optional thematic map sides: reference setup counts have been extracted, but terrain, coastal flags, adjacency and all spirit/adversary/scenario setup interactions still require validation.
- Bringer compound-Power UI: simulate pushed Invaders entering a later area-damage target and allow allocating damage against the updated physical piece list. The server already preserves physical identity and once-per-Power replacement; the UI needs dedicated coverage of this case.
- Expand end-to-end rule interaction testing, including action-tree timing, Ocean cleanup and modified printed costs in Blitz.

## Saved reference work

The thematic setup reference JSON contains mechanical piece counts only. It does not bundle artwork or card text and is explicitly unverified for release. Balanced topology was already checked against the printed board boundaries and standard layout transforms.
