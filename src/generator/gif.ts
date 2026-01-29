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
  /** Output height (default: auto) */
  height?: number;
  /** Quality 1-20, lower is better (default: 10) */
  quality?: number;
  /** Number of loops, 0 = infinite (default: 0) */
  loops?: number;
  /**
   * Generation method:
   * - 'montage': Static grid image using sharp (default, no external deps)
   * - 'ffmpeg': Use ffmpeg scripts to generate animated GIF (best quality, requires ffmpeg)
   */
  method?: 'montage' | 'ffmpeg';
}

/**
 * Generate demo preview from screenshots
 *
 * Methods:
 * - 'montage': Static montage image using sharp (default, no external deps)
 * - 'ffmpeg': Use the generated ffmpeg scripts for animated GIF
 *
 * Always generates:
 * - demo-montage.png (static grid image)
 * - animated-preview.html (interactive HTML player)
 * - generate-gif.sh / generate-gif.bat (ffmpeg scripts for animated GIF)
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
    method = 'montage',
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

  // Always generate HTML preview
  const gifHtmlPath = path.join(outputDir, 'animated-preview.html');
  const gifHtml = generateAnimatedHtmlPreview(session, screenshots, frameDelay);
  await fs.writeFile(gifHtmlPath, gifHtml, 'utf-8');

  // Always generate ffmpeg scripts (for users who want animated GIF later)
  const ffmpegScript = generateFfmpegScript(screenshots, outputDir, {
    frameDelay,
    width,
    quality,
    loops,
  });
  await fs.writeFile(path.join(outputDir, 'generate-gif.sh'), ffmpegScript, 'utf-8');

  const batchScript = generateFfmpegBatch(screenshots, outputDir, {
    frameDelay,
    width,
    quality,
    loops,
  });
  await fs.writeFile(path.join(outputDir, 'generate-gif.bat'), batchScript, 'utf-8');

  // Generate montage (default)
  try {
    const montagePath = await generateMontage(screenshots, outputDir, { width });
    if (montagePath) {
      console.log(`Montage generated: ${montagePath}`);
      console.log(`For animated GIF, run: ./generate-gif.sh (requires ffmpeg)`);
      return montagePath;
    }
  } catch (err) {
    console.warn('Montage generation failed:', err);
  }

  // Return HTML preview as fallback
  console.log(`HTML preview generated: ${gifHtmlPath}`);
  console.log(`For animated GIF, run: ./generate-gif.sh (requires ffmpeg)`);
  return gifHtmlPath;
}

/**
 * Generate a montage image (grid of screenshots) using sharp
 * No external dependencies required - sharp is prebuilt
 */
async function generateMontage(
  screenshots: string[],
  outputDir: string,
  options: { width: number }
): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;

    // Calculate grid layout (2 columns)
    const cols = 2;
    const rows = Math.ceil(screenshots.length / cols);
    const thumbWidth = Math.floor(options.width / cols);

    // Get aspect ratio from first image
    const firstMeta = await sharp(screenshots[0]).metadata();
    const aspectRatio = (firstMeta.height || 600) / (firstMeta.width || 800);
    const thumbHeight = Math.round(thumbWidth * aspectRatio);

    // Resize all screenshots
    const resizedBuffers: Buffer[] = [];
    for (const screenshot of screenshots) {
      const resized = await sharp(screenshot)
        .resize(thumbWidth, thumbHeight, { fit: 'cover' })
        .png()
        .toBuffer();
      resizedBuffers.push(resized);
    }

    // Create composite
    const composites: { input: Buffer; left: number; top: number }[] = [];
    for (let i = 0; i < resizedBuffers.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      composites.push({
        input: resizedBuffers[i],
        left: col * thumbWidth,
        top: row * thumbHeight,
      });
    }

    const montagePath = path.join(outputDir, 'demo-montage.png');
    await sharp({
      create: {
        width: cols * thumbWidth,
        height: rows * thumbHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite(composites)
      .png()
      .toFile(montagePath);

    return montagePath;
  } catch (err) {
    console.warn('Sharp not available or failed:', err);
    return null;
  }
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

  return `#!/bin/bash
# Generate GIF from screenshots using ffmpeg
# Requires: ffmpeg installed
# Usage: cd examples/github-login-demo && ./generate-gif.sh

cd "$(dirname "$0")"

# Create input file list
cat > frames.txt << 'EOF'
${screenshots.map(s => `file 'assets/${path.basename(s)}'\nduration ${options.frameDelay / 1000}`).join('\n')}
EOF

# Generate GIF with palette for better quality
ffmpeg -f concat -safe 0 -i frames.txt \\
  -vf "fps=${fps.toFixed(2)},scale=${options.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \\
  -loop ${options.loops} \\
  demo.gif

rm frames.txt
echo "GIF generated: demo.gif"
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
REM Usage: cd examples\\github-login-demo && generate-gif.bat

cd /d "%~dp0"

echo Creating frames list...
(
${screenshots.map(s => `echo file 'assets/${path.basename(s)}'\necho duration ${options.frameDelay / 1000}`).join('\n')}
) > frames.txt

echo Generating GIF...
ffmpeg -f concat -safe 0 -i frames.txt ^
  -vf "fps=${fps.toFixed(2)},scale=${options.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" ^
  -loop ${options.loops} ^
  demo.gif

del frames.txt
echo GIF generated: demo.gif
pause
`;
}
