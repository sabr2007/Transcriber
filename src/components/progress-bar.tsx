"use client";

export type Phase = "uploading" | "transcribing";

interface LoadingIndicatorProps {
  phase: Phase;
}

export function LoadingIndicator({ phase }: LoadingIndicatorProps) {
  const label = phase === "uploading" ? "Uploading..." : "Transcribing...";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping-slow" />
        <div className="relative w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          {/* Microphone icon */}
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse-gentle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </div>
  );
}
