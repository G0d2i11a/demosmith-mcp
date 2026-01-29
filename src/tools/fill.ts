import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';
import { findElementByRef } from '../utils/snapshot.js';
import { animatedFill } from '../overlay/index.js';

export const fillInputSchema = z.object({
  ref: z.string().describe('Element ref from snapshot (e.g., "1", "2")'),
  value: z.string().describe('Value to fill in'),
  description: z.string().describe('Description of this fill action (for documentation)'),
  animated: z.boolean().optional().default(true).describe('Whether to animate cursor and typing (default: true)'),
  moveDuration: z.number().optional().default(500).describe('Cursor movement duration in ms (default: 500)'),
  typeDelay: z.number().optional().default(50).describe('Delay between keystrokes in ms (default: 50)'),
});

export type FillInput = z.infer<typeof fillInputSchema>;

export async function fill(input: FillInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'fill',
      description: input.description,
      details: { ref: input.ref, value: input.value },
    },
    async () => {
      const locator = await findElementByRef(page, input.ref);

      if (input.animated) {
        // Use animated fill with cursor movement and typing sounds
        await animatedFill(page, locator, input.value, {
          moveDuration: input.moveDuration,
          typeDelay: input.typeDelay,
          sound: true,
          showTyping: true,
        });
      } else {
        // Simple fill without animation
        await locator.fill(input.value);
      }
    }
  );

  return {
    success: step.success,
    stepId: step.id,
    ref: input.ref,
    value: input.value,
    error: step.error,
  };
}
