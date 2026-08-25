import { spawn } from 'child_process';

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: false });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`"${cmd}" was not found on PATH. Make sure it is installed (see server/video/README setup notes).`));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}

// Per-language default voices for the free `edge-tts` CLI (Microsoft neural voices).
// EDGE_TTS_VOICE, if set, overrides only the English voice — Hindi/Bengali always
// get their own matching voice so narration is never silently spoken in English.
const LANGUAGE_VOICES: Record<string, string> = {
  english: process.env.EDGE_TTS_VOICE || 'en-US-GuyNeural',
  hindi: 'hi-IN-MadhurNeural',
  bengali: 'bn-IN-BashkarNeural',
};

/** Maps a doubt-solver language ("English" | "Hindi" | "Bengali") to its edge-tts voice. */
export function voiceForLanguage(language?: string): string {
  const key = (language || 'english').trim().toLowerCase();
  return LANGUAGE_VOICES[key] || LANGUAGE_VOICES.english;
}

/** Synthesizes narration text to an audio file using the free `edge-tts` CLI. */
export async function synthesizeNarration(text: string, outPath: string, voice: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Cannot synthesize empty narration text');
  }
  await run('edge-tts', ['--voice', voice, '--text', trimmed, '--write-media', outPath]);
}

/** Reads the duration (in seconds) of an audio/video file via `ffprobe`. */
export async function getAudioDuration(filePath: string): Promise<number> {
  const stdout = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const duration = parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine duration of audio file: ${filePath}`);
  }
  return duration;
}
