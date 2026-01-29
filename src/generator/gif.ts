import * as fs from 'fs/promises';
import * as path from 'path';
import type { DemoSession } from '../types.js';

/**
 * GIF generation options
 */
export interface GifOptions {
  /** Frame delay in ms (default: 1500) */
  frameDelay?: number;
  /** Output width (default: 800) */
  width?: number;
  /** Output height (default: 600) */
  height?: number;
  /** Quality 1-20, lower is better (default: 10) */
  quality?: number;
  /** Number of loops, 0 = infinite (default: 0) */
  loops?: number;
}

/**
 * Generate an animated GIF from screenshots
 * Uses external ffmpeg for reliable GIF creation
 */
export async function generateGif(
  session: DemoSession,
  outputDir: string,
  options: GifOptions = {}
): Promise<string | null> {
  const {
    frameDelay = 1500,
    width = 800,
    quality = 10,
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

  // Create a simple HTML-based animated preview as fallback
  // (True GIF generation would require native dependencies like sharp/gifencoder)
  const gifHtmlPath = path.join(outputDir, 'animated-preview.html');
  const gifHtml = generateAnimatedHtmlPreview(session, screenshots, frameDelay);
  await fs.writeFile(gifHtmlPath, gifHtml, 'utf-8');

  // Also create a ffmpeg command file for users who have ffmpeg installed
  const ffmpegScript = generateFfmpegScript(screenshots, outputDir, {
    frameDelay,
    width,
    quality,
    loops,
  });
  const scriptPath = path.join(outputDir, 'generate-gif.sh');
  await fs.writeFile(scriptPath, ffmpegScript, 'utf-8');

  // Create Windows batch version
  const batchScript = generateFfmpegBatch(screenshots, outputDir, {
    frameDelay,
    width,
    quality,
    loops,
  });
  const batchPath = path.join(outputDir, 'generate-gif.bat');
  await fs.writeFile(batchPath, batchScript, 'utf-8');

  return gifHtmlPath;
}

/**
 * Generate an HTML file that shows animated screenshots
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

/**
 * Generate ffmpeg shell script for GIF creation
 */
function generateFfmpegScript(
  screenshots: string[],
  outputDir: string,
  options: { frameDelay: number; width: number; quality: number; loops: number }
): string {
  const fps = 1000 / options.frameDelay;
  const inputList = screenshots.map((s, i) => `file '${s}'`).join('\n');

  return `#!/bin/bash
# Generate GIF from screenshots using ffmpeg
# Requires: ffmpeg installed

# Create input file list
cat > "${outputDir}/frames.txt" << 'EOF'
${screenshots.map(s => `file '${s}'\nduration ${options.frameDelay / 1000}`).join('\n')}
EOF

# Generate GIF with palette for better quality
ffmpeg -f concat -safe 0 -i "${outputDir}/frames.txt" \\
  -vf "fps=${fps},scale=${options.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \\
  -loop ${options.loops} \\
  "${outputDir}/demo.gif"

echo "GIF generated: ${outputDir}/demo.gif"
`;
}

/**
 * Generate ffmpeg Windows batch script
 */
function generateFfmpegBatch(
  screenshots: string[],
  outputDir: string,
  options: { frameDelay: number; width: number; quality: number; loops: number }
): string {
  const fps = 1000 / options.frameDelay;

  return `@echo off
REM Generate GIF from screenshots using ffmpeg
REM Requires: ffmpeg installed and in PATH

echo Creating frames list...
(
${screenshots.map(s => `echo file '${s.replace(/\\/g, '/')}'\necho duration ${options.frameDelay / 1000}`).join('\n')}
) > "${outputDir.replace(/\\/g, '/')}/frames.txt"

echo Generating GIF...
ffmpeg -f concat -safe 0 -i "${outputDir.replace(/\\/g, '/')}/frames.txt" ^
  -vf "fps=${fps},scale=${options.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" ^
  -loop ${options.loops} ^
  "${outputDir.replace(/\\/g, '/')}/demo.gif"

echo GIF generated: ${outputDir}\\demo.gif
pause
`;
}
