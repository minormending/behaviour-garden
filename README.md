# Behaviour Garden

### [▶ Open the live demo](https://minormending.github.io/behaviour-garden/)

A static web app for a young child. Each day plants a seed. Watering it — earned by
being kind, and performed by the child — grows it through sprout, leaves and bud to a
flower. Every day's plant is kept, so the garden fills up over weeks.

No build step, no backend to run, and no accounts. Everything is stored in the browser's
`localStorage` and every asset is vendored into the repo.

Live sharing is the single exception, and it is off until you turn it on: it syncs the
garden through a Firebase Realtime Database and is the only thing here that touches the
network. Leave it off and the description above holds exactly.

## Running it

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

## Publishing to GitHub Pages

This repository is deployed from `main` at the repository root:

**<https://minormending.github.io/behaviour-garden/>**

To do the same elsewhere, push the folder and turn on Pages (Settings → Pages → deploy
from branch, root). The `.nojekyll` file stops Jekyll interfering with the `assets/`
folder. On a tablet, use the browser's "Add to Home Screen" — `manifest.json` makes it
open full-screen like an app, which also protects the saved garden (see
[Backups](#backups-and-why-they-matter)).

Pages serves with a ten-minute cache, so after a deploy a hard refresh may be needed
before a change shows up.

## Sizing

The whole kid-facing scene is driven off one token rather than a pile of independent
caps, so it fills a tablet instead of sitting phone-sized in the middle of one:

```css
--stage: min(92vw, 56dvh, 660px);
```

Width-bound on a phone, height-bound in landscape, capped so it stops growing on a large
monitor. Every dimension — plant, mound, buttons, icons, mood bubble, sun, scene type — is
a fraction of it, and the fractions are the ratios the old fixed px caps produced at 375px
wide, so a phone renders exactly as it did before.

| Viewport | `--stage` | Plant | Button | Scene text |
|---|---|---|---|---|
| 320×568 | 294px | 214px | 93px | 13px |
| 375×812 (phone) | 345px | 253px | 110px | 14px |
| 820×1180 (tablet) | 660px | 485px | 211px | 22px |
| 1440×900 (desktop) | 504px | 364px | 166px | 20px |
| 844×390 (landscape) | 164px | 120px | 112px | 13px |

Landscape phones get their own rule: the fixed vertical chrome costs more than a 56dvh
scene can spare, so the stage shrinks to 42dvh and the hint stops reserving three lines —
without it the plant is pushed up underneath the top bar. Tap targets never shrink below
112px however narrow the stage gets. The grown-up sheets widen to 720px and bump their
type on larger screens, and the QR grows to 460px, which makes it markedly easier to scan.

## How it works

| Screen | Who it's for |
|---|---|
| The garden | The child. Water, tap the plant, add stickers, browse past days. |
| ⚙ Grown-ups | The parent, behind a gate the child is not meant to pass. |

### Getting into the grown-ups panel

Two options, switchable in the panel itself:

- **Maths question** (default) — a two-digit multiplication. Strong: a five-year-old will
  not guess 13 × 22.
- **Hold the ⚙ button** — a 1.6-second press with a ring that sweeps round the button as it
  fills. Quicker for you, but the weaker of the two: a determined child mashing buttons can
  stumble into a long press. That trade is stated in the panel rather than buried here.

Releasing early cancels and the ring snaps back. A plain tap in hold mode gives nothing
away — it just nudges the button. The hold also works from the keyboard, so the panel is
never unreachable without a pointer. Once you are in, you stay in for the rest of the
session either way, and the choice is per-device: it is deliberately left out of the merge,
so a shared garden cannot change how the other parent gets in.

## How the plant is feeling

The droop on its own is too quiet to read at a glance, especially after a single
reminder. So a small speech bubble surfaces beside the plant for about three seconds
every nine or so, showing a face, then dissipates — a permanent face would stop being
information and become wallpaper.

| Face | When |
|---|---|
| beaming, sparkles | just watered, or just grew |
| beaming | in full bloom and content |
| smiling | growing along fine |
| smiling with a droplet | a watering is owed — tap Water |
| blank | one reminder |
| sad | two reminders |
| sad with a droplet | three reminders, the thirstiest it gets |

It also reacts immediately to anything that happens — a watering, a reminder, a repair,
or just being tapped — and then falls back into the idle rhythm.

Two deliberate lines: the saddest face is **thirsty, never distressed**, and it always
comes with a water droplet, so it reads as "I need a drink" rather than as an accusation.
The brows are the whole difference — sloping their inner ends down instead of up turns the
same face from sad into cross.

## Stickers

Once something has grown, the child can decorate it from a tray of seven stickers — tap
one to add it, tap it on the plant to take it off. They are saved with the day.

The **bee and the butterfly are alive, so they behave differently from the rest**: their
wings beat, and they wander slowly around the plant on a shallow looping path. Stars,
hearts, rainbows and sparkles stay exactly where they are put — they are decoration, not
creatures, and a star that drifts just reads as a bug.

Their wings can only run over the stretch of each animation where the creature is actually
in frame. Measured coverage: the bee leaves frame entirely from 10% to 70% of its timeline
and is steady from 80% on, and the butterfly never leaves but shrinks at both ends. The app
loops those windows — 80–100% and 10–75% — rather than the whole clip, which is why neither
blinks out of existence mid-flight.

The wander is deliberately slow and shallow, and each sticker's period and delay are
derived from its stored position so no two drift in lockstep and none of them restarts on
a re-render. Both stay over the plant at the widest point of the path, because a
five-year-old still has to be able to land a finger on one to take it off.

Under `prefers-reduced-motion` every looping animation stops outright and the two fliers
stay parked on a still frame. Shortening them instead — which is what the stylesheet used
to do — makes an infinite loop strobe rather than settle.

## The garden view

Tapping **My Garden** opens the whole garden as one place, not a list: every day's plant
laid out in rows that recede into the distance, oldest at the back, today glowing at the
front. Rows are balanced rather than filled greedily, each row gets its own plant size so
depth comes from honest layout instead of transform maths, and the hedge line is placed
just behind the back row whatever depth the garden has grown to. Tap any flower to see
which day it was.

The grid icon in the corner still opens the dated list, which is the more useful view for
a grown-up checking back over a fortnight.

## Flowers (grown-ups panel)

A collection view of all eleven species, each named whether or not it has been grown — a
silhouette is enough of a "not yet", and a parent choosing a seed needs to know what they
are picking. Grown species show the date they were last planted and the best stage they
have ever reached, with a count of how many times they have flowered. Ones that have never
appeared are silhouetted and marked "Not yet grown".

The same sheet is the **seed picker**. While today's plant is still a seed — before the
first watering — tapping any species replants today as that flower. Once the child has put
a watering into it the seed is settled and the grid goes inert, with a note saying so. The
guard is re-checked when you tap, not only when the grid is drawn.

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

### Sharing by QR

**Share by QR** draws a code holding the whole garden. Point the other phone's ordinary
camera at it, tap the link, and the app opens offering to merge. Nothing is installed, no
camera permission is asked for, and no decoder is bundled — the receiving phone's own
camera does the scanning. The data rides in the URL *fragment*, which browsers never send
to a server, so it only ever exists on the two devices. It works with no signal.

Size is the whole constraint, and it is why the behaviour log is left out. Measured on a
60-day garden: the full state is 23.8KB of JSON, still 2.5KB after gzip and base64 — which
only fits a QR at error-correction L, at 165 modules, and a code that dense loses a fight
with a phone camera. Without the log the same garden is 1.1KB and 125 modules at level M.
Leaving it out is right anyway: the log records the adult's logging habits on one device,
not the child's garden.

| Garden | Payload | Code |
|---|---|---|
| 40 days | 732 chars | 105×105 |
| 60 days | 1,097 chars | 125×125 |
| 100 days | 1,508 chars | 145×145 |
| 150 days+ | over the cap | falls back to the file backup |

Past roughly a hundred days the sheet says so plainly and points at **Save backup file**,
which has no size limit, rather than drawing a code nothing can read.

**Restoring merges rather than replaces.** A day already on this device is only overwritten
if the backup grew it further, so a restore can never lose progress, and re-running the same
backup twice is a no-op. Your own targets survive a restore; the backup's are adopted only if
yours are still the untouched defaults, and your own behaviour log and art style are never
touched. Every route in — pasted text, a file, or a scanned QR — goes through the same merge,
and every field is validated and clamped rather than trusted.

That is also the answer to the **two-parent problem**: scan one phone's QR from the other and
the two gardens combine, in either direction, as often as you like.

### Sharing live

A QR is a deliberate act every time, which is fine for moving a garden and tiring for
keeping two in step. **Live sharing** does the continuous version: turn it on in the
grown-ups panel, and the parent who did the watering is no longer the only one who sees
it. One device presses *Start sharing* and reads out a code like `MARBLE-COMET-JELLY-334`;
the other types it in. From then on both stay in step whenever they are online.

**Only the garden travels.** Three things are deliberately left behind:

| Left out | Why |
|---|---|
| The behaviour log | The same reason the QR omits it — it records one adult's logging habits, not the child's garden. It is also the bulk of the bytes: with the log a 60-day garden is 23.8KB against a 32KB room cap, so carrying it would break sync around ten weeks in. Without it, a hundred days is about 1.5KB. |
| `style` | Which art a child prefers belongs to the child in front of the screen, not to the garden. |
| `gate` | A shared garden must not be able to change how the other parent gets into their own panel. |

**Merging is the same merge.** Live sync reuses `mergeGardens` — the function a pasted
backup, a file and a scanned QR all go through. A day already here only loses to one that
grew further, so the rule the whole app is built on survives being networked: nothing a
child earned can be taken away by another device. Push a lower number at it deliberately
and the other device pulls it back up.

**Erasing is the exception, and it needs care.** An erased garden arrives as an *empty*
one, which an additive merge would shrug at — leaving the plants standing on the other
device and quietly undoing the erase. So *Erase everything* bumps an epoch that overrides
the merge everywhere, and the second confirmation names the code it is about to erase
across. Per-device preferences survive it.

**Joining is never destructive.** A device carrying sixty days that pairs with a room
someone erased last month merges into it rather than inheriting that old erase. An epoch
only erases if this device was already in the room when the bump happened.

**The code is the password.** Two things guard a garden. Each device signs in
anonymously — no email, no password, nothing anyone types, and the session is remembered
after the first run — which means wholly unauthenticated access is refused and every write
is stamped with a verifiable identity rather than a string the client made up. But
anonymous sign-in is open to anyone, so it is not what makes a room private: the code is.
Roughly 2.1 billion of them, and anyone holding one can read and write that garden.

That is a fair trade for growth stages and sticker positions, and it is exactly why nothing
else goes near it — no names, no photos, no free text a child typed. If you want a real
privacy boundary you need real accounts, which is a different app from this one.

`sync/firebase-config.js` holds public values by design: Firebase publishes them in client
code, and the protection is `sync/firebase-rules.json` — explained line by line in
`sync/RULES-EXPLAINED.md` — not their secrecy.

**The `sync/` folder is vendored, not written here.** Its canonical copy lives in
the sibling `kidsync` repo, shared with the other games. Edit it there and run
`kidsync/tools/install`; `kidsync/tools/check` fails if a copy has drifted. What
belongs to *this* app is the merge — `mergeGardens` in `app.js` — and the sharing
card in the panel.

**If it cannot start, nothing breaks.** The sync module is loaded with a dynamic import
inside a try/catch, so an unreachable CDN, a blocked domain or a missing config is a line
in the console and a garden that behaves exactly as it did before. The app is a
`localStorage` app that can sync, not a sync app that needs a network.

Free-tier limits are far past anything a family will meet: 100 devices with the app open
simultaneously, 1GB stored. There is no card on the account, so the failure mode is sync
stopping, never a bill.

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
assets/vendor/  lottie-web, and the QR encoder (loaded on demand)
sync/           vendored from ../kidsync — edit it there, not here
```

## Ideas for v3

- Let the child choose the day's seed from two or three options.
- Seasons, so the garden background changes over months.
- A weekly recap for the parent: which behaviours came up most.
- More species — adding one is a single entry in the `ART` table in `plants.js`.
