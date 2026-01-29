import * as fs from 'fs/promises';
import * as path from 'path';
import type { DemoSession, DemoDeliverables } from '../types.js';
import { generateMarkdownGuide } from './markdown.js';
import { generateStepsJson } from './json.js';
import { generateNarrationScript } from './narration.js';
import { generateSrt, generateVtt } from './subtitle.js';
import { generateGif } from './gif.js';
import { generateHtmlTutorial } from './html-tutorial.js';

/**
 * Package all deliverables for a completed demo session
 */
export async function packageDeliverables(session: DemoSession): Promise<DemoDeliverables> {
  const outputDir = session.options.outputDir;

  // Generate and write Markdown guide
  const guideContent = generateMarkdownGuide(session);
  const guidePath = path.join(outputDir, 'guide.md');
  await fs.writeFile(guidePath, guideContent, 'utf-8');

  // Generate and write JSON steps
  const stepsData = generateStepsJson(session);
  const stepsPath = path.join(outputDir, 'steps.json');
  await fs.writeFile(stepsPath, JSON.stringify(stepsData, null, 2), 'utf-8');

  // Generate and write narration script
  const narrationContent = generateNarrationScript(session);
  const narrationPath = path.join(outputDir, 'narration.txt');
  await fs.writeFile(narrationPath, narrationContent, 'utf-8');

  // Generate and write SRT subtitles
  const srtContent = generateSrt(session);
  const srtPath = path.join(outputDir, 'subtitles.srt');
  await fs.writeFile(srtPath, srtContent, 'utf-8');

  // Generate and write VTT subtitles
  const vttContent = generateVtt(session);
  const vttPath = path.join(outputDir, 'subtitles.vtt');
  await fs.writeFile(vttPath, vttContent, 'utf-8');

  // Generate HTML interactive tutorial
  const htmlContent = generateHtmlTutorial(session);
  const htmlPath = path.join(outputDir, 'tutorial.html');
  await fs.writeFile(htmlPath, htmlContent, 'utf-8');

  // Generate GIF (animated preview + ffmpeg scripts)
  const gifPreviewPath = await generateGif(session, outputDir);

  // Collect asset paths
  const assetsDir = path.join(outputDir, 'assets');
  let assets: string[] = [];
  try {
    const files = await fs.readdir(assetsDir);
    assets = files
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(assetsDir, f));
  } catch {
    // No assets directory
  }

  // Check for video
  let videoPath: string | undefined;
  const expectedVideoPath = path.join(outputDir, 'demo.webm');
  try {
    await fs.access(expectedVideoPath);
    videoPath = expectedVideoPath;
  } catch {
    // Try videos directory
    const videosDir = path.join(outputDir, 'videos');
    try {
      const files = await fs.readdir(videosDir);
      const webmFile = files.find(f => f.endsWith('.webm'));
      if (webmFile) {
        videoPath = path.join(videosDir, webmFile);
      }
    } catch {
      // No video
    }
  }

  // Check for trace
  let tracePath: string | undefined;
  const expectedTracePath = path.join(outputDir, 'trace.zip');
  try {
    await fs.access(expectedTracePath);
    tracePath = expectedTracePath;
  } catch {
    // No trace
  }

  const successCount = session.steps.filter(s => s.success).length;
  const totalDuration = session.steps.reduce((sum, s) => sum + s.duration, 0);

  return {
    sessionId: session.id,
    title: session.title,
    outputDir,
    files: {
      video: videoPath,
      trace: tracePath,
      guide: guidePath,
      steps: stepsPath,
      narration: narrationPath,
      subtitleSrt: srtPath,
      subtitleVtt: vttPath,
      tutorial: htmlPath,
      gifPreview: gifPreviewPath || undefined,
      assets,
    },
    summary: {
      totalSteps: session.steps.length,
      duration: totalDuration,
      successRate: session.steps.length > 0 ? successCount / session.steps.length : 1,
    },
  };
}
