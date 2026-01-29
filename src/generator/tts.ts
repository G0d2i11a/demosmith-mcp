import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { NarrationData, NarrationSegment } from './narration.js';

const execFileAsync = promisify(execFile);

/**
 * TTS provider options
 */
export type TTSProvider = 'openai' | 'edge' | 'elevenlabs' | 'azure';

/**
 * TTS generation options
 */
export interface TTSOptions {
  provider: TTSProvider;
  apiKey?: string;
  voice?: string;
  language?: string;
  speed?: number;
}

/**
 * TTS segment result
 */
interface TTSSegmentResult {
  segmentId: number;
  audioPath: string;
  durationMs: number;
}

/**
 * Generate TTS audio from narration data
 */
export async function generateTTS(
  narrationData: NarrationData,
  outputDir: string,
  options: TTSOptions
): Promise<string | null> {
  const { provider, apiKey, voice, language = 'en', speed = 1.0 } = options;

  // Create temp directory for segments
  const tempDir = path.join(outputDir, '.tts-temp');
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Generate audio for each segment
    const segmentResults: TTSSegmentResult[] = [];

    for (let i = 0; i < narrationData.segments.length; i++) {
      const segment = narrationData.segments[i];
      const audioPath = path.join(tempDir, `segment-${i.toString().padStart(3, '0')}.mp3`);

      let success = false;

      switch (provider) {
        case 'openai':
          success = await generateOpenAITTS(segment.text, audioPath, apiKey!, voice);
          break;
        case 'edge':
          success = await generateEdgeTTS(segment.text, audioPath, voice, language);
          break;
        case 'elevenlabs':
          success = await generateElevenLabsTTS(segment.text, audioPath, apiKey!, voice);
          break;
        case 'azure':
          success = await generateAzureTTS(segment.text, audioPath, apiKey!, voice, language);
          break;
      }

      if (success) {
        segmentResults.push({
          segmentId: i,
          audioPath,
          durationMs: segment.durationMs,
        });
      }
    }

    if (segmentResults.length === 0) {
      console.warn('No TTS segments generated');
      return null;
    }

    // Merge segments with timing
    const outputPath = path.join(outputDir, 'narration.mp3');
    await mergeAudioSegments(segmentResults, narrationData, outputPath, outputDir);

    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true });

    return outputPath;
  } catch (err) {
    console.error('TTS generation failed:', err);
    // Cleanup on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }
}

/**
 * Generate TTS using OpenAI API
 */
async function generateOpenAITTS(
  text: string,
  outputPath: string,
  apiKey: string,
  voice: string = 'alloy'
): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice, // alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      console.error('OpenAI TTS error:', await response.text());
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return true;
  } catch (err) {
    console.error('OpenAI TTS failed:', err);
    return false;
  }
}

/**
 * Generate TTS using Edge TTS (free, no API key needed)
 * Requires edge-tts Python CLI: pip install edge-tts
 */
async function generateEdgeTTS(
  text: string,
  outputPath: string,
  voice: string = 'en-US-AriaNeural',
  _language: string = 'en'
): Promise<boolean> {
  try {
    // Try using edge-tts CLI (Python)
    await execFileAsync('edge-tts', [
      '--voice', voice,
      '--text', text,
      '--write-media', outputPath,
    ]);
    return true;
  } catch {
    console.warn('Edge TTS not available. Install with: pip install edge-tts');
    return false;
  }
}

/**
 * Generate TTS using ElevenLabs API
 */
async function generateElevenLabsTTS(
  text: string,
  outputPath: string,
  apiKey: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM' // Rachel
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      console.error('ElevenLabs TTS error:', await response.text());
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return true;
  } catch (err) {
    console.error('ElevenLabs TTS failed:', err);
    return false;
  }
}

/**
 * Generate TTS using Azure Speech Services
 */
async function generateAzureTTS(
  text: string,
  outputPath: string,
  apiKey: string,
  voice: string = 'en-US-JennyNeural',
  language: string = 'en-US'
): Promise<boolean> {
  try {
    // Azure requires region in the endpoint
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';
    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
        <voice name='${voice}'>${escapeXml(text)}</voice>
      </speak>
    `;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!response.ok) {
      console.error('Azure TTS error:', await response.text());
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return true;
  } catch (err) {
    console.error('Azure TTS failed:', err);
    return false;
  }
}

/**
 * Merge audio segments with proper timing using ffmpeg
 */
async function mergeAudioSegments(
  segments: TTSSegmentResult[],
  narrationData: NarrationData,
  outputPath: string,
  outputDir: string
): Promise<void> {
  const ffmpegStatic = await import('ffmpeg-static');
  const ffmpegPath = ffmpegStatic.default as unknown as string;

  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary not found');
  }

  // Create a complex filter to position each segment at the correct time
  // First, generate silence for the total duration
  const totalDurationSec = narrationData.totalDurationMs / 1000;

  // Build filter complex
  const inputs: string[] = [];
  const filterParts: string[] = [];

  // Add silence base track
  inputs.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${totalDurationSec}`);

  // Add each segment
  for (let i = 0; i < segments.length; i++) {
    inputs.push('-i', segments[i].audioPath);
  }

  // Build adelay filter for each segment
  let mixInputs = '[0]';
  for (let i = 0; i < segments.length; i++) {
    const segment = narrationData.segments[i];
    const delayMs = segment.startMs;
    filterParts.push(`[${i + 1}]adelay=${delayMs}|${delayMs}[a${i}]`);
    mixInputs += `[a${i}]`;
  }

  // Mix all tracks
  const mixCount = segments.length + 1;
  filterParts.push(`${mixInputs}amix=inputs=${mixCount}:duration=first[out]`);

  const filterComplex = filterParts.join(';');

  await execFileAsync(ffmpegPath, [
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[out]',
    '-y',
    outputPath,
  ]);
}

/**
 * Merge audio narration with video
 */
export async function mergeAudioWithVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<string> {
  const ffmpegStatic = await import('ffmpeg-static');
  const ffmpegPath = ffmpegStatic.default as unknown as string;

  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary not found');
  }

  await execFileAsync(ffmpegPath, [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    '-y',
    outputPath,
  ]);

  return outputPath;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
