import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep } from '../session/manager.js';
import { getElementByRef } from '../utils/selector.js';

export const uploadInputSchema = z.object({
  ref: z.string().describe('Ref of the file input element (from snapshot)'),
  filePath: z.string().describe('Path to the file to upload'),
  description: z.string().describe('Description of this action for documentation'),
});

export type UploadInput = z.infer<typeof uploadInputSchema>;

export async function upload(input: UploadInput) {
  const session = requireSession();
  const page = session.page!;
  const startTime = Date.now();

  // Get the file input element
  const element = await getElementByRef(page, input.ref);
  if (!element) {
    throw new Error(`Element with ref "${input.ref}" not found`);
  }

  // Set the file
  await element.setInputFiles(input.filePath);

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
    action: 'upload',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      ref: input.ref,
      filePath: input.filePath,
      fileName: path.basename(input.filePath),
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    fileName: path.basename(input.filePath),
    duration,
  };
}
