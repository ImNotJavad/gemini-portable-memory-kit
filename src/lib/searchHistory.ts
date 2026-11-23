export const RECENT_SEARCHES_STORAGE_KEY = 'gemini-memory-kit:recent-searches';
export const MAX_RECENT_SEARCHES = 5;

/**
 * Add a search query to the front of recent history, deduplicating
 * case-insensitively and capping the list at maxItems (default: 5).
 */
export function addRecentSearch(
  history: string[],
  rawQuery: string,
  maxItems = MAX_RECENT_SEARCHES
): string[] {
  const query = rawQuery.trim();
  if (!query) return history;

  const lower = query.toLowerCase();
  const deduped = history.filter((item) => item.trim().toLowerCase() !== lower);
  return [query, ...deduped].slice(0, Math.max(1, maxItems));
}

export function removeRecentSearch(history: string[], targetQuery: string): string[] {
  const lower = targetQuery.trim().toLowerCase();
  return history.filter((item) => item.trim().toLowerCase() !== lower);
}

export function loadRecentSearches(storageKey = RECENT_SEARCHES_STORAGE_KEY): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearches(
  items: string[],
  storageKey = RECENT_SEARCHES_STORAGE_KEY
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Ignore storage quota or private-mode errors gracefully.
  }
}
