# Behaviour Garden

A static web app for a young child. Each day plants a seed. Watering it — earned by
being kind, and performed by the child — grows it through sprout, leaves and bud to a
flower. Every day's plant is kept, so the garden fills up over weeks.

No build step, no backend, no accounts, no network calls. Everything is stored in the
browser's `localStorage` and every asset is vendored into the repo.

## Running it

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

## Publishing to GitHub Pages

Push this folder to a repository and turn on Pages (Settings → Pages → deploy from
branch, root). The `.nojekyll` file stops Jekyll interfering with the `assets/` folder.
On a tablet, use the browser's "Add to Home Screen" — `manifest.json` makes it open
full-screen like an app.

## How it works

| Screen | Who it's for |
|---|---|
| The garden | The child. Water, tap the plant, add stickers, browse past days. |
| ⚙ Grown-ups | The parent, behind a multiplication question a five-year-old won't pass. |

The grown-up notices behaviour; the child does the watering. Four waterings take a
plant from seed to bloom. Unused waterings carry over — up to two — into the next day.

## The rules it deliberately follows

This design is opinionated, because the obvious version of this idea is the one child
behaviour specialists warn about. The differences are the whole point:

- **Growth is additive only.** Nothing a child has earned is ever taken away. Systems
  that remove earned progress tend to collapse motivation the moment a day looks lost.
- **Plants never die.** A rough moment makes today's plant *thirsty* — it droops and
  loses its colour — and a single watering always brings it back. A wilting plant is a
  call to action; a dying one is a verdict, and five-year-olds read it as one.
- **Yesterday is untouchable.** Nothing that happens today can affect a plant already
  grown. A bad day costs today's plant, never the garden.
- **Behaviours are named, not judged.** The parent panel logs specific, positively
  phrased things you'd actually say out loud, not an abstract "bad behaviour" button.
- **The positive button is the big one.** The panel shows your good-to-reminder ratio
  over the last seven days, because the ratio is the thing that actually predicts
  whether this helps. Most parent-training programmes aim for about 5:1.
- **Repair is rewarded on its own.** "Made it right" clears the droop in one go.
  Recovering from a mistake is the skill worth teaching, and most charts ignore it.

Two honest caveats. First, the active ingredient here is almost certainly the two
minutes of shared attention at the end of the day, not the app — treat it as a reason
to sit down together. Second, novelty carries systems like this for a few weeks, then
fades; plan to retire it gracefully rather than watch it die.

## Assets

Plants and effects are [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/)
(CC BY 4.0), scenery is [Kenney](https://kenney.nl/assets/foliage-sprites) foliage (CC0)
used as tintable CSS masks, and playback is [lottie-web](https://github.com/airbnb/lottie-web)
(MIT). Full attribution and file-by-file detail in [CREDITS.md](CREDITS.md).

Two Noto animations need care and are handled in `app.js`: 🌱 is a one-shot clip that
fades back to an empty frame, and 🐝 flies out of frame mid-loop. Both are parked on a
frame where the art is fully drawn.

## Files

```
index.html      markup
styles.css      scenery, layout, the thirst treatment
app.js          state, growth, effects, parent panel
assets/plants/  11 Lottie JSON — growth stages and 8 species
assets/effects/ 9 Lottie JSON — water, sparkles, stickers, sun
assets/kenney/  17 silhouette PNGs (4 in use) used as tintable CSS masks
assets/vendor/  lottie-web
```

## Ideas for v2

- Replace the Noto plants with a commissioned or generated style set — 6 species ×
  4 stages × 2 health states, layered so stem, leaves and bloom animate separately.
- Let the child choose the day's seed from two or three options.
- Seasons, so the garden background changes over months.
- A weekly recap for the parent: which behaviours came up most.
