import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';
import { findElementByRef } from '../utils/snapshot.js';

export const scrollInputSchema = z.object({
  ref: z.string().optional().describe('Element ref to scroll into view (optional, scrolls page if not provided)'),
  direction: z.enum(['up', 'down']).default('down').describe('Scroll direction (if no ref provided)'),
  amount: z.number().default(500).describe('Scroll amount in pixels (if no ref provided)'),
  description: z.string().describe('Description of this scroll action (for documentation)'),
});

export type ScrollInput = z.infer<typeof scrollInputSchema>;

export async function scroll(input: ScrollInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'scroll',
      description: input.description,
      details: { ref: input.ref },
    },
    async () => {
      if (input.ref) {
        // Scroll element into view
        const locator = await findElementByRef(page, input.ref);
        await locator.scrollIntoViewIfNeeded();
      } else {
        // Scroll page
        const delta = input.direction === 'down' ? input.amount : -input.amount;
        await page.mouse.wheel(0, delta);
      }
    }
  );

  return {
    success: step.success,
    stepId: step.id,
    ref: input.ref,
    direction: input.direction,
    error: step.error,
  };
}
