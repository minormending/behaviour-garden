'use strict';

/* ============================================================
   Hand-authored plant art.

   Why this exists: Noto's emoji are beautifully drawn but each one is a
   single sealed unit. There is no seed, no closed bud, no wilted variant,
   and no way to move a stem independently of its flower. This module draws
   every plant from parts instead, so one species definition yields all five
   growth stages and a continuous health state, and the stem, leaves and
   bloom can each animate on their own.

   Everything returns an SVG string. No files, no network, ~2KB per plant
   against 27–157KB for the equivalent Lottie.

   Coordinate contract: viewBox 0 28 200 202, the plant rooted at (100, 224)
   so `preserveAspectRatio="xMidYMax meet"` sits it on the soil mound and a
   bloom fills its frame. The box is cropped tight to the tallest species.
   ============================================================ */

const BASE_Y = 224;

const PAL = {
  stem: '#4f9e57', stemHi: '#74c477', stemDark: '#3a8145',
  leaf: '#57ab5c', leafHi: '#7ecb80', leafDark: '#3f8f49',
  seed: '#8b5a2b', seedHi: '#c69157',
};

/* ─────────────── primitives ─────────────── */

const stemPath = (topY, lean) =>
  `M100 ${BASE_Y} Q${(100 + lean * 0.35).toFixed(1)} ${((BASE_Y + topY) / 2).toFixed(1)} ${100 + lean} ${topY}`;

function stem(topY, lean, w) {
  const d = stemPath(topY, lean);
  return `<g class="p-stem">`
    + `<path d="${d}" fill="none" stroke="${PAL.stem}" stroke-width="${w}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${PAL.stemHi}" stroke-width="${(w * 0.3).toFixed(1)}"`
    + ` stroke-linecap="round" opacity=".75" transform="translate(${(-w * 0.24).toFixed(1)},0)"/>`
    + `</g>`;
}

/** A lens-shaped leaf pointing along +x from its own origin. */
const leafShape = (len, wid) =>
  `M0 0 C${(len * .3).toFixed(1)} ${-wid} ${(len * .78).toFixed(1)} ${(-wid * .92).toFixed(1)} ${len} 0`
  + ` C${(len * .78).toFixed(1)} ${(wid * .92).toFixed(1)} ${(len * .3).toFixed(1)} ${wid} 0 0Z`;

/** side: -1 left, +1 right. rot is measured as a lift from horizontal.
    Three nested groups on purpose: flutter animates the outer one, thirst
    transforms the middle one, and the inner one carries the static placement.
    Collapsing them would make CSS transform clobber the SVG attribute. */
function leaf(x, y, side, rot, len, wid, i = 0, col = PAL) {
  const cls = side < 0 ? 'p-leaf p-leaf-l' : 'p-leaf p-leaf-r';
  return `<g class="${cls}" style="--i:${i}">`
    + `<g class="p-leafdroop">`
    + `<g transform="translate(${x},${y}) scale(${side},1) rotate(${-rot})">`
    + `<path d="${leafShape(len, wid)}" fill="${col.leaf}"/>`
    + `<path d="${leafShape(len * .82, wid * .4)}" fill="${col.leafHi}" opacity=".55"`
    + ` transform="translate(${(len * .07).toFixed(1)},${(-wid * .2).toFixed(1)})"/>`
    + `<path d="M3 0 Q${(len * .5).toFixed(1)} ${(-wid * .1).toFixed(1)} ${(len * .9).toFixed(1)} 0"`
    + ` fill="none" stroke="${col.leafDark}" stroke-width="2" opacity=".45"/>`
    + `</g></g></g>`;
}

/* ─────────────── bloom builders ─────────────── */

/** Daisies, blossom, poppies, sunflowers — anything with petals around a disc. */
function radial({ n, len, w, fill, hi, cr, cfill, cdot, rot = 0, back }) {
  let s = '';
  if (back) {
    for (let i = 0; i < back.n; i++) {
      const a = rot + (i + .5) * 360 / back.n;
      s += `<ellipse cx="0" cy="${(-back.len * .55).toFixed(1)}" rx="${back.w}"`
        + ` ry="${(back.len * .55).toFixed(1)}" transform="rotate(${a.toFixed(1)})" fill="${back.fill}"/>`;
    }
  }
  for (let i = 0; i < n; i++) {
    const a = rot + i * 360 / n;
    s += `<g transform="rotate(${a.toFixed(1)})">`
      + `<ellipse cx="0" cy="${(-len * .55).toFixed(1)}" rx="${w}" ry="${(len * .55).toFixed(1)}" fill="${fill}"/>`
      + `<ellipse cx="${(-w * .26).toFixed(1)}" cy="${(-len * .64).toFixed(1)}" rx="${(w * .32).toFixed(1)}"`
      + ` ry="${(len * .28).toFixed(1)}" fill="${hi}" opacity=".45"/>`
      + `</g>`;
  }
  s += `<circle r="${cr}" fill="${cfill}"/>`;
  if (cdot) s += `<circle r="${(cr * .6).toFixed(1)}" fill="${cdot}"/>`;
  return s;
}

/** A tulip's closed cup of three overlapping petals. */
function cup({ fill, hi, dark }) {
  const petal = (dx, sc, f) =>
    `<path transform="translate(${dx},0) scale(${sc})"`
    + ` d="M0 8 C-23 -3 -25 -31 -15 -46 C-6 -57 6 -57 15 -46 C25 -31 23 -3 0 8Z" fill="${f}"/>`;
  return petal(-13, .96, dark) + petal(13, .96, dark) + petal(0, 1.04, fill)
    + `<path d="M-5 -40 C-10 -27 -10 -11 -6 1" fill="none" stroke="${hi}" stroke-width="5.5"`
    + ` stroke-linecap="round" opacity=".5"/>`;
}

/** A rose, read as outer petals wrapped around a visible spiral. */
function spiral({ fill, hi, dark }) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + 15;
    s += `<g transform="rotate(${a})">`
      + `<path d="M0 -12 C-16 -17 -23 -31 -15 -42 C-6 -51 6 -51 15 -42 C23 -31 16 -17 0 -12Z" fill="${fill}"/>`
      + `<path d="M0 -18 C-8 -21 -12 -30 -8 -37" fill="none" stroke="${hi}" stroke-width="3.5"`
      + ` stroke-linecap="round" opacity=".45"/></g>`;
  }
  s += `<circle r="25" fill="${dark}"/>`
    + `<circle r="23" cy="-2" fill="${fill}"/>`
    + `<path d="M-17 4 C-21 -11 -9 -22 3 -21 C14 -20 20 -11 18 -3 C16 4 8 7 4 3 C0 -1 2 -7 7 -8"`
    + ` fill="none" stroke="${dark}" stroke-width="4" opacity=".55" stroke-linecap="round"/>`
    + `<circle r="11" cy="-3" fill="${hi}" opacity=".35"/>`;
  return s;
}

/** Bluebells, hanging off short pedicels. */
function bells({ fill, hi, dark }) {
  const bell = (x, y, sc, f) =>
    `<g transform="translate(${x},${y}) scale(${sc})">`
    + `<path d="M-13 -9 C-13 5 -8 16 0 20 C8 16 13 5 13 -9 C13 -18 -13 -18 -13 -9Z" fill="${f}"/>`
    + `<path d="M-13 -9 C-13 -18 13 -18 13 -9 C13 -4 -13 -4 -13 -9Z" fill="${dark}" opacity=".45"/>`
    + `<path d="M-5 -4 C-6 4 -4 11 0 14" fill="none" stroke="${hi}" stroke-width="3.5"`
    + ` stroke-linecap="round" opacity=".55"/></g>`;
  return `<path d="M0 -44 L-24 -20 M0 -44 L26 -14 M0 -44 L1 -30" fill="none"`
    + ` stroke="${PAL.stemDark}" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>`
    + bell(-24, -17, 1.24, fill) + bell(26, -11, 1.12, dark) + bell(1, -31, 1.4, fill);
}

/** A little bunch — three small heads on one stalk. */
function cluster({ fill, hi, dark }) {
  const head = (x, y, sc, f) =>
    `<g transform="translate(${x},${y}) scale(${sc})">`
    + radial({ n: 6, len: 26, w: 7.5, fill: f, hi, cr: 6, cfill: '#f6c944' })
    + `</g>`;
  return `<path d="M0 -6 L-19 -20 M0 -6 L19 -18 M0 -6 L0 -26" fill="none"`
    + ` stroke="${PAL.stemDark}" stroke-width="3" stroke-linecap="round" opacity=".75"/>`
    + head(-19, -22, .95, dark) + head(19, -20, .9, fill) + head(0, -30, 1.05, fill);
}

/* ─────────────── whole-plant species ─────────────── */

function cactusBody(stage) {
  const h = stage <= 1 ? 44 : stage === 2 ? 74 : 104;
  const arms = stage >= 2;
  const spine = (x, y) =>
    `<path d="M${x} ${y} l5 -4 M${x} ${y} l5 4" stroke="#e9f5d8" stroke-width="2.2"`
    + ` stroke-linecap="round" fill="none" opacity=".85"/>`;
  let s = `<g class="p-stem">`
    + `<rect x="${100 - 19}" y="${BASE_Y - h}" width="38" height="${h}" rx="19" fill="#4f9e57"/>`
    + `<rect x="${100 - 13}" y="${BASE_Y - h + 8}" width="9" height="${h - 20}" rx="4.5" fill="#74c477" opacity=".6"/>`;
  if (arms) {
    s += `<path d="M-18 -46 q-22 0 -22 -22 v-16" transform="translate(100,${BASE_Y})"`
      + ` fill="none" stroke="#4f9e57" stroke-width="22" stroke-linecap="round"/>`
      + `<path d="M18 -66 q20 0 20 -20 v-12" transform="translate(100,${BASE_Y})"`
      + ` fill="none" stroke="#48934f" stroke-width="20" stroke-linecap="round"/>`;
  }
  for (let y = BASE_Y - h + 14; y < BASE_Y - 8; y += 17) { s += spine(107, y) + spine(89, y); }
  s += `</g>`;
  if (stage === 3) s += `<g class="p-bloom"><g class="p-nod"><g transform="translate(100,${BASE_Y - h - 4})">`
    + `<ellipse rx="9" ry="12" fill="#f2a0bd"/></g></g></g>`;
  if (stage === 4) s += `<g class="p-bloom"><g class="p-nod">`
    + `<g transform="translate(100,${BASE_Y - h - 6})">${radial({ n: 8, len: 26, w: 8, fill: '#f7b4cb', hi: '#fff', cr: 7, cfill: '#f6c944' })}</g>`
    + `<g transform="translate(${100 - 40},${BASE_Y - 84}) scale(.7)">${radial({ n: 8, len: 24, w: 7.5, fill: '#f7b4cb', hi: '#fff', cr: 6, cfill: '#f6c944' })}</g>`
    + `</g></g>`;
  return s;
}

function pineBody(stage) {
  const tiers = stage <= 1 ? 1 : stage === 2 ? 2 : 3;
  const sc    = stage <= 1 ? .58 : stage === 2 ? .82 : 1;
  const trunk = 30 * sc;
  let s = `<g class="p-stem"><rect x="${100 - 6 * sc}" y="${BASE_Y - trunk}" width="${12 * sc}"`
    + ` height="${trunk}" rx="4" fill="#8b5a2b"/></g>`;
  s += `<g class="p-leaves">`;
  for (let i = 0; i < tiers; i++) {
    const y = BASE_Y - trunk + 4 - i * 34 * sc;
    const w = (62 - i * 15) * sc;
    const hgt = 62 * sc;
    s += `<path d="M100 ${(y - hgt).toFixed(1)} L${(100 + w).toFixed(1)} ${y.toFixed(1)}`
      + ` L${(100 - w).toFixed(1)} ${y.toFixed(1)}Z" fill="${i % 2 ? '#3f8f49' : '#47a052'}"/>`;
  }
  s += `</g>`;
  const top = BASE_Y - trunk + 4 - (tiers - 1) * 34 * sc - 62 * sc;
  if (stage === 4) s += `<g class="p-bloom"><g class="p-nod"><g transform="translate(100,${(top - 8).toFixed(1)})">`
    + `<path d="M0 -15 L5 -5 L15 0 L5 5 L0 15 L-5 5 L-15 0 L-5 -5Z" fill="#ffd24a"/></g></g></g>`;
  return s;
}

function cloverBody(stage) {
  const n = stage <= 1 ? 2 : stage === 2 ? 3 : 4;
  const top = stage <= 1 ? 176 : stage === 2 ? 150 : 132;
  const sc = stage <= 1 ? .55 : stage === 2 ? .8 : 1;
  let s = stem(top, 0, 9);
  s += `<g class="p-leaves">`;
  for (let i = 0; i < n; i++) {
    const a = -90 + (i - (n - 1) / 2) * (n === 4 ? 90 : 105);
    s += `<g class="p-leaf" style="--i:${i}"><g class="p-leafdroop">`
      + `<g transform="translate(100,${top}) rotate(${a.toFixed(1)}) scale(${sc})">`
      + `<path d="M0 -6 C-13 -10 -30 -26 -21 -40 C-14 -50 -2 -45 0 -30 C2 -45 14 -50 21 -40 C30 -26 13 -10 0 -6Z"`
      + ` fill="${i % 2 ? '#4f9e57' : '#5cb85f'}"/>`
      + `<path d="M0 -8 C-8 -14 -16 -26 -13 -35" fill="none" stroke="#7ecb80" stroke-width="3"`
      + ` stroke-linecap="round" opacity=".5"/>`
      + `</g></g></g>`;
  }
  s += `</g>`;
  if (stage === 3) s += `<g class="p-bloom"><g class="p-nod">`
    + `<g transform="translate(100,${top - 34})"><ellipse rx="10" ry="13" fill="#eef6ef"/></g></g></g>`;
  if (stage === 4) s += `<g class="p-bloom"><g class="p-nod"><g transform="translate(100,${top - 38})">`
    + `<circle r="17" fill="#f7fbf8"/>`
    + radial({ n: 12, len: 26, w: 6.5, fill: '#ffffff', hi: '#e8f1ea', cr: 8, cfill: '#f6c944', cdot: '#e0a52c' })
    + `</g></g></g>`;
  return s;
}

/* ─────────────── the species table ─────────────── */

/* `id` is the stable key stored against a day and must never change — the
   original eight match their Noto codepoint so v1 gardens keep rendering.
   `cp` is the Noto file used when the emoji style is selected. */
const ART = [
  { id: '1f339', cp: '1f339', name: 'Rose', bud: '#e0566b',
    leafCol: { leaf: '#3f8f49', leafHi: '#63b46a', leafDark: '#2f7038' }, leafLen: .95, leafWid: 1.1,
    bloom: () => spiral({ fill: '#e35d75', hi: '#f79cae', dark: '#b83f57' }) },

  { id: '1f337', cp: '1f337', name: 'Tulip', bud: '#e8683f',
    leafLen: 1.18, leafWid: .72,
    bloom: () => cup({ fill: '#ec6a8f', hi: '#ffc0d4', dark: '#c94b73' }) },

  { id: '1f338', cp: '1f338', name: 'Blossom', bud: '#f2a0bd',
    bloom: () => radial({ n: 5, len: 46, w: 17, fill: '#f8b8ce', hi: '#ffffff', cr: 11, cfill: '#f6c944', cdot: '#d9822b' }) },

  { id: '1f33c', cp: '1f33c', name: 'Daisy', bud: '#f6c944',
    bloom: () => radial({ n: 14, len: 44, w: 7.5, fill: '#ffffff', hi: '#eef4ef', cr: 14, cfill: '#f6c944', cdot: '#e0a52c' }) },

  { id: '1f490', cp: '1f490', name: 'Posy', bud: '#ef7d9d',
    bloom: () => cluster({ fill: '#ef7d9d', hi: '#ffffff', dark: '#c95f80' }) },

  { id: '1f340', cp: '1f340', name: 'Lucky Clover', bud: '#5fbf5f', custom: cloverBody },

  { id: '1f335', cp: '1f335', name: 'Cactus', bud: '#4fa35a', custom: cactusBody },

  { id: '1f332', cp: '1f332', name: 'Little Pine', bud: '#3f8a55', custom: pineBody },

  /* New species — the illustrated set is not limited to what Noto animates. */
  { id: 'sunflower', cp: '1f33c', name: 'Sunflower', bud: '#f2b229',
    leafCol: { leaf: '#3f8f49', leafHi: '#63b46a', leafDark: '#2f7038' }, leafLen: 1.05, leafWid: 1.35,
    bloom: () => radial({
      n: 13, len: 46, w: 11, fill: '#ffc93c', hi: '#ffe79a', cr: 17, cfill: '#7a4a22', cdot: '#5d3417',
      back: { n: 13, len: 40, w: 10, fill: '#e2a521' },
    }) },

  { id: 'bluebell', cp: '1f490', name: 'Bluebell', bud: '#8e7bd8',
    leafCol: { leaf: '#5cb85f', leafHi: '#86d089', leafDark: '#42904b' }, leafLen: 1.25, leafWid: .5,
    bloom: () => bells({ fill: '#8e7bd8', hi: '#d6ccff', dark: '#6f5cbb' }) },

  { id: 'poppy', cp: '1f339', name: 'Poppy', bud: '#e8503c',
    leafLen: .9, leafWid: .78,
    bloom: () => radial({ n: 5, len: 48, w: 21, fill: '#ea5240', hi: '#ff9d8c', cr: 10, cfill: '#4a3229', cdot: '#241713', rot: 20 }) },
];

const artOf = id => ART.find(s => s.id === id) || ART[0];

/* ─────────────── stage geometry ─────────────── */

const STAGE = [
  null,
  { top: 172, lean: 0,  w: 9,  leaf: [{ y: 182, len: 34, wid: 15, rot: 26 }] },
  { top: 134, lean: -4, w: 10, leaf: [{ y: 176, len: 42, wid: 18, rot: 20 }, { y: 148, len: 32, wid: 13, rot: 34 }] },
  { top: 100, lean: 4,  w: 11, leaf: [{ y: 180, len: 46, wid: 19, rot: 18 }, { y: 146, len: 36, wid: 15, rot: 30 }] },
  { top: 94,  lean: -3, w: 11, leaf: [{ y: 182, len: 48, wid: 20, rot: 16 }, { y: 148, len: 38, wid: 16, rot: 30 }] },
];

const seedArt = () =>
  `<g class="p-stem"><g transform="translate(100,${BASE_Y - 14})">`
  + `<path d="M0-15c9 0 15 7 15 14S9 13 0 13-15 6-15-1-9-15 0-15Z" fill="${PAL.seed}"/>`
  + `<path d="M-6-9c4-2 9-2 12 2" stroke="${PAL.seedHi}" stroke-width="4" stroke-linecap="round" fill="none"/>`
  + `</g></g>`;

function budArt(sp, g) {
  return `<g class="p-bloom"><g class="p-nod"><g transform="translate(${100 + g.lean},${g.top})">`
    + `<path d="M0-46 C22-29 29-8 20 8 C12 21-12 21-20 8 C-29-8-22-29 0-46Z" fill="${sp.bud}"/>`
    + `<path d="M-2-38 C7-24 10-7 7 6" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M-19 4 C-9 14 9 14 19 4 C13 16-13 16-19 4Z" fill="${PAL.stemDark}"/>`
    + `</g></g></g>`;
}

/**
 * Build one plant.
 * @param {string} id      species id
 * @param {number} stage   0 seed · 1 sprout · 2 leaves · 3 bud · 4 bloom
 * @param {boolean} popped add the bloom-in flourish
 */
function buildPlant(id, stage, popped = false) {
  const sp = artOf(id);
  let body;

  if (stage === 0) {
    body = seedArt();
  } else if (sp.custom) {
    body = sp.custom(stage);
  } else {
    const g = STAGE[stage];
    const kL = sp.leafLen ?? 1, kW = sp.leafWid ?? 1, col = sp.leafCol || PAL;
    body = stem(g.top, g.lean, g.w)
      + `<g class="p-leaves">`
      + g.leaf.map((l, i) =>
          leaf(100, l.y, i % 2 ? 1 : -1, l.rot, l.len * kL, l.wid * kW, i, col)
          + leaf(100, l.y + 3, i % 2 ? -1 : 1, l.rot - 6, l.len * .86 * kL, l.wid * .9 * kW, i + 1, col)
        ).join('')
      + `</g>`;
    if (stage === 3) body += budArt(sp, g);
    if (stage === 4) body += `<g class="p-bloom"><g class="p-nod">`
      + `<g transform="translate(${100 + g.lean},${g.top})">${sp.bloom()}</g></g></g>`;
  }

  return `<svg class="plantsvg${popped ? ' popped' : ''}" viewBox="0 28 200 202"`
    + ` preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">`
    + `<g class="p-droop"><g class="p-sway">${body}</g></g></svg>`;
}

const STAGE_LABEL = ['A seed', 'A little sprout', 'Growing leaves', 'A bud!'];

/* ─────────────── how the plant is feeling ───────────────
   The droop alone is too quiet to read at a glance, especially at one
   reminder. A face states it outright. The saddest face is thirsty, never
   distressed, and it comes with a droplet so it reads as "I need a drink"
   rather than as an accusation. */

const FACE_INK = '#3b4a3d';

function buildFace(mood) {
  const dot = (x, y, r = 6.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${FACE_INK}"/>`;
  const archEye = (x, y) =>
    `<path d="M${x - 10} ${y + 4} Q${x} ${y - 9} ${x + 10} ${y + 4}" fill="none"`
    + ` stroke="${FACE_INK}" stroke-width="6" stroke-linecap="round"/>`;
  const smile = (w, d) =>
    `<path d="M${50 - w} 60 Q50 ${60 + d} ${50 + w} 60" fill="none"`
    + ` stroke="${FACE_INK}" stroke-width="6" stroke-linecap="round"/>`;
  const grin = () => `<path d="M27 55 Q50 86 73 55 Q50 66 27 55Z" fill="${FACE_INK}"/>`;
  const frown = (w, d) =>
    `<path d="M${50 - w} 68 Q50 ${68 - d} ${50 + w} 68" fill="none"`
    + ` stroke="${FACE_INK}" stroke-width="6" stroke-linecap="round"/>`;
  const flat = () => `<path d="M37 65 H63" fill="none" stroke="${FACE_INK}" stroke-width="6" stroke-linecap="round"/>`;
  const cheeks = () =>
    `<circle cx="20" cy="57" r="7.5" fill="#f7a2a2" opacity=".8"/>`
    + `<circle cx="80" cy="57" r="7.5" fill="#f7a2a2" opacity=".8"/>`;
  /* Inner ends RAISED. Sloping them down instead is the single line that turns
     this face from "I need a drink" into "I am cross with you". */
  const brows = () =>
    `<path d="M23 35 Q32 29 41 27" fill="none" stroke="${FACE_INK}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M77 35 Q68 29 59 27" fill="none" stroke="${FACE_INK}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
  const drop = () =>
    `<path d="M84 12 c6 9 9 13 9 17.5 a9 9 0 0 1-18 0 C75 25 78 21 84 12Z" fill="#5bc0eb"/>`
    + `<path d="M80 27 a4 4 0 0 0 4 4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`;
  const sparks = () =>
    `<path d="M12 22 l3 -7 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3Z" fill="#ffd24a"/>`
    + `<path d="M86 66 l2.4 -5.5 2.4 5.5 5.5 2.4 -5.5 2.4 -2.4 5.5 -2.4 -5.5 -5.5 -2.4Z" fill="#ffd24a"/>`;

  let f;
  switch (mood) {
    case 'yay':     f = archEye(34, 44) + archEye(66, 44) + grin() + cheeks() + sparks(); break;
    case 'beam':    f = archEye(34, 44) + archEye(66, 44) + grin() + cheeks(); break;
    case 'hopeful': f = dot(34, 42) + dot(66, 42) + smile(16, 14) + drop(); break;
    case 'meh':     f = dot(34, 44) + dot(66, 44) + flat(); break;
    case 'sad':     f = brows() + dot(34, 49) + dot(66, 49) + frown(15, 10); break;
    case 'thirsty': f = brows() + dot(34, 49) + dot(66, 49) + frown(17, 12) + drop(); break;
    default:        f = dot(34, 43) + dot(66, 43) + smile(17, 15); break;   // 'happy'
  }
  return `<svg class="facesvg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${f}</svg>`;
}
