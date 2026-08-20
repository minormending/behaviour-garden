'use strict';

/* ============================================================
   Behaviour Garden

   Design rules baked into this file, on purpose:
     • Growth is additive only. Nothing a child earns is ever taken away.
     • A rough moment makes today's plant THIRSTY, never dying, and one
       watering always brings it back.
     • Yesterday's garden is permanent and untouchable.
     • The grown-up observes; the child performs the watering.
   ============================================================ */

const KEY   = 'behaviour-garden/v1';
const PLANT = 'assets/plants/';
const FX    = 'assets/effects/';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ─────────────── species ─────────────── */

/* The species table lives in plants.js so the art and the data agree.
   `id` is the stable key stored against a day; `cp` is the Noto file used
   when the emoji style is selected. */
const SPECIES = ART;
const speciesOf = id => SPECIES.find(s => s.id === id) || SPECIES[0];

const STAGE_NAMES = ['A seed', 'A little sprout', 'Growing leaves', 'A bud!'];
const STICKERS = ['1f41d','1f98b','2b50','1f31f','1f496','1f308','2728'];

/* hand-drawn stages — Noto has no seed or closed bud */
const SEED_SVG = `<svg viewBox="0 0 200 200"><g transform="translate(100,168)">
  <path d="M0-26c15 0 25 12 25 24S15 22 0 22-25 10-25 -2 -15-26 0-26Z" fill="#8b5a2b"/>
  <path d="M-9-15c6-4 15-3 19 3" stroke="#c69157" stroke-width="6" stroke-linecap="round" fill="none"/>
</g></svg>`;

const budSVG = tint => `<svg viewBox="0 0 200 200">
  <path d="M100 178V96" stroke="#4a9a52" stroke-width="10" stroke-linecap="round" fill="none"/>
  <path d="M100 144c-27-2-42-17-44-36 27-2 42 13 44 36Z" fill="#5cb85f"/>
  <path d="M100 128c27-2 42-17 44-36-27-2-42 13-44 36Z" fill="#6cc76f"/>
  <path d="M100 36c23 17 32 38 23 57-9 16-37 16-46 0-9-19 0-40 23-57Z" fill="${tint}"/>
  <path d="M100 46c9 16 12 34 8 50" stroke="rgba(255,255,255,.38)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <ellipse cx="100" cy="96" rx="22" ry="9" fill="#4a9a52"/>
</svg>`;

/* ─────────────── state ─────────────── */

const DEFAULTS = {
  v: 1,
  targets: ['Gentle hands', 'Come the first time I call', 'Shoes on before the timer'],
  days: {},
  log: [],
  lastBackup: 0,
  style: 'illustrated',
  gate: 'maths',
};

const ymd = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const shiftDay = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) { console.warn('could not read save', e); }
  return structuredClone(DEFAULTS);
}
let S = load();

/* Live sync is optional and lives further down the file. These three flags are
   declared up here because save() is the one choke point every mutation already
   passes through, which makes it the only honest place to notice a change. */
let syncHandle   = null;    // the kidsync instance; null until (and unless) it boots
let syncPushing  = false;   // set while we write, so we can ignore our own echo
let syncApplying = false;   // set while a remote garden lands, to avoid a write loop

const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('could not save', e); }
  syncPush();
};

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function pickSpecies(key) {
  let i = hash(key) % SPECIES.length;
  const prev = S.days[shiftDay(key, -1)];
  if (prev && prev.species === SPECIES[i].id) i = (i + 1) % SPECIES.length;
  return SPECIES[i].id;
}

/** Today's plot — created on first open of the day. */
function today() {
  const k = ymd();
  if (!S.days[k]) {
    // A brilliant afternoon shouldn't be wasted just because the plant was already
    // in full bloom — up to two unused waterings come with you into the new day.
    const prev = S.days[shiftDay(k, -1)];
    const carried = prev ? Math.min(2, prev.water || 0) : 0;
    if (prev) prev.water = 0;
    S.days[k] = { species: pickSpecies(k), growth: 0, thirst: 0, water: carried, stickers: [] };
    save();
  }
  return S.days[k];
}

const stageOf = g => Math.min(4, Math.floor(g / 25));

function streak() {
  let n = 0, k = ymd();
  if (!S.days[k] || stageOf(S.days[k].growth) < 4) k = shiftDay(k, -1);
  while (S.days[k] && stageOf(S.days[k].growth) === 4) { n++; k = shiftDay(k, -1); }
  return n;
}

/* ─────────────── lottie plumbing ─────────────── */

const jsonCache = new Map();
function getJSON(url) {
  if (!jsonCache.has(url)) {
    jsonCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); }));
  }
  return jsonCache.get(url);
}

async function mountLottie(el, url, opts = {}) {
  let data;
  try { data = await getJSON(url); }
  catch (e) { console.warn('missing animation', url); return null; }
  const anim = lottie.loadAnimation({
    container: el,
    renderer: 'svg',
    loop: opts.loop !== false,
    autoplay: opts.autoplay !== false,
    animationData: structuredClone(data),           // lottie mutates its input
    rendererSettings: { progressiveLoad: true, preserveAspectRatio: 'xMidYMid meet' },
  });
  if (opts.speed) anim.setSpeed(opts.speed);
  return anim;
}

/* Noto's animations are not uniform, and two of them will bite you:
   • 🌱 seedling is a one-shot "birth" clip — it grows in, then fades back to
     an empty frame. Looping it leaves the plot blank most of the time.
   • 🐝 bee flies right out of frame mid-loop.
   So plants hold at the frame where the art is fully drawn, and stickers —
   which are decoration, not animation — are parked on their best frame. */
const PLANT_HOLD   = { '1f331': 0.55 };
const STICKER_PEAK = { '1f98b': 0.5, '1f31f': 0.5, '1f308': 0.5 };

/* The bee and the butterfly are the only stickers that are alive, so they are
   the only ones that fly. Stars, hearts and rainbows stay put — they are
   decoration, and a drifting star just looks like a bug.

   Their wings can only run over the stretch of timeline where the creature is
   actually in frame and centred. Measured coverage: the bee leaves frame
   entirely from 10% to 70% and is steady from 80% on; the butterfly never
   leaves but shrinks at both ends. Loop those windows, not the whole clip. */
const FLY_SEGMENT = { '1f41d': [0.80, 1.0], '1f98b': [0.10, 0.75] };

const stillness = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function mountPlant(host, cp, speed = 0.7) {
  const hold = PLANT_HOLD[cp];
  const a = await mountLottie(host, PLANT + cp + '.json',
    { loop: !hold, autoplay: !hold, speed });
  // Jump straight to the fully-drawn frame — playing the 9s intro would leave
  // the plot empty every time the app opens. The intro is a reward, not a load screen.
  if (a && hold) a.goToAndStop(Math.floor(a.totalFrames * hold), true);
  return a;
}

/** A plant frozen on the frame where its art is fully drawn. */
async function mountPlantStill(host, cp) {
  const a = await mountLottie(host, PLANT + cp + '.json', { loop: false, autoplay: false });
  if (a) a.goToAndStop(Math.floor(a.totalFrames * (PLANT_HOLD[cp] ?? 0)), true);
  return a;
}

async function mountSticker(host, cp) {
  const seg = FLY_SEGMENT[cp];
  if (seg && !stillness()) {
    const a = await mountLottie(host, FX + cp + '.json', { loop: true, autoplay: false });
    if (a) a.playSegments([Math.floor(a.totalFrames * seg[0]), Math.floor(a.totalFrames * seg[1])], true);
    return a;
  }
  const a = await mountLottie(host, FX + cp + '.json', { loop: false, autoplay: false });
  if (a) a.goToAndStop(Math.floor(a.totalFrames * (STICKER_PEAK[cp] ?? 0)), true);
  return a;
}

/** Where the plant sits, in #plotWrap coordinates. */
function plantCenter() {
  const p = $('#plantBox').getBoundingClientRect();
  const w = $('#plotWrap').getBoundingClientRect();
  return { x: p.left - w.left + p.width / 2, y: p.top - w.top + p.height / 2, w: p.width };
}

async function fx(cp, x, y, size = 84, speed = 1) {
  const el = document.createElement('div');
  el.className = 'fx';
  el.style.cssText = `left:${x}px; top:${y}px; width:${size}px; height:${size}px`;
  $('#fxLayer').appendChild(el);
  const a = await mountLottie(el, FX + cp + '.json', { loop: false, speed });
  if (!a) { el.remove(); return; }
  // lottie's 'complete' does not always fire (throttled tabs, backgrounded sheets),
  // so back it with a hard timer — otherwise effect nodes pile up all session.
  let dead = false;
  const kill = () => { if (dead) return; dead = true; try { a.destroy(); } catch (e) {} el.remove(); };
  a.addEventListener('complete', kill);
  const ms = (a.totalFrames / (a.frameRate || 30)) * 1000 / (speed || 1);
  setTimeout(kill, Math.max(2000, ms + 800));
}

const rand = (a, b) => a + Math.random() * (b - a);

/* ─────────────── rendering ─────────────── */

let plantAnim = null, plantSig = '', plantCp = '';

async function renderPlant() {
  const d  = today();
  const st = stageOf(d.growth);
  const sp = speciesOf(d.species);
  const illustrated = S.style !== 'emoji';
  const sig = st + ':' + d.species + ':' + (illustrated ? 'art' : 'emoji');

  if (sig !== plantSig) {
    const justBloomed = plantSig !== '' && st === 4;
    plantSig = sig;
    if (plantAnim) { plantAnim.destroy(); plantAnim = null; }
    const host = $('#plantAnim');
    host.innerHTML = '';
    if (illustrated) {
      host.innerHTML = buildPlant(sp.id, st, justBloomed);
    } else if (st === 0) {
      host.innerHTML = SEED_SVG;
    } else if (st === 3) {
      host.innerHTML = budSVG(sp.bud);
    } else {
      plantCp = st === 1 ? '1f331' : st === 2 ? '1f33f' : sp.cp;
      plantAnim = await mountPlant(host, plantCp);
    }
  }

  const box = $('#plantBox');
  box.classList.toggle('illustrated', illustrated);
  $('#faceBubble').style.top = FACE_TOP[st];
  box.style.setProperty('--droop', (d.thirst / 3).toFixed(2));
  box.classList.toggle('thirsty', d.thirst > 0);

  $('#plantName').textContent = st === 4 ? sp.name + '!' : STAGE_NAMES[st];
  renderChrome();
  renderStickers();
}

function renderChrome() {
  const d = today();
  const st = stageOf(d.growth);

  $('#waterCount').textContent = d.water;
  $('#waterCount').hidden      = d.water === 0;
  $('#waterBtn').disabled      = d.water === 0;

  $('#dateChip').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long' });
  const n = streak();
  const chip = $('#streakChip');
  chip.hidden = n < 2;
  chip.textContent = '🔥 ' + n + ' days blooming';

  $('#hint').textContent =
    d.thirst > 0            ? 'Your plant is thirsty. A watering will perk it right back up.' :
    st === 4 && d.water > 0 ? 'All grown! Spare waterings keep until tomorrow 🌙' :
    st === 4                ? 'It bloomed! Add some stickers 🌟' :
    d.water > 0             ? 'Tap Water to help it grow!' :
                              'Ask a grown-up for a watering 💧';
}

function renderStickers() {
  const d = today(), layer = $('#stickerLayer');
  layer.innerHTML = '';
  d.stickers.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'sticker' + (FLY_SEGMENT[s.cp] ? ' flier' : '');
    el.style.left = s.x + '%';
    el.style.top  = s.y + '%';
    if (FLY_SEGMENT[s.cp]) {
      // Derived from the stored position rather than random, so a sticker keeps
      // the same wandering rhythm across re-renders instead of restarting.
      el.style.setProperty('--dur', (21 + (s.x % 13)) + 's');
      el.style.setProperty('--del', (0.6 + (s.y % 6) * 0.8).toFixed(1) + 's');
    }
    layer.appendChild(el);
    mountSticker(el, s.cp);
    el.addEventListener('click', () => { d.stickers.splice(i, 1); save(); renderStickers(); });
  });
}

function replayPlant() {
  if (S.style !== 'emoji') return;   // CSS drives the illustrated plants
  if (!plantAnim) return;
  const hold = PLANT_HOLD[plantCp];
  if (hold) plantAnim.playSegments([0, Math.floor(plantAnim.totalFrames * hold)], true);
  else plantAnim.goToAndPlay(0);
}

/* ─────────────── the mood bubble ───────────────
   It surfaces for a few seconds and goes again, rather than sitting there —
   a constant face would stop being information and become wallpaper. */

const FACE_HOLD = 2900;   // how long it lingers
const FACE_GAP  = 5200;   // and how long until it comes back

/* A seed sits at the bottom of the plot and a bloom fills it, so the bubble
   has to follow the plant up as it grows or it ends up talking to thin air. */
const FACE_TOP = ['58%', '43%', '29%', '15%', '11%'];

let faceShowTimer = 0, faceHideTimer = 0;

/** Read the plant's feelings off today's record. */
function moodNow() {
  const d = today();
  const st = stageOf(d.growth);
  if (d.thirst >= 3) return 'thirsty';
  if (d.thirst === 2) return 'sad';
  if (d.thirst === 1) return 'meh';
  if (d.water > 0 && st < 4) return 'hopeful';   // asks for the drink it is owed
  if (st === 4) return 'beam';
  return 'happy';
}

function paintFace(mood) {
  const b = $('#faceBubble');
  b.innerHTML = buildFace(mood);
  b.classList.add('show');
}

function hideFace() {
  $('#faceBubble').classList.remove('show');
}

/** The idle rhythm: appear, linger, dissipate, wait, repeat. */
function faceBeat() {
  paintFace(moodNow());
  faceHideTimer = setTimeout(() => {
    hideFace();
    faceShowTimer = setTimeout(faceBeat, FACE_GAP);
  }, FACE_HOLD);
}

function startFaceLoop(delay = 900) {
  clearTimeout(faceShowTimer);
  clearTimeout(faceHideTimer);
  faceShowTimer = setTimeout(faceBeat, delay);
}

/** Something just happened — react at once, then fall back into the rhythm. */
function flashFace(mood, hold = 3400) {
  clearTimeout(faceShowTimer);
  clearTimeout(faceHideTimer);
  paintFace(mood || moodNow());
  faceHideTimer = setTimeout(() => {
    hideFace();
    faceShowTimer = setTimeout(faceBeat, FACE_GAP);
  }, hold);
}

function bump() {
  const b = $('#plantBox');
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('pop');
}

/* ─────────────── the child's one action ─────────────── */

async function doWater() {
  const d = today();
  if (d.water <= 0) return;

  d.water--;
  d.thirst = Math.max(0, d.thirst - 1);         // a drink always helps
  const before = stageOf(d.growth);
  d.growth = Math.min(100, d.growth + 25);      // and always grows
  save();

  const c = plantCenter();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => fx('1f4a7', c.x + rand(-.4, .4) * c.w, c.y - c.w * .25 + rand(0, .45) * c.w, rand(42, 66), 1.3), i * 90);
  }
  bump();
  await renderPlant();
  replayPlant();

  const after = stageOf(d.growth);
  if (after > before) {
    setTimeout(() => {
      for (let i = 0; i < 3; i++) fx('2728', c.x + rand(-.5, .5) * c.w, c.y + rand(-.45, .25) * c.w, 82);
    }, 420);
  }
  if (after === 4 && before < 4) celebrate(c);
  flashFace(after > before ? 'yay' : moodNow());
}

function celebrate(c) {
  setTimeout(() => fx('1f308', c.x, c.y - c.w * .55, c.w * 1.15, .8), 300);
  ['2b50','1f31f','1f496','2728','2b50'].forEach((cp, i) =>
    setTimeout(() => fx(cp, c.x + rand(-.75, .75) * c.w, c.y + rand(-.6, .4) * c.w, rand(56, 92)), 480 + i * 150));
}

/* ─────────────── stickers ─────────────── */

function buildTray() {
  const tray = $('#stickerTray');
  tray.innerHTML = '';
  STICKERS.forEach(cp => {
    const b = document.createElement('button');
    b.type = 'button';
    tray.appendChild(b);
    const host = document.createElement('div');
    host.style.cssText = 'width:100%;height:100%';
    b.appendChild(host);
    mountSticker(host, cp);
    b.addEventListener('click', () => { addSticker(cp); });
  });
}

function addSticker(cp) {
  const d = today();
  if (d.stickers.length >= 8) return;
  d.stickers.push({ cp, x: Math.round(rand(4, 72)), y: Math.round(rand(2, 66)) });
  save();
  renderStickers();
}

/* ─────────────── garden history ─────────────── */

function renderGarden() {
  const grid = $('#gardenGrid');
  grid.innerHTML = '';

  const keys = Object.keys(S.days).sort();
  const bloomed = keys.filter(k => stageOf(S.days[k].growth) === 4).length;
  $('#listSummary').textContent =
    `${keys.length} day${keys.length === 1 ? '' : 's'} planted · ${bloomed} in full bloom`;

  keys.reverse().forEach(k => {
    const cell = document.createElement('div');
    cell.className = 'cell' + (k === ymd() ? ' today' : '');
    cell.dataset.k = k;
    cell.innerHTML = `<div class="pot"><div></div></div><small>${labelDate(k)}</small>`;
    grid.appendChild(cell);
    fillCell(cell);
  });

  if (!keys.length) grid.innerHTML = '<p class="muted small">Your first plant is waiting outside.</p>';
}

function labelDate(k) {
  if (k === ymd()) return 'Today';
  if (k === shiftDay(ymd(), -1)) return 'Yesterday';
  return new Date(k + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Draw one day's plant into `host`, in whichever art style is active. */
function paintPlant(host, d) {
  const st = stageOf(d.growth);
  const sp = speciesOf(d.species);
  if (S.style !== 'emoji') { host.innerHTML = buildPlant(sp.id, st); return; }
  if (st === 0) { host.innerHTML = SEED_SVG; return; }
  if (st === 3) { host.innerHTML = budSVG(sp.bud); return; }
  // Parked, not playing: a stopped Lottie is static SVG with no ticker behind it,
  // so the garden stays flat-cost however many days it holds.
  mountPlantStill(host, st === 1 ? '1f331' : st === 2 ? '1f33f' : sp.cp);
}

function fillCell(cell) {
  paintPlant(cell.querySelector('.pot > div'), S.days[cell.dataset.k]);
}

/* ─────────────── the garden as one place ─────────────── */

/** Split the days into rows that recede: oldest at the back, today at the front. */
function bedRows(keys) {
  const w = $('#bed').clientWidth - 24;
  const base = Math.min(110, Math.max(56, w / 5.2));
  const maxPer = Math.max(3, Math.min(12, Math.floor(w / (base * .9))));
  const n = keys.length;
  // Balance the rows rather than filling greedily, or a 15th plant ends up
  // standing on its own in front of a row of fourteen.
  const rowCount = Math.max(1, Math.ceil(n / maxPer));
  const per = Math.ceil(n / rowCount);
  const rows = [];
  for (let i = 0; i < n; i += per) rows.push(keys.slice(i, i + per));
  return { rows, base };
}


/** Oldest on the left, today on the right, planted in two bands for depth. */
function renderMeadow() {
  const row = $('#bedRows');
  row.innerHTML = '';
  $('#plotLabel').hidden = true;
  $$('.scene-empty').forEach(e => e.remove());

  $('#gardenSheet').classList.toggle('emoji', S.style === 'emoji');

  const keys = Object.keys(S.days).sort();
  const bloomed = keys.filter(k => stageOf(S.days[k].growth) === 4).length;
  $('#gardenSummary').textContent = keys.length
    ? `${keys.length} plant${keys.length === 1 ? '' : 's'} · ${bloomed} in full bloom`
    : '';

  if (!keys.length) {
    const p = document.createElement('p');
    p.className = 'scene-empty';
    p.textContent = 'Your first plant is waiting outside 🌱';
    $('#gardenSheet').appendChild(p);
    $('#bedHint').hidden = true;
    return;
  }
  $('#bedHint').hidden = false;

  const { rows, base } = bedRows(keys);
  rows.forEach((rowKeys, r) => {
    // 0 at the back, 1 at the front. A single row still reads as the front row.
    const depth = rows.length === 1 ? 1 : r / (rows.length - 1);
    const el = document.createElement('div');
    el.className = 'brow';
    el.style.setProperty('--pw', Math.round(base * (0.56 + 0.44 * depth)) + 'px');
    el.style.filter = depth === 1 ? '' : `saturate(${(0.86 + 0.14 * depth).toFixed(2)}) brightness(${(1.07 - 0.07 * depth).toFixed(2)})`;
    rowKeys.forEach(k => {
      const plot = document.createElement('button');
      plot.type = 'button';
      plot.className = 'plot' + (k === ymd() ? ' today' : '');
      plot.dataset.k = k;
      plot.innerHTML = '<div class="pplant"></div><div class="pmound"></div>';
      el.appendChild(plot);
      paintPlant(plot.querySelector('.pplant'), S.days[k]);
      plot.addEventListener('click', () => showPlotLabel(k));
    });
    row.appendChild(el);
  });

  // Newest is at the bottom, so start there.
  const m = $('#bed');
  m.scrollTop = m.scrollHeight;
  $('#bedHint').classList.remove('gone');
  placeHorizon(row);
}

/** Put the hedge line just behind the back row, whatever depth the garden is. */
function placeHorizon(row) {
  const sheet = $('#gardenSheet');
  const h = sheet.clientHeight;
  if (!h) return;
  // #bedRows is min-height:100% with the rows pinned to its bottom, so measure
  // the first actual row rather than the wrapper.
  const first = row.querySelector('.brow');
  if (!first) return;
  const top = first.getBoundingClientRect().top;
  const pct = (h - top + 22) / h * 100;
  sheet.style.setProperty('--horizon', Math.min(76, Math.max(28, pct)).toFixed(1) + '%');
}

let labelTimer = 0;
function showPlotLabel(k) {
  const d = S.days[k];
  const st = stageOf(d.growth);
  const sp = speciesOf(d.species);
  const el = $('#plotLabel');
  el.textContent = `${labelDate(k)} — ${st === 4 ? sp.name : STAGE_NAMES[st]}`;
  el.hidden = false;
  $('#bedHint').classList.add('gone');
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ─────────────── the species collection ─────────────── */

/** How far each species has ever got, across the whole garden. */
function speciesStats() {
  const stats = {};
  SPECIES.forEach(s => { stats[s.id] = { days: 0, blooms: 0, best: -1, last: null }; });
  Object.entries(S.days).forEach(([k, d]) => {
    const st = stats[d.species];
    if (!st) return;
    const g = stageOf(d.growth);
    st.days++;
    if (g > st.best) st.best = g;
    if (g === 4) st.blooms++;
    if (!st.last || k > st.last) st.last = k;
  });
  return stats;
}

const REACHED = ['Still a seed', 'Reached a sprout', 'Reached leaves', 'Reached a bud'];

function renderFlowers() {
  const stats = speciesStats();
  const grid = $('#flowerGrid');
  const cur = S.days[ymd()];   // not today(): never create a day just by looking
  // The seed can only be swapped before the first watering — after that the
  // child has put something into this plant and it is not ours to change.
  const canPick = !!cur && stageOf(cur.growth) === 0;

  const grown = SPECIES.filter(s => stats[s.id].days > 0).length;
  const bloomed = SPECIES.filter(s => stats[s.id].blooms > 0).length;
  $('#flowersSummary').textContent =
    `${grown} of ${SPECIES.length} species grown · ${bloomed} brought to full bloom`;

  const note = $('#seedNote');
  note.className = 'seed-note ' + (canPick ? 'can' : 'cant');
  note.textContent = canPick
    ? "Today is still a seed — tap any flower to plant it instead."
    : cur
      ? "Today's plant is already growing, so its seed is settled. You can choose again tomorrow morning."
      : 'No plant for today yet.';

  grid.className = 'flgrid' + (canPick ? ' pickable' : '');
  grid.innerHTML = '';

  SPECIES.forEach(sp => {
    const st = stats[sp.id];
    const seen = st.days > 0;
    const cell = document.createElement(canPick ? 'button' : 'div');
    if (canPick) cell.type = 'button';
    cell.className = 'fl'
      + (seen ? '' : ' locked')
      + (st.blooms ? ' bloomed' : '')
      + (cur && cur.species === sp.id ? ' istoday' : '');

    const art = document.createElement('div');
    art.className = 'flart';
    // Show each species at the best stage it has ever reached; unseen ones are
    // silhouetted at full bloom so the shape still hints at what is missing.
    // Follows the active art style so this matches what the child is looking at.
    paintPlant(art, { species: sp.id, growth: (seen ? Math.max(0, st.best) : 4) * 25 });
    cell.appendChild(art);

    // The name shows whether or not it has been grown — a silhouette is enough
    // of a "not yet", and a parent choosing a seed needs to know what it is.
    const name = document.createElement('b');
    name.textContent = sp.name;
    cell.appendChild(name);

    const when = document.createElement('small');
    if (seen) {
      // "Today"/"Yesterday" read better lowercase mid-sentence; a month must not.
      const rel = labelDate(st.last);
      when.append('Last planted ');
      const d8 = document.createElement('span');
      d8.className = 'nb';   // never break "Aug 16" across two lines
      d8.textContent = /^(Today|Yesterday)$/.test(rel) ? rel.toLowerCase() : rel;
      when.appendChild(d8);
    } else {
      when.textContent = 'Not yet grown';
    }
    cell.appendChild(when);

    if (seen) {
      const how = document.createElement('small');
      how.className = 'flprog';
      how.textContent = st.blooms ? `Bloomed ${st.blooms}×` : REACHED[Math.max(0, st.best)];
      cell.appendChild(how);
    }

    if (canPick) cell.addEventListener('click', () => pickSeed(sp.id));
    grid.appendChild(cell);
  });
}

function pickSeed(id) {
  const d = today();
  if (stageOf(d.growth) !== 0) return;   // re-checked at tap time, not just at render
  d.species = id;
  save();
  plantSig = '';
  renderPlant();
  renderFlowers();
}

/* ─────────────── grown-ups ─────────────── */

let gateAnswer = 0, unlocked = false;

/* Two ways in. The maths question is the stronger of the two; a long press is
   quicker for the adult but a child mashing buttons can stumble into it, which
   is why maths stays the default. */
const HOLD_MS = 1600;
const gateMode = () => (S.gate === 'hold' ? 'hold' : 'maths');

let holdTimer = 0, justHeld = false;

function startHold() {
  if (gateMode() !== 'hold' || unlocked) return;
  const b = $('#parentBtn');
  // keydown auto-repeats, and restarting the timer on every repeat would mean the
  // hold never completes. Ignore anything that arrives while one is already running.
  if (b.classList.contains('holding')) return;
  b.style.setProperty('--holdms', HOLD_MS + 'ms');
  b.classList.add('holding');
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    b.classList.remove('holding');
    justHeld = true;                 // the pointerup that follows also fires click
    unlocked = true;
    openParent();
  }, HOLD_MS);
}

function cancelHold() {
  clearTimeout(holdTimer);
  $('#parentBtn').classList.remove('holding');
}

function renderGateChoice() {
  $$('#gateRow button').forEach(b => b.classList.toggle('on', gateMode() === b.dataset.gate));
}

function newGate() {
  const a = 6 + Math.floor(Math.random() * 9);    // 6–14
  const b = 13 + Math.floor(Math.random() * 15);   // 13–27
  gateAnswer = a * b;
  $('#gateQ').textContent = `${a} × ${b} = ?`;
  $('#gateA').value = '';
  $('#gateErr').hidden = true;
}

function openParent() {
  if (unlocked) { $('#gate').hidden = true; $('#panel').hidden = false; renderPanel(); }
  else { $('#gate').hidden = false; $('#panel').hidden = true; newGate(); }
  show('#parentSheet');
}

function renderPanel() {
  const good = $('#goodList');
  good.innerHTML = '';
  [...S.targets, 'Something else kind'].forEach(t => {
    const b = document.createElement('button');
    b.className = 'btn tick';
    b.innerHTML = `<span>${escapeHTML(t)}</span><span class="plus">+1 💧</span>`;
    b.addEventListener('click', () => {
      today().water++;                       // resolve the day at tap time, not at render time
      S.log.push({ t: Date.now(), k: 'good', n: t });
      save(); renderChrome(); flashFace('hopeful'); flash(b, 'Watering added ✓');
    });
    good.appendChild(b);
  });

  const miss = $('#missList');
  miss.innerHTML = '';
  [...S.targets, 'Something else'].forEach(t => {
    const b = document.createElement('button');
    b.className = 'btn nudge';
    b.textContent = t;
    b.addEventListener('click', () => {
      const day = today();
      day.thirst = Math.min(3, day.thirst + 1);
      S.log.push({ t: Date.now(), k: 'miss', n: t });
      save(); renderPlant(); flashFace(null, 4200);
      flash(b, 'The plant droops a little');
    });
    miss.appendChild(b);
  });

  renderRatio();
  renderTargets();
  renderStyle();
  renderGateChoice();
  renderData();
  renderSync();
}

function flash(btn, msg) {
  const old = btn.innerHTML;
  btn.innerHTML = `<span>${msg}</span>`;
  btn.disabled = true;
  setTimeout(() => { btn.innerHTML = old; btn.disabled = false; }, 900);
}

function renderRatio() {
  const since = Date.now() - 7 * 864e5;
  const g = S.log.filter(e => e.t >= since && e.k === 'good').length;
  const b = S.log.filter(e => e.t >= since && e.k === 'miss').length;
  const tot = g + b;
  $('#ratioGood').style.width = tot ? (g / tot * 100) + '%' : '0%';
  $('#ratioBad').style.width  = tot ? (b / tot * 100) + '%' : '0%';

  let msg;
  if (!tot)      msg = 'Nothing logged yet this week.';
  else if (!b)   msg = `${g} good noticed, no reminders. `;
  else           msg = `${g} good noticed : ${b} reminders — about ${(g / b).toFixed(1)} to 1. `;
  if (tot && b)  msg += g / b >= 5 ? 'That is the ratio you want.' : 'Most programmes aim for 5 good to every 1 reminder.';
  else if (tot)  msg += 'Keep it up.';
  $('#ratioText').textContent = msg;
}

function renderTargets() {
  const box = $('#targetEdit');
  box.innerHTML = '';
  S.targets.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'tgt';
    row.innerHTML = `<input value="${escapeHTML(t)}" maxlength="60"><button type="button" aria-label="Remove">✕</button>`;
    row.querySelector('input').addEventListener('change', e => {
      S.targets[i] = e.target.value.trim() || t; save(); renderPanel();
    });
    row.querySelector('button').addEventListener('click', () => {
      if (S.targets.length <= 1) return;
      S.targets.splice(i, 1); save(); renderPanel();
    });
    box.appendChild(row);
  });
  $('#addTarget').hidden = S.targets.length >= 5;
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* ─────────────── keeping the garden alive ───────────────
   iOS Safari clears script-writable storage — localStorage included — after
   seven days without a first-party visit. A home-screen web app gets its own
   use counter and is exempt, which is why manifest.json exists. Belt and
   braces: ask for persistent storage, and make backups actually restorable. */

let persisted = null;

async function initStorage() {
  try {
    if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
    if (!persisted && navigator.storage && navigator.storage.persist) persisted = await navigator.storage.persist();
  } catch (e) { persisted = null; }
  if (!$('#parentSheet').hidden) renderData();
}

const markBackedUp = () => { S.lastBackup = Date.now(); save(); renderData(); };

function backupOverdue() {
  return Object.keys(S.days).length >= 10 && Date.now() - (S.lastBackup || 0) > 14 * 864e5;
}

const num = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0;
};

/** Union `inc` into `target`, in place. A day already in `target` only loses to
    an incoming day that grew further, so a merge can never cost a child progress.

    Split out from mergeState so the same rules serve every route in — pasted
    text, a file, a scanned QR, and now live sync. There is exactly one
    definition of what merging two gardens means, and this is it. */
function mergeGardens(target, inc) {
  if (!inc || typeof inc !== 'object' || !inc.days || typeof inc.days !== 'object') {
    throw new Error("That doesn't look like a Behaviour Garden backup.");
  }
  let added = 0, improved = 0, logs = 0;

  for (const [k, v] of Object.entries(inc.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    const day = {
      species: SPECIES.some(s => s.id === v.species) ? v.species : SPECIES[0].id,
      growth:  num(v.growth, 100),
      thirst:  num(v.thirst, 3),
      water:   num(v.water, 9),
      stickers: (Array.isArray(v.stickers) ? v.stickers : [])
        .filter(s => s && STICKERS.includes(s.cp))
        .slice(0, 8)
        .map(s => ({ cp: s.cp, x: num(s.x, 100), y: num(s.y, 100) })),
    };
    const cur = target.days[k];
    if (!cur) { target.days[k] = day; added++; }
    else if (day.growth > cur.growth) { target.days[k] = day; improved++; }
  }

  const seen = new Set(target.log.map(e => e.t + '|' + e.k + '|' + (e.n || '')));
  (Array.isArray(inc.log) ? inc.log : []).forEach(e => {
    if (!e || typeof e.t !== 'number' || !e.k) return;
    const id = e.t + '|' + e.k + '|' + (e.n || '');
    if (seen.has(id)) return;
    seen.add(id);
    target.log.push({ t: e.t, k: e.k, n: typeof e.n === 'string' ? e.n.slice(0, 60) : undefined });
    logs++;
  });
  target.log.sort((a, b) => a.t - b.t);

  // Only adopt the incoming targets if these are still the untouched defaults.
  if (JSON.stringify(target.targets) === JSON.stringify(DEFAULTS.targets)
      && Array.isArray(inc.targets) && inc.targets.length) {
    target.targets = inc.targets.slice(0, 5).map(t => String(t).slice(0, 60));
  }
  if (typeof inc.lastBackup === 'number') target.lastBackup = Math.max(target.lastBackup || 0, inc.lastBackup);
  // `gate` and `style` are per-device preferences and are deliberately not merged.

  return { added, improved, logs };
}

/** Merge a backup into the live garden and persist it. */
function mergeState(inc) {
  const counts = mergeGardens(S, inc);
  save();
  return counts;
}

/* ─────────────── live sync ───────────────
   Optional, and deliberately additive. The garden is a localStorage app first:
   if this never loads, the network is gone, or no room is paired, everything
   below is inert and the app behaves exactly as it did before.

   What travels is only the garden. Three deliberate omissions:

   • The behaviour log, for the same reason the QR leaves it out — it records one
     adult's logging habits on one device, not the child's garden. It is also
     the bulk of the payload. Measured on a 60-day garden the full state is
     23.8KB of JSON against a 32KB room cap, so carrying the log would quietly
     break sync somewhere around ten weeks in. Without it the same garden is
     1.1KB, and a hundred days is still only about 1.5KB.
   • `style`, because which art a child prefers is a property of the child in
     front of this screen, not of the garden.
   • `gate`, because a shared garden must not be able to change how the other
     parent gets into their own panel.

   The merge rules are mergeGardens — the same ones a restore uses. There is one
   definition of merging two gardens and live sync does not get its own. */

const SYNC_GAME   = 'behaviour-garden';
const SYNC_FIELDS = ['v', 'targets', 'days', 'lastBackup'];

const syncSubset = st => {
  const out = {};
  for (const f of SYNC_FIELDS) if (st[f] !== undefined) out[f] = st[f];
  return out;
};

/** Publish the local garden. Debounced inside kidsync, so calling it from every
    save() is cheap. No-op when sync never booted or a remote garden is landing. */
function syncPush() {
  if (!syncHandle || syncApplying) return;
  syncPushing = true;
  try { syncHandle.set(syncSubset(S)); }
  catch (e) { console.warn('[sync] could not publish', e); }
  finally { syncPushing = false; }
}

/** kidsync's merge hook. Runs on the shareable subset, never on the live state. */
function syncMerge(local, remote) {
  const base = Object.assign(structuredClone(DEFAULTS), structuredClone(local || {}));
  try { mergeGardens(base, remote); }
  catch (e) { return local; }          // an unusable remote garden changes nothing
  return syncSubset(base);
}

/** A merged garden arrived from kidsync. Fold it into the live state and repaint.

    Almost every arrival is additive, which is the whole point — a merge can
    never cost a child a plant. Erasing is the one exception, and it needs care:
    an erased garden arrives as an EMPTY garden, and an additive merge would
    shrug and ignore it, leaving the other device's plants standing. So kidsync's
    `_epoch` — bumped only by Erase everything — replaces instead of merging.

    The guard that matters is `firstContact`. Joining a room must never be
    destructive: a device carrying sixty days of garden that pairs with a room
    someone once erased should merge into it, not be wiped by its old epoch. So a
    bump only erases if we were already in that room when it happened. */
function syncApply(incoming) {
  if (syncPushing) return;             // the echo of our own set()

  const room         = syncHandle ? syncHandle.roomCode : null;
  const epoch        = incoming && incoming._epoch || 0;
  const firstContact = !room || S._syncRoom !== room;

  syncApplying = true;
  try {
    if (!firstContact && epoch > (S._syncEpoch || 0)) {
      // Erase everything was pressed on another device. Per-device preferences
      // survive it, exactly as they survive a restore.
      const keep = { style: S.style, gate: S.gate };
      S = Object.assign(structuredClone(DEFAULTS), keep);
    }

    const counts = mergeGardens(S, incoming);
    if (room) S._syncRoom = room;
    S._syncEpoch = Math.max(S._syncEpoch || 0, epoch);
    save();                            // push stays suppressed while applying

    plantSig = '';                     // force the plant to re-render
    renderPlant();
    if (!$('#parentSheet').hidden) renderPanel();
    if (!$('#gardenSheet').hidden)  renderMeadow();
    if (!$('#listSheet').hidden)    renderGarden();
    return counts;
  } catch (e) {
    console.warn('[sync] ignoring an unusable remote garden:', e.message);
  } finally {
    syncApplying = false;
  }
}

/** Paint the sharing card. Tolerates the markup being absent so this file stays
    runnable on its own. */
function renderSync() {
  const note = $('#syncState');
  if (!note) return;

  const paired = syncHandle && syncHandle.roomCode;
  const status = syncHandle ? syncHandle.status : 'local';

  if (!syncHandle) {
    note.textContent = 'Sharing is unavailable — this device could not reach the sync service. '
      + 'The garden is safe and saved here as usual.';
  } else if (!paired) {
    note.textContent = 'Not sharing. This garden lives on this device only.';
  } else if (status === 'synced') {
    note.textContent = 'Sharing live with code ' + syncHandle.roomCode + ' \u2713';
  } else if (status === 'offline') {
    note.textContent = 'Sharing with code ' + syncHandle.roomCode
      + ' \u2014 offline just now. Changes will catch up when the connection returns.';
  } else {
    note.textContent = 'Connecting\u2026';
  }

  const on  = $('#syncOnRow');
  const off = $('#syncOffRow');
  if (on)  on.hidden  = !syncHandle || !paired;
  if (off) off.hidden = !syncHandle ||  paired;
  const codeEl = $('#syncCode');
  if (codeEl) codeEl.textContent = paired ? syncHandle.roomCode : '';
}

/* The contract the bridge module talks to. Kept explicit rather than letting a
   module reach into this file's globals, so what crosses the boundary is
   obvious to whoever reads this next. */
window.GardenSync = {
  game: SYNC_GAME,
  initialState: () => syncSubset(S),
  merge: syncMerge,
  apply: syncApply,
  attach(handle) {
    syncHandle = handle;
    renderSync();
    handle.onStatusChange(renderSync);
  },
};

function renderStyle() {
  $$('#styleRow button').forEach(b =>
    b.classList.toggle('on', (S.style || 'illustrated') === b.dataset.style));
}

function renderData() {
  $('#storageNote').textContent = persisted
    ? 'This device has marked the garden as persistent storage ✓ — still worth keeping a backup.'
    : 'This browser has not guaranteed the garden\u2019s storage. On iPhone and iPad, add this to the '
      + 'Home Screen and open it from there — Safari clears data for sites left unvisited for a week.';

  const nudge = $('#backupNudge');
  nudge.hidden = !backupOverdue();
  if (!nudge.hidden) {
    nudge.textContent = Object.keys(S.days).length
      + ' days of garden here and no backup in the last fortnight. Saving one takes a second.';
  }
}

/* ─────────────── sharing the garden by QR ───────────────
   The other phone's built-in camera does the scanning, so there is no decoder
   to vendor, no camera permission to ask for, and nothing to install — the QR
   just holds a link back to this page with the garden packed into the fragment.
   Fragments are never sent to a server, so the data stays on the two devices.

   Size is the whole design constraint. A QR tops out near 2.9KB and anything
   past ~1.2KB gets dense enough to fight a phone camera. Measured on a 60-day
   garden: the full state is 23.8KB of JSON, 2.5KB once gzipped and base64'd —
   which only encodes at error-correction L, at 165 modules. Dropping the
   behaviour log takes the same garden to 1.2KB and 133 modules at level M.
   So the log is left out, which is right anyway: it is a record of the adult's
   logging habits on this device, not part of the child's garden. */

const QR_EC       = 'M';
const QR_MAX_CHARS = 1800;   // beyond this, send them to the file backup instead

const b64urlEncode = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {          // chunked: spreading a
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); // big array overflows the stack
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlDecode = s => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, ch => ch.charCodeAt(0));
};

const canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function gzipText(text) {
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(text));
  w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

async function gunzipText(bytes) {
  const ds = new DecompressionStream('gzip');
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new Response(ds.readable).text();
}

/** The QR encoder is 56KB and only a grown-up ever needs it, so load it on demand. */
let qrLib = null;
function loadQrLib() {
  if (qrLib) return qrLib;
  qrLib = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'assets/vendor/qrcode.js';
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => reject(new Error('could not load the QR encoder'));
    document.head.appendChild(s);
  });
  return qrLib;
}

/** One <path> for every dark module — crisp at any size, no canvas. */
function qrSVG(make, text) {
  const q = make(0, QR_EC);
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount(), quiet = 2, size = n + quiet * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  }
  return { modules: n, svg: `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"`
    + ` xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#fff"/>`
    + `<path d="${d}" fill="#111"/></svg>` };
}

async function shareLink() {
  const packed = await gzipText(JSON.stringify({ ...S, log: [] }));
  const payload = b64urlEncode(packed);
  const base = location.origin + location.pathname;
  return { url: base + '#g=' + payload, chars: (base + '#g=').length + payload.length };
}

let lastShareURL = '';

async function renderQR() {
  const box = $('#qrBox'), note = $('#qrNote');
  box.className = 'qrbox';
  box.innerHTML = '<p class="muted small">Building…</p>';
  note.textContent = '';

  if (!canZip()) {
    box.className = 'qrbox tooBig';
    box.textContent = 'This browser cannot compress the garden, so a QR would not fit. Use “Save backup file”.';
    return;
  }
  try {
    const { url, chars } = await shareLink();
    lastShareURL = url;
    const dayCount = Object.keys(S.days).length;

    if (chars > QR_MAX_CHARS) {
      box.className = 'qrbox tooBig';
      box.textContent = `This garden is too big for a QR code (${dayCount} days). `
        + 'Use “Save backup file” and send the file instead — it has no size limit.';
      return;
    }
    const { modules, svg } = qrSVG(await loadQrLib(), url);
    box.innerHTML = svg;
    note.textContent = `${dayCount} day${dayCount === 1 ? '' : 's'} packed into ${chars} characters`
      + ` · ${modules}×${modules} code. Hold the phone steady and fairly close.`;
  } catch (e) {
    box.className = 'qrbox tooBig';
    box.textContent = 'Could not build the code. Use “Save backup file” instead.';
    console.warn('QR build failed', e);
  }
}

/* ─────────────── receiving a shared garden ─────────────── */

let incoming = null;

async function checkIncomingShare() {
  const m = /[#&]g=([A-Za-z0-9\-_]+)/.exec(location.hash);
  if (!m) return;
  // Drop it from the URL straight away so a refresh cannot re-prompt.
  history.replaceState(null, '', location.pathname + location.search);
  if (!canZip()) return;
  try {
    const inc = JSON.parse(await gunzipText(b64urlDecode(m[1])));
    if (!inc || typeof inc.days !== 'object' || !inc.days) throw new Error('not a garden');
    incoming = inc;
    const keys = Object.keys(inc.days);
    const bloomed = keys.filter(k => stageOf(inc.days[k].growth) === 4).length;
    const fresh = keys.filter(k => !S.days[k]).length;
    $('#importSummary').textContent =
      `${keys.length} day${keys.length === 1 ? '' : 's'} · ${bloomed} in full bloom · `
      + `${fresh} not on this device yet`;
    $('#importMsg').hidden = true;
    show('#importSheet');
  } catch (e) {
    console.warn('could not read the shared garden', e);
  }
}

/* ─────────────── sheets ─────────────── */

const show = sel => { $(sel).hidden = false; };
const hide = sel => { $(sel).hidden = true; };

/* ─────────────── sky ─────────────── */

function skyByHour() {
  const h = new Date().getHours();
  const [top, bot] =
    h < 6  ? ['#2b3563', '#5f6fa4'] :
    h < 9  ? ['#6a9ad4', '#ffd7ae'] :
    h < 17 ? ['#7ec8ee', '#d6f0ff'] :
    h < 20 ? ['#e88b5a', '#ffd9a8'] :
             ['#2b3563', '#5f6fa4'];
  document.documentElement.style.setProperty('--sky-top', top);
  document.documentElement.style.setProperty('--sky-bot', bot);
}

/* ─────────────── wiring ─────────────── */

function init() {
  skyByHour();
  initStorage();
  mountLottie($('#sun'), FX + '1f31e.json', { speed: 0.25 });
  buildTray();
  renderPlant();
  startFaceLoop();
  checkIncomingShare();
  // A link that differs only by its fragment does not reload the page, so a
  // shared garden opened while the app is already running arrives here instead.
  window.addEventListener('hashchange', checkIncomingShare);

  $('#waterBtn').addEventListener('click', doWater);
  $('#plantBox').addEventListener('click', () => {
    bump();
    replayPlant();
    flashFace();
    const c = plantCenter();
    fx('2728', c.x + rand(-.3, .3) * c.w, c.y + rand(-.3, .1) * c.w, 70);
  });

  $('#stickerBtn').addEventListener('click', () => show('#stickerSheet'));
  $('#gardenBtn').addEventListener('click', () => {
    show('#gardenSheet');
    renderMeadow();
  });
  $('#viewToggle').addEventListener('click', () => { renderGarden(); show('#listSheet'); });
  $('#bed').addEventListener('scroll', () => $('#bedHint').classList.add('gone'), { passive: true });
  window.addEventListener('resize', () => { if (!$('#gardenSheet').hidden) renderMeadow(); });
  const gear = $('#parentBtn');
  gear.addEventListener('click', () => {
    if (justHeld) { justHeld = false; return; }        // swallow the click after a hold
    if (gateMode() === 'hold' && !unlocked) {
      // Give nothing away to a child tapping it — just acknowledge the tap.
      gear.classList.remove('nudge-hold');
      void gear.offsetWidth;
      gear.classList.add('nudge-hold');
      return;
    }
    openParent();
  });

  gear.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    gear.addEventListener(ev, cancelHold));
  // Keyboard equivalent, so the panel is never unreachable without a pointer.
  gear.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startHold(); }
  });
  gear.addEventListener('keyup', cancelHold);
  gear.addEventListener('blur', cancelHold);

  $$('[data-close]').forEach(b => b.addEventListener('click', () => hide('#' + b.closest('.sheet').id)));
  // Backdrop-to-close, except the garden — it is a full-screen place, not a card,
  // and a tap on its sky should not dismiss it.
  $$('.sheet:not(.scene)').forEach(s =>
    s.addEventListener('click', e => { if (e.target === s) hide('#' + s.id); }));

  $('#gateGo').addEventListener('click', () => {
    if (Number($('#gateA').value) === gateAnswer) {
      unlocked = true;
      $('#gate').hidden = true; $('#panel').hidden = false;
      renderPanel();
    } else { $('#gateErr').hidden = false; newGate(); }
  });
  $('#gateA').addEventListener('keydown', e => { if (e.key === 'Enter') $('#gateGo').click(); });

  $('#repairBtn').addEventListener('click', () => {
    const d = today();
    d.thirst = 0;
    S.log.push({ t: Date.now(), k: 'repair' });
    save(); renderPlant();
    flashFace('yay');
    flash($('#repairBtn'), 'Perked back up ✓');
  });

  $('#flowersBtn').addEventListener('click', () => { renderFlowers(); show('#flowersSheet'); });

  $$('#gateRow button').forEach(b => b.addEventListener('click', () => {
    S.gate = b.dataset.gate;
    save();
    renderGateChoice();
  }));

  $$('#styleRow button').forEach(b => b.addEventListener('click', () => {
    S.style = b.dataset.style;
    save();
    renderStyle();
    plantSig = '';
    renderPlant();
  }));

  $('#addTarget').addEventListener('click', () => {
    S.targets.push('New thing we are working on'); save(); renderTargets();
  });

  $('#exportBtn').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    const text = JSON.stringify(S);
    // The clipboard rejects on an unfocused document and on insecure origins, and the
    // prompt() fallback can be suppressed entirely — neither may abort the bookkeeping.
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (err) { /* fall through */ }
    if (!ok) { try { ok = window.prompt('Copy your backup:', text) !== null; } catch (err) {} }
    flash(btn, ok ? 'Copied ✓' : 'Use “Save backup file”');
    if (ok) markBackedUp();
  });

  $('#saveBtn').addEventListener('click', e => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'behaviour-garden-' + ymd() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    flash(e.target.closest('button'), 'Saved ✓');
    markBackedUp();
  });

  $('#qrBtn').addEventListener('click', () => { show('#qrSheet'); renderQR(); });

  $('#qrCopyBtn').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!lastShareURL) { flash(btn, 'Nothing to copy'); return; }
    let ok = false;
    try { await navigator.clipboard.writeText(lastShareURL); ok = true; } catch (err) {}
    if (!ok) { try { ok = window.prompt('Copy this link:', lastShareURL) !== null; } catch (err) {} }
    flash(btn, ok ? 'Link copied ✓' : 'Could not copy');
  });

  $('#importCancel').addEventListener('click', () => { incoming = null; hide('#importSheet'); });

  $('#importGo').addEventListener('click', () => {
    const msg = $('#importMsg');
    msg.hidden = false;
    try {
      const r = mergeState(incoming);
      msg.className = 'small ok';
      msg.textContent = `${r.added} day${r.added === 1 ? '' : 's'} added, ${r.improved} grown further.`;
      incoming = null;
      plantSig = '';
      renderPlant();
    } catch (err) {
      msg.className = 'small bad';
      msg.textContent = err.message;
    }
  });

  $('#restoreBtn').addEventListener('click', () => {
    const box = $('#restoreBox');
    box.hidden = !box.hidden;
    $('#restoreMsg').hidden = true;
    if (!box.hidden) $('#restoreText').focus();
  });
  $('#restoreCancel').addEventListener('click', () => {
    $('#restoreBox').hidden = true;
    $('#restoreText').value = '';
  });

  $('#restoreGo').addEventListener('click', () => {
    const msg = $('#restoreMsg');
    msg.hidden = false;
    try {
      const r = mergeState(JSON.parse($('#restoreText').value.trim()));
      msg.className = 'small ok';
      msg.textContent = r.added + ' day' + (r.added === 1 ? '' : 's') + ' added, '
        + r.improved + ' grown further, ' + r.logs + ' log entries merged.';
      $('#restoreText').value = '';
      plantSig = '';
      renderPlant();
      renderPanel();
      msg.hidden = false;
    } catch (err) {
      msg.className = 'small bad';
      msg.textContent = err instanceof SyntaxError ? "That isn't valid backup text." : err.message;
    }
  });

  /* ── live sharing ── */

  const JOIN_ERRORS = {
    malformed:          'That code is not complete — three words and three numbers.',
    'not-found':        'No garden found with that code. Check for a typo, or press Start sharing '
                        + 'on the other device for a fresh one.',
    network:            'Could not reach the network just now. Try again in a moment.',
    'not-configured':   'Sharing is unavailable on this device.',
  };

  $('#syncStart').addEventListener('click', async () => {
    if (!syncHandle) return;
    const btn = $('#syncStart');
    btn.disabled = true;
    try {
      const code = await syncHandle.createRoom();
      // Record the room now. syncApply would otherwise only learn it when a
      // remote change arrives, and until then a remote erase would look like
      // first contact and be merged away instead of honoured. Safe to claim
      // here because we seeded this room ourselves, so its epoch is ours.
      S._syncRoom = code;
      save();
      renderSync();
    }
    catch (e) { console.warn('[sync] could not start sharing', e); flash(btn, 'Could not start'); }
    finally { btn.disabled = false; }
  });

  $('#syncJoin').addEventListener('click', () => {
    $('#syncJoinBox').hidden = false;
    $('#syncJoinMsg').hidden = true;
    $('#syncCodeInput').value = '';
    $('#syncCodeInput').focus();
  });

  $('#syncJoinCancel').addEventListener('click', () => { $('#syncJoinBox').hidden = true; });

  async function joinRoomFromInput() {
    if (!syncHandle) return;
    const msg = $('#syncJoinMsg'), go = $('#syncJoinGo');
    go.disabled = true;
    const res = await syncHandle.joinRoom($('#syncCodeInput').value);
    go.disabled = false;
    msg.hidden = false;
    if (res.ok) {
      // Deliberately not setting S._syncRoom here. The first state to arrive from
      // a room we have just joined must count as first contact so it MERGES; if
      // that room was erased at some point in the past, claiming it now would let
      // its old epoch wipe the garden we just brought with us. syncApply records
      // the room once it has safely merged.
      msg.className = 'small ok';
      msg.textContent = 'Connected — the two gardens are merging now.';
      $('#syncJoinBox').hidden = true;
      renderSync();
    } else {
      msg.className = 'small bad';
      msg.textContent = JOIN_ERRORS[res.reason] || 'That did not work. Try again.';
    }
  }

  $('#syncJoinGo').addEventListener('click', joinRoomFromInput);
  $('#syncCodeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') joinRoomFromInput();
  });

  $('#syncStop').addEventListener('click', () => {
    if (!syncHandle) return;
    syncHandle.leaveRoom();
    // Forget the room, so rejoining it later counts as first contact and merges
    // rather than inheriting an erase that happened while we were away.
    delete S._syncRoom;
    delete S._syncEpoch;
    save();
    renderSync();
  });

  $('#resetBtn').addEventListener('click', async () => {
    const shared = syncHandle && syncHandle.roomCode;
    if (!confirm('Erase the whole garden and start again? This cannot be undone.')) return;
    if (!confirm(shared
      ? 'Really sure? Every plant your child has grown will be gone \u2014 on this device and '
        + 'on every device sharing code ' + syncHandle.roomCode + '.'
      : 'Really sure? Every plant your child has grown will be gone.')) return;
    localStorage.removeItem(KEY);
    S = structuredClone(DEFAULTS);
    // A plain write would lose this argument: the other device merges its fuller
    // garden straight back over the top. reset() bumps the epoch, which overrides
    // the merge everywhere, so an erase actually erases.
    if (syncHandle) {
      try { await syncHandle.reset(syncSubset(S)); }
      catch (e) { console.warn('[sync] the erase did not publish', e); }
    }
    plantSig = '';
    renderPlant();
    renderSync();
    hide('#parentSheet');
  });

  // a new day while the tab was left open
  let seen = ymd();
  setInterval(() => {
    if (ymd() !== seen) { seen = ymd(); plantSig = ''; skyByHour(); renderPlant(); startFaceLoop(); }
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ymd() !== seen) { seen = ymd(); plantSig = ''; skyByHour(); renderPlant(); startFaceLoop(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
