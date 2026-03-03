# Transcriber - Design Document

## Overview

Single-page web app for personal use to transcribe audio and video files using OpenAI Whisper API. Deployed on Vercel.

## Requirements

- Upload audio (mp3, wav, m4a, ogg, flac, webm) and video (mp4, webm, mkv, avi, mov) files
- Transcribe using OpenAI Whisper API (model: whisper-1)
- API key stored in Vercel environment variables (server-side only)
- File size limit: 25MB (Whisper API limit)
- Minimal UI: upload -> transcribe -> copy result

## Architecture

```
Browser (SPA)                    Vercel Serverless          OpenAI
┌───────────────┐               ┌──────────────────┐      ┌──────────┐
│ Next.js App   │  POST         │ /api/transcribe   │      │ Whisper  │
│ Router        │──────────────>│ route.ts          │─────>│ API      │
│               │ multipart/    │                   │      │          │
│ File Upload   │ form-data     │ Validate + Forward│      │          │
│ Result View   │<──────────────│                   │<─────│          │
└───────────────┘  { text }     └──────────────────┘      └──────────┘
```

## Tech Stack

- **Next.js 15** - App Router, TypeScript
- **Tailwind CSS** - Styling
- **OpenAI Node SDK** - API calls
- No database, no authentication

## File Structure

```
src/
  app/
    layout.tsx                  - Root layout
    page.tsx                    - Main page (only page)
    api/
      transcribe/
        route.ts                - Transcription API endpoint
  components/
    file-upload.tsx             - Drag & drop + file input
    transcription-result.tsx    - Result display + copy button
```

## UI Flow

1. **Initial state:** Drag & drop zone with "Drop a file or click to select". Supported formats shown below.
2. **File selected:** Show filename, size. "Transcribe" button.
3. **Processing:** Button disabled, spinner/loading indicator.
4. **Result:** Text in scrollable textarea, "Copy" button (with "Copied!" feedback).
5. **Error:** Red block with message (file too large, wrong format, API error).

## API Route (`/api/transcribe`)

- Accepts `multipart/form-data` with single file
- Validates: size <= 25MB, MIME type whitelist (audio/*, video/*)
- Forwards file to OpenAI `POST /v1/audio/transcriptions`
- Returns `{ text: "..." }` or `{ error: "..." }`
- `maxDuration` set for serverless function (60 seconds)

## Error Handling

- File > 25MB: client-side validation, never sent to server
- Wrong format: client-side validation
- OpenAI API error: display user-friendly message
- Timeout: display "File is too large to process"

## Supported Formats

Audio: mp3, mp4, mpeg, mpga, m4a, wav, webm
Video: mp4, webm (audio track extracted by Whisper)

Note: OpenAI Whisper API natively supports: mp3, mp4, mpeg, mpga, m4a, wav, webm.
For other video formats (mkv, avi, mov), we accept them but they may fail at the API level.
