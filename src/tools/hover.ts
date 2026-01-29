import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep } from '../session/manager.js';
import { getElementByRef } from '../utils/selector.js';
import { injectCursor, animateCursorTo, removeCursor } from '../overlay/cursor.js';
import { highlightElement } from '../overlay/effects.js';

export const hoverInputSchema = z.object({
  ref: z.string().describe('Ref of the element to hover (from snapshot)'),
  description: z.string().describe('Description of this action for documentation'),
  animated: z.boolean().optional().default(true).describe('Whether to show animated cursor movement'),
  moveDuration: z.number().optional().default(500).describe('Duration of cursor movement in ms'),
  waitAfter: z.number().optional().default(500).describe('Time to wait after hover (for tooltips/menus to appear)'),
});

export type HoverInput = z.infer<typeof hoverInputSchema>;

export async function hover(input: HoverInput) {
  const session = requireSession();
  const page = session.page!;
  const startTime = Date.now();

  // Get the element
  const element = await getElementByRef(page, input.ref);
  if (!element) {
    throw new Error(`Element with ref "${input.ref}" not found`);
  }

  // Get element position
  const box = await element.boundingBox();
  if (!box) {
    throw new Error('Could not get element position');
  }

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  if (input.animated) {
    // Inject cursor and animate
    await injectCursor(page);
    await animateCursorTo(page, targetX, targetY, input.moveDuration);

    // Highlight the element
    await highlightElement(page, input.ref);
  }

  // Perform the hover
  await element.hover();

  // Wait for tooltips/menus to appear
  if (input.waitAfter > 0) {
    await page.waitForTimeout(input.waitAfter);
  }

  const duration = Date.now() - startTime;

  // Take screenshot if enabled (after wait, to capture tooltip/menu)
  let screenshotPath: string | undefined;
  if (session.options.screenshotOnStep) {
    const stepNum = session.steps.length + 1;
    screenshotPath = path.join(session.options.outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  if (input.animated) {
    // Remove cursor after screenshot
    await removeCursor(page);
  }

  // Record step
  const step = addStep({
    action: 'hover',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      ref: input.ref,
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    position: { x: targetX, y: targetY },
    duration,
  };
}
