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

## The garden view

Tapping **My Garden** opens the whole garden as one place, not a list: every day's plant
laid out in rows that recede into the distance, oldest at the back, today glowing at the
front. Rows are balanced rather than filled greedily, each row gets its own plant size so
depth comes from honest layout instead of transform maths, and the hedge line is placed
just behind the back row whatever depth the garden has grown to. Tap any flower to see
which day it was.

The grid icon in the corner still opens the dated list, which is the more useful view for
a grown-up checking back over a fortnight.

## Two art styles

**Illustrated** (the default) draws every plant from parts in `plants.js` — eleven species
across five growth stages with a continuous health state, about 2KB of generated SVG each
and no asset files at all. Because the stem, leaves and flower head are separate layers,
thirst is expressed four ways at once: the plant leans and settles, the head nods over, the
leaves fall away and the colour drains. Three species — sunflower, bluebell, poppy — do not
exist in Noto's animated set at all.

**Emoji** uses the original Noto Animated Emoji. Switch between them in the grown-ups panel;
the choice is remembered per browser and past days re-render in whichever style is active.
The switcher exists because the only opinion that matters here is your child's — show them
both. Note that in emoji mode the three new species fall back to a lookalike (sunflower and
bluebell borrow the daisy and the posy), so you will see the odd duplicate.

Open `art.html` to see the whole matrix — every species, every stage, healthy and thirsty.

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

## Backups, and why they matter

iOS Safari clears script-writable storage — `localStorage` included — after **seven days
without a first-party visit**. A garden left alone over a fortnight's holiday would simply
be gone. Two defences, both in place:

1. **Add it to the Home Screen and open it from there.** Home-screen web apps keep their own
   use counter and are exempt from the seven-day sweep. This is what `manifest.json` is for,
   and it is the single most important thing to do on an iPad or iPhone.
2. **Take a backup.** The grown-ups panel offers *Save backup file* (a dated `.json`) and
   *Copy backup*. Past ten days of garden with no backup in a fortnight, the panel nudges you.

The app also calls `navigator.storage.persist()` on load — honoured by Chrome and Firefox,
best-effort in Safari. The panel tells you which way it went.

**Restoring merges rather than replaces.** A day already on this device is only overwritten
if the backup grew it further, so a restore can never lose progress, and re-running the same
backup twice is a no-op. Your own targets survive a restore; the backup's are adopted only if
yours are still the untouched defaults. That also makes this the cheap answer to the
two-parent problem — pass a backup between devices to combine two gardens.

## Assets

The illustrated plants are original work with no licence attached. The emoji style uses
[Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) (CC BY 4.0),
which also supplies the water, sparkles and stickers in both styles. Scenery is
[Kenney](https://kenney.nl/assets/foliage-sprites) foliage (CC0) used as tintable CSS masks,
and playback is [lottie-web](https://github.com/airbnb/lottie-web) (MIT). Full attribution
and file-by-file detail in [CREDITS.md](CREDITS.md).

Two Noto animations need care and are handled in `app.js`: 🌱 is a one-shot clip that
fades back to an empty frame, and 🐝 flies out of frame mid-loop. Both are parked on a
frame where the art is fully drawn.

## Files

```
index.html      markup
styles.css      scenery, layout, plant animation, the thirst treatment
app.js          state, growth, effects, parent panel
plants.js       the illustrated plant set — 11 species, drawn from parts
art.html        dev sheet: every species × stage × health state
assets/plants/  11 Lottie JSON — used only by the emoji style
assets/effects/ 9 Lottie JSON — water, sparkles, stickers, sun (both styles)
assets/kenney/  17 silhouette PNGs (4 in use) used as tintable CSS masks
assets/vendor/  lottie-web
```

## Ideas for v3

- Let the child choose the day's seed from two or three options.
- Seasons, so the garden background changes over months.
- A weekly recap for the parent: which behaviours came up most.
- More species — adding one is a single entry in the `ART` table in `plants.js`.
