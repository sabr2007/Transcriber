import { randomUUID } from "crypto";
import { mkdir, writeFile, readdir, rm } from "fs/promises";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";

const CHUNK_DURATION_SECS = 600; // 10 minutes

export interface ChunkResult {
  dir: string;
  chunks: string[];
}

/**
 * Save uploaded file to a temp directory.
 */
export async function saveUploadedFile(file: File): Promise<{ dir: string; path: string }> {
  const dir = join("/tmp", `transcriber-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  const ext = file.name.split(".").pop() || "m4a";
  const path = join(dir, `input.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path, buffer);

  return { dir, path };
}

/**
 * Convert audio to mp3 64kbps mono and split into 10-minute chunks.
 */
export async function chunkAudio(inputPath: string, dir: string): Promise<string[]> {
  const outputPattern = join(dir, "chunk_%03d.mp3");

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libmp3lame")
      .audioBitrate("64k")
      .audioChannels(1)
      .outputOptions([
        "-f", "segment",
        "-segment_time", String(CHUNK_DURATION_SECS),
        "-reset_timestamps", "1",
      ])
      .output(outputPattern)
      .on("error", reject)
      .on("end", () => resolve())
      .run();
  });

  const files = await readdir(dir);
  const chunks = files
    .filter((f) => f.startsWith("chunk_") && f.endsWith(".mp3"))
    .sort()
    .map((f) => join(dir, f));

  if (chunks.length === 0) {
    throw new Error("ffmpeg produced no output chunks");
  }

  return chunks;
}

/**
 * Cleanup temp directory.
 */
export async function cleanup(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
