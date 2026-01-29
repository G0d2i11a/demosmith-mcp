import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep } from '../session/manager.js';
import { getElementByRef } from '../utils/selector.js';
import { injectCursor, animateCursorTo, removeCursor } from '../overlay/cursor.js';
import { playClickSound } from '../overlay/audio.js';

export const dragInputSchema = z.object({
  fromRef: z.string().describe('Ref of the element to drag (from snapshot)'),
  toRef: z.string().describe('Ref of the target element to drop onto (from snapshot)'),
  description: z.string().describe('Description of this action for documentation'),
  animated: z.boolean().optional().default(true).describe('Whether to show animated cursor movement'),
  moveDuration: z.number().optional().default(600).describe('Duration of cursor movement in ms'),
});

export type DragInput = z.infer<typeof dragInputSchema>;

export async function drag(input: DragInput) {
  const session = requireSession();
  const page = session.page!;
  const startTime = Date.now();

  // Get source element
  const fromElement = await getElementByRef(page, input.fromRef);
  if (!fromElement) {
    throw new Error(`Element with ref "${input.fromRef}" not found`);
  }

  // Get target element
  const toElement = await getElementByRef(page, input.toRef);
  if (!toElement) {
    throw new Error(`Element with ref "${input.toRef}" not found`);
  }

  // Get bounding boxes
  const fromBox = await fromElement.boundingBox();
  const toBox = await toElement.boundingBox();

  if (!fromBox || !toBox) {
    throw new Error('Could not get element positions');
  }

  const fromX = fromBox.x + fromBox.width / 2;
  const fromY = fromBox.y + fromBox.height / 2;
  const toX = toBox.x + toBox.width / 2;
  const toY = toBox.y + toBox.height / 2;

  if (input.animated) {
    // Inject cursor and animate
    await injectCursor(page);

    // Move to source element
    await animateCursorTo(page, fromX, fromY, input.moveDuration / 2);
    await playClickSound(page);

    // Perform drag with animated cursor following
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();

    // Animate cursor to target while dragging
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentX = fromX + (toX - fromX) * progress;
      const currentY = fromY + (toY - fromY) * progress;
      await page.mouse.move(currentX, currentY);
      await animateCursorTo(page, currentX, currentY, input.moveDuration / steps / 2);
    }

    await page.mouse.up();
    await playClickSound(page);

    // Remove cursor after a delay
    await page.waitForTimeout(300);
    await removeCursor(page);
  } else {
    // Simple drag without animation
    await fromElement.dragTo(toElement);
  }

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
    action: 'drag',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      fromRef: input.fromRef,
      toRef: input.toRef,
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    duration,
  };
}
