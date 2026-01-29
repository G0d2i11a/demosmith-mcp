import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

const outputDir = 'D:/Code/mcp/demosmith-mcp/.tmp/test-demo';

async function test() {
  console.log('Starting test...');

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

  // Start tracing
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
  });

  const page = await context.newPage();

  // Step 1: Navigate
  console.log('Step 1: Navigate to example.com');
  await page.goto('https://example.com');
  await page.screenshot({ path: path.join(outputDir, 'assets', 'step-001.png') });

  // Step 2: Get page info
  console.log('Step 2: Get page info');
  const title = await page.title();
  console.log('Page title:', title);

  // Step 3: Click the "More information" link
  console.log('Step 3: Click link');
  const link = page.getByRole('link', { name: 'More information' });
  if (await link.count() > 0) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: path.join(outputDir, 'assets', 'step-002.png') });
  } else {
    console.log('Link not found, taking screenshot anyway');
    await page.screenshot({ path: path.join(outputDir, 'assets', 'step-002.png') });
  }

  // Stop tracing
  await context.tracing.stop({
    path: path.join(outputDir, 'trace.zip')
  });

  // Close browser (this finalizes the video)
  await page.close();
  await context.close();
  await browser.close();

  // Generate guide.md
  const guide = `# Example.com 演示

## 步骤 1: 打开 Example.com
导航到 https://example.com

![步骤1截图](./assets/step-001.png)

## 步骤 2: 点击链接
点击 "More information" 链接

![步骤2截图](./assets/step-002.png)

---
*本文档由 demosmith 自动生成于 ${new Date().toISOString()}*
`;

  await fs.writeFile(path.join(outputDir, 'guide.md'), guide);

  // Generate steps.json
  const steps = {
    title: 'Example.com 演示',
    steps: [
      { id: 1, action: 'navigate', description: '打开 Example.com', url: 'https://example.com' },
      { id: 2, action: 'click', description: '点击 "More information" 链接' }
    ]
  };
  await fs.writeFile(path.join(outputDir, 'steps.json'), JSON.stringify(steps, null, 2));

  // List output files
  console.log('\n=== Output Files ===');
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    const stat = await fs.stat(path.join(outputDir, file));
    if (stat.isDirectory()) {
      const subfiles = await fs.readdir(path.join(outputDir, file));
      console.log(`${file}/`);
      for (const sf of subfiles) {
        console.log(`  ${sf}`);
      }
    } else {
      console.log(file);
    }
  }

  console.log('\nTest completed! Check:', outputDir);
}

test().catch(console.error);
