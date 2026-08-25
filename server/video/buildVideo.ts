import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { ANIMATION_DURATION_SECONDS } from './renderSlide';

export interface StepClip {
  /** Short animated clip (webm) from renderSlide.ts — plays once, then its last frame is held. */
  videoPath: string;
  audioPath: string;
  /** Narration audio duration in seconds. */
  duration: number;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', ...args], { shell: false });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error('"ffmpeg" was not found on PATH. Make sure it is installed.'));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
  });
}

// Playwright's video recorder captures a frame or two of Chromium's initial
// blank paint before content appears, even with a black background applied as
// early as possible in the page — trimming this off the front is more robust
// than chasing the exact cause, and the animation's opacity is near-zero here
// anyway so nothing meaningful is lost.
const LEADING_TRIM_SECONDS = 0.1;

/**
 * Renders a single step's animated clip + narration into an MP4. The clip's
 * entrance animation plays once; if the narration runs longer than the
 * animation, its last (fully-settled) frame is held for the remainder via
 * ffmpeg's tpad filter, rather than looping a static image from the start.
 */
export async function buildStepClip(clip: StepClip, outPath: string): Promise<void> {
  const trimmedAnimationSeconds = ANIMATION_DURATION_SECONDS - LEADING_TRIM_SECONDS;
  const extraHold = Math.max(0, clip.duration - trimmedAnimationSeconds);

  await runFfmpeg([
    '-ss', LEADING_TRIM_SECONDS.toFixed(3),
    '-i', clip.videoPath,
    '-i', clip.audioPath,
    '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${extraHold.toFixed(3)},fps=30,format=yuv420p[v]`,
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', clip.duration.toFixed(3),
    '-shortest',
    outPath,
  ]);
}

/** Concatenates already-encoded clips (same codec/params) into a single MP4 without re-encoding. */
export async function concatClips(clipPaths: string[], workDir: string, outPath: string): Promise<void> {
  const listPath = path.join(workDir, 'concat-list.txt');
  const listContent = clipPaths
    .map((p) => `file '${p.split(path.sep).join('/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  await fs.writeFile(listPath, listContent, 'utf-8');

  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
}

/**
 * Full stitching step of the pipeline: turns each step's animated clip+audio into
 * an MP4, then concatenates all clips into the final narrated video.
 */
export async function assembleVideo(steps: StepClip[], workDir: string, outPath: string, cleanup = true): Promise<string> {
  const clipPaths = await Promise.all(
    steps.map(async (step, i) => {
      const clipPath = path.join(workDir, `clip-${i + 1}.mp4`);
      await buildStepClip(step, clipPath);
      return clipPath;
    })
  );

  await concatClips(clipPaths, workDir, outPath);

  if (cleanup) {
    await Promise.all(
      [
        ...clipPaths,
        ...steps.map((s) => s.videoPath),
        ...steps.map((s) => s.audioPath),
        path.join(workDir, 'concat-list.txt'),
      ].map((f) => fs.rm(f, { force: true }))
    );
  }

  return outPath;
}
