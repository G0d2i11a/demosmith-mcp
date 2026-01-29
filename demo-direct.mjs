// Direct demo - bypasses MCP protocol for reliable execution
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

// Import overlay modules
import { injectCursor, animateCursorTo, removeCursor } from './dist/overlay/cursor.js';
import { showRipple } from './dist/overlay/effects.js';
import { playClickSound, playKeystrokeSound } from './dist/overlay/audio.js';

const outputDir = 'D:/Code/mcp/demosmith-mcp/demo-output';

async function demo() {
  console.log('🎬 demosmith-mcp Demo\n');
  console.log('Features showcased:');
  console.log('  ✦ Animated cursor with smooth movement');
  console.log('  ✦ Click effects (ripple + sound)');
  console.log('  ✦ Form filling with typing animation');
  console.log('  ✦ Screenshot capture at each step');
  console.log('  ✦ Multiple output formats\n');

  // Clean and create output directory
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'videos'), { recursive: true });

  // Launch browser with video recording
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: path.join(outputDir, 'videos'), size: { width: 1280, height: 720 } }
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  const steps = [];
  let stepNum = 0;

  async function recordStep(action, description, details = {}) {
    stepNum++;
    const screenshotPath = path.join(outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });

    steps.push({
      id: stepNum,
      action,
      description,
      timestamp: new Date(),
      duration: 500,
      details,
      evidence: { screenshotPath },
      success: true,
    });
    console.log(`  ✓ Step ${stepNum}: ${description}`);
  }

  try {
    // Step 1: Navigate
    console.log('\n📍 Navigating to GitHub login...');
    await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await recordStep('navigate', 'Open GitHub login page', { url: 'https://github.com/login' });

    // Step 2: Inject cursor and animate to username field
    console.log('\n📍 Filling username with animated cursor...');
    await injectCursor(page);

    const usernameField = page.locator('#login_field');
    const usernameBox = await usernameField.boundingBox();
    if (usernameBox) {
      await animateCursorTo(page, usernameBox.x + usernameBox.width / 2, usernameBox.y + usernameBox.height / 2, 600);
      await showRipple(page, usernameBox.x + usernameBox.width / 2, usernameBox.y + usernameBox.height / 2);
      await playClickSound(page);
    }
    await usernameField.click();

    // Type with animation
    const username = 'demo-user@example.com';
    for (const char of username) {
      await page.keyboard.type(char, { delay: 0 });
      await playKeystrokeSound(page);
      await page.waitForTimeout(60);
    }
    await recordStep('fill', 'Enter username or email address', { ref: 'login_field', value: username });

    // Step 3: Fill password
    console.log('\n📍 Filling password...');
    const passwordField = page.locator('#password');
    const passwordBox = await passwordField.boundingBox();
    if (passwordBox) {
      await animateCursorTo(page, passwordBox.x + passwordBox.width / 2, passwordBox.y + passwordBox.height / 2, 500);
      await showRipple(page, passwordBox.x + passwordBox.width / 2, passwordBox.y + passwordBox.height / 2);
      await playClickSound(page);
    }
    await passwordField.click();

    const password = 'SecureP@ss123';
    for (const char of password) {
      await page.keyboard.type(char, { delay: 0 });
      await playKeystrokeSound(page);
      await page.waitForTimeout(50);
    }
    await recordStep('fill', 'Enter password', { ref: 'password', value: '••••••••••••' });

    // Step 4: Hover over Sign in button
    console.log('\n📍 Hovering over Sign in button...');
    const signInBtn = page.locator('input[type="submit"][value="Sign in"]');
    const btnBox = await signInBtn.boundingBox();
    if (btnBox) {
      await animateCursorTo(page, btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, 400);
    }
    await signInBtn.hover();
    await page.waitForTimeout(500);
    await recordStep('hover', 'Hover over Sign in button', { ref: 'submit' });

    // Step 5: Take screenshot
    console.log('\n📍 Taking screenshot of filled form...');
    await recordStep('screenshot', 'Login form filled and ready to submit');

    // Step 6: Scroll down
    console.log('\n📍 Scrolling down...');
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(300);
    await recordStep('scroll', 'Scroll down to see more options', { direction: 'down', amount: 150 });

    // Step 7: Press Tab
    console.log('\n📍 Pressing Tab key...');
    await page.keyboard.press('Tab');
    await playKeystrokeSound(page);
    await page.waitForTimeout(300);
    await recordStep('pressKey', 'Press Tab to navigate', { key: 'Tab' });

    // Step 8: Assert
    console.log('\n📍 Verifying page...');
    const title = await page.title();
    await recordStep('assert', 'Verify GitHub login page', { type: 'title', expected: 'GitHub', actual: title });

    // Remove cursor
    await removeCursor(page);

    // Stop tracing
    await context.tracing.stop({ path: path.join(outputDir, 'trace.zip') });

    // Close browser
    await page.close();
    await context.close();
    await browser.close();

    // Build session object
    const session = {
      id: 'github-demo',
      title: 'GitHub Login Demo',
      startUrl: 'https://github.com/login',
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
      steps,
    };

    // Generate all outputs
    console.log('\n📦 Generating deliverables...\n');

    // 1. Markdown guide
    const guide = generateMarkdownGuide(session);
    await fs.writeFile(path.join(outputDir, 'guide.md'), guide);
    console.log('  ✓ guide.md');

    // 2. JSON steps
    const stepsJson = generateStepsJson(session);
    await fs.writeFile(path.join(outputDir, 'steps.json'), JSON.stringify(stepsJson, null, 2));
    console.log('  ✓ steps.json');

    // 3. Narration script
    const narration = generateNarrationScript(session);
    await fs.writeFile(path.join(outputDir, 'narration.txt'), narration);
    console.log('  ✓ narration.txt');

    // 4. SRT subtitles
    const srt = generateSrt(session);
    await fs.writeFile(path.join(outputDir, 'subtitles.srt'), srt);
    console.log('  ✓ subtitles.srt');

    // 5. VTT subtitles
    const vtt = generateVtt(session);
    await fs.writeFile(path.join(outputDir, 'subtitles.vtt'), vtt);
    console.log('  ✓ subtitles.vtt');

    // 6. HTML tutorial
    const html = generateHtmlTutorial(session);
    await fs.writeFile(path.join(outputDir, 'tutorial.html'), html);
    console.log('  ✓ tutorial.html');

    // 7. GIF preview
    await generateGif(session, outputDir);
    console.log('  ✓ animated-preview.html');

    // Rename video
    const videosDir = path.join(outputDir, 'videos');
    const videoFiles = await fs.readdir(videosDir);
    if (videoFiles.length > 0) {
      await fs.rename(
        path.join(videosDir, videoFiles[0]),
        path.join(outputDir, 'demo.webm')
      );
      await fs.rmdir(videosDir);
      console.log('  ✓ demo.webm');
    }

    // List all files
    console.log('\n' + '='.repeat(50));
    console.log('📦 Generated Files:');
    console.log('='.repeat(50));

    const files = await fs.readdir(outputDir);
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        const subFiles = await fs.readdir(filePath);
        console.log(`\n📁 ${file}/`);
        for (const sf of subFiles) {
          const sfStat = await fs.stat(path.join(filePath, sf));
          const size = (sfStat.size / 1024).toFixed(1);
          console.log(`   📄 ${sf} (${size} KB)`);
        }
      } else {
        const size = (stat.size / 1024).toFixed(1);
        console.log(`📄 ${file} (${size} KB)`);
      }
    }

    // Show samples
    console.log('\n' + '='.repeat(50));
    console.log('📝 Narration Script Preview:');
    console.log('='.repeat(50));
    console.log(narration);

    console.log('\n' + '='.repeat(50));
    console.log('📝 SRT Subtitles Preview:');
    console.log('='.repeat(50));
    console.log(srt);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Demo Complete!');
    console.log('='.repeat(50));
    console.log(`\nOutput: ${outputDir}`);
    console.log('\nOpen in browser:');
    console.log(`  file:///${outputDir.replace(/\\/g, '/')}/tutorial.html`);
    console.log(`  file:///${outputDir.replace(/\\/g, '/')}/animated-preview.html`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await browser.close();
  }
}

demo().catch(console.error);
