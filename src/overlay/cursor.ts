import type { Page } from 'playwright';

/**
 * Inject a fake cursor element into the page
 */
export async function injectCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Check if cursor already exists
    if (document.getElementById('demosmith-cursor')) return;

    // Create cursor container
    const cursor = document.createElement('div');
    cursor.id = 'demosmith-cursor';
    cursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill="#000" stroke="#fff" stroke-width="1.5"/>
      </svg>
    `;

    // Style the cursor
    Object.assign(cursor.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '24px',
      height: '24px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(-2px, -2px)',
      transition: 'none',
      opacity: '0',
    });

    document.body.appendChild(cursor);
  });
}

/**
 * Show the fake cursor
 */
export async function showCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cursor = document.getElementById('demosmith-cursor');
    if (cursor) {
      cursor.style.opacity = '1';
    }
  });
}

/**
 * Hide the fake cursor
 */
export async function hideCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cursor = document.getElementById('demosmith-cursor');
    if (cursor) {
      cursor.style.opacity = '0';
    }
  });
}

/**
 * Get current cursor position
 */
export async function getCursorPosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const cursor = document.getElementById('demosmith-cursor');
    if (!cursor) return { x: 0, y: 0 };

    const transform = cursor.style.transform;
    const match = transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
    if (match) {
      return { x: parseFloat(match[1]) + 2, y: parseFloat(match[2]) + 2 };
    }
    return { x: 0, y: 0 };
  });
}

/**
 * Set cursor position instantly
 */
export async function setCursorPosition(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(({ x, y }) => {
    const cursor = document.getElementById('demosmith-cursor');
    if (cursor) {
      cursor.style.transition = 'none';
      cursor.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
    }
  }, { x, y });
}

/**
 * Animate cursor to target position with easing
 * @param page Playwright page
 * @param targetX Target X coordinate
 * @param targetY Target Y coordinate
 * @param duration Animation duration in ms (default 500ms)
 */
export async function animateCursorTo(
  page: Page,
  targetX: number,
  targetY: number,
  duration: number = 500
): Promise<void> {
  // Ensure cursor exists and is visible
  await injectCursor(page);
  await showCursor(page);

  // Get current position
  const currentPos = await getCursorPosition(page);

  // If cursor is at origin (first time), start from top-left corner
  const startX = currentPos.x === 0 && currentPos.y === 0 ? 100 : currentPos.x;
  const startY = currentPos.x === 0 && currentPos.y === 0 ? 100 : currentPos.y;

  // Set initial position if first time
  if (currentPos.x === 0 && currentPos.y === 0) {
    await setCursorPosition(page, startX, startY);
    await page.waitForTimeout(50); // Small delay for the position to apply
  }

  // Animate using requestAnimationFrame for smooth movement
  await page.evaluate(({ startX, startY, targetX, targetY, duration }) => {
    return new Promise<void>((resolve) => {
      const cursor = document.getElementById('demosmith-cursor');
      if (!cursor) {
        resolve();
        return;
      }

      const startTime = performance.now();

      // Ease-out cubic function for natural deceleration
      function easeOutCubic(t: number): number {
        return 1 - Math.pow(1 - t, 3);
      }

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        const currentX = startX + (targetX - startX) * easedProgress;
        const currentY = startY + (targetY - startY) * easedProgress;

        if (cursor) {
          cursor.style.transform = `translate(${currentX - 2}px, ${currentY - 2}px)`;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animate);
    });
  }, { startX, startY, targetX, targetY, duration });
}

/**
 * Remove the fake cursor from the page
 */
export async function removeCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cursor = document.getElementById('demosmith-cursor');
    if (cursor) {
      cursor.remove();
    }
  });
}
