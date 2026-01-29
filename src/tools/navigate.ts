import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';

export const navigateInputSchema = z.object({
  url: z.string().url().describe('URL to navigate to'),
  description: z.string().describe('Description of this navigation step (for documentation)'),
});

export type NavigateInput = z.infer<typeof navigateInputSchema>;

export async function navigate(input: NavigateInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'navigate',
      description: input.description,
      details: { url: input.url },
    },
    async () => {
      await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    }
  );

  return {
    success: step.success,
    stepId: step.id,
    url: input.url,
    error: step.error,
  };
}
