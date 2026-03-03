"use client";

import { useState, useCallback } from "react";

interface TranscriptionResultProps {
  text: string;
}

export function TranscriptionResult({ text }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select textarea text for manual copy
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea[readonly]");
      if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
      }
    }
  }, [text]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Result
        </h2>
        <button
          onClick={handleCopy}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200
            ${copied
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }
          `}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        rows={12}
        className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-700
          bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
          resize-y text-sm leading-relaxed focus:outline-none"
      />
    </div>
  );
}
