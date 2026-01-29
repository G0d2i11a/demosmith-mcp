import type { DemoSession, DemoStep } from '../types.js';

/**
 * Narration segment with timing for TTS
 */
export interface NarrationSegment {
  stepId: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: string;
}

/**
 * Full narration data for TTS generation
 */
export interface NarrationData {
  title: string;
  totalDurationMs: number;
  segments: NarrationSegment[];
}

/**
 * Generate a narration script for voiceover
 */
export function generateNarrationScript(session: DemoSession): string {
  const lines: string[] = [];

  // Opening
  lines.push(`=== ${session.title} ===`);
  lines.push('');
  lines.push(`Welcome! In this tutorial, I'll show you how to ${session.title.toLowerCase()}.`);
  lines.push('');
  lines.push('Let\'s get started.');
  lines.push('');

  // Steps
  for (const step of session.steps) {
    const narration = stepToNarration(step);
    if (narration) {
      lines.push(`[Step ${step.id}]`);
      lines.push(narration);
      lines.push('');
    }
  }

  // Closing
  lines.push('---');
  lines.push('');
  lines.push(`And that's it! You've successfully completed ${session.title.toLowerCase()}.`);
  lines.push('');
  lines.push('If you have any questions, feel free to reach out.');
  lines.push('Thanks for watching!');

  return lines.join('\n');
}

/**
 * Convert a step to natural narration text
 */
function stepToNarration(step: DemoStep): string {
  const { action, description, details } = step;

  // Use the user-provided description as the base
  let narration = description;

  // Add action-specific context
  switch (action) {
    case 'navigate':
      if (details.url) {
        narration = `First, let's navigate to the page. ${description}`;
      }
      break;

    case 'click':
      narration = `Now, ${description.toLowerCase().startsWith('click') ? description : `click to ${description.toLowerCase()}`}`;
      break;

    case 'fill':
      if (details.value) {
        const maskedValue = details.value.length > 20
          ? details.value.substring(0, 20) + '...'
          : details.value;
        narration = `${description}. I'll type "${maskedValue}".`;
      }
      break;

    case 'select':
      if (details.value) {
        narration = `${description}. I'll select "${details.value}".`;
      }
      break;

    case 'scroll':
      narration = `Let me scroll ${(details as any).direction || 'down'} to show you more.`;
      break;

    case 'wait':
      narration = `I'll wait for the page to load.`;
      break;

    case 'screenshot':
      // Skip screenshot steps in narration
      return '';

    default:
      // Use description as-is
      break;
  }

  return narration;
}

/**
 * Generate narration with timing from actual video timestamps
 */
export function generateTimedNarration(session: DemoSession): NarrationData {
  const segments: NarrationSegment[] = [];

  // Calculate total duration from last step
  const lastStep = session.steps[session.steps.length - 1];
  const totalDurationMs = lastStep?.videoEndMs ??
    session.steps.reduce((sum, s) => sum + s.duration, 0) + 5000;

  // Add intro (first 2 seconds)
  const introText = `Welcome! In this tutorial, I'll show you how to ${session.title.toLowerCase()}. Let's get started.`;
  segments.push({
    stepId: 0,
    startMs: 0,
    endMs: 2000,
    durationMs: 2000,
    text: introText,
  });

  // Add steps with actual video timestamps
  for (const step of session.steps) {
    const narration = stepToNarration(step);
    if (narration) {
      const startMs = step.videoStartMs ?? segments[segments.length - 1]?.endMs ?? 2000;
      const endMs = step.videoEndMs ?? startMs + step.duration;

      segments.push({
        stepId: step.id,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        text: narration,
      });
    }
  }

  // Add outro (last 3 seconds)
  const outroStart = segments[segments.length - 1]?.endMs ?? totalDurationMs - 3000;
  const outroText = `And that's it! You've successfully completed ${session.title.toLowerCase()}. Thanks for watching!`;
  segments.push({
    stepId: -1,
    startMs: outroStart,
    endMs: totalDurationMs,
    durationMs: totalDurationMs - outroStart,
    text: outroText,
  });

  return {
    title: session.title,
    totalDurationMs,
    segments,
  };
}

/**
 * Generate narration JSON file for TTS APIs
 */
export function generateNarrationJson(session: DemoSession): string {
  const data = generateTimedNarration(session);
  return JSON.stringify(data, null, 2);
}
