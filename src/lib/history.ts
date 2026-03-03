export interface HistoryEntry {
  id: string;
  filename: string;
  text: string;
  date: string;
}

const STORAGE_KEY = "transcriber-history";
const MAX_ENTRIES = 50;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: Omit<HistoryEntry, "id" | "date">): void {
  const history = getHistory();
  history.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...entry,
  });
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
