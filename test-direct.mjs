// Direct test of generators (bypassing MCP protocol)
import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

// Import generators directly
import { generateMarkdownGuide } from './dist/generator/markdown.js';
import { generateStepsJson } from './dist/generator/json.js';
import { generateNarrationScript } from './dist/generator/narration.js';
import { generateSrt, generateVtt } from './dist/generator/subtitle.js';
import { generateGif } from './dist/generator/gif.js';
import { generateHtmlTutorial } from './dist/generator/html-tutorial.js';

const outputDir = 'D:/Code/mcp/demosmith-mcp/.tmp/test-generators';

async function test() {
  console.log('Testing all generators directly...\n');

  // Clean and create output directory
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });

  // Launch browser and take some screenshots
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: { dir: path.join(outputDir, 'videos'), size: { width: 1280, height: 720 } }
  });
  await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();

  // Navigate and take screenshots
  await page.goto('https://example.com');
  await page.screenshot({ path: path.join(outputDir, 'assets', 'step-001.png') });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, 'assets', 'step-002.png') });

  // Stop tracing
  await context.tracing.stop({ path: path.join(outputDir, 'trace.zip') });
  await page.close();
  await context.close();
  await browser.close();

  // Create mock session
  const session = {
    id: 'test-001',
    title: 'Example.com Demo',
    startUrl: 'https://example.com',
    startedAt: new Date(),
    status: 'completed',
    options: {
      video: true,
      trace: true,
      screenshotOnStep: true,
      outputDir: outputDir,
      headless: false,
      viewport: { width: 1280, height: 720 },
    },
    steps: [
      {
        id: 1,
        action: 'navigate',
        description: 'Open the Example.com homepage',
        timestamp: new Date(),
        duration: 1500,
        details: { url: 'https://example.com' },
        evidence: { screenshotPath: 'assets/step-001.png' },
        success: true,
      },
      {
        id: 2,
        action: 'screenshot',
        description: 'Capture the main page content',
        timestamp: new Date(),
        duration: 200,
        details: {},
        evidence: { screenshotPath: 'assets/step-002.png' },
        success: true,
      },
    ],
  };

  console.log('Generating deliverables...\n');

  // 1. Markdown guide
  const guide = generateMarkdownGuide(session);
  await fs.writeFile(path.join(outputDir, 'guide.md'), guide);
  console.log('✓ guide.md');

  // 2. JSON steps
  const steps = generateStepsJson(session);
  await fs.writeFile(path.join(outputDir, 'steps.json'), JSON.stringify(steps, null, 2));
  console.log('✓ steps.json');

  // 3. Narration script
  const narration = generateNarrationScript(session);
  await fs.writeFile(path.join(outputDir, 'narration.txt'), narration);
  console.log('✓ narration.txt');

  // 4. SRT subtitles
  const srt = generateSrt(session);
  await fs.writeFile(path.join(outputDir, 'subtitles.srt'), srt);
  console.log('✓ subtitles.srt');

  // 5. VTT subtitles
  const vtt = generateVtt(session);
  await fs.writeFile(path.join(outputDir, 'subtitles.vtt'), vtt);
  console.log('✓ subtitles.vtt');

  // 6. HTML tutorial
  const html = generateHtmlTutorial(session);
  await fs.writeFile(path.join(outputDir, 'tutorial.html'), html);
  console.log('✓ tutorial.html');

  // 7. GIF preview
  await generateGif(session, outputDir);
  console.log('✓ animated-preview.html + generate-gif scripts');

  // List all files
  console.log('\n=== Generated Files ===');
  const files = await fs.readdir(outputDir);
  for (const file of files) {
    const stat = await fs.stat(path.join(outputDir, file));
    if (stat.isDirectory()) {
      const subFiles = await fs.readdir(path.join(outputDir, file));
      console.log(`📁 ${file}/`);
      for (const sf of subFiles) {
        console.log(`   - ${sf}`);
      }
    } else {
      const size = (stat.size / 1024).toFixed(1);
      console.log(`📄 ${file} (${size} KB)`);
    }
  }

  // Show previews
  console.log('\n=== Narration Script ===');
  console.log(narration);

  console.log('\n=== SRT Subtitles ===');
  console.log(srt);

  console.log('\n=== Test Complete! ===');
  console.log(`Open ${outputDir}/tutorial.html in browser`);
}

test().catch(console.error);
