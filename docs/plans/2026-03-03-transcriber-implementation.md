# Transcriber Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page transcription app that uploads audio/video files and returns text via OpenAI Whisper API.

**Architecture:** Next.js 15 App Router with a single API route (`/api/transcribe`) that proxies file uploads to OpenAI. Client-side handles drag & drop, validation, and result display. Deployed on Vercel with API key in environment variables.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, OpenAI Node SDK v6

**Important:** Vercel serverless functions have a 4.5MB request body limit on free/pro plans. Files larger than ~4.5MB will fail at the Vercel infrastructure level before reaching our code. The client-side validation enforces the 25MB Whisper API limit, but the effective limit on Vercel is ~4.5MB unless using a paid plan with higher limits. This is acceptable for personal use (4.5MB ≈ 4-5 min of MP3 at 128kbps).

**Design doc:** `docs/plans/2026-03-03-transcriber-design.md`

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: project root (Next.js scaffold)
- Create: `.env.local` (gitignored by default)

**Step 1: Create Next.js app**

Run from `/home/sabr/Projects/Transcriber`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the full Next.js project with App Router, TypeScript, Tailwind, and ESLint.

**Step 2: Install OpenAI SDK**

```bash
npm install openai
```

**Step 3: Create `.env.local`**

Create `.env.local` in project root:

```
OPENAI_API_KEY=sk-your-key-here
```

**Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000, shows default Next.js page.

**Step 5: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

## Task 2: Create API Route for Transcription

**Files:**
- Create: `src/app/api/transcribe/route.ts`

**Step 1: Write the API route test manually**

Before writing the route, define the expected behavior:
- POST with multipart form data containing `file` field → returns `{ text: "..." }`
- POST without file → returns 400 `{ error: "No file provided" }`
- POST with oversized file → returns 400 `{ error: "File too large..." }`
- POST with wrong MIME type → returns 400 `{ error: "Unsupported file format..." }`
- OpenAI API failure → returns 500 `{ error: "Transcription failed..." }`

**Step 2: Write the API route**

Create `src/app/api/transcribe/route.ts`:

```typescript
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/webm",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload an audio or video file." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);

    const message =
      error instanceof Error ? error.message : "Transcription failed";

    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: 500 }
    );
  }
}
```

**Step 3: Test manually with curl**

Start dev server (`npm run dev`), then in another terminal:

```bash
# Test missing file
curl -X POST http://localhost:3000/api/transcribe
# Expected: {"error":"No file provided"}

# Test with a small audio file (if you have one)
curl -X POST http://localhost:3000/api/transcribe \
  -F "file=@/path/to/test.mp3"
# Expected: {"text":"...transcribed text..."}
```

**Step 4: Commit**

```bash
git add src/app/api/transcribe/route.ts
git commit -m "feat: add transcription API route with OpenAI Whisper"
```

---

## Task 3: Create FileUpload Component

**Files:**
- Create: `src/components/file-upload.tsx`

**Step 1: Define component interface**

The component needs:
- Props: `onFileSelect: (file: File) => void`, `disabled: boolean`
- Drag & drop zone
- Hidden file input triggered by click
- Client-side validation (size, type)
- Display selected file name and size

**Step 2: Write the component**

Create `src/components/file-upload.tsx`:

```tsx
"use client";

import { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from "react";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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
        setError(`File too large (${formatFileSize(file.size)}). Maximum is 25MB.`);
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
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
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
              Max size: 25MB
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
```

**Step 3: Verify it renders**

Import into `page.tsx` temporarily to verify it renders without errors in the browser.

**Step 4: Commit**

```bash
git add src/components/file-upload.tsx
git commit -m "feat: add FileUpload component with drag & drop"
```

---

## Task 4: Create TranscriptionResult Component

**Files:**
- Create: `src/components/transcription-result.tsx`

**Step 1: Define component interface**

The component needs:
- Props: `text: string`
- Scrollable textarea displaying the transcription
- Copy button with "Copied!" feedback

**Step 2: Write the component**

Create `src/components/transcription-result.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";

interface TranscriptionResultProps {
  text: string;
}

export function TranscriptionResult({ text }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
```

**Step 3: Commit**

```bash
git add src/components/transcription-result.tsx
git commit -m "feat: add TranscriptionResult component with copy button"
```

---

## Task 5: Build Main Page

**Files:**
- Modify: `src/app/page.tsx` (replace default content)
- Modify: `src/app/layout.tsx` (update metadata)

**Step 1: Write the main page**

Replace `src/app/page.tsx` entirely:

```tsx
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
```

**Step 2: Update layout metadata**

In `src/app/layout.tsx`, update the metadata:

```typescript
export const metadata: Metadata = {
  title: "Transcriber",
  description: "Audio and video transcription using OpenAI Whisper",
};
```

**Step 3: Test the full flow**

1. Run `npm run dev`
2. Open http://localhost:3000
3. Verify: drag & drop zone renders
4. Select a small audio file
5. Click "Transcribe" (needs valid `OPENAI_API_KEY` in `.env.local`)
6. Verify result appears with copy button
7. Verify "Transcribe another file" resets the UI

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: build main page with upload, transcribe, and result flow"
```

---

## Task 6: Clean Up and Vercel Prep

**Files:**
- Modify: `src/app/globals.css` (clean up default styles if needed)
- Remove or clean: any unused default Next.js assets

**Step 1: Clean up default styles**

In `src/app/globals.css`, keep only Tailwind directives and remove any default Next.js custom styles (keep `@tailwind base/components/utilities` or `@import "tailwindcss"` — depends on Next.js version generated).

**Step 2: Remove unused default assets**

Delete default Next.js SVG files if present (e.g., `public/vercel.svg`, `public/next.svg`).

**Step 3: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: clean up defaults and verify production build"
```

---

## Deployment Notes

1. Push to GitHub
2. Connect repo to Vercel
3. In Vercel dashboard → Settings → Environment Variables → add `OPENAI_API_KEY`
4. Deploy

No `vercel.json` needed — Next.js on Vercel works with zero config.

**Body size caveat:** Vercel serverless functions have a ~4.5MB request body limit on hobby/pro plans. Files larger than this will fail at the infrastructure level. For personal use with voice messages and short recordings, this is typically sufficient.
