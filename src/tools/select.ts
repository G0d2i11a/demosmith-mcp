import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { executeWithEvidence } from '../collector/collector.js';
import { findElementByRef } from '../utils/snapshot.js';

export const selectInputSchema = z.object({
  ref: z.string().describe('Element ref from snapshot (e.g., "1", "2")'),
  value: z.string().describe('Value to select'),
  description: z.string().describe('Description of this select action (for documentation)'),
});

export type SelectInput = z.infer<typeof selectInputSchema>;

export async function select(input: SelectInput) {
  const session = requireSession();
  const page = session.page!;

  const { step } = await executeWithEvidence(
    {
      action: 'select',
      description: input.description,
      details: { ref: input.ref, value: input.value },
    },
    async () => {
      const locator = await findElementByRef(page, input.ref);
      await locator.selectOption(input.value);
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
