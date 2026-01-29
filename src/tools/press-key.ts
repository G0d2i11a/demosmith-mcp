import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep } from '../session/manager.js';
import { playKeystrokeSound } from '../overlay/audio.js';

export const pressKeyInputSchema = z.object({
  key: z.string().describe('Key or key combination to press (e.g., "Enter", "Tab", "Control+A", "Shift+Tab")'),
  description: z.string().describe('Description of this action for documentation'),
  animated: z.boolean().optional().default(true).describe('Whether to play keystroke sound'),
});

export type PressKeyInput = z.infer<typeof pressKeyInputSchema>;

export async function pressKey(input: PressKeyInput) {
  const session = requireSession();
  const page = session.page!;
  const startTime = Date.now();

  // Play keystroke sound if animated
  if (input.animated) {
    await playKeystrokeSound(page);
  }

  // Press the key
  await page.keyboard.press(input.key);

  const duration = Date.now() - startTime;

  // Take screenshot if enabled
  let screenshotPath: string | undefined;
  if (session.options.screenshotOnStep) {
    const stepNum = session.steps.length + 1;
    screenshotPath = path.join(session.options.outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  // Record step
  const step = addStep({
    action: 'pressKey',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      key: input.key,
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    key: input.key,
    duration,
  };
}
