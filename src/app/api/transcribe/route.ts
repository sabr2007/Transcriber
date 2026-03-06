import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { validateFile } from "@/lib/validation";
import { saveUploadedFile, chunkAudio, cleanup } from "@/lib/chunker";

const WHISPER_LIMIT = 25 * 1024 * 1024; // 25MB
const MAX_RETRIES = 2;
const DRY_RUN = process.env.DRY_RUN === "true";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "Transcription service is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  const result = validateFile(file);
  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Small file: direct Whisper transcription (no SSE needed)
  if (file.size <= WHISPER_LIMIT) {
    if (DRY_RUN) {
      await new Promise((r) => setTimeout(r, 3_000));
      return NextResponse.json({ text: `[DRY RUN] Mock transcription for "${file.name}"` });
    }
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
      });
      return NextResponse.json({ text: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      return NextResponse.json(
        { error: "Transcription failed. Please try again or use a different file." },
        { status: 500 }
      );
    }
  }

  // Large file: chunk with ffmpeg, transcribe each chunk, stream progress via SSE
  let tempDir: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Save uploaded file to disk
        send("progress", { phase: "processing", message: "Preparing audio..." });
        const { dir, path } = await saveUploadedFile(file);
        tempDir = dir;

        // Chunk audio with ffmpeg
        send("progress", { phase: "processing", message: "Splitting audio into chunks..." });
        const chunks = await chunkAudio(path, dir);
        const totalChunks = chunks.length;

        // Transcribe each chunk
        const texts: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          send("progress", {
            phase: "transcribing",
            message: `Transcribing chunk ${i + 1} of ${totalChunks}...`,
            current: i + 1,
            total: totalChunks,
          });

          // Send keepalive comments to prevent proxy idle-timeout disconnects
          const keepalive = setInterval(() => {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          }, 15_000);

          try {
            let chunkText: string;
            if (DRY_RUN) {
              await new Promise((r) => setTimeout(r, 30_000));
              chunkText = `[DRY RUN] Chunk ${i + 1} mock text.`;
            } else {
              chunkText = await transcribeWithRetry(openai, chunks[i], MAX_RETRIES, i + 1);
            }
            texts.push(chunkText);
          } finally {
            clearInterval(keepalive);
          }
        }

        const fullText = texts.join(" ");
        send("done", { text: fullText });
      } catch (error) {
        console.error("Chunked transcription error:", error);
        const message = error instanceof Error && error.message.includes("ffmpeg")
          ? "Could not process audio file."
          : "Transcription failed. Please try again or use a different file.";
        send("error", { error: message });
      } finally {
        if (tempDir) {
          await cleanup(tempDir);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function transcribeWithRetry(
  openai: OpenAI,
  chunkPath: string,
  maxRetries: number,
  chunkNum: number,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const fileStream = createReadStream(chunkPath);
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
      });
      return transcription.text;
    } catch (error) {
      lastError = error;
      console.error(`Chunk ${chunkNum} attempt ${attempt + 1} failed:`, error);
    }
  }

  console.error(`Chunk ${chunkNum} failed after ${maxRetries + 1} attempts:`, lastError);
  return `[transcription failed for segment ${chunkNum}]`;
}
