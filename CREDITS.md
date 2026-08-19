# Credits

Behaviour Garden is built entirely from freely licensed assets. Everything is
vendored into this repository — the app makes no external network requests.

## Plants — illustrated style (the default)
Original work, drawn from parts in `plants.js`. No third-party licence applies.
Eleven species × five growth stages × a continuous health state, generated as SVG at
runtime. Three of them (sunflower, bluebell, poppy) have no counterpart in the Noto set.

## Plants and effects — emoji style
**[Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/)** — Google
Licensed **CC BY 4.0** ([licence](https://creativecommons.org/licenses/by/4.0/)).
Lottie JSON files in `assets/plants/` and `assets/effects/`, unmodified.

| File | Emoji | Used for |
|---|---|---|
| `plants/1f331.json` | 🌱 seedling | growth stage 1 (emoji style) |
| `plants/1f33f.json` | 🌿 herb | growth stage 2 |
| `plants/1f339.json` | 🌹 rose | species |
| `plants/1f337.json` | 🌷 tulip | species |
| `plants/1f338.json` | 🌸 cherry blossom | species |
| `plants/1f33c.json` | 🌼 blossom | species |
| `plants/1f490.json` | 💐 bouquet | species |
| `plants/1f340.json` | 🍀 four leaf clover | species |
| `plants/1f335.json` | 🌵 cactus | species |
| `plants/1f332.json` | 🌲 evergreen | species |
| `plants/1f940.json` | 🥀 wilted flower | reserved (unused in v1) |
| `effects/1f4a7.json` | 💧 droplet | watering |
| `effects/2728.json` | ✨ sparkles | growth burst |
| `effects/1f31e.json` | 🌞 sun | sky |
| `effects/1f308.json` | 🌈 rainbow | bloom celebration |
| `effects/1f41d.json` | 🐝 bee | sticker |
| `effects/1f98b.json` | 🦋 butterfly | sticker |
| `effects/2b50.json` | ⭐ star | sticker |
| `effects/1f31f.json` | 🌟 glowing star | sticker |
| `effects/1f496.json` | 💖 sparkling heart | sticker |

## Scenery
**[Foliage Sprites](https://kenney.nl/assets/foliage-sprites)** — [Kenney](https://kenney.nl)
Licensed **CC0 1.0** (public domain dedication). Credit is not required; it is given gladly.
PNGs in `assets/kenney/`, cropped to their content box and downscaled to 512px.
Used as CSS `mask-image` silhouettes so the hedges, meadow and grass can be tinted freely.
Original licence text preserved at `assets/kenney/LICENSE-kenney.txt`.

## Animation player
**[lottie-web](https://github.com/airbnb/lottie-web)** 5.13.0 — Airbnb, **MIT**.
`assets/vendor/lottie.min.js`, unmodified. Licence at `assets/vendor/LICENSE-lottie-web.txt`.

## QR encoder
**[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)** 1.4.4 —
Kazuhiko Arase, **MIT**. `assets/vendor/qrcode.js`, unmodified. Loaded on demand rather
than at startup, since only a grown-up ever needs it. Encoding only — scanning is done by
the receiving phone's own camera app, so no decoder is bundled.

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Everything else
The illustrated plant set, the seed and bud, the picket fence, the soil mound, the app icon
and all UI iconography were drawn for this project.
