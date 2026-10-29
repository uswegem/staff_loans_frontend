// Calendar dates in East Africa Time (UTC+3), matching the API.

export function todayEat(now = new Date()) {
  return new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Basis points as a percentage: 600 → "6%", 60 → "0.6%", 50 → "0.5%". */
export const pct = (bps, digits = 2) => (bps == null ? '—' : `${Number.parseFloat((bps / 100).toFixed(digits))}%`);
