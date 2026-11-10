// The time of the user's last keyboard, pointer, touch or scroll input, shared by every
// SLAS tab of this browser (NFR-04). Only a timestamp is stored; no token or staff data.
// localStorage keeps it for tabs opened later; its storage event tells the other tabs.

const KEY = 'slas.lastActivity';
const WRITE_EVERY_MS = 1000;

let local = 0;
let written = 0;

function read() {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Last input in any tab (ms since epoch). */
export function lastActivity() {
  return Math.max(local, read());
}

/** Records input now; writes for other tabs at most once a second unless forced. */
export function markActivity(now = Date.now(), { force = false } = {}) {
  local = Math.max(local, now);
  if (!force && now - written < WRITE_EVERY_MS) return;
  written = now;
  try {
    window.localStorage.setItem(KEY, String(local));
  } catch {
    // Private mode or blocked storage: this tab still keeps its own clock.
  }
}

/** Calls onChange when another tab records input. Returns an unsubscribe function. */
export function onOtherTabActivity(onChange) {
  const handler = (e) => {
    if (e.key === KEY) onChange(lastActivity());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/** For tests: forget everything. */
export function resetIdleClock() {
  local = 0;
  written = 0;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
