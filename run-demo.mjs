// Complete demo for GitHub showcase
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

const outputDir = 'D:/Code/mcp/demosmith-mcp/demo-output';

async function sendRequest(proc, method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  return new Promise((resolve, reject) => {
    let response = '';

    const onData = (data) => {
      response += data.toString();
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === request.id || parsed.result || parsed.error) {
              proc.stdout.off('data', onData);
              resolve(parsed);
              return;
            }
          } catch {
            // Not complete yet
          }
        }
      }
    };

    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(request) + '\n');

    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error('Timeout waiting for response'));
    }, 60000);
  });
}

async function callTool(proc, name, args) {
  const result = await sendRequest(proc, 'tools/call', { name, arguments: args });
  console.log(`  ✓ ${name}`);
  return result;
}

async function demo() {
  console.log('🎬 demosmith-mcp Demo\n');
  console.log('This demo will showcase the key features:\n');
  console.log('  - Animated cursor with click effects');
  console.log('  - Form filling with typing animation');
  console.log('  - Screenshot capture at each step');
  console.log('  - Multiple output formats generation\n');

  // Clean output directory
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  // Start MCP server
  console.log('Starting demosmith-mcp server...');
  const proc = spawn('node', ['dist/index.js'], {
    cwd: 'D:/Code/mcp/demosmith-mcp',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  proc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes('server started')) {
      console.error('  [server]', msg);
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  try {
    // Initialize MCP
    await sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'demo', version: '1.0.0' },
    });
    console.log('✓ MCP initialized\n');

    // === Demo Flow ===
    console.log('📍 Step 1: Start demo session');
    await callTool(proc, 'demosmith_start', {
      title: 'GitHub Login Demo',
      startUrl: 'https://github.com/login',
      outputDir: outputDir,
      headless: false,
      video: true,
      trace: true,
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n📍 Step 2: Take accessibility snapshot');
    await callTool(proc, 'demosmith_snapshot', {});

    console.log('\n📍 Step 3: Fill username (with animated cursor)');
    await callTool(proc, 'demosmith_fill', {
      ref: 'label:Username or email address',
      value: 'demo-user@example.com',
      description: 'Enter username or email',
      animated: true,
      moveDuration: 600,
      typeDelay: 80,
    });
    await new Promise(r => setTimeout(r, 500));

    console.log('\n📍 Step 4: Fill password');
    await callTool(proc, 'demosmith_fill', {
      ref: 'label:Password',
      value: 'demo-password-123',
      description: 'Enter password',
      animated: true,
      moveDuration: 500,
      typeDelay: 60,
    });
    await new Promise(r => setTimeout(r, 500));

    console.log('\n📍 Step 5: Hover over Sign in button');
    await callTool(proc, 'demosmith_hover', {
      ref: 'text:Sign in',
      description: 'Hover over the Sign in button',
      animated: true,
      waitAfter: 300,
    });

    console.log('\n📍 Step 6: Take manual screenshot');
    await callTool(proc, 'demosmith_screenshot', {
      description: 'Login form filled and ready to submit',
    });

    console.log('\n📍 Step 7: Press Tab key');
    await callTool(proc, 'demosmith_press_key', {
      key: 'Tab',
      description: 'Navigate to next element',
    });
    await new Promise(r => setTimeout(r, 300));

    console.log('\n📍 Step 8: Scroll down');
    await callTool(proc, 'demosmith_scroll', {
      direction: 'down',
      amount: 200,
      description: 'Scroll to see more options',
    });
    await new Promise(r => setTimeout(r, 500));

    console.log('\n📍 Step 9: Assert page title');
    await callTool(proc, 'demosmith_assert', {
      type: 'title',
      expected: 'GitHub',
      description: 'Verify we are on GitHub login page',
    });

    console.log('\n📍 Step 10: End session and generate outputs');
    const endResult = await callTool(proc, 'demosmith_end', {});

    // Parse result
    let deliverables;
    try {
      const content = endResult.result?.content?.[0]?.text;
      if (content) {
        deliverables = JSON.parse(content);
      }
    } catch {}

    console.log('\n' + '='.repeat(50));
    console.log('📦 Generated Files:');
    console.log('='.repeat(50));

    // List all files
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

    // Show sample content
    console.log('\n' + '='.repeat(50));
    console.log('📝 Sample: Narration Script');
    console.log('='.repeat(50));
    try {
      const narration = await fs.readFile(path.join(outputDir, 'narration.txt'), 'utf-8');
      console.log(narration.slice(0, 800));
      if (narration.length > 800) console.log('...');
    } catch {}

    console.log('\n' + '='.repeat(50));
    console.log('📝 Sample: SRT Subtitles');
    console.log('='.repeat(50));
    try {
      const srt = await fs.readFile(path.join(outputDir, 'subtitles.srt'), 'utf-8');
      console.log(srt.slice(0, 600));
      if (srt.length > 600) console.log('...');
    } catch {}

    console.log('\n' + '='.repeat(50));
    console.log('✅ Demo Complete!');
    console.log('='.repeat(50));
    console.log(`\nOutput directory: ${outputDir}`);
    console.log('\nOpen in browser:');
    console.log(`  - ${outputDir}/tutorial.html (Interactive Tutorial)`);
    console.log(`  - ${outputDir}/animated-preview.html (GIF Preview)`);
    console.log(`  - ${outputDir}/guide.md (Markdown Guide)`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    proc.kill();
  }
}

demo().catch(console.error);
