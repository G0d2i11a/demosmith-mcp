// End-to-end test for demosmith-mcp with all generators
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

const outputDir = 'D:/Code/mcp/demosmith-mcp/.tmp/test-demo-v2';

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
    }, 30000);
  });
}

async function callTool(proc, name, args) {
  return sendRequest(proc, 'tools/call', { name, arguments: args });
}

async function test() {
  console.log('Starting demosmith-mcp E2E test (all generators)...\n');

  // Clean output directory
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  // Start MCP server
  const proc = spawn('node', ['dist/index.js'], {
    cwd: 'D:/Code/mcp/demosmith-mcp',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  proc.stderr.on('data', (data) => {
    console.error('Server:', data.toString());
  });

  await new Promise(r => setTimeout(r, 1000));

  try {
    // Initialize
    console.log('1. Initializing MCP connection...');
    await sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    });

    // Start demo session
    console.log('2. Starting demo session...');
    await callTool(proc, 'demosmith_start', {
      title: 'Example Form Demo',
      startUrl: 'https://www.w3schools.com/html/html_forms.asp',
      outputDir: outputDir,
      headless: false,
    });

    await new Promise(r => setTimeout(r, 3000));

    // Take snapshot
    console.log('3. Taking accessibility snapshot...');
    await callTool(proc, 'demosmith_snapshot', {});

    // Scroll
    console.log('4. Scrolling to form section...');
    await callTool(proc, 'demosmith_scroll', {
      direction: 'down',
      amount: 300,
      description: 'Scroll down to see the form',
    });
    await new Promise(r => setTimeout(r, 500));

    // Take screenshot
    console.log('5. Taking screenshot...');
    await callTool(proc, 'demosmith_screenshot', {
      description: 'Form section visible',
    });

    // End session
    console.log('6. Ending demo session...');
    await callTool(proc, 'demosmith_end', {});

    console.log('\n=== Generated Files ===');

    // List all files
    const files = await fs.readdir(outputDir);
    for (const file of files) {
      const stat = await fs.stat(path.join(outputDir, file));
      if (stat.isDirectory()) {
        const subFiles = await fs.readdir(path.join(outputDir, file));
        console.log(`📁 ${file}/`);
        for (const subFile of subFiles) {
          console.log(`   - ${subFile}`);
        }
      } else {
        const size = (stat.size / 1024).toFixed(1);
        console.log(`📄 ${file} (${size} KB)`);
      }
    }

    // Show narration preview
    console.log('\n=== Narration Script ===');
    try {
      const narration = await fs.readFile(path.join(outputDir, 'narration.txt'), 'utf-8');
      console.log(narration.substring(0, 600));
    } catch (e) {
      console.log('(not found)');
    }

    // Show SRT preview
    console.log('\n=== SRT Subtitles ===');
    try {
      const srt = await fs.readFile(path.join(outputDir, 'subtitles.srt'), 'utf-8');
      console.log(srt.substring(0, 500));
    } catch (e) {
      console.log('(not found)');
    }

    console.log('\n=== Test Complete! ===');
    console.log('Open these files in browser:');
    console.log(`  - ${outputDir}/tutorial.html (interactive tutorial)`);
    console.log(`  - ${outputDir}/animated-preview.html (GIF-like preview)`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    proc.kill();
  }
}

test().catch(console.error);
