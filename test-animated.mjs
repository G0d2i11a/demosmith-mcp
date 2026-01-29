import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

const outputDir = 'D:/Code/mcp/demosmith-mcp/.tmp/test-animated';

async function test() {
  console.log('Starting animated cursor test...');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });

  // Launch browser with video recording
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: {
      dir: path.join(outputDir, 'videos'),
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Navigate to a page with form elements
  console.log('Step 1: Navigate to example form page');
  await page.goto('https://www.w3schools.com/html/html_forms.asp');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Inject cursor
  console.log('Step 2: Inject animated cursor');
  await page.evaluate(() => {
    // Check if cursor already exists
    if (document.getElementById('demosmith-cursor')) return;

    const cursor = document.createElement('div');
    cursor.id = 'demosmith-cursor';
    cursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill="#000" stroke="#fff" stroke-width="1.5"/>
      </svg>
    `;

    Object.assign(cursor.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '24px',
      height: '24px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(100px, 100px)',
      opacity: '1',
    });

    document.body.appendChild(cursor);
  });

  // Inject ripple styles
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'demosmith-ripple-styles';
    style.textContent = `
      @keyframes demosmith-ripple {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
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
        0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  });

  // Find the first input field
  const firstInput = page.locator('input[type="text"]').first();
  const box = await firstInput.boundingBox();

  if (box) {
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    console.log('Step 3: Animate cursor to input field');

    // Animate cursor movement
    await page.evaluate(({ targetX, targetY }) => {
      return new Promise((resolve) => {
        const cursor = document.getElementById('demosmith-cursor');
        if (!cursor) { resolve(); return; }

        const startX = 100, startY = 100;
        const duration = 800;
        const startTime = performance.now();

        function easeOutCubic(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        function animate(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeOutCubic(progress);

          const currentX = startX + (targetX - startX) * easedProgress;
          const currentY = startY + (targetY - startY) * easedProgress;

          cursor.style.transform = `translate(${currentX - 2}px, ${currentY - 2}px)`;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        }

        requestAnimationFrame(animate);
      });
    }, { targetX, targetY });

    // Show ripple effect
    console.log('Step 4: Show click effect');
    await page.evaluate(({ x, y }) => {
      const ripple = document.createElement('div');
      ripple.className = 'demosmith-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      const dot = document.createElement('div');
      dot.className = 'demosmith-click-dot';
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      document.body.appendChild(ripple);
      document.body.appendChild(dot);

      setTimeout(() => {
        ripple.remove();
        dot.remove();
      }, 500);
    }, { x: targetX, y: targetY });

    // Click and type
    await firstInput.click();
    await page.waitForTimeout(300);

    console.log('Step 5: Type with animation');
    const text = 'Hello Demo!';
    for (const char of text) {
      await firstInput.pressSequentially(char, { delay: 0 });
      await page.waitForTimeout(80);
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, 'assets', 'final.png') });

  // Close browser
  await page.close();
  await context.close();
  await browser.close();

  console.log('\n=== Test completed! ===');
  console.log('Output directory:', outputDir);
  console.log('Check the video in:', path.join(outputDir, 'videos'));
}

test().catch(console.error);
