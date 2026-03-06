"use client";

import { useState, useCallback, useRef } from "react";
import { FileUpload } from "@/components/file-upload";
import { TranscriptionResult } from "@/components/transcription-result";
import { LoadingIndicator, type Phase } from "@/components/progress-bar";
import { HistoryList } from "@/components/history-list";
import { addToHistory } from "@/lib/history";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase | "idle">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const loading = phase !== "idle";

  const handleTranscribe = useCallback(() => {
    if (!file) return;

    setPhase("uploading");
    setUploadProgress(0);
    setChunkProgress(null);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    let isSSE = false;
    let parsedLength = 0;
    let doneHandled = false;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadProgress(e.loaded / e.total);
      }
    });

    xhr.upload.addEventListener("load", () => {
      setUploadProgress(1);
      setPhase("transcribing");
    });

    // Progressive SSE parsing — only process complete events (delimited by \n\n)
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState >= 3) {
        const contentType = xhr.getResponseHeader("Content-Type") || "";
        if (contentType.includes("text/event-stream")) {
          isSSE = true;
          processCompleteEvents();
        }
      }
    });

    xhr.addEventListener("load", () => {
      if (isSSE) {
        // Final parse to catch any remaining events (including "done")
        processCompleteEvents();
        // Safety net: if "done"/"error" event was never received
        if (!doneHandled) {
          setPhase("idle");
          xhrRef.current = null;
        }
        return;
      }

      // JSON response (small file path)
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setResult(data.text);
          addToHistory({ filename: file.name, text: data.text });
          setHistoryKey((k) => k + 1);
        } else {
          setError(data.error || "Transcription failed");
        }
      } catch {
        setError("Failed to parse server response.");
      }
      setPhase("idle");
      xhrRef.current = null;
    });

    xhr.addEventListener("error", () => {
      setError("Network error. Please try again.");
      setPhase("idle");
      xhrRef.current = null;
    });

    xhr.addEventListener("abort", () => {
      setPhase("idle");
      setChunkProgress(null);
      xhrRef.current = null;
    });

    xhr.open("POST", "/api/transcribe");
    xhr.send(formData);
    xhrRef.current = xhr;

    function processCompleteEvents() {
      const raw = xhr.responseText.substring(parsedLength);
      // Only process up to the last complete event boundary (\n\n)
      const lastBoundary = raw.lastIndexOf("\n\n");
      if (lastBoundary === -1) return;

      const completePart = raw.substring(0, lastBoundary);
      parsedLength += lastBoundary + 2;

      // Split into individual events and parse each
      const eventBlocks = completePart.split("\n\n").filter(Boolean);
      for (const block of eventBlocks) {
        const lines = block.split("\n");
        let eventType = "";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.substring(7).trim();
          else if (line.startsWith("data: ")) data = line.substring(6).trim();
        }
        if (eventType && data) {
          try {
            const payload = JSON.parse(data);
            handleSSEEvent(eventType, payload);
          } catch {
            // Malformed JSON, skip
          }
        }
      }
    }

    function handleSSEEvent(event: string, payload: Record<string, unknown>) {
      switch (event) {
        case "progress":
          if (payload.phase === "processing") {
            setPhase("processing");
          } else if (payload.phase === "transcribing") {
            setPhase("transcribing");
            if (typeof payload.current === "number" && typeof payload.total === "number") {
              setChunkProgress({ current: payload.current as number, total: payload.total as number });
            }
          }
          break;
        case "done":
          doneHandled = true;
          setResult(payload.text as string);
          addToHistory({ filename: file!.name, text: payload.text as string });
          setHistoryKey((k) => k + 1);
          setPhase("idle");
          setChunkProgress(null);
          xhrRef.current = null;
          break;
        case "error":
          doneHandled = true;
          setError(payload.error as string);
          setPhase("idle");
          setChunkProgress(null);
          xhrRef.current = null;
          break;
      }
    }
  }, [file]);

  const handleCancel = useCallback(() => {
    xhrRef.current?.abort();
  }, []);

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
            <div className="space-y-3">
              <LoadingIndicator phase={phase as Phase} chunkProgress={chunkProgress} />
              <button
                onClick={handleCancel}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium
                  text-neutral-700 dark:text-neutral-300
                  bg-neutral-100 dark:bg-neutral-800
                  hover:bg-neutral-200 dark:hover:bg-neutral-700
                  transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
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

        <div className="mt-12">
          <HistoryList refreshKey={historyKey} />
        </div>
      </div>
    </main>
  );
}
