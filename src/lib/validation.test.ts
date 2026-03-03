import { describe, it, expect } from "vitest";
import {
  validateFile,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "./validation";

function makeFile(name: string, type: string, size = 1024) {
  return { name, type, size };
}

// ─── Explicit MIME types from the whitelist ──────────────────────────────────

describe("ALLOWED_TYPES whitelist — each explicit MIME type is accepted", () => {
  const cases: [string, string][] = [
    ["audio/mpeg", "test.mp3"],
    ["audio/mp3", "test.mp3"],
    ["audio/mp4", "test.mp4"],
    ["audio/mpga", "test.mpga"],
    ["audio/m4a", "test.m4a"],
    ["audio/wav", "test.wav"],
    ["audio/wave", "test.wav"],
    ["audio/x-wav", "test.wav"],
    ["audio/webm", "test.webm"],
    ["audio/ogg", "test.ogg"],
    ["audio/flac", "test.flac"],
    ["application/ogg", "test.ogg"],
    ["video/mp4", "test.mp4"],
    ["video/webm", "test.webm"],
    ["video/ogg", "test.ogg"],
  ];

  it.each(cases)("accepts MIME type %s (file: %s)", (mime, filename) => {
    const result = validateFile(makeFile(filename, mime));
    expect(result.valid).toBe(true);
  });
});

// ─── Extension-based acceptance ──────────────────────────────────────────────

describe("ALLOWED_EXTENSIONS — each extension is accepted even with unknown MIME", () => {
  const extensions = [".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg", ".flac"];

  it.each(extensions)("accepts extension %s with application/octet-stream MIME", (ext) => {
    const result = validateFile(makeFile(`upload${ext}`, "application/octet-stream"));
    expect(result.valid).toBe(true);
  });

  it.each(extensions)("accepts extension %s with empty MIME type", (ext) => {
    const result = validateFile(makeFile(`upload${ext}`, ""));
    expect(result.valid).toBe(true);
  });
});

// ─── Fallback: any audio/* or video/* MIME passes ────────────────────────────

describe("audio/video MIME fallback — startsWith matches", () => {
  const fallbackTypes = [
    "audio/aac",
    "audio/x-flac",
    "audio/vnd.wave",
    "audio/x-m4a",
    "video/x-matroska",
    "video/quicktime",
    "video/3gpp",
  ];

  it.each(fallbackTypes)("accepts non-whitelisted MIME %s via startsWith fallback", (mime) => {
    const result = validateFile(makeFile("file.unknown", mime));
    expect(result.valid).toBe(true);
  });
});

// ─── Real-world format scenarios ─────────────────────────────────────────────

describe("real-world format scenarios", () => {
  it("accepts WhatsApp .ogg audio (application/ogg)", () => {
    const result = validateFile(makeFile("PTT-20240101-WA0001.ogg", "application/ogg"));
    expect(result.valid).toBe(true);
  });

  it("accepts WhatsApp .ogg audio (audio/ogg)", () => {
    const result = validateFile(makeFile("AUD-20240101-WA0001.ogg", "audio/ogg"));
    expect(result.valid).toBe(true);
  });

  it("accepts iPhone voice memo (.m4a, audio/m4a)", () => {
    const result = validateFile(makeFile("Recording 001.m4a", "audio/m4a"));
    expect(result.valid).toBe(true);
  });

  it("accepts iPhone voice memo (.m4a, audio/mp4)", () => {
    const result = validateFile(makeFile("Recording 001.m4a", "audio/mp4"));
    expect(result.valid).toBe(true);
  });

  it("accepts browser-recorded WebM audio", () => {
    const result = validateFile(makeFile("recording.webm", "audio/webm"));
    expect(result.valid).toBe(true);
  });

  it("accepts browser-recorded WebM video", () => {
    const result = validateFile(makeFile("recording.webm", "video/webm"));
    expect(result.valid).toBe(true);
  });

  it("accepts standard MP3 download", () => {
    const result = validateFile(makeFile("song.mp3", "audio/mpeg"));
    expect(result.valid).toBe(true);
  });

  it("accepts MP4 video file", () => {
    const result = validateFile(makeFile("video.mp4", "video/mp4"));
    expect(result.valid).toBe(true);
  });

  it("accepts WAV file (audio/wav)", () => {
    const result = validateFile(makeFile("recording.wav", "audio/wav"));
    expect(result.valid).toBe(true);
  });

  it("accepts WAV file (audio/wave)", () => {
    const result = validateFile(makeFile("recording.wav", "audio/wave"));
    expect(result.valid).toBe(true);
  });

  it("accepts WAV file (audio/x-wav)", () => {
    const result = validateFile(makeFile("recording.wav", "audio/x-wav"));
    expect(result.valid).toBe(true);
  });

  it("accepts FLAC file", () => {
    const result = validateFile(makeFile("music.flac", "audio/flac"));
    expect(result.valid).toBe(true);
  });

  it("accepts OGG video (video/ogg)", () => {
    const result = validateFile(makeFile("clip.ogg", "video/ogg"));
    expect(result.valid).toBe(true);
  });
});

// ─── Case sensitivity ────────────────────────────────────────────────────────

describe("extension case sensitivity", () => {
  it("accepts uppercase extension .MP3", () => {
    const result = validateFile(makeFile("file.MP3", "application/octet-stream"));
    expect(result.valid).toBe(true);
  });

  it("accepts mixed-case extension .Mp4", () => {
    const result = validateFile(makeFile("file.Mp4", "application/octet-stream"));
    expect(result.valid).toBe(true);
  });

  it("accepts uppercase .FLAC", () => {
    const result = validateFile(makeFile("file.FLAC", "application/octet-stream"));
    expect(result.valid).toBe(true);
  });
});

// ─── Rejection: unsupported formats ──────────────────────────────────────────

describe("rejects unsupported formats", () => {
  it("rejects a .txt file", () => {
    const result = validateFile(makeFile("notes.txt", "text/plain"));
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("rejects a .pdf file", () => {
    const result = validateFile(makeFile("doc.pdf", "application/pdf"));
    expect(result.valid).toBe(false);
  });

  it("rejects a .jpg image", () => {
    const result = validateFile(makeFile("photo.jpg", "image/jpeg"));
    expect(result.valid).toBe(false);
  });

  it("rejects a .png image", () => {
    const result = validateFile(makeFile("screenshot.png", "image/png"));
    expect(result.valid).toBe(false);
  });

  it("rejects a .zip archive", () => {
    const result = validateFile(makeFile("archive.zip", "application/zip"));
    expect(result.valid).toBe(false);
  });

  it("rejects a .exe file", () => {
    const result = validateFile(makeFile("program.exe", "application/x-msdownload"));
    expect(result.valid).toBe(false);
  });

  it("rejects application/json", () => {
    const result = validateFile(makeFile("data.json", "application/json"));
    expect(result.valid).toBe(false);
  });
});

// ─── File size validation ────────────────────────────────────────────────────

describe("file size validation", () => {
  it("rejects empty file (0 bytes)", () => {
    const result = validateFile(makeFile("test.mp3", "audio/mpeg", 0));
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty("error", "File is empty.");
  });

  it("accepts 1 byte file", () => {
    const result = validateFile(makeFile("test.mp3", "audio/mpeg", 1));
    expect(result.valid).toBe(true);
  });

  it("accepts file exactly at 25MB limit", () => {
    const result = validateFile(makeFile("test.mp3", "audio/mpeg", MAX_FILE_SIZE));
    expect(result.valid).toBe(true);
  });

  it("rejects file 1 byte over 25MB limit", () => {
    const result = validateFile(makeFile("test.mp3", "audio/mpeg", MAX_FILE_SIZE + 1));
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty("error", "File too large. Maximum size is 25MB.");
  });

  it("accepts small valid file", () => {
    const result = validateFile(makeFile("test.wav", "audio/wav", 512));
    expect(result.valid).toBe(true);
  });
});

// ─── OR logic: type OR extension is sufficient ───────────────────────────────

describe("validation OR logic — type OR extension suffices", () => {
  it("accepts valid MIME with unrecognized extension", () => {
    const result = validateFile(makeFile("file.dat", "audio/mpeg"));
    expect(result.valid).toBe(true);
  });

  it("accepts valid extension with unrecognized MIME", () => {
    const result = validateFile(makeFile("file.mp3", "application/octet-stream"));
    expect(result.valid).toBe(true);
  });

  it("rejects when both MIME and extension are unrecognized", () => {
    const result = validateFile(makeFile("file.xyz", "application/octet-stream"));
    expect(result.valid).toBe(false);
  });
});

// ─── Completeness: all declared sets match what we test ──────────────────────

describe("completeness checks", () => {
  it("ALLOWED_TYPES has exactly 15 entries", () => {
    expect(ALLOWED_TYPES.size).toBe(15);
  });

  it("ALLOWED_EXTENSIONS has exactly 9 entries", () => {
    expect(ALLOWED_EXTENSIONS.size).toBe(9);
  });

  it("every ALLOWED_TYPE passes validation", () => {
    for (const mime of ALLOWED_TYPES) {
      const result = validateFile(makeFile("test.bin", mime));
      expect(result.valid).toBe(true);
    }
  });

  it("every ALLOWED_EXTENSION passes validation (with unknown MIME)", () => {
    for (const ext of ALLOWED_EXTENSIONS) {
      const result = validateFile(makeFile(`test${ext}`, "application/octet-stream"));
      expect(result.valid).toBe(true);
    }
  });
});
