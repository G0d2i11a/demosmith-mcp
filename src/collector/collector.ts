import * as path from 'path';
import * as fs from 'fs/promises';
import type { DemoSession, DemoStep } from '../types.js';
import { requireSession, addStep } from '../session/manager.js';

export interface ExecuteOptions {
  action: string;
  description: string;
  details?: DemoStep['details'];
}

/**
 * Execute an action with evidence collection (screenshot before/after)
 */
export async function executeWithEvidence<T>(
  options: ExecuteOptions,
  fn: () => Promise<T>
): Promise<{ step: DemoStep; result: T }> {
  const session = requireSession();
  const page = session.page!;

  const startTime = Date.now();
  const videoStartMs = session.videoStartTime ? startTime - session.videoStartTime : undefined;
  let screenshotPath: string | undefined;

  // Take screenshot before action if enabled
  if (session.options.screenshotOnStep) {
    const stepNum = session.steps.length + 1;
    const filename = `step-${String(stepNum).padStart(3, '0')}.png`;
    screenshotPath = path.join(session.options.outputDir, 'assets', filename);
    await page.screenshot({ path: screenshotPath });
  }

  let success = true;
  let error: string | undefined;
  let result: T;

  try {
    result = await fn();
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const duration = Date.now() - startTime;
    const videoEndMs = session.videoStartTime ? Date.now() - session.videoStartTime : undefined;

    addStep({
      action: options.action,
      description: options.description,
      timestamp: new Date(),
      duration,
      videoStartMs,
      videoEndMs,
      details: options.details ?? {},
      evidence: {
        screenshotPath,
      },
      success,
      error,
    });
  }

  return { step: session.steps[session.steps.length - 1], result: result! };
}

/**
 * Take a manual screenshot
 */
export async function takeScreenshot(name?: string): Promise<string> {
  const session = requireSession();
  const page = session.page!;

  const stepNum = session.steps.length + 1;
  const filename = name
    ? `${name}.png`
    : `step-${String(stepNum).padStart(3, '0')}.png`;
  const screenshotPath = path.join(session.options.outputDir, 'assets', filename);

  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}
