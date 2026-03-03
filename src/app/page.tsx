"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/file-upload";
import { TranscriptionResult } from "@/components/transcription-result";
import { ProgressBar, type Phase } from "@/components/progress-bar";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase | "idle">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const loading = phase !== "idle";

  const handleTranscribe = useCallback(() => {
    if (!file) return;

    setPhase("uploading");
    setUploadProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadProgress(e.loaded / e.total);
      }
    });

    xhr.upload.addEventListener("load", () => {
      setUploadProgress(1);
      setPhase("transcribing");
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setResult(data.text);
        } else {
          setError(data.error || "Transcription failed");
        }
      } catch {
        setError("Failed to parse server response.");
      }
      setPhase("idle");
    });

    xhr.addEventListener("error", () => {
      setError("Network error. Please try again.");
      setPhase("idle");
    });

    xhr.addEventListener("abort", () => {
      setPhase("idle");
    });

    xhr.open("POST", "/api/transcribe");
    xhr.send(formData);
  }, [file]);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">
          Transcriber
        </h1>

        <div className="space-y-6">
          <FileUpload onFileSelect={setFile} disabled={loading} />

          {file && !result && !loading && (
            <button
              onClick={handleTranscribe}
              className="w-full py-3 px-4 rounded-xl font-medium text-white
                bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Transcribe
            </button>
          )}

          {loading && (
            <ProgressBar phase={phase as Phase} uploadProgress={uploadProgress} />
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <>
              <TranscriptionResult text={result} />
              <button
                onClick={handleReset}
                className="w-full py-3 px-4 rounded-xl font-medium
                  text-neutral-700 dark:text-neutral-300
                  bg-neutral-100 dark:bg-neutral-800
                  hover:bg-neutral-200 dark:hover:bg-neutral-700
                  transition-colors duration-200"
              >
                Transcribe another file
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
