// Lightweight session-scoped store so the Data Upload and Data Explorer
// pages can share the most recently analyzed dataset without a global
// state library. Backed by sessionStorage so a refresh doesn't lose it,
// but a new tab starts clean.

const KEY = 'eic_last_dataset_analysis';

export function saveDatasetAnalysis(analysis) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(analysis));
  } catch {
    // sessionStorage unavailable — non-fatal, Data Explorer will show empty state
  }
}

export function loadDatasetAnalysis() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
