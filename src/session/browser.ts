import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { DemoSession, DemoSessionOptions } from '../types.js';

export async function launchBrowser(options: DemoSessionOptions): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({
    headless: options.headless,
  });

  // Ensure output directories exist
  await fs.mkdir(options.outputDir, { recursive: true });
  await fs.mkdir(path.join(options.outputDir, 'assets'), { recursive: true });

  const contextOptions: Parameters<Browser['newContext']>[0] = {
    viewport: options.viewport,
  };

  // Video recording
  if (options.video) {
    const videosDir = path.join(options.outputDir, 'videos');
    await fs.mkdir(videosDir, { recursive: true });
    contextOptions.recordVideo = {
      dir: videosDir,
      size: options.viewport,
    };
  }

  // Storage state (login session)
  if (options.storageState) {
    contextOptions.storageState = options.storageState;
  }

  const context = await browser.newContext(contextOptions);

  // Trace recording
  if (options.trace) {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  }

  const page = await context.newPage();

  return { browser, context, page };
}

export async function closeBrowser(session: DemoSession): Promise<{ videoPath?: string }> {
  const result: { videoPath?: string } = {};

  if (!session.context || !session.browser) {
    return result;
  }

  // Stop trace and save
  if (session.options.trace) {
    const tracePath = path.join(session.options.outputDir, 'trace.zip');
    await session.context.tracing.stop({ path: tracePath });
  }

  // Get video path before closing
  if (session.options.video && session.page) {
    const video = session.page.video();
    if (video) {
      const videoPath = await video.path();
      result.videoPath = videoPath;
    }
  }

  await session.context.close();
  await session.browser.close();

  // Rename video to demo.webm
  if (result.videoPath) {
    const finalVideoPath = path.join(session.options.outputDir, 'demo.webm');
    try {
      await fs.rename(result.videoPath, finalVideoPath);
      result.videoPath = finalVideoPath;
    } catch {
      // Video might still be in videos/ folder
    }
  }

  return result;
}
