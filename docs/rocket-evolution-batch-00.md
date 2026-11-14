# Rocket evolution: batch 00 direct file inspection

Source: GitHub repository default branch, files under `public/assets/rocket/cards/evolution/`.
Method: fetch each WebP as base64, inspect RIFF/VP8L lossless WebP header and decode the stored canvas dimensions.
This does **not** inspect decoded pixels, RGB color, black border geometry, shadows, or visual quality.

| File | WebP | Width | Height |
| --- | --- | ---: | ---: |
| aerodactyl-lv1.webp | VP8L | 745 | 1040 |
| aerodactyl-lv2-q2.webp | VP8L | 745 | 1040 |
| aerodactyl-lv2.webp | VP8L | 600 | 840 |
| bulbasaur-lv1-q2.webp | VP8L | 745 | 1040 |
| bulbasaur-lv1.webp | VP8L | 630 | 880 |
| chansey-lv1.webp | VP8L | 745 | 1040 |
| chansey-lv2.webp | VP8L | 600 | 840 |
| charmander-lv1.webp | VP8L | 745 | 1040 |
| charmeleon-lv2.webp | VP8L | 600 | 840 |
| cubone-lv1.webp | VP8L | 745 | 1040 |

## Findings

- All ten fetched files have readable lossless WebP VP8L headers.
- Image dimensions differ among the cards. This alone is **not** evidence of a defect: canvas aspect ratios are approximately 0.714 for all three size groups.
- No claim is made that the images are fully decodable or visually corrected.
- The audit script still needs to run with Pillow on decoded pixels before RGB matching and perspective correction can be evaluated.

Next batch: inspect the remaining files, and use a real decoded-image environment to validate border geometry and RGB targets before modifying any image.
