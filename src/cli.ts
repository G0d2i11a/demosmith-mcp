#!/usr/bin/env node

/**
 * CLI interface for demosmith-mcp
 *
 * Usage:
 *   demosmith replay <steps.json> [options]
 *   demosmith generate <steps.json> [options]
 *   demosmith serve <outputDir>
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { chromium } from 'playwright';
import { packageDeliverables } from './generator/packager.js';
import { setLanguage, type Language } from './utils/i18n.js';
import type { DemoSession, DemoStep } from './types.js';

interface CLIOptions {
  output?: string;
  language?: Language;
  headless?: boolean;
  video?: boolean;
  width?: number;
  height?: number;
}

function parseArgs(args: string[]): { command: string; file?: string; options: CLIOptions } {
  const command = args[0] || 'help';
  const file = args[1];
  const options: CLIOptions = {};

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--language' || arg === '-l') {
      options.language = args[++i] as Language;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--video') {
      options.video = true;
    } else if (arg === '--width') {
      options.width = parseInt(args[++i], 10);
    } else if (arg === '--height') {
      options.height = parseInt(args[++i], 10);
    }
  }

  return { command, file, options };
}

function printHelp() {
  console.log(`
demosmith - Demo recording and documentation generator

Commands:
  replay <steps.json>     Replay a recorded demo from steps.json
  generate <steps.json>   Generate documentation from steps.json (no browser)
  serve <outputDir>       Start a local server to preview generated files
  help                    Show this help message

Options:
  -o, --output <dir>      Output directory (default: ./demosmith-output)
  -l, --language <lang>   Language for generated content (en, zh)
  --headless              Run browser in headless mode
  --video                 Record video during replay
  --width <px>            Viewport width (default: 1280)
  --height <px>           Viewport height (default: 720)

Examples:
  demosmith replay ./steps.json -o ./output --video
  demosmith generate ./steps.json -l zh -o ./docs
  demosmith serve ./output
`);
}

async function replay(stepsFile: string, options: CLIOptions) {
  console.log(`Replaying demo from ${stepsFile}...`);

  const stepsContent = await fs.readFile(stepsFile, 'utf-8');
  const stepsData = JSON.parse(stepsContent);

  const outputDir = options.output || './demosmith-output';
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });

  if (options.language) {
    setLanguage(options.language);
  }

  const viewport = {
    width: options.width || 1280,
    height: options.height || 720,
  };

  // Launch browser
  const browser = await chromium.launch({
    headless: options.headless ?? false,
  });

  const contextOptions: any = { viewport };
  if (options.video) {
    await fs.mkdir(path.join(outputDir, 'videos'), { recursive: true });
    contextOptions.recordVideo = {
      dir: path.join(outputDir, 'videos'),
      size: viewport,
    };
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const steps: DemoStep[] = [];
  let stepNum = 0;

  // Replay each step
  for (const stepData of stepsData.steps || stepsData) {
    stepNum++;
    console.log(`  Step ${stepNum}: ${stepData.description}`);

    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      switch (stepData.action) {
        case 'navigate':
          await page.goto(stepData.details.url, { waitUntil: 'domcontentloaded' });
          break;
        case 'click':
          if (stepData.details.selector) {
            await page.click(stepData.details.selector);
          }
          break;
        case 'fill':
          if (stepData.details.selector && stepData.details.value) {
            await page.fill(stepData.details.selector, stepData.details.value);
          }
          break;
        case 'pressKey':
          if (stepData.details.key) {
            await page.keyboard.press(stepData.details.key);
          }
          break;
        case 'wait':
          await page.waitForTimeout(stepData.duration || 1000);
          break;
        case 'scroll':
          await page.evaluate((dir: string) => {
            window.scrollBy(0, dir === 'down' ? 300 : -300);
          }, stepData.details.direction || 'down');
          break;
        case 'screenshot':
          // Just take screenshot below
          break;
        default:
          console.log(`    (Skipping unsupported action: ${stepData.action})`);
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      console.log(`    Error: ${error}`);
    }

    const duration = Date.now() - startTime;

    // Take screenshot
    const screenshotPath = path.join(outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });

    steps.push({
      id: stepNum,
      action: stepData.action,
      description: stepData.description,
      timestamp: new Date(),
      duration,
      details: stepData.details || {},
      evidence: { screenshotPath },
      success,
      error,
    });
  }

  await context.close();
  await browser.close();

  // Build session for packaging
  const session: DemoSession = {
    id: path.basename(stepsFile, '.json'),
    title: stepsData.title || 'Demo Replay',
    startUrl: stepsData.startUrl || steps[0]?.details.url || '',
    startedAt: new Date(),
    status: 'completed',
    options: {
      video: options.video ?? false,
      trace: false,
      screenshotOnStep: true,
      outputDir,
      headless: options.headless ?? false,
      viewport,
    },
    steps,
    pages: new Map(),
    activePageId: 0,
    nextPageId: 1,
  };

  // Generate deliverables
  console.log('\nGenerating documentation...');
  const deliverables = await packageDeliverables(session);

  console.log('\nGenerated files:');
  console.log(`  - ${deliverables.files.guide}`);
  console.log(`  - ${deliverables.files.steps}`);
  if (deliverables.files.narration) console.log(`  - ${deliverables.files.narration}`);
  if (deliverables.files.tutorial) console.log(`  - ${deliverables.files.tutorial}`);
  console.log(`  - ${deliverables.files.assets.length} screenshots`);

  console.log('\nDone!');
}

async function generate(stepsFile: string, options: CLIOptions) {
  console.log(`Generating documentation from ${stepsFile}...`);

  const stepsContent = await fs.readFile(stepsFile, 'utf-8');
  const stepsData = JSON.parse(stepsContent);

  const outputDir = options.output || './demosmith-output';
  await fs.mkdir(outputDir, { recursive: true });

  if (options.language) {
    setLanguage(options.language);
  }

  // Build session from steps data
  const steps: DemoStep[] = (stepsData.steps || stepsData).map((s: any, i: number) => ({
    id: i + 1,
    action: s.action,
    description: s.description,
    timestamp: new Date(s.timestamp || Date.now()),
    duration: s.duration || 0,
    details: s.details || {},
    evidence: s.evidence || {},
    success: s.success ?? true,
    error: s.error,
  }));

  const session: DemoSession = {
    id: path.basename(stepsFile, '.json'),
    title: stepsData.title || 'Demo',
    startUrl: stepsData.startUrl || '',
    startedAt: new Date(stepsData.startedAt || Date.now()),
    status: 'completed',
    options: {
      video: false,
      trace: false,
      screenshotOnStep: false,
      outputDir,
      headless: true,
      viewport: { width: 1280, height: 720 },
    },
    steps,
    pages: new Map(),
    activePageId: 0,
    nextPageId: 1,
  };

  // Generate deliverables
  const deliverables = await packageDeliverables(session);

  console.log('Generated files:');
  console.log(`  - ${deliverables.files.guide}`);
  console.log(`  - ${deliverables.files.steps}`);
  if (deliverables.files.narration) console.log(`  - ${deliverables.files.narration}`);
  if (deliverables.files.tutorial) console.log(`  - ${deliverables.files.tutorial}`);

  console.log('\nDone!');
}

async function serve(outputDir: string, _options: CLIOptions) {
  // Dynamic import for optional http server
  const http = await import('http');
  const port = 3456;

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.srt': 'text/plain',
    '.vtt': 'text/vtt',
  };

  const server = http.createServer(async (req, res) => {
    let filePath = path.join(outputDir, req.url === '/' ? 'tutorial.html' : req.url!);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'tutorial.html');
      }

      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`Serving ${outputDir} at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { command, file, options } = parseArgs(args);

  switch (command) {
    case 'replay':
      if (!file) {
        console.error('Error: Please provide a steps.json file');
        process.exit(1);
      }
      await replay(file, options);
      break;

    case 'generate':
      if (!file) {
        console.error('Error: Please provide a steps.json file');
        process.exit(1);
      }
      await generate(file, options);
      break;

    case 'serve':
      if (!file) {
        console.error('Error: Please provide an output directory');
        process.exit(1);
      }
      await serve(file, options);
      break;

    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
