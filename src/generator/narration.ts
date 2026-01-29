import type { DemoSession, DemoStep } from '../types.js';

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
 * Generate narration with timing hints for TTS
 */
export function generateTimedNarration(session: DemoSession): Array<{
  stepId: number;
  timestamp: number;
  duration: number;
  text: string;
}> {
  const timedNarration: Array<{
    stepId: number;
    timestamp: number;
    duration: number;
    text: string;
  }> = [];

  // Calculate cumulative time
  let cumulativeTime = 0;

  // Add intro
  timedNarration.push({
    stepId: 0,
    timestamp: 0,
    duration: 3000,
    text: `Welcome! In this tutorial, I'll show you how to ${session.title.toLowerCase()}. Let's get started.`,
  });
  cumulativeTime = 3000;

  // Add steps
  for (const step of session.steps) {
    const narration = stepToNarration(step);
    if (narration) {
      // Estimate duration based on text length (roughly 150 words per minute)
      const wordCount = narration.split(/\s+/).length;
      const estimatedDuration = Math.max(2000, (wordCount / 150) * 60 * 1000);

      timedNarration.push({
        stepId: step.id,
        timestamp: cumulativeTime,
        duration: Math.round(estimatedDuration),
        text: narration,
      });

      cumulativeTime += step.duration + 500; // Add step duration + pause
    }
  }

  // Add outro
  timedNarration.push({
    stepId: -1,
    timestamp: cumulativeTime,
    duration: 4000,
    text: `And that's it! You've successfully completed ${session.title.toLowerCase()}. Thanks for watching!`,
  });

  return timedNarration;
}
