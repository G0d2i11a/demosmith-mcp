import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DemoSession } from '../types.js';

const execFileAsync = promisify(execFile);

/**
 * GIF generation options
 */
export interface GifOptions {
  /** Frame delay in ms (default: 1500) */
  frameDelay?: number;
  /** Output width (default: 800) */
  width?: number;
  /** Quality 1-20, lower is better (default: 10) */
  quality?: number;
  /** Number of loops, 0 = infinite (default: 0) */
  loops?: number;
}

/**
 * Generate animated GIF from demo screenshots using ffmpeg-static
 *
 * Output:
 * - demo.gif (animated GIF)
 * - animated-preview.html (interactive HTML player as fallback)
 */
export async function generateGif(
  session: DemoSession,
  outputDir: string,
  options: GifOptions = {}
): Promise<string | null> {
  const {
    frameDelay = 1500,
    width = 800,
    loops = 0,
  } = options;

  // Collect screenshot paths
  const screenshots: string[] = [];
  for (const step of session.steps) {
    if (step.evidence.screenshotPath) {
      const fullPath = path.isAbsolute(step.evidence.screenshotPath)
        ? step.evidence.screenshotPath
        : path.join(outputDir, step.evidence.screenshotPath);

      try {
        await fs.access(fullPath);
        screenshots.push(fullPath);
      } catch {
        // Skip missing screenshots
      }
    }
  }

  if (screenshots.length === 0) {
    console.warn('No screenshots available for GIF generation');
    return null;
  }

  // Always generate HTML preview as fallback
  const htmlPath = path.join(outputDir, 'animated-preview.html');
  const gifHtml = generateAnimatedHtmlPreview(session, screenshots, frameDelay);
  await fs.writeFile(htmlPath, gifHtml, 'utf-8');

  // Generate animated GIF using ffmpeg-static
  try {
    const gifPath = await generateAnimatedGif(screenshots, outputDir, {
      frameDelay,
      width,
      loops,
    });
    if (gifPath) {
      console.log(`Animated GIF generated: ${gifPath}`);
      return gifPath;
    }
  } catch (err) {
    console.warn('GIF generation failed:', err);
  }

  // Return HTML preview as fallback
  console.log(`HTML preview generated: ${htmlPath}`);
  return htmlPath;
}

/**
 * Generate animated GIF using ffmpeg-static (bundled ffmpeg binary)
 */
async function generateAnimatedGif(
  screenshots: string[],
  outputDir: string,
  options: { frameDelay: number; width: number; loops: number }
): Promise<string | null> {
  // Import ffmpeg-static to get the bundled ffmpeg binary path
  const ffmpegStatic = await import('ffmpeg-static');
  const ffmpegPath = ffmpegStatic.default as unknown as string;

  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary not found');
  }

  const fps = 1000 / options.frameDelay;
  const gifPath = path.join(outputDir, 'demo.gif');

  // Create concat file for ffmpeg
  const concatPath = path.join(outputDir, 'frames.txt');
  const concatContent = screenshots
    .map(s => `file '${s.replace(/\\/g, '/')}'\nduration ${options.frameDelay / 1000}`)
    .join('\n');
  await fs.writeFile(concatPath, concatContent, 'utf-8');

  try {
    // Generate GIF with palette for better quality
    // Two-pass approach: first generate palette, then use it
    const palettePath = path.join(outputDir, 'palette.png');

    // Pass 1: Generate palette
    await execFileAsync(ffmpegPath, [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatPath,
      '-vf', `fps=${fps.toFixed(2)},scale=${options.width}:-1:flags=lanczos,palettegen`,
      '-y',
      palettePath,
    ]);

    // Pass 2: Generate GIF using palette
    await execFileAsync(ffmpegPath, [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatPath,
      '-i', palettePath,
      '-lavfi', `fps=${fps.toFixed(2)},scale=${options.width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
      '-loop', String(options.loops),
      '-y',
      gifPath,
    ]);

    // Cleanup temp files
    await fs.unlink(concatPath).catch(() => {});
    await fs.unlink(palettePath).catch(() => {});

    return gifPath;
  } catch (err) {
    // Cleanup on error
    await fs.unlink(concatPath).catch(() => {});
    throw err;
  }
}

/**
 * Generate an HTML file that shows animated screenshots (fallback)
 */
function generateAnimatedHtmlPreview(
  session: DemoSession,
  screenshots: string[],
  frameDelay: number
): string {
  const relativePaths = screenshots.map(s => path.basename(s));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${session.title} - Animated Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    h1 {
      color: #eee;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .player {
      position: relative;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    .player img {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    button {
      padding: 10px 20px;
      font-size: 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #4361ee;
      color: white;
      transition: background 0.2s;
    }
    button:hover { background: #3a56d4; }
    button:disabled { background: #666; cursor: not-allowed; }
    .step-indicator {
      color: #aaa;
      margin-top: 15px;
      font-size: 14px;
    }
    .step-description {
      color: #fff;
      margin-top: 10px;
      font-size: 16px;
      max-width: 600px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${session.title}</h1>
  <div class="player">
    <img id="frame" src="assets/${relativePaths[0]}" alt="Demo frame">
  </div>
  <div class="controls">
    <button id="prev">← Previous</button>
    <button id="playPause">⏸ Pause</button>
    <button id="next">Next →</button>
  </div>
  <div class="step-indicator">
    Step <span id="current">1</span> of ${screenshots.length}
  </div>
  <div class="step-description" id="description"></div>

  <script>
    const frames = ${JSON.stringify(relativePaths.map(p => 'assets/' + p))};
    const descriptions = ${JSON.stringify(session.steps.filter(s => s.evidence.screenshotPath).map(s => s.description))};
    const frameDelay = ${frameDelay};
    let currentFrame = 0;
    let isPlaying = true;
    let intervalId;

    const img = document.getElementById('frame');
    const currentSpan = document.getElementById('current');
    const descDiv = document.getElementById('description');
    const playPauseBtn = document.getElementById('playPause');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

    function updateFrame() {
      img.src = frames[currentFrame];
      currentSpan.textContent = currentFrame + 1;
      descDiv.textContent = descriptions[currentFrame] || '';
    }

    function nextFrame() {
      currentFrame = (currentFrame + 1) % frames.length;
      updateFrame();
    }

    function prevFrame() {
      currentFrame = (currentFrame - 1 + frames.length) % frames.length;
      updateFrame();
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
      if (isPlaying) {
        intervalId = setInterval(nextFrame, frameDelay);
      } else {
        clearInterval(intervalId);
      }
    }

    // Start autoplay
    intervalId = setInterval(nextFrame, frameDelay);
    updateFrame();

    playPauseBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => { prevFrame(); });
    nextBtn.addEventListener('click', () => { nextFrame(); });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevFrame();
      if (e.key === 'ArrowRight') nextFrame();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    });
  </script>
</body>
</html>`;
}
