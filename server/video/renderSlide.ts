import { chromium, Browser } from 'playwright';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import katex from 'katex';
import { VideoStep } from './types';

const require = createRequire(import.meta.url);

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
// How long the entrance animation (title -> caption -> math -> highlight pulse)
// takes to fully play out and settle. buildVideo.ts holds the final frame for
// however much longer the narration audio runs past this.
export const ANIMATION_DURATION_SECONDS = 2.6;

let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

/** Closes the shared headless browser instance. Call once the whole pipeline is done. */
export async function closeSlideRenderer(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  }
}

// KaTeX's stylesheet loads its fonts via relative `url(fonts/...)` paths, which only resolve
// when the CSS is served from its own directory. Since slides are rendered from an in-memory
// HTML string (no base URL), rewrite those to absolute file:// URIs so math renders offline.
let katexCssCache: string | null = null;
async function getKatexCss(): Promise<string> {
  if (katexCssCache) return katexCssCache;
  const cssPath = require.resolve('katex/dist/katex.min.css');
  const cssDir = path.dirname(cssPath);
  const raw = await fs.readFile(cssPath, 'utf-8');
  katexCssCache = raw.replace(/url\((["']?)(fonts\/[^)"']+)\1\)/g, (_m, _q, rel) => {
    const fileUrl = pathToFileURL(path.join(cssDir, rel)).href;
    return `url("${fileUrl}")`;
  });
  return katexCssCache;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMathHtml(math?: string): string {
  if (!math) return '';
  try {
    return katex.renderToString(math, { throwOnError: false, displayMode: true });
  } catch {
    return `<span class="math-fallback">${escapeHtml(math)}</span>`;
  }
}

function buildSlideHtml(opts: {
  stepNumber: number;
  totalSteps: number;
  title: string;
  caption: string;
  math?: string;
  katexCss: string;
}): string {
  const { stepNumber, totalSteps, title, caption, math, katexCss } = opts;
  const mathHtml = renderMathHtml(math);
  const progress = Math.round((stepNumber / totalSteps) * 100);
  // No math on this step (a purely conceptual step) — the caption is the sole
  // content, so give it the visual weight + highlight treatment math would
  // otherwise get, instead of leaving the slide feeling empty.
  const captionIsHero = !math;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${katexCss}
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  background: #000;
  overflow: hidden;
}
body {
  /* Inter/Bebas Neue don't cover Devanagari or Bengali glyphs — Noto Sans
     fallbacks kick in per-character so Hindi/Bengali narration slides render
     correctly instead of showing tofu boxes on hosts without Indic system fonts. */
  font-family: 'Inter', 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Segoe UI', sans-serif;
  color: #d4d4d8;
  background-image: radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.14) 0%, transparent 55%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}
.frame {
  position: absolute;
  inset: 48px;
  border: 2px solid #27272a;
}
.eyebrow {
  position: absolute;
  top: 64px;
  left: 64px;
  font-family: 'Bebas Neue', Impact, sans-serif;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-size: 22px;
  color: #f97316;
}
.step-counter {
  position: absolute;
  top: 64px;
  right: 64px;
  font-family: 'Bebas Neue', Impact, sans-serif;
  letter-spacing: 0.2em;
  font-size: 20px;
  color: #71717a;
}
.step-counter b { color: #ec4899; }

@keyframes fadeSlideDown {
  from { opacity: 0; transform: translateY(-24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeScaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes highlightPulse {
  0%, 100% { filter: drop-shadow(0 0 0px rgba(236, 72, 153, 0)); }
  50% { filter: drop-shadow(0 0 26px rgba(236, 72, 153, 0.95)); }
}

.title {
  font-family: 'Bebas Neue', Impact, 'Noto Sans Devanagari', 'Noto Sans Bengali', sans-serif;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-size: 40px;
  color: #f4f4f5;
  text-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
  margin-bottom: 48px;
  text-align: center;
  opacity: 0;
  animation: fadeSlideDown 0.6s ease-out 0s forwards;
}
.content {
  max-width: 1500px;
  text-align: center;
  padding: 0 64px;
}
.caption {
  font-size: ${captionIsHero ? 44 : 34}px;
  line-height: 1.5;
  color: #e4e4e7;
  font-weight: ${captionIsHero ? 600 : 500};
  opacity: 0;
  animation: fadeSlideDown 0.6s ease-out 0.3s forwards${captionIsHero ? ', highlightPulse 1.1s ease-in-out 1.3s 1' : ''};
}
.math {
  margin-top: 44px;
  font-size: 30px;
  color: #fde68a;
  opacity: 0;
  animation: fadeScaleIn 0.55s ease-out 0.65s forwards, highlightPulse 1.1s ease-in-out 1.3s 1;
}
.math .katex { font-size: 1.5em; }
.progress-track {
  position: absolute;
  bottom: 64px;
  left: 64px;
  right: 64px;
  height: 4px;
  background: #18181b;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #f97316);
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.8);
}
</style>
</head>
<body style="background:#000">
  <!-- Inline background style above (not just the .css rule) is deliberate: the
       Google Fonts @import in the stylesheet above is render-blocking for the
       rules that follow it in the same cascade, so without this the page would
       sit on Chromium's default WHITE background for as long as that fetch
       takes — a real, visible white flash at the start of every recording. -->
  <div class="frame"></div>
  <div class="eyebrow">Vidya &middot; Doubt Solver</div>
  <div class="step-counter"><b>${String(stepNumber).padStart(2, '0')}</b> / ${String(totalSteps).padStart(2, '0')}</div>
  <div class="content">
    <div class="title">${escapeHtml(title)}</div>
    <div class="caption">${escapeHtml(caption)}</div>
    ${mathHtml ? `<div class="math">${mathHtml}</div>` : ''}
  </div>
  <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
</body>
</html>`;
}

/**
 * Renders one narration step to a short animated video clip (title, then
 * caption, then math, then a highlight pulse — via Playwright's screen
 * recording of the CSS transitions, not a single static screenshot). The clip
 * settles into its final fully-visible state and stays there — buildVideo.ts
 * holds that last frame for however much longer the narration audio runs.
 */
export async function renderSlide(
  step: VideoStep,
  index: number,
  total: number,
  title: string,
  outPath: string,
  tmpDir: string
): Promise<void> {
  await fs.mkdir(tmpDir, { recursive: true });

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
    recordVideo: { dir: tmpDir, size: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } },
  });
  const page = await context.newPage();
  try {
    const katexCss = await getKatexCss();
    const html = buildSlideHtml({
      stepNumber: index + 1,
      totalSteps: total,
      title,
      caption: step.caption,
      math: step.math,
      katexCss,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(ANIMATION_DURATION_SECONDS * 1000);
  } finally {
    await context.close();
  }

  const video = page.video();
  if (!video) {
    throw new Error('Playwright did not record a video for this slide.');
  }
  await video.saveAs(outPath);
  await video.delete().catch(() => {});
}
