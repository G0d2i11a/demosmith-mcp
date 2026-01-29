import { z } from 'zod';
import { requireSession, addStep } from '../session/manager.js';
import { takeScreenshot as doTakeScreenshot } from '../collector/collector.js';

export const screenshotInputSchema = z.object({
  name: z.string().optional().describe('Screenshot filename (without extension)'),
  description: z.string().describe('Description of this screenshot (for documentation)'),
});

export type ScreenshotInput = z.infer<typeof screenshotInputSchema>;

export async function screenshot(input: ScreenshotInput) {
  const session = requireSession();

  const startTime = Date.now();
  let success = true;
  let error: string | undefined;
  let screenshotPath: string | undefined;

  try {
    screenshotPath = await doTakeScreenshot(input.name);
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
  }

  const duration = Date.now() - startTime;

  addStep({
    action: 'screenshot',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {},
    evidence: { screenshotPath },
    success,
    error,
  });

  return {
    success,
    stepId: session.steps.length,
    screenshotPath,
    error,
  };
}
