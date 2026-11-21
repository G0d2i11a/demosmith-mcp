import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStepsJson } from '../dist/generator/json.js';
import { generateSrt, generateVtt } from '../dist/generator/subtitle.js';

const startedAt = new Date('2026-01-01T00:00:00Z');
const session = {
  id: 'demo', title: 'Open the guide', startUrl: 'about:blank', startedAt,
  steps: [{
    id: 1, action: 'click', description: 'Open the guide', timestamp: startedAt,
    duration: 1250, videoStartMs: 2250, videoEndMs: 3500,
    details: { selector: '#guide' }, evidence: { screenshotPath: 'guide.png' }, success: true,
  }],
};

test('exports step outcome, duration, action and screenshot from a recorded session', () => {
  const output = generateStepsJson(session);
  assert.deepEqual(output.summary, { totalSteps: 1, successCount: 1, failureCount: 0, totalDuration: 1250 });
  assert.equal(output.steps[0].action, 'click');
  assert.equal(output.steps[0].details.selector, '#guide');
  assert.equal(output.steps[0].evidence.screenshotPath, 'guide.png');
});

test('exports a timed cue in both SRT and WebVTT', () => {
  const srt = generateSrt(session);
  const vtt = generateVtt(session);
  assert.match(vtt, /^WEBVTT/);
  assert.match(srt, /00:00:02,250 --> 00:00:03,500\nNow, click to open the guide/);
  assert.match(vtt, /00:00:02\.250 --> 00:00:03\.500\nNow, click to open the guide/);
});
