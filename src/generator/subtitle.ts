import type { DemoSession } from '../types.js';
import { generateTimedNarration } from './narration.js';

/**
 * Format milliseconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Generate SRT subtitle file content
 *
 * SRT format:
 * 1
 * 00:00:00,000 --> 00:00:03,000
 * Subtitle text here
 *
 * 2
 * 00:00:03,500 --> 00:00:06,000
 * Next subtitle
 */
export function generateSrt(session: DemoSession): string {
  const narrationData = generateTimedNarration(session);
  const lines: string[] = [];

  narrationData.segments.forEach((item, index) => {
    const startTime = formatSrtTime(item.startMs);
    const endTime = formatSrtTime(item.endMs);

    lines.push(`${index + 1}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(item.text);
    lines.push(''); // Empty line between entries
  });

  return lines.join('\n');
}

/**
 * Generate VTT (WebVTT) subtitle file content
 * More modern format, supported by HTML5 video
 */
export function generateVtt(session: DemoSession): string {
  const narrationData = generateTimedNarration(session);
  const lines: string[] = [];

  // VTT header
  lines.push('WEBVTT');
  lines.push('');

  narrationData.segments.forEach((item, index) => {
    // VTT uses different time format (HH:MM:SS.mmm with dot instead of comma)
    const startTime = formatSrtTime(item.startMs).replace(',', '.');
    const endTime = formatSrtTime(item.endMs).replace(',', '.');

    lines.push(`${index + 1}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(item.text);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate simple step-by-step subtitles (just the descriptions)
 */
export function generateSimpleSrt(session: DemoSession): string {
  const lines: string[] = [];
  let cumulativeTime = 0;
  let index = 1;

  for (const step of session.steps) {
    if (step.description) {
      const startTime = formatSrtTime(cumulativeTime);
      const endTime = formatSrtTime(cumulativeTime + step.duration + 1000);

      lines.push(`${index}`);
      lines.push(`${startTime} --> ${endTime}`);
      lines.push(`Step ${step.id}: ${step.description}`);
      lines.push('');

      index++;
    }
    cumulativeTime += step.duration + 500;
  }

  return lines.join('\n');
}
