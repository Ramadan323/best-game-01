// The best score, kept in localStorage when the browser allows it, and in
// memory when it does not (a file:// page, a blocked store).
const KEY = 'lumen.bestScore';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  const value = Math.floor(score);
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    // The store is unavailable; the in-memory best still stands for the run.
  }
  return value;
}
