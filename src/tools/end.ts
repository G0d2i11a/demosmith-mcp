import { z } from 'zod';
import { endSession, getSession } from '../session/manager.js';
import { packageDeliverables } from '../generator/packager.js';
import type { TTSOptions } from '../generator/tts.js';

export const endInputSchema = z.object({
  tts: z.object({
    provider: z.enum(['openai', 'edge', 'elevenlabs', 'azure']).describe('TTS provider to use'),
    apiKey: z.string().optional().describe('API key for the TTS provider (not needed for edge)'),
    voice: z.string().optional().describe('Voice ID or name'),
    language: z.string().optional().describe('Language code (e.g., en-US, zh-CN)'),
    speed: z.number().optional().describe('Speech speed multiplier'),
  }).optional().describe('TTS options for generating audio narration'),
});

export type EndInput = z.infer<typeof endInputSchema>;

export async function end(input: EndInput) {
  const session = getSession();
  if (!session) {
    return {
      success: false,
      error: 'No active demo session',
    };
  }

  // End the session (closes browser, saves trace)
  const completedSession = await endSession();
  if (!completedSession) {
    return {
      success: false,
      error: 'Failed to end session',
    };
  }

  // Package deliverables with optional TTS
  const deliverables = await packageDeliverables(completedSession, {
    tts: input.tts as TTSOptions | undefined,
  });

  return {
    success: true,
    deliverables,
  };
}
