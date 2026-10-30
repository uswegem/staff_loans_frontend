// Navigation targets that come from data (notification links, the page to return to
// after sign-in) must stay inside the app. Mitigates the React Router open-redirect
// advisory GHSA-wrjc-x8rr-h8h6 (DECISIONS D-76) until the move to v7.

/** The path if it is an in-app path such as /applications/123, otherwise the fallback. */
export function safePath(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.includes('\\') || /\s/.test(value)) return fallback;
  return value;
}
