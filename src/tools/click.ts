import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';
import { findElementByRef } from '../utils/snapshot.js';
import { animatedClick } from '../overlay/index.js';

export const clickInputSchema = z.object({
  ref: z.string().describe('Element ref from snapshot (e.g., "1", "2")'),
  description: z.string().describe('Description of this click action (for documentation)'),
  animated: z.boolean().optional().default(true).describe('Whether to animate cursor movement and show click effects (default: true)'),
  moveDuration: z.number().optional().default(500).describe('Cursor movement duration in ms (default: 500)'),
});

export type ClickInput = z.infer<typeof clickInputSchema>;

export async function click(input: ClickInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'click',
      description: input.description,
      details: { ref: input.ref },
    },
    async () => {
      const locator = await findElementByRef(page, input.ref);

      if (input.animated) {
        // Use animated click with cursor movement, sound, and ripple
        await animatedClick(page, locator, {
          moveDuration: input.moveDuration,
          sound: true,
          ripple: true,
          highlight: true,
        });
      } else {
        // Simple click without animation
        await locator.click();
      }
    }
  );

  return {
    success: step.success,
    stepId: step.id,
    ref: input.ref,
    error: step.error,
  };
}
