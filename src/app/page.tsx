"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { TranscriptionResult } from "@/components/transcription-result";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTranscribe = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Transcription failed");
        return;
      }

      setResult(data.text);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

          {file && !result && (
            <button
              onClick={handleTranscribe}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-white
                bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Transcribing..." : "Transcribe"}
            </button>
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
