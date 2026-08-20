// ─────────────────────────────────────────────────────────────────────────────
//  kidsync — live cross-device state sync for static GitHub Pages games.
//
//  No build step. No CLI. No deploy. No keys that expire.
//  Drop this folder into a project, paste your config into firebase-config.js,
//  and call createSync().
//
//  Design rules (the reasons it stays low-maintenance):
//    1. LOCAL FIRST. The game works with no room, no network, and no Firebase
//       config at all. Sync is an enhancement layered on localStorage, never a
//       dependency. If this file fails to load, your game still works.
//    2. THE DATABASE IS TRUTH. No clever client-side conflict resolution to
//       reason about later — last write wins, unless you pass a merge()
//       function, which you probably should. See README.
//    3. WRITES ARE DEBOUNCED. A game loop calling set() 60x/sec produces one
//       write per debounce window, not 60. This is what keeps you inside the
//       free tier without thinking about it.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, onValue, set as dbSet, get as dbGet,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Room codes are read aloud and typed by children, so: no homophones, no words
// that differ only by a doubled letter, nothing that invites a spelling debate.
// 128 words = 7 bits each. 3 words + 3 digits ≈ 2.1 billion combinations, which
// is the entropy that makes "anyone who knows the code has access" acceptable.
const WORDS = (
  "apple arrow bacon badge bagel banjo beach bean bear bell berry bird boat bone " +
  "book boot brick bridge broom brush bubble bunny cake camel candle cape card " +
  "carrot castle cave cheese cherry chess clock cloud clover comet cookie coral " +
  "crayon crown cube daisy desk diamond dolphin donut dragon drum eagle feather " +
  "fern fig flame flute forest fox frog garden ghost giraffe glove grape hammer " +
  "harp hazel helmet honey igloo ivy jelly jewel kayak kite koala ladder lemon " +
  "lion lizard llama magnet mango maple marble mask meadow melon mitten moose " +
  "mountain muffin mushroom nest noodle ocean olive onion orbit otter owl paddle " +
  "panda parrot peach pebble pencil penguin pepper piano pickle pigeon pillow " +
  "pine planet plum pocket pond pretzel pumpkin puppy quilt rabbit raccoon radish " +
  "raven ribbon river robin"
).split(" ");

const LS_PREFIX = "kidsync";

/** Cryptographically random integer in [0, max). Not Math.random() — these
 *  codes are the only thing standing between a room and a stranger. */
function randomInt(max) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xFFFFFFFF / max) * max; // reject to avoid modulo bias
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % max;
}

function generateCode() {
  const w = [0, 1, 2].map(() => WORDS[randomInt(WORDS.length)].toUpperCase());
  const digits = String(randomInt(1000)).padStart(3, "0");
  return `${w.join("-")}-${digits}`;
}

/** Accepts sloppy human input: lowercase, spaces instead of dashes, stray
 *  whitespace. Returns a canonical code or null if it can't be salvaged. */
function normalizeCode(input) {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  return /^[A-Z]+-[A-Z]+-[A-Z]+-\d{3}$/.test(cleaned) ? cleaned : null;
}

const MAX_STATE_BYTES = 32 * 1024; // must match the .validate rule in firebase-rules.json

export async function createSync({
  firebaseConfig,
  game,
  initialState = {},
  onChange = () => {},
  onStatus = () => {},
  merge = null,
  debounceMs = 400,
} = {}) {
  if (!game) throw new Error("[kidsync] createSync needs a `game` name (e.g. 'phoneme-sounds').");

  const stateKey = `${LS_PREFIX}:${game}:state`;
  const roomKey  = `${LS_PREFIX}:${game}:room`;
  const idKey    = `${LS_PREFIX}:deviceId`;

  // Stable per-device id. Lets us recognise the echo of our own writes.
  let deviceId = localStorage.getItem(idKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(idKey, deviceId);
  }

  // ── Local state, loaded before any network work happens ────────────────────
  let state = { ...initialState };
  try {
    const saved = localStorage.getItem(stateKey);
    if (saved) state = { ...initialState, ...JSON.parse(saved) };
  } catch {
    console.warn("[kidsync] Saved local state was corrupt; starting fresh.");
  }

  let rev = 0;
  let roomCode = localStorage.getItem(roomKey) || null;
  let status = "local";
  let db = null, roomRef = null, unsubscribeRoom = null, unsubscribeConn = null;
  let flushTimer = null, pendingWrite = false;

  const persistLocal = () => {
    try { localStorage.setItem(stateKey, JSON.stringify(state)); }
    catch (e) { console.warn("[kidsync] Could not write to localStorage:", e.message); }
  };

  const statusListeners = new Set();
  const setStatus = (s) => {
    if (s === status) return;
    status = s;
    try { onStatus(status); } catch (e) { console.error("[kidsync] onStatus threw:", e); }
    for (const fn of statusListeners) {
      try { fn(status); } catch (e) { console.error("[kidsync] status listener threw:", e); }
    }
  };

  const emitChange = () => {
    try { onChange(state); } catch (e) { console.error("[kidsync] onChange threw:", e); }
  };

  // ── Firebase init is best-effort. A bad or missing config must degrade to
  //    local-only rather than throw and take the game down with it. ──────────
  const configured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_ME";
  if (configured) {
    try {
      db = getDatabase(initializeApp(firebaseConfig, `kidsync-${game}`));
      unsubscribeConn = onValue(ref(db, ".info/connected"), (snap) => {
        if (!roomCode) return setStatus("local");
        setStatus(snap.val() ? "synced" : "offline");
      });
    } catch (e) {
      console.warn("[kidsync] Firebase failed to initialise; local-only mode.", e.message);
      db = null;
    }
  }

  const roomPath = (code) => `rooms/${game}-${code}`;

  async function pushNow() {
    if (!roomRef) { pendingWrite = false; return; }
    const payload = JSON.stringify(state);
    if (payload.length > MAX_STATE_BYTES) {
      console.error(
        `[kidsync] State is ${payload.length} bytes, over the ${MAX_STATE_BYTES} limit. ` +
        `The write was rejected locally. Store large assets outside synced state.`
      );
      pendingWrite = false;
      return;
    }
    rev += 1;
    try {
      await dbSet(roomRef, { state: payload, rev, writer: deviceId, updatedAt: Date.now() });
      pendingWrite = false;
    } catch (e) {
      // Offline writes are queued by the SDK and replay on reconnect, so this
      // branch is for genuine rejections (rules, quota) — worth surfacing.
      pendingWrite = false;
      console.warn("[kidsync] Write rejected:", e.message);
    }
  }

  function schedulePush() {
    if (!roomRef) return;
    pendingWrite = true;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(pushNow, debounceMs);
  }

  // ── Merging, with a way to actually delete things ──────────────────────────
  //
  // A merge that protects progress (Math.max, set-union) can only ever grow.
  // That is the right default — a child must never lose stars by opening a
  // second device — but it makes deletion impossible: reset stars to 0 and the
  // other device merges max(10, 0) back to 10 and pushes it straight back.
  //
  // `_epoch` is the escape hatch. It is a reserved field kidsync manages, and
  // it only ever changes via sync.reset(). A state with a higher epoch is a
  // deliberate destructive act, so it wins WHOLESALE and the merge is skipped.
  // Within one epoch, the merge runs normally and progress is safe.
  function applyMerge(localState, remoteState) {
    const localEpoch  = localState._epoch  ?? 0;
    const remoteEpoch = remoteState._epoch ?? 0;

    // A newer reset elsewhere overrides everything we hold.
    if (remoteEpoch > localEpoch) return remoteState;
    // Ours is the newer reset; keep it. adoptRemote publishes it so they agree.
    if (localEpoch > remoteEpoch) return localState;

    const merged = merge ? merge(localState, remoteState) : remoteState;
    // A user merge that forgets to carry _epoch through must not lose it.
    return { ...merged, _epoch: localEpoch };
  }

  function adoptRemote(snapshot) {
    const data = snapshot.val();
    if (!data || typeof data.state !== "string") return;

    // If the database already matches what we hold, take its revision and stop.
    //
    // This one comparison replaces any "was this my own write?" bookkeeping, and
    // that matters: if two devices write in the same instant, only one value can
    // survive in the database. A device that recognised its own write by id and
    // skipped it would keep a value the database no longer holds, and the two
    // devices would disagree forever. By treating the database as the single
    // source of truth and diffing against it, both devices always converge on
    // whatever actually landed. The echo of our own write is swallowed here too,
    // since by then it is identical to our local state.
    if (data.state === JSON.stringify(state)) { rev = data.rev; return; }

    let remoteState;
    try { remoteState = JSON.parse(data.state); }
    catch { return console.warn("[kidsync] Remote state was unparseable; ignoring."); }

    // Don't clobber a local edit that hasn't been flushed yet — let it land and
    // have the resulting snapshot settle things, so no keystroke is silently
    // lost. A remote reset is exempt: it is meant to win immediately.
    const remoteIsNewerReset = (remoteState._epoch ?? 0) > (state._epoch ?? 0);
    if (pendingWrite && !merge && !remoteIsNewerReset) return;

    state = applyMerge(state, remoteState);
    rev = data.rev;
    persistLocal();
    emitChange();

    // Merging can produce a state neither device had (a union), and an epoch
    // check can mean we deliberately kept ours. Either way, if what we now hold
    // differs from what is in the database, publish it so the two agree. When
    // we simply took the remote value this is a no-op, so there is no loop.
    if (JSON.stringify(state) !== data.state) schedulePush();
  }

  async function attach(code) {
    if (!db) return false;
    if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
    roomCode = code;
    roomRef = ref(db, roomPath(code));
    localStorage.setItem(roomKey, code);
    setStatus("connecting");
    unsubscribeRoom = onValue(
      roomRef,
      adoptRemote,
      (err) => { console.warn("[kidsync] Lost the room subscription:", err.message); setStatus("offline"); }
    );
    return true;
  }

  // Rejoin whatever room this device was last in. This is why a kid pairs once
  // and never thinks about it again.
  if (roomCode && db) await attach(roomCode);

  emitChange();
  onStatus(status);

  return {
    get state() { return state; },
    get roomCode() { return roomCode; },
    get status() { return status; },
    get deviceId() { return deviceId; },

    /** Shallow-merge a patch into state and sync it. The everyday call. */
    set(patch) {
      state = { ...state, ...patch };
      persistLocal();
      emitChange();
      schedulePush();
      return state;
    },

    /** Replace state wholesale. For "load save" / "reset progress". */
    replace(next) {
      state = { ...next };
      persistLocal();
      emitChange();
      schedulePush();
      return state;
    },

    /** Wipe progress everywhere. Use this instead of replace() for any
     *  destructive action — "reset progress", "start over", "clear save".
     *
     *  replace() alone does NOT work for this: other devices merge your zeroed
     *  state against their own and push their higher values back, silently
     *  undoing the reset. This bumps the reserved _epoch field, which overrides
     *  every merge, and flushes immediately so the reset can't sit in the
     *  debounce window. */
    async reset(nextState = {}) {
      state = { ...nextState, _epoch: (state._epoch ?? 0) + 1 };
      persistLocal();
      emitChange();
      clearTimeout(flushTimer);
      await pushNow();
      return state;
    },

    /** Subscribe to status changes ('local' | 'connecting' | 'synced' | 'offline').
     *  Returns an unsubscribe function. Used by pair-ui.js to keep its
     *  indicator light accurate without polling. */
    onStatusChange(fn) {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },

    /** Skip the debounce — call before navigating away or on a big milestone. */
    async flush() { clearTimeout(flushTimer); await pushNow(); },

    /** Start a new room. Returns the code to show the user. */
    async createRoom() {
      if (!db) throw new Error("[kidsync] Sync is not configured — see kidsync/README.md.");
      const code = generateCode();
      await attach(code);
      await pushNow();          // seed the room with this device's state
      return code;
    },

    /** Join an existing room. Resolves to a result object rather than throwing,
     *  because "wrong code" is a normal thing a child does, not an exception. */
    async joinRoom(input) {
      if (!db) return { ok: false, reason: "not-configured" };
      const code = normalizeCode(input);
      if (!code) return { ok: false, reason: "malformed" };
      let snap;
      try { snap = await dbGet(ref(db, roomPath(code))); }
      catch (e) { return { ok: false, reason: "network", detail: e.message }; }
      if (!snap.exists()) return { ok: false, reason: "not-found" };
      await attach(code);
      return { ok: true, code };
    },

    /** Stop syncing. Local state and progress are kept. */
    leaveRoom() {
      if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
      roomRef = null;
      roomCode = null;
      rev = 0;
      localStorage.removeItem(roomKey);
      setStatus("local");
    },
  };
}

export { generateCode, normalizeCode };
