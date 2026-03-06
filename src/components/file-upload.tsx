"use client";

import { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { MAX_FILE_SIZE } from "@/lib/validation";

const ACCEPTED_EXTENSIONS = [
  ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm",
  ".ogg", ".flac",
];

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (${formatFileSize(file.size)}). Maximum is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [validateAndSelect]
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        {selectedFile ? (
          <div>
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-full">
              {selectedFile.name}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Drop a file here or click to select
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
              Supported: {ACCEPTED_EXTENSIONS.join(", ")}
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
