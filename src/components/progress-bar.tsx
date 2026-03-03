"use client";

export type Phase = "uploading" | "transcribing";

interface ProgressBarProps {
  phase: Phase;
  uploadProgress: number; // 0–1
}

export function ProgressBar({ phase, uploadProgress }: ProgressBarProps) {
  const percent =
    phase === "uploading"
      ? Math.round(uploadProgress * 50)
      : 50;

  const label =
    phase === "uploading"
      ? `Uploading... ${Math.round(uploadProgress * 100)}%`
      : "Transcribing...";

  return (
    <div className="space-y-2">
      <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        {phase === "transcribing" ? (
          <div
            className="h-full rounded-full bg-blue-500 animate-progress-pulse"
            style={{ width: "100%" }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
        {label}
      </p>
    </div>
  );
}
