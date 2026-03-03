export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ALLOWED_TYPES = new Set([
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
  "application/ogg",
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

export const ALLOWED_EXTENSIONS = new Set([
  ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav",
  ".webm", ".ogg", ".flac",
]);

export type ValidationError =
  | { valid: false; error: string }
  | { valid: true };

export function validateFile(file: { name: string; type: string; size: number }): ValidationError {
  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large. Maximum size is 25MB." };
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const typeAllowed =
    ALLOWED_TYPES.has(file.type) ||
    file.type.startsWith("audio/") ||
    file.type.startsWith("video/");
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (!typeAllowed && !extAllowed) {
    return { valid: false, error: "Unsupported file format. Please upload an audio or video file." };
  }

  return { valid: true };
}
