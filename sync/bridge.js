/* ─────────────── sync bridge ───────────────
   Joins app.js (a classic script) to kidsync.js (an ES module).

   Two things matter here and both are about the garden surviving this file:

   1. kidsync is loaded with a DYNAMIC import inside a try/catch. It pulls the
      Firebase SDK off a CDN, and a static import would mean an unreachable CDN
      takes the whole app down with it. This way a failed load is a warning in
      the console and a garden that works exactly as it did before.
   2. Everything it touches in app.js goes through window.GardenSync. No reaching
      into that file's internals, so the seam is visible from both sides.        */

import { firebaseConfig } from './firebase-config.js';

async function boot() {
  const bridge = window.GardenSync;
  if (!bridge) return;                       // app.js did not load; nothing to attach to

  let createSync;
  try {
    ({ createSync } = await import('./kidsync.js'));
  } catch (e) {
    console.warn('[sync] could not load the sync module — staying local-only.', e.message);
    return;
  }

  try {
    const handle = await createSync({
      firebaseConfig,
      game: bridge.game,
      initialState: bridge.initialState(),
      merge: bridge.merge,
      onChange: bridge.apply,
    });
    bridge.attach(handle);
  } catch (e) {
    console.warn('[sync] could not start syncing — staying local-only.', e.message);
  }
}

/* app.js runs during parsing and registers its DOMContentLoaded listener first,
   so init() has already built the panel by the time this fires. */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
