import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';

export const waitInputSchema = z.object({
  condition: z.enum(['load', 'networkidle', 'domcontentloaded']).default('load')
    .describe('Wait condition: load, networkidle, or domcontentloaded'),
  timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  description: z.string().describe('Description of this wait action (for documentation)'),
});

export type WaitInput = z.infer<typeof waitInputSchema>;

export async function wait(input: WaitInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'wait',
      description: input.description,
      details: {},
    },
    async () => {
      await page.waitForLoadState(input.condition, { timeout: input.timeout });
    }
  );

  return {
    success: step.success,
    stepId: step.id,
    condition: input.condition,
    error: step.error,
  };
}
