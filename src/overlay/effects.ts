import type { Page } from 'playwright';

/**
 * Inject the ripple effect styles into the page
 */
export async function injectRippleStyles(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Check if styles already exist
    if (document.getElementById('demosmith-ripple-styles')) return;

    const style = document.createElement('style');
    style.id = 'demosmith-ripple-styles';
    style.textContent = `
      @keyframes demosmith-ripple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 0.6;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0;
        }
      }

      .demosmith-ripple {
        position: fixed;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(66, 133, 244, 0.6) 0%, rgba(66, 133, 244, 0) 70%);
        pointer-events: none;
        z-index: 2147483646;
        animation: demosmith-ripple 0.4s ease-out forwards;
      }

      .demosmith-click-dot {
        position: fixed;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(66, 133, 244, 0.8);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%) scale(0);
        animation: demosmith-click-dot 0.3s ease-out forwards;
      }

      @keyframes demosmith-click-dot {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(style);
  });
}

/**
 * Show a ripple effect at the specified position
 * @param page Playwright page
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function showRipple(page: Page, x: number, y: number): Promise<void> {
  // Ensure styles are injected
  await injectRippleStyles(page);

  await page.evaluate(({ x, y }) => {
    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'demosmith-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // Create click dot
    const dot = document.createElement('div');
    dot.className = 'demosmith-click-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;

    document.body.appendChild(ripple);
    document.body.appendChild(dot);

    // Remove elements after animation
    setTimeout(() => {
      ripple.remove();
      dot.remove();
    }, 500);
  }, { x, y });
}

/**
 * Show a highlight effect around an element (for focus/hover states)
 * @param page Playwright page
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Element width
 * @param height Element height
 */
export async function showHighlight(
  page: Page,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  await page.evaluate(({ x, y, width, height }) => {
    // Check if highlight styles exist
    if (!document.getElementById('demosmith-highlight-styles')) {
      const style = document.createElement('style');
      style.id = 'demosmith-highlight-styles';
      style.textContent = `
        @keyframes demosmith-highlight {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
          }
        }

        .demosmith-highlight {
          position: fixed;
          border: 2px solid rgba(66, 133, 244, 0.8);
          border-radius: 4px;
          background: rgba(66, 133, 244, 0.1);
          pointer-events: none;
          z-index: 2147483645;
          animation: demosmith-highlight 0.6s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    const highlight = document.createElement('div');
    highlight.className = 'demosmith-highlight';
    highlight.style.left = `${x - 4}px`;
    highlight.style.top = `${y - 4}px`;
    highlight.style.width = `${width + 8}px`;
    highlight.style.height = `${height + 8}px`;

    document.body.appendChild(highlight);

    setTimeout(() => {
      highlight.remove();
    }, 700);
  }, { x, y, width, height });
}

/**
 * Show typing indicator effect
 * @param page Playwright page
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function showTypingIndicator(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(({ x, y }) => {
    // Check if typing styles exist
    if (!document.getElementById('demosmith-typing-styles')) {
      const style = document.createElement('style');
      style.id = 'demosmith-typing-styles';
      style.textContent = `
        @keyframes demosmith-typing-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .demosmith-typing-cursor {
          position: fixed;
          width: 2px;
          height: 18px;
          background: rgba(66, 133, 244, 0.9);
          pointer-events: none;
          z-index: 2147483646;
          animation: demosmith-typing-blink 0.8s infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // Remove any existing typing cursor
    const existing = document.querySelector('.demosmith-typing-cursor');
    if (existing) existing.remove();

    const cursor = document.createElement('div');
    cursor.className = 'demosmith-typing-cursor';
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;

    document.body.appendChild(cursor);
  }, { x, y });
}

/**
 * Hide typing indicator
 */
export async function hideTypingIndicator(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cursor = document.querySelector('.demosmith-typing-cursor');
    if (cursor) cursor.remove();
  });
}

/**
 * Remove all effect elements from the page
 */
export async function removeAllEffects(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Remove all effect elements
    document.querySelectorAll('.demosmith-ripple, .demosmith-click-dot, .demosmith-highlight, .demosmith-typing-cursor').forEach(el => el.remove());

    // Remove style elements
    ['demosmith-ripple-styles', 'demosmith-highlight-styles', 'demosmith-typing-styles'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  });
}

/**
 * Highlight an element by ref (finds element and shows highlight around it)
 * @param page Playwright page
 * @param ref Element ref from snapshot
 */
export async function highlightElement(page: Page, ref: string): Promise<void> {
  // Import dynamically to avoid circular dependency
  const { findElement } = await import('../utils/snapshot.js');

  try {
    const locator = await findElement(page, ref);
    const box = await locator.boundingBox();

    if (box) {
      await showHighlight(page, box.x, box.y, box.width, box.height);
    }
  } catch {
    // Element not found, skip highlight
  }
}
