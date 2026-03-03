"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import {
  getHistory,
  deleteFromHistory,
  clearHistory,
  type HistoryEntry,
} from "@/lib/history";

const STORAGE_KEY = "transcriber-history";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function HistoryList({ refreshKey }: { refreshKey: number }) {
  const history = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null,
  );

  // refreshKey forces re-read after same-tab writes
  void refreshKey;

  const entries: HistoryEntry[] = history ? JSON.parse(history) : [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const rerender = () => forceUpdate((n) => n + 1);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteFromHistory(id);
    setExpandedId((prev) => (prev === id ? null : prev));
    rerender();
  }, []);

  const handleClear = useCallback(() => {
    clearHistory();
    setExpandedId(null);
    rerender();
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          History
        </h2>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200
            text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          Clear history
        </button>
      </div>

      <ul className="space-y-2">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const date = new Date(entry.date);
          const dateStr = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <li
              key={entry.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700
                bg-neutral-50 dark:bg-neutral-900 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : entry.id)
                }
                className="w-full px-4 py-3 flex items-center gap-3 text-left
                  hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-150"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {entry.filename}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {dateStr}
                    {!isExpanded && (
                      <span className="ml-2">
                        &mdash; {entry.text.slice(0, 80)}
                        {entry.text.length > 80 ? "..." : ""}
                      </span>
                    )}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {entry.text}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(entry.text, entry.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                        copiedId === entry.id
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {copiedId === entry.id ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200
                        text-red-600 dark:text-red-400
                        hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
