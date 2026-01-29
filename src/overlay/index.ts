import type { Page, Locator } from 'playwright';
import { injectCursor, showCursor, hideCursor, animateCursorTo, removeCursor } from './cursor.js';
import { showRipple, showHighlight, showTypingIndicator, hideTypingIndicator, removeAllEffects } from './effects.js';
import { playClickSound, playKeystrokeSound, resumeAudio, cleanupAudio } from './audio.js';

// Re-export individual modules
export * from './cursor.js';
export * from './effects.js';
export * from './audio.js';

/**
 * Options for animated click
 */
export interface AnimatedClickOptions {
  /** Animation duration for cursor movement in ms (default: 500) */
  moveDuration?: number;
  /** Whether to play click sound (default: true) */
  sound?: boolean;
  /** Whether to show ripple effect (default: true) */
  ripple?: boolean;
  /** Whether to show element highlight (default: true) */
  highlight?: boolean;
  /** Delay after click before continuing in ms (default: 100) */
  postClickDelay?: number;
}

/**
 * Perform an animated click on an element
 * - Moves cursor smoothly to the element
 * - Shows highlight around element
 * - Plays click sound
 * - Shows ripple effect
 * - Performs the actual click
 */
export async function animatedClick(
  page: Page,
  locator: Locator,
  options: AnimatedClickOptions = {}
): Promise<void> {
  const {
    moveDuration = 500,
    sound = true,
    ripple = true,
    highlight = true,
    postClickDelay = 100,
  } = options;

  // Get element bounding box
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element not visible or has no bounding box');
  }

  // Calculate center of element
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Ensure cursor is injected and visible
  await injectCursor(page);
  await showCursor(page);

  // Animate cursor to target
  await animateCursorTo(page, targetX, targetY, moveDuration);

  // Show highlight around element
  if (highlight) {
    await showHighlight(page, box.x, box.y, box.width, box.height);
  }

  // Small pause before click
  await page.waitForTimeout(50);

  // Resume audio context (in case it was suspended)
  if (sound) {
    await resumeAudio(page);
  }

  // Play click sound and show ripple simultaneously
  const effects: Promise<void>[] = [];
  if (sound) {
    effects.push(playClickSound(page));
  }
  if (ripple) {
    effects.push(showRipple(page, targetX, targetY));
  }
  await Promise.all(effects);

  // Perform the actual click
  await locator.click();

  // Post-click delay
  if (postClickDelay > 0) {
    await page.waitForTimeout(postClickDelay);
  }
}

/**
 * Options for animated fill
 */
export interface AnimatedFillOptions {
  /** Animation duration for cursor movement in ms (default: 500) */
  moveDuration?: number;
  /** Whether to play sounds (default: true) */
  sound?: boolean;
  /** Delay between keystrokes in ms (default: 50) */
  typeDelay?: number;
  /** Whether to show typing indicator (default: true) */
  showTyping?: boolean;
  /** Delay after fill before continuing in ms (default: 100) */
  postFillDelay?: number;
}

/**
 * Perform an animated fill on an input element
 * - Moves cursor smoothly to the element
 * - Clicks to focus
 * - Types with keystroke sounds
 */
export async function animatedFill(
  page: Page,
  locator: Locator,
  value: string,
  options: AnimatedFillOptions = {}
): Promise<void> {
  const {
    moveDuration = 500,
    sound = true,
    typeDelay = 50,
    showTyping = true,
    postFillDelay = 100,
  } = options;

  // Get element bounding box
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element not visible or has no bounding box');
  }

  // Calculate center of element
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Ensure cursor is injected and visible
  await injectCursor(page);
  await showCursor(page);

  // Animate cursor to target
  await animateCursorTo(page, targetX, targetY, moveDuration);

  // Click to focus
  if (sound) {
    await resumeAudio(page);
    await playClickSound(page);
  }
  await showRipple(page, targetX, targetY);
  await locator.click();

  // Show typing indicator
  if (showTyping) {
    await showTypingIndicator(page, targetX + 5, targetY - 9);
  }

  // Clear existing value and type new value with sounds
  await locator.clear();

  // Type each character with optional sound
  for (const char of value) {
    await locator.pressSequentially(char, { delay: 0 });
    if (sound) {
      await playKeystrokeSound(page);
    }
    if (typeDelay > 0) {
      await page.waitForTimeout(typeDelay);
    }
  }

  // Hide typing indicator
  if (showTyping) {
    await hideTypingIndicator(page);
  }

  // Post-fill delay
  if (postFillDelay > 0) {
    await page.waitForTimeout(postFillDelay);
  }
}

/**
 * Clean up all overlay elements from the page
 */
export async function cleanupOverlay(page: Page): Promise<void> {
  await Promise.all([
    removeCursor(page),
    removeAllEffects(page),
    cleanupAudio(page),
  ]);
}
