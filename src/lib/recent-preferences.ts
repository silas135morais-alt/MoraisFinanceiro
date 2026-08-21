export type RecentOption = {
  id: string;
  name: string;
};

type RecentEntry = {
  count: number;
  lastUsed: number;
};

type RecentMap = Record<string, RecentEntry>;

function statsKey(key: string) {
  return `${key}-stats-v1`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readMap(key: string): RecentMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(statsKey(key));
    if (raw) {
      const parsed = JSON.parse(raw) as RecentMap;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // Prefer the application flow even if browser storage is unavailable or malformed.
  }

  const lastUsedId = storage.getItem(key);
  return lastUsedId ? { [lastUsedId]: { count: 1, lastUsed: 1 } } : {};
}

export function readLastPreference(key: string) {
  const storage = getStorage();
  return storage?.getItem(key) ?? "";
}

export function rememberRecentPreference(key: string, id: string) {
  if (!id) return;
  const storage = getStorage();
  if (!storage) return;

  const current = readMap(key);
  const previous = current[id] ?? { count: 0, lastUsed: 0 };
  current[id] = { count: previous.count + 1, lastUsed: Date.now() };

  try {
    storage.setItem(key, id);
    storage.setItem(statsKey(key), JSON.stringify(current));
  } catch {
    // A full or disabled localStorage must not block saving a financial entry.
  }
}

export function prioritizeRecentOptions<T extends RecentOption>(options: T[], key: string) {
  const recent = readMap(key);
  return options
    .map((option, index) => ({ option, index, recent: recent[option.id] }))
    .sort((left, right) => {
      const countDifference = (right.recent?.count ?? 0) - (left.recent?.count ?? 0);
      if (countDifference !== 0) return countDifference;
      const lastUsedDifference = (right.recent?.lastUsed ?? 0) - (left.recent?.lastUsed ?? 0);
      return lastUsedDifference || left.index - right.index;
    })
    .map(({ option }) => option);
}
